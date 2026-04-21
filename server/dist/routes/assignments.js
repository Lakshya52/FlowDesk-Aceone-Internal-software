"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const assignmentController_1 = require("../controllers/assignmentController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/', (0, auth_1.authorize)('admin', 'manager', 'member'), assignmentController_1.createAssignment);
router.get('/', assignmentController_1.getAssignments);
router.get('/:id', assignmentController_1.getAssignment);
router.put('/:id', (0, auth_1.authorize)('admin', 'manager', 'member'), assignmentController_1.updateAssignment);
router.patch('/:id/canvas', assignmentController_1.updateAssignmentCanvas);
router.delete('/:id', (0, auth_1.authorize)('admin', 'manager', 'member'), assignmentController_1.deleteAssignment);
exports.default = router;
//# sourceMappingURL=assignments.js.map