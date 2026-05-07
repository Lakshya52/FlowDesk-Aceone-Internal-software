import { Router } from 'express';
import { register, login, getMe, getUsers, permanentDeleteUser, deleteUser, updateUser, uploadAvatar, removeAvatar, changePassword, forgotPassword, verifyForgotPasswordOtp } from '../controllers/authController';
import { authenticate, authorize } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.get('/users', authenticate, getUsers);
router.put('/users/:id', authenticate, authorize('admin'), updateUser);
router.delete('/users/:id', authorize('admin'), deleteUser);
router.put('/users/:id/avatar', upload.single('avatar'), uploadAvatar);
router.delete('/users/:id/avatar', removeAvatar);
router.delete('/users/:id/permanent', authorize('admin', 'manager'), permanentDeleteUser);
router.put('/change-password', authenticate, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/verify-forgot-password-otp', verifyForgotPasswordOtp);

// Temporary debug route to check SMTP connectivity
router.get('/debug-email', async (req, res) => {
    const net = require('net');
    
    const socket = new net.Socket();
    socket.setTimeout(5000);
    
    socket.connect(587, 'smtp.gmail.com', () => {
        socket.destroy();
        res.json({ status: '✅ Port 587 is OPEN - SMTP should work' });
    });
    
    socket.on('timeout', () => {
        socket.destroy();
        res.json({ status: '❌ Port 587 TIMED OUT - Render is blocking SMTP' });
    });
    
    socket.on('error', (err: any) => {
        res.json({ status: `❌ Port 587 BLOCKED - ${err.message}` });
    });
});


export default router;
