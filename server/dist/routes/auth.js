"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middlewares/auth");
const upload_1 = require("../middlewares/upload");
const router = (0, express_1.Router)();
router.post('/register', authController_1.register);
router.post('/verify-registration-otp', authController_1.verifyRegistrationOtp);
router.post('/resend-registration-otp', authController_1.resendRegistrationOtp);
router.post('/login', authController_1.login);
router.get('/me', auth_1.authenticate, authController_1.getMe);
router.get('/users', auth_1.authenticate, authController_1.getUsers);
router.post('/users/create', auth_1.authenticate, authController_1.createUser);
router.put('/users/:id', auth_1.authenticate, (0, auth_1.authorize)('admin'), authController_1.updateUser);
router.delete('/users/:id', auth_1.authenticate, (0, auth_1.authorize)('admin'), authController_1.deleteUser);
router.put('/users/:id/avatar', upload_1.upload.single('avatar'), authController_1.uploadAvatar);
router.delete('/users/:id/avatar', authController_1.removeAvatar);
router.delete('/users/:id/permanent', auth_1.authenticate, (0, auth_1.authorize)('admin', 'manager'), authController_1.permanentDeleteUser);
router.put('/change-password', auth_1.authenticate, authController_1.changePassword);
router.post('/forgot-password', authController_1.forgotPassword);
router.post('/verify-forgot-password-otp', authController_1.verifyForgotPasswordOtp);
// Temporary debug route to check SMTP connectivity
router.get('/debug-email', async (req, res) => {
    const net = require('net');
    const checkPort = (port) => new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(5000);
        socket.connect(port, 'smtp.gmail.com', () => {
            socket.destroy();
            resolve(`✅ Port ${port} OPEN`);
        });
        socket.on('timeout', () => { socket.destroy(); resolve(`❌ Port ${port} TIMED OUT`); });
        socket.on('error', (err) => { resolve(`❌ Port ${port} BLOCKED - ${err.message}`); });
    });
    const [p587, p465] = await Promise.all([checkPort(587), checkPort(465)]);
    res.json({ port587: p587, port465: p465 });
});
exports.default = router;
//# sourceMappingURL=auth.js.map