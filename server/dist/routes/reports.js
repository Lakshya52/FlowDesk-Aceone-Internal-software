"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reportController_1 = require("../controllers/reportController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/employee-tracking', (0, auth_1.authorize)('admin', 'manager', 'member'), reportController_1.getEmployeeTrackingReport);
router.get('/workload', (0, auth_1.authorize)('admin', 'manager', 'member'), reportController_1.getWorkloadReport);
router.get('/activity', (0, auth_1.authorize)('admin', 'manager', 'member'), reportController_1.getActivityReport);
// router.get('/export', authorize('admin', 'manager'), exportReport);
router.get('/export', reportController_1.exportReport);
exports.default = router;
//# sourceMappingURL=reports.js.map