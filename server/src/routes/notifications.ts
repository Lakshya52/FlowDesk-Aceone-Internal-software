import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead, subscribePush, unsubscribePush } from '../controllers/notificationController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.post('/subscribe', subscribePush);
router.post('/unsubscribe', unsubscribePush);

export default router;
