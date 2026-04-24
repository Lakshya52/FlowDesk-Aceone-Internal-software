"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = exports.downloadSampleExcel = exports.sendBulkCompanyEmail = exports.exportCompaniesToPDF = exports.exportCompaniesToExcel = exports.importCompanies = exports.getCompanyProjects = exports.deleteContact = exports.updateContact = exports.createContact = exports.getCompanyContacts = exports.deleteCompany = exports.updateCompany = exports.getCompany = exports.getCompanies = exports.createCompany = void 0;
const Company_1 = __importDefault(require("../models/Company"));
const Contact_1 = __importDefault(require("../models/Contact"));
const exceljs_1 = __importDefault(require("exceljs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const multer_1 = __importDefault(require("multer"));
const emailService_1 = require("../services/emailService");
const ActivityLog_1 = __importStar(require("../models/ActivityLog"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
exports.upload = upload;
// Create Company
const createCompany = async (req, res) => {
    try {
        const { name, parentCompanyId, industry, description, website, email, phone, address, status } = req.body;
        const companyData = {
            name,
            parentCompanyId: parentCompanyId || null,
            industry,
            description,
            website,
            email,
            phone,
            address,
            status: status || 'active',
        };
        const company = await Company_1.default.create(companyData);
        await ActivityLog_1.default.create({
            action: 'Company created',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.COMPANY,
            entityId: company._id,
            metadata: { name: company.name },
        });
        res.status(201).json({ success: true, company });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.createCompany = createCompany;
// Get All Companies (with hierarchy)
const getCompanies = async (req, res) => {
    try {
        const { flat } = req.query;
        // Return flat list of all companies
        if (flat === 'true') {
            const allCompanies = await Company_1.default.find().select('_id name parentCompanyId').sort({ name: 1 }).lean();
            res.json({ success: true, companies: allCompanies });
            return;
        }
        const companies = await Company_1.default.find({ parentCompanyId: null })
            .populate('contacts')
            .populate('childCompanies');
        // Build full hierarchy recursively
        const buildHierarchy = async (parentId) => {
            const children = await Company_1.default.find({ parentCompanyId: parentId }).lean();
            for (const child of children) {
                const childDocs = await buildHierarchy(child._id.toString());
                child.children = childDocs;
            }
            return children;
        };
        const rootCompanies = await buildHierarchy(null);
        res.json({ success: true, companies: rootCompanies });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCompanies = getCompanies;
// Get Single Company with contacts and child companies
const getCompany = async (req, res) => {
    try {
        const company = await Company_1.default.findById(req.params.id)
            .populate('contacts')
            .populate('childCompanies');
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }
        res.json({ success: true, company });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCompany = getCompany;
// Update Company
const updateCompany = async (req, res) => {
    try {
        const { name, parentCompanyId, industry, description, website, email, phone, address, status } = req.body;
        const updateData = {
            name,
            parentCompanyId: parentCompanyId === '' ? null : (parentCompanyId || null),
            industry,
            description,
            website,
            email,
            phone,
            address,
            status
        };
        const company = await Company_1.default.findById(req.params.id);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }
        // Capture changes
        const changes = {};
        Object.keys(updateData).forEach(key => {
            const oldValue = company[key];
            const newValue = updateData[key];
            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                changes[key] = { old: oldValue, new: newValue };
            }
        });
        Object.assign(company, updateData);
        await company.save();
        await ActivityLog_1.default.create({
            action: 'Company updated',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.COMPANY,
            entityId: company._id,
            metadata: {
                name: company.name,
                changes
            },
        });
        res.json({ success: true, company });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.updateCompany = updateCompany;
// Delete Company
const deleteCompany = async (req, res) => {
    try {
        const company = await Company_1.default.findByIdAndDelete(req.params.id);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }
        // Delete all contacts associated with this company
        await Contact_1.default.deleteMany({ companyId: req.params.id });
        // Recursively delete child companies
        const childCompanies = await Company_1.default.find({ parentCompanyId: req.params.id });
        for (const child of childCompanies) {
            await Company_1.default.findByIdAndDelete(child._id);
            await Contact_1.default.deleteMany({ companyId: child._id });
            // Recursively delete deeper levels
            const deeperChildren = await Company_1.default.find({ parentCompanyId: child._id });
            for (const grandchild of deeperChildren) {
                await Company_1.default.findByIdAndDelete(grandchild._id);
                await Contact_1.default.deleteMany({ companyId: grandchild._id });
            }
        }
        await ActivityLog_1.default.create({
            action: 'Company deleted',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.COMPANY,
            entityId: company._id,
            metadata: { name: company.name },
        });
        res.json({ success: true, message: 'Company deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteCompany = deleteCompany;
// Get Company Contacts
const getCompanyContacts = async (req, res) => {
    try {
        const contacts = await Contact_1.default.find({ companyId: req.params.id });
        res.json({ success: true, contacts });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCompanyContacts = getCompanyContacts;
// Create Contact
const createContact = async (req, res) => {
    try {
        const { name, email, phone, position, department, isPrimary, notes } = req.body;
        // If primary, unset other primary contacts
        if (isPrimary) {
            await Contact_1.default.updateMany({ companyId: req.params.id, isPrimary: true }, { isPrimary: false });
        }
        const contact = await Contact_1.default.create({
            companyId: req.params.id,
            name,
            email,
            phone,
            position,
            department,
            isPrimary: isPrimary || false,
            notes,
        });
        res.status(201).json({ success: true, contact });
        await ActivityLog_1.default.create({
            action: 'Contact created',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.CONTACT,
            entityId: contact._id,
            metadata: { name: contact.name, companyId: req.params.id },
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.createContact = createContact;
// Update Contact
const updateContact = async (req, res) => {
    try {
        const { name, email, phone, position, department, isPrimary, notes } = req.body;
        // If setting as primary, unset other primary contacts
        if (isPrimary) {
            await Contact_1.default.updateMany({ companyId: req.params.id, isPrimary: true, _id: { $ne: req.params.contactId } }, { isPrimary: false });
        }
        const contact = await Contact_1.default.findById(req.params.contactId);
        if (!contact) {
            return res.status(404).json({ success: false, message: 'Contact not found' });
        }
        const oldValue = contact.toObject();
        Object.assign(contact, { name, email, phone, position, department, isPrimary, notes });
        await contact.save();
        // Capture changes
        const changes = {};
        const fields = ['name', 'email', 'phone', 'position', 'department', 'isPrimary', 'notes'];
        fields.forEach(field => {
            const oldVal = oldValue[field];
            const newVal = contact[field];
            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                changes[field] = { old: oldVal, new: newVal };
            }
        });
        await ActivityLog_1.default.create({
            action: 'Contact updated',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.CONTACT,
            entityId: contact._id,
            metadata: {
                name: contact.name,
                companyId: contact.companyId,
                changes
            },
        });
        res.json({ success: true, contact });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.updateContact = updateContact;
// Delete Contact
const deleteContact = async (req, res) => {
    try {
        const contact = await Contact_1.default.findByIdAndDelete(req.params.contactId);
        if (!contact) {
            return res.status(404).json({ success: false, message: 'Contact not found' });
        }
        await ActivityLog_1.default.create({
            action: 'Contact deleted',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.CONTACT,
            entityId: contact._id,
            metadata: { name: contact.name },
        });
        res.json({ success: true, message: 'Contact deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteContact = deleteContact;
// Get Company Projects (placeholder)
const getCompanyProjects = async (req, res) => {
    res.json({ success: true, projects: [], message: 'Project integration coming soon' });
};
exports.getCompanyProjects = getCompanyProjects;
// Import Companies from Excel
const importCompanies = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        const workbook = new exceljs_1.default.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
            return res.status(400).json({ success: false, message: 'No worksheet found' });
        }
        const results = {
            created: 0,
            updated: 0,
            errors: [],
            companies: [],
        };
        // Map column headers to indices
        const headerRow = worksheet.getRow(1);
        const headers = {};
        headerRow.eachCell((cell, col) => {
            const key = cell.value?.toString().toLowerCase().trim();
            if (key)
                headers[key] = col;
        });
        // Process each row
        for (let row = 2; row <= worksheet.rowCount; row++) {
            try {
                const getCell = (key) => {
                    const col = headers[key];
                    return col ? worksheet.getRow(row).getCell(col).value : null;
                };
                const name = getCell('company name') || getCell('name');
                if (!name) {
                    results.errors.push(`Row ${row}: Missing company name`);
                    continue;
                }
                // Find existing company by name
                let company = await Company_1.default.findOne({ name });
                const isUpdate = !!company;
                const parentName = getCell('parent company') || getCell('parent');
                let parentCompanyId = null;
                if (parentName) {
                    const parent = await Company_1.default.findOne({ name: parentName });
                    parentCompanyId = parent?._id || null;
                }
                const companyData = {
                    name,
                    parentCompanyId,
                    industry: getCell('industry') || undefined,
                    description: getCell('description') || undefined,
                    website: getCell('website') || undefined,
                    email: getCell('company email') || undefined,
                    phone: getCell('phone') || getCell('contact') || undefined,
                    address: {
                        street: getCell('street') || undefined,
                        city: getCell('city') || undefined,
                        state: getCell('state') || undefined,
                        country: getCell('country') || 'India',
                        postalCode: getCell('postal code') || getCell('postalcode') || undefined,
                    },
                    status: (getCell('status')?.toString().toLowerCase() === 'inactive' ? 'inactive' : 'active'),
                };
                if (isUpdate) {
                    company = await Company_1.default.findByIdAndUpdate(company._id, companyData, { new: true });
                    results.updated++;
                }
                else {
                    company = await Company_1.default.create(companyData);
                    results.created++;
                }
                results.companies.push(company);
                // Import contacts if columns exist
                const contactName = getCell('contact name') || getCell('contact person');
                if (contactName && company) {
                    const contactEmail = getCell('contact email') || getCell('email') || undefined;
                    const isPrimaryRaw = getCell('is primary')?.toString().toLowerCase();
                    const isPrimary = isPrimaryRaw === 'true' || isPrimaryRaw === 'yes' || isPrimaryRaw === 'y' || isPrimaryRaw === '1';
                    const contactData = {
                        companyId: company._id,
                        name: contactName,
                        email: contactEmail,
                        phone: getCell('contact phone') || undefined,
                        position: getCell('position') || getCell('designation') || undefined,
                        department: getCell('department') || undefined,
                        isPrimary: isPrimary,
                        notes: getCell('notes') || undefined,
                    };
                    // Avoid duplicate contacts within the same company
                    const existingContact = await Contact_1.default.findOne({
                        companyId: company._id,
                        $or: [
                            { name: contactName },
                            ...(contactEmail ? [{ email: contactEmail }] : [])
                        ]
                    });
                    if (existingContact) {
                        await Contact_1.default.findByIdAndUpdate(existingContact._id, contactData);
                    }
                    else {
                        await Contact_1.default.create(contactData);
                    }
                }
            }
            catch (error) {
                results.errors.push(`Row ${row}: ${error.message}`);
            }
        }
        await ActivityLog_1.default.create({
            action: 'Companies imported',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.COMPANY,
            entityId: req.user._id,
            metadata: {
                createdCount: results.created,
                updatedCount: results.updated,
                fileName: req.file?.originalname
            },
        });
        res.json({ success: true, results });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.importCompanies = importCompanies;
// Export Companies to Excel
const exportCompaniesToExcel = async (req, res) => {
    try {
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet('Companies');
        // Define columns
        worksheet.columns = [
            { header: 'Company Name', key: 'name', width: 30 },
            { header: 'Parent Company', key: 'parentCompany', width: 25 },
            { header: 'Industry', key: 'industry', width: 20 },
            { header: 'Description', key: 'description', width: 40 },
            { header: 'Website', key: 'website', width: 25 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Street', key: 'street', width: 25 },
            { header: 'City', key: 'city', width: 15 },
            { header: 'State', key: 'state', width: 15 },
            { header: 'Country', key: 'country', width: 15 },
            { header: 'Postal Code', key: 'postalCode', width: 15 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Contact Name', key: 'contactName', width: 25 },
            { header: 'Contact Email', key: 'contactEmail', width: 25 },
            { header: 'Contact Phone', key: 'contactPhone', width: 15 },
            { header: 'Position', key: 'position', width: 20 },
            { header: 'Department', key: 'department', width: 15 },
            { header: 'Is Primary', key: 'isPrimary', width: 12 },
        ];
        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' },
        };
        // Fetch companies with optional ID filtering
        const { ids } = req.query;
        let queryFilter = {};
        if (ids) {
            const idList = ids.split(',');
            queryFilter = { _id: { $in: idList } };
        }
        const companies = await Company_1.default.find(queryFilter).populate('contacts').lean();
        // Get parent company names map
        const parentIds = [...new Set(companies.map(c => c.parentCompanyId).filter(Boolean))];
        const parents = await Company_1.default.find({ _id: { $in: parentIds } });
        const parentMap = new Map(parents.map(p => [p._id.toString(), p.name]));
        for (const company of companies) {
            const parentName = company.parentCompanyId ? parentMap.get(company.parentCompanyId.toString()) || '' : '';
            // Base company row
            const baseRow = {
                name: company.name,
                parentCompany: parentName,
                industry: company.industry || '',
                description: company.description || '',
                website: company.website || '',
                email: company.email || '',
                phone: company.phone || '',
                street: company.address?.street || '',
                city: company.address?.city || '',
                state: company.address?.state || '',
                country: company.address?.country || '',
                postalCode: company.address?.postalCode || '',
                status: company.status,
            };
            const contacts = company.contacts || [];
            if (contacts.length === 0) {
                // No contacts - add company row only
                worksheet.addRow(baseRow);
            }
            else {
                // One row per contact
                contacts.forEach((contact, idx) => {
                    worksheet.addRow({
                        ...baseRow,
                        contactName: contact.name,
                        contactEmail: contact.email || '',
                        contactPhone: contact.phone || '',
                        position: contact.position || '',
                        department: contact.department || '',
                        isPrimary: contact.isPrimary ? 'Yes' : 'No',
                    });
                });
            }
        }
        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="companies_export_' + new Date().toISOString().split('T')[0] + '.xlsx"');
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.exportCompaniesToExcel = exportCompaniesToExcel;
// Export Companies to PDF
const exportCompaniesToPDF = async (req, res) => {
    try {
        const doc = new pdfkit_1.default({ margin: 40, size: 'A4' });
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="companies_export_' + new Date().toISOString().split('T')[0] + '.pdf"');
        doc.pipe(res);
        // Title
        doc.fontSize(20).font('Helvetica-Bold').text('Companies Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(1);
        // Fetch companies with optional ID filtering
        const { ids } = req.query;
        let queryFilter = {};
        if (ids) {
            const idList = ids.split(',');
            queryFilter = { _id: { $in: idList } };
        }
        const companies = await Company_1.default.find(queryFilter).sort({ name: 1 }).populate('contacts');
        // Get parent company names map
        const parentIds = [...new Set(companies.map(c => c.parentCompanyId).filter(Boolean))];
        const parents = await Company_1.default.find({ _id: { $in: parentIds } });
        const parentMap = new Map(parents.map(p => [p._id.toString(), p.name]));
        for (let i = 0; i < companies.length; i++) {
            const company = companies[i];
            const parentName = company.parentCompanyId ? parentMap.get(company.parentCompanyId.toString()) || '' : '';
            // Company header
            doc.fontSize(14).font('Helvetica-Bold').text(company.name);
            if (parentName) {
                doc.fontSize(10).font('Helvetica-Oblique').text(`Subsidiary of: ${parentName}`);
            }
            doc.moveDown(0.3);
            // Company details
            doc.fontSize(10).font('Helvetica');
            if (company.industry)
                doc.text(`Industry: ${company.industry}`);
            if (company.phone)
                doc.text(`Phone: ${company.phone}`);
            if (company.website)
                doc.text(`Website: ${company.website}`);
            if (company.description)
                doc.text(`Description: ${company.description}`, { width: 500 });
            if (company.address && (company.address.street || company.address.city || company.address.country)) {
                const addr = [
                    company.address.street,
                    company.address.city,
                    company.address.state,
                    company.address.postalCode,
                    company.address.country,
                ].filter(Boolean).join(', ');
                doc.text(`Address: ${addr}`);
            }
            doc.moveDown(0.3);
            doc.fontSize(10).font('Helvetica-Bold').text(`Status: ${company.status.toUpperCase()}`, { continued: true });
            // Contacts section
            const contacts = company.contacts || [];
            if (contacts.length > 0) {
                doc.moveDown(0.5);
                doc.fontSize(11).font('Helvetica-Bold').text('Contacts:');
                doc.moveDown(0.3);
                doc.fontSize(10).font('Helvetica');
                contacts.forEach((contact, idx) => {
                    const primaryBadge = contact.isPrimary ? ' [PRIMARY]' : '';
                    let contactText = `  ${idx + 1}. ${contact.name}${primaryBadge}`;
                    if (contact.position)
                        contactText += ` - ${contact.position}`;
                    if (contact.department)
                        contactText += ` (${contact.department})`;
                    doc.text(contactText);
                    if (contact.email)
                        doc.fontSize(9).font('Helvetica-Oblique').text(`     Email: ${contact.email}`);
                    if (contact.phone)
                        doc.fontSize(9).font('Helvetica-Oblique').text(`     Phone: ${contact.phone}`);
                    if (contact.notes)
                        doc.fontSize(9).font('Helvetica-Oblique').text(`     Notes: ${contact.notes}`);
                    doc.fontSize(10).font('Helvetica');
                    if (idx < contacts.length - 1)
                        doc.moveDown(0.3);
                });
            }
            // Add line between companies
            if (i < companies.length - 1) {
                doc.moveDown(0.5);
                doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke('#CCCCCC');
                doc.moveDown(0.5);
            }
            // Add page break if needed
            if (doc.y > 750 && i < companies.length - 1) {
                doc.addPage();
            }
        }
        doc.end();
    }
    catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};
exports.exportCompaniesToPDF = exportCompaniesToPDF;
// Send Bulk Email to Companies
const sendBulkCompanyEmail = async (req, res) => {
    try {
        const { companyIds, subject, message } = req.body;
        if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No companies selected' });
        }
        if (!subject || !message) {
            return res.status(400).json({ success: false, message: 'Subject and message are required' });
        }
        // Fetch company emails
        const companies = await Company_1.default.find({ _id: { $in: companyIds } }).select('email name');
        const emails = companies.map(c => c.email).filter(Boolean);
        if (emails.length === 0) {
            return res.status(400).json({ success: false, message: 'None of the selected companies have an email address' });
        }
        await (0, emailService_1.sendGenericEmail)(emails, subject, message);
        await ActivityLog_1.default.create({
            action: 'Bulk email sent',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.COMPANY,
            entityId: req.user._id,
            metadata: {
                targetCount: companyIds.length,
                successCount: emails.length,
                subject
            },
        });
        res.json({
            success: true,
            message: `Email sent successfully to ${emails.length} companies`,
            skipped: companyIds.length - emails.length
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.sendBulkCompanyEmail = sendBulkCompanyEmail;
// Download Sample Excel Template
const downloadSampleExcel = async (req, res) => {
    try {
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet('Sample Format');
        // Define columns
        worksheet.columns = [
            { header: 'Company Name', key: 'name', width: 25 },
            { header: 'Parent Company', key: 'parent', width: 20 },
            { header: 'Industry', key: 'industry', width: 20 },
            { header: 'Description', key: 'description', width: 30 },
            { header: 'Website', key: 'website', width: 25 },
            { header: 'Company Email', key: 'email', width: 25 },
            { header: 'Country Code', key: 'phoneCountryCode', width: 10 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Street', key: 'street', width: 20 },
            { header: 'City', key: 'city', width: 15 },
            { header: 'State', key: 'state', width: 15 },
            { header: 'Country', key: 'country', width: 15 },
            { header: 'Postal Code', key: 'zip', width: 12 },
            { header: 'Status', key: 'status', width: 10 },
            { header: 'Contact Name', key: 'cname', width: 20 },
            { header: 'Contact Email', key: 'cemail', width: 25 },
            { header: 'Contact Phone', key: 'cphone', width: 15 },
            { header: 'Position', key: 'pos', width: 20 },
            { header: 'Department', key: 'dept', width: 15 },
            { header: 'Is Primary', key: 'pri', width: 12 },
            { header: 'Notes', key: 'notes', width: 30 },
        ];
        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' },
        };
        // Add sample data
        worksheet.addRow({
            name: 'Sample Corp',
            parent: '',
            industry: 'Technology',
            description: 'A sample technology company',
            website: 'https://example.com',
            email: 'contact@samplecorp.com',
            phoneCountryCode: '+91',
            phone: '1234567890',
            street: '123 Tech Park',
            city: 'Bangalore',
            state: 'Karnataka',
            country: 'India',
            zip: '560001',
            status: 'Active',
            cname: 'John Doe',
            cemail: 'john@example.com',
            cphone: '9876543210',
            pos: 'Managing Director',
            dept: 'Management',
            pri: 'Yes',
            notes: 'First contact for this company',
        });
        worksheet.addRow({
            name: 'Sample Corp',
            cname: 'Jane Smith',
            cemail: 'jane@example.com',
            cphone: '9876543211',
            pos: 'Technical Lead',
            dept: 'Engineering',
            pri: 'No',
            notes: 'Second contact for the same company',
        });
        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="company_import_sample.xlsx"');
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (error) {
        alert("Something went wrong, downloading the sample file, please contact developer of the application ")
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.downloadSampleExcel = downloadSampleExcel;
//# sourceMappingURL=companyController.js.map