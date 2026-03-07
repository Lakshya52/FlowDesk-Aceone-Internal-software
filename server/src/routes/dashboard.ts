import { Router } from 'express';
import { getDashboardStats, getCalendarEvents, getReports, getReportFilters } from '../controllers/dashboardController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/stats', getDashboardStats);
router.get('/calendar', getCalendarEvents);
router.get('/report-filters', getReportFilters);
router.get('/reports', authorize('admin', 'manager', 'member'), getReports);

export default router;
