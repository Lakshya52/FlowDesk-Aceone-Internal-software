"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const taskController_1 = require("../controllers/taskController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/', (0, auth_1.authorize)('admin', 'manager', 'member'), taskController_1.createTask);
router.get('/', taskController_1.getTasks);
router.get('/:id', taskController_1.getTask);
router.put('/:id', (0, auth_1.authorize)('admin', 'manager', 'member'), taskController_1.updateTask);
router.delete('/:id', (0, auth_1.authorize)('admin', 'manager', 'member'), taskController_1.deleteTask);
exports.default = router;
//# sourceMappingURL=tasks.js.map