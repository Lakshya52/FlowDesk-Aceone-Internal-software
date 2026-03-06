import { Router } from 'express';
import { register, login, getMe, getUsers, updateUser, deleteUser, permanentDeleteUser } from '../controllers/authController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.get('/users', authenticate, getUsers);
router.put('/users/:id', authenticate, authorize('admin'), updateUser);
router.delete('/users/:id', authenticate, authorize('admin'), deleteUser);
router.delete('/users/:id/permanent', authenticate, authorize('admin'), permanentDeleteUser);

export default router;
