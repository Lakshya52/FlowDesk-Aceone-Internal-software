import { Router } from 'express';
import {
    createCompany,
    getCompanies,
    getCompany,
    updateCompany,
    deleteCompany,
    getCompanyContacts,
    createContact,
    updateContact,
    deleteContact,
    getCompanyProjects,
    importCompanies,
    exportCompaniesToExcel,
    exportCompaniesToPDF,
    downloadSampleExcel,
    sendBulkCompanyEmail,
    upload
} from '../controllers/companyController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

// Import/Export routes (must come before /:id to avoid conflicts)
router.post('/import', upload.single('file'), importCompanies);
router.get('/import/sample', downloadSampleExcel);
router.get('/export/excel', exportCompaniesToExcel);
router.get('/export/pdf', exportCompaniesToPDF);
router.post('/bulk-email', sendBulkCompanyEmail);

// Company routes
router.post('/', createCompany);
router.get('/', getCompanies);
router.get('/:id', getCompany);
router.put('/:id', updateCompany);
router.delete('/:id', deleteCompany);

// Contact routes
router.get('/:id/contacts', getCompanyContacts);
router.post('/:id/contacts', createContact);
router.put('/:id/contacts/:contactId', updateContact);
router.delete('/:id/contacts/:contactId', deleteContact);

// Projects route (placeholder for future integration)
router.get('/:id/projects', getCompanyProjects);

export default router;
