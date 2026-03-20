"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
router.get('/me', auth_1.authenticate, authController_1.getMe);
router.get('/users', auth_1.authenticate, authController_1.getUsers);
router.put('/users/:id', auth_1.authenticate, (0, auth_1.authorize)('admin'), authController_1.updateUser);
router.delete('/users/:id', auth_1.authenticate, (0, auth_1.authorize)('admin'), authController_1.deleteUser);
router.delete('/users/:id/permanent', auth_1.authenticate, (0, auth_1.authorize)('admin'), authController_1.permanentDeleteUser);
exports.default = router;
//# sourceMappingURL=auth.js.map