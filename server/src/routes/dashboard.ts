import { Router } from 'express';
import { getDashboardStats, getCalendarEvents, getReports, getReportFilters, globalSearch } from '../controllers/dashboardController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/stats', getDashboardStats);
router.get('/calendar', getCalendarEvents);
router.get('/report-filters', getReportFilters);
router.get('/reports', authorize('admin', 'manager', 'member'), getReports);
router.get('/search', globalSearch);

export default router;
