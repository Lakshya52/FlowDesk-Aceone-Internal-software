"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboardController_1 = require("../controllers/dashboardController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/stats', dashboardController_1.getDashboardStats);
router.get('/calendar', dashboardController_1.getCalendarEvents);
router.get('/report-filters', dashboardController_1.getReportFilters);
router.get('/reports', (0, auth_1.authorize)('admin', 'manager', 'member'), dashboardController_1.getReports);
router.get('/search', dashboardController_1.globalSearch);
exports.default = router;
//# sourceMappingURL=dashboard.js.map