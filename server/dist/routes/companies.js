"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const companyController_1 = require("../controllers/companyController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Import/Export routes (must come before /:id to avoid conflicts)
router.post('/import', companyController_1.upload.single('file'), companyController_1.importCompanies);
router.get('/export/excel', companyController_1.exportCompaniesToExcel);
router.get('/export/pdf', companyController_1.exportCompaniesToPDF);
// Company routes
router.post('/', companyController_1.createCompany);
router.get('/', companyController_1.getCompanies);
router.get('/:id', companyController_1.getCompany);
router.put('/:id', companyController_1.updateCompany);
router.delete('/:id', companyController_1.deleteCompany);
// Contact routes
router.get('/:id/contacts', companyController_1.getCompanyContacts);
router.post('/:id/contacts', companyController_1.createContact);
router.put('/:id/contacts/:contactId', companyController_1.updateContact);
router.delete('/:id/contacts/:contactId', companyController_1.deleteContact);
// Projects route (placeholder for future integration)
router.get('/:id/projects', companyController_1.getCompanyProjects);
exports.default = router;
//# sourceMappingURL=companies.js.map