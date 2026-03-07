import { Router } from 'express';
import { register, login, getMe, getUsers, permanentDeleteUser, deleteUser, updateUser, uploadAvatar, removeAvatar } from '../controllers/authController';
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
router.delete('/users/:id/permanent', authorize('admin'), permanentDeleteUser);

export default router;
