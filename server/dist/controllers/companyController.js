"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = exports.exportCompaniesToPDF = exports.exportCompaniesToExcel = exports.importCompanies = exports.getCompanyProjects = exports.deleteContact = exports.updateContact = exports.createContact = exports.getCompanyContacts = exports.deleteCompany = exports.updateCompany = exports.getCompany = exports.getCompanies = exports.createCompany = void 0;
const Company_1 = __importDefault(require("../models/Company"));
const Contact_1 = __importDefault(require("../models/Contact"));
const exceljs_1 = __importDefault(require("exceljs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
exports.upload = upload;
// Create Company
const createCompany = async (req, res) => {
    try {
        const { name, parentCompanyId, industry, description, website, phone, address, status } = req.body;
        const company = await Company_1.default.create({
            name,
            parentCompanyId: parentCompanyId || null,
            industry,
            description,
            website,
            phone,
            address,
            status: status || 'active',
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
        const { name, parentCompanyId, industry, description, website, phone, address, status } = req.body;
        const company = await Company_1.default.findByIdAndUpdate(req.params.id, { name, parentCompanyId, industry, description, website, phone, address, status }, { new: true, runValidators: true }).populate('contacts').populate('childCompanies');
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }
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
            await (0, exports.deleteCompany)({ params: { id: child._id.toString() } }, res);
        }
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
        const contact = await Contact_1.default.findByIdAndUpdate(req.params.contactId, { name, email, phone, position, department, isPrimary, notes }, { new: true, runValidators: true });
        if (!contact) {
            return res.status(404).json({ success: false, message: 'Contact not found' });
        }
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
                    phone: getCell('phone') || getCell('contact') || undefined,
                    address: {
                        street: getCell('street') || undefined,
                        city: getCell('city') || undefined,
                        state: getCell('state') || undefined,
                        country: getCell('country') || 'India',
                        postalCode: getCell('postal code') || getCell('postalcode') || undefined,
                    },
                    status: (getCell('status')?.toLowerCase() === 'inactive' ? 'inactive' : 'active'),
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
                    const contactData = {
                        companyId: company._id,
                        name: contactName,
                        email: getCell('contact email') || getCell('email') || undefined,
                        phone: getCell('contact phone') || getCell('contact phone') || undefined,
                        position: getCell('position') || getCell('designation') || undefined,
                        department: getCell('department') || undefined,
                        isPrimary: getCell('is primary')?.toString().toLowerCase() === 'true' || false,
                        notes: getCell('notes') || undefined,
                    };
                    await Contact_1.default.create(contactData);
                }
            }
            catch (error) {
                results.errors.push(`Row ${row}: ${error.message}`);
            }
        }
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
        // Fetch all companies with contacts
        const companies = await Company_1.default.find().populate('contacts').lean();
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
        // Fetch all companies with contacts
        const companies = await Company_1.default.find().sort({ name: 1 }).populate('contacts');
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
                doc.fontSize(10).font('Helvetica').text(`Subsidiary of: ${parentName}`, { italic: true });
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
                        doc.text(`     Email: ${contact.email}`, { italic: true });
                    if (contact.phone)
                        doc.text(`     Phone: ${contact.phone}`, { italic: true });
                    if (contact.notes)
                        doc.text(`     Notes: ${contact.notes}`, { italic: true });
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
//# sourceMappingURL=companyController.js.map