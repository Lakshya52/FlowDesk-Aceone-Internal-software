import { Router } from 'express';
import { getDashboardStats, getCalendarEvents, getReports } from '../controllers/dashboardController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/stats', getDashboardStats);
router.get('/calendar', getCalendarEvents);
router.get('/reports', authorize('admin', 'manager'), getReports);

export default router;
