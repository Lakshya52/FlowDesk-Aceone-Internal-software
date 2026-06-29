import { Response } from 'express';
import Lead from '../models/Lead';
import ActivityLog, { EntityType } from '../models/ActivityLog';
import { AuthRequest } from '../middlewares/auth';
import XLSX from 'xlsx';

const getTenantId = (user: any): string =>
    (user.tenantId?._id || user.tenantId).toString();

export const getLeads = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const tenantId = getTenantId(req.user);
        const { campaignId, status, search, industry, source, priority } = req.query;
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(10000, Math.max(1, parseInt(req.query.limit as string) || 20));
        const skip = (page - 1) * limit;

        const filter: any = { tenantId };
        if (campaignId) filter.campaignId = campaignId;
        if (status) filter.status = status;
        if (industry) filter.industry = industry;
        if (source) filter.source = source;
        if (priority) filter.priority = priority;
        if (search) {
            const regex = new RegExp(String(search), 'i');
            filter.$or = [
                { name: regex },
                { phone: regex },
                { alternatePhone: regex },
                { companyName: regex },
                { email: regex },
                { designation: regex },
                { companyPan: regex },
                { companyGst: regex },
            ];
        }

        const [leads, total] = await Promise.all([
            Lead.find(filter)
                .populate('campaignId', 'name')
                .populate('notes.createdBy', 'name email avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Lead.countDocuments(filter),
        ]);

        res.json({ success: true, leads, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getLead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const lead = await Lead.findById(req.params.id)
            .populate('campaignId', 'name')
            .populate('notes.createdBy', 'name email avatar');

        if (!lead) {
            res.status(404).json({ success: false, message: 'Lead not found' });
            return;
        }

        res.json({ success: true, lead });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createLead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const tenantId = getTenantId(req.user);

        const source = req.user!.role === 'admin' ? 'Udyam Capital' : req.user!.name;
        const lead = await Lead.create({
            ...req.body,
            tenantId,
            source,
            status: 'new',
            callCount: 0,
            notes: [],
        });

        const populated = await Lead.findById(lead._id)
            .populate('campaignId', 'name');

        await ActivityLog.create({
            action: 'Lead created',
            user: req.user!._id,
            entityType: EntityType.LEAD,
            entityId: lead._id,
            metadata: { name: lead.name },
        });

        res.status(201).json({ success: true, lead: populated });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateLead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const lead = await Lead.findById(req.params.id);

        if (!lead) {
            res.status(404).json({ success: false, message: 'Lead not found' });
            return;
        }

        const oldStatus = lead.status;
        Object.assign(lead, req.body);
        await lead.save();

        const populated = await Lead.findById(lead._id)
            .populate('campaignId', 'name')
            .populate('notes.createdBy', 'name email avatar');

        const changedFields = Object.keys(req.body);
        if (changedFields.includes('status') && oldStatus !== lead.status) {
            await ActivityLog.create({
                action: `Lead status changed: ${oldStatus.replace(/_/g, ' ')} → ${lead.status.replace(/_/g, ' ')}`,
                user: req.user!._id,
                entityType: EntityType.LEAD,
                entityId: lead._id,
                metadata: { name: lead.name, oldStatus, newStatus: lead.status, phone: lead.phone, company: lead.companyName },
            });
        } else {
            await ActivityLog.create({
                action: 'Lead updated',
                user: req.user!._id,
                entityType: EntityType.LEAD,
                entityId: lead._id,
                metadata: { name: lead.name, fields: changedFields, phone: lead.phone, company: lead.companyName },
            });
        }

        res.json({ success: true, lead: populated });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const addNote = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { text } = req.body;

        if (!text || !text.trim()) {
            res.status(400).json({ success: false, message: 'Note text is required' });
            return;
        }

        const lead = await Lead.findById(req.params.id);

        if (!lead) {
            res.status(404).json({ success: false, message: 'Lead not found' });
            return;
        }

        lead.notes.push({
            text: text.trim(),
            createdBy: req.user!._id,
            createdAt: new Date(),
        } as any);

        await lead.save();

        const populated = await Lead.findById(lead._id)
            .populate('notes.createdBy', 'name email avatar');

        await ActivityLog.create({
            action: 'Note added to lead',
            user: req.user!._id,
            entityType: EntityType.LEAD,
            entityId: lead._id,
            metadata: { name: lead.name, notePreview: text.trim().slice(0, 80) + (text.trim().length > 80 ? '...' : ''), phone: lead.phone, company: lead.companyName },
        });

        res.json({ success: true, lead: populated });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const recordCall = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const lead = await Lead.findById(req.params.id);

        if (!lead) {
            res.status(404).json({ success: false, message: 'Lead not found' });
            return;
        }

        lead.callCount = (lead.callCount || 0) + 1;
        lead.lastCallAt = new Date();
        if (req.body.callDuration != null) {
            lead.callDuration = (lead.callDuration || 0) + Number(req.body.callDuration);
        }

        let statusChanged = false;
        let oldStatus = lead.status;
        if (req.body.status) {
            lead.status = req.body.status;
            statusChanged = oldStatus !== lead.status;
        }

        await lead.save();

        const populated = await Lead.findById(lead._id)
            .populate('campaignId', 'name')
            .populate('notes.createdBy', 'name email avatar');

        let action = `Call #${lead.callCount} recorded`;
        if (statusChanged) {
            action += ` — status: ${oldStatus.replace(/_/g, ' ')} → ${lead.status.replace(/_/g, ' ')}`;
        }

        await ActivityLog.create({
            action,
            user: req.user!._id,
            entityType: EntityType.LEAD,
            entityId: lead._id,
            metadata: { name: lead.name, callCount: lead.callCount, oldStatus, newStatus: lead.status, phone: lead.phone, company: lead.companyName },
        });

        res.json({ success: true, lead: populated });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteLead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const lead = await Lead.findByIdAndDelete(req.params.id);

        if (!lead) {
            res.status(404).json({ success: false, message: 'Lead not found' });
            return;
        }

        await ActivityLog.create({
            action: 'Lead deleted',
            user: req.user!._id,
            entityType: EntityType.LEAD,
            entityId: lead._id,
            metadata: { name: lead.name, phone: lead.phone, company: lead.companyName, status: lead.status },
        });

        res.json({ success: true, message: 'Lead deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const importExcel = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'No file uploaded' });
            return;
        }

        const tenantId = getTenantId(req.user);
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        const campaignId = req.body.campaignId;

        if (rows.length === 0) {
            res.status(400).json({ success: false, message: 'Excel file is empty' });
            return;
        }

        const leads = [];
        const errors = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                if (!row.name && !row.Name && !row.NAME) {
                    errors.push({ row: i + 1, message: 'Missing name' });
                    continue;
                }

                const lead = await Lead.create({
                    campaignId,
                    tenantId,
                    name: row.name || row.Name || row.NAME || '',
                    designation: row.designation || row.Designation || '',
                    phone: row.phone || row.Phone || row.PHONE ? String(row.phone || row.Phone || row.PHONE) : undefined,
                    alternatePhone: row.alternatePhone || row['Alternate Phone'] || row.alternate_phone ? String(row.alternatePhone || row['Alternate Phone'] || row.alternate_phone) : undefined,
                    companyName: row.companyName || row.Company || row['Company Name'] || row.company_name || '',
                    addressLine: row.addressLine || row['Address Line'] || row.address_line || '',
                    city: row.city || row.City || '',
                    state: row.state || row.State || '',
                    pincode: row.pincode || row.Pincode || row.PINCODE ? String(row.pincode || row.Pincode || row.PINCODE) : undefined,
                    companyPan: row.companyPan || row['Company PAN'] || row.company_pan || '',
                    companyGst: row.companyGst || row['Company GST'] || row.company_gst || '',
                    industry: row.industry || row.Industry || '',
                    email: row.email || row.Email || row.EMAIL ? String(row.email || row.Email || row.EMAIL).toLowerCase() : undefined,
                    website: row.website || row.Website || '',
                    priority: (
                        row.priority || row.Priority || 'med'
                    ).toLowerCase().replace('_', ' '),
                    source: req.user!.role === 'admin' ? 'Udyam Capital' : req.user!.name,
                    status: 'new',
                    callCount: 0,
                    notes: [],
                });

                leads.push(lead);
            } catch (err: any) {
                errors.push({ row: i + 1, message: err.message });
            }
        }

        await ActivityLog.create({
            action: `${leads.length} leads imported via Excel`,
            user: req.user!._id,
            entityType: EntityType.LEAD,
            entityId: leads[0]?._id || req.user!._id,
            metadata: { count: leads.length, errors: errors.length },
        });

        res.status(201).json({
            success: true,
            imported: leads.length,
            errors,
            leads,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const downloadSampleExcel = async (_req: AuthRequest, res: Response): Promise<void> => {
    const wb = XLSX.utils.book_new();
    const headers = [
        'name', 'phone', 'email', 'companyName', 'addressLine', 'city', 'state', 'pincode',
        'companyPan', 'companyGst', 'industry',
        'designation', 'website', 'alternatePhone', 'priority',
    ];
    const sampleData = [
        {
            name: 'John Doe',
            phone: '9876543210',
            email: 'john@example.com',
            companyName: 'Acme Corp',
            addressLine: '123 Business Park',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            companyPan: 'AAAAA0000A',
            companyGst: '27AAAAA0000A1Z5',
            industry: 'Technology',
            designation: 'CEO',
            website: 'https://acme.com',
            alternatePhone: '9876543211',
            priority: 'high',
        },
        {
            name: 'Jane Smith',
            phone: '9123456789',
            email: 'jane@example.com',
            companyName: 'Globex Inc',
            addressLine: '',
            city: '',
            state: '',
            pincode: '',
            companyPan: '',
            companyGst: '',
            industry: 'Finance',
            designation: 'Director',
            website: '',
            alternatePhone: '',
            priority: 'med',
        },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');

    const colWidths = headers.map(h => ({ wch: Math.max(h.length, 20) }));
    ws['!cols'] = colWidths;

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="lead-import-template.xlsx"');
    res.send(buffer);
};

export const getUpcomingFollowups = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const tenantId = getTenantId(req.user);
        const leads = await Lead.find({
            tenantId,
            nextFollowupAt: { $ne: null },
        })
            .populate('campaignId', 'name')
            .sort({ nextFollowupAt: 1 })
            .limit(50);
        res.json({ success: true, leads });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
