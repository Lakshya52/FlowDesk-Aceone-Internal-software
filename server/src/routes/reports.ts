import { Router } from 'express';
import { 
    getTimeTrackingReport, 
    getWorkloadReport, 
    getActivityReport, 
    getCustomReport,
    exportReport
} from '../controllers/reportController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/time-tracking', authorize('admin', 'manager', 'member'), getTimeTrackingReport);
router.get('/workload', authorize('admin', 'manager', 'member'), getWorkloadReport);
router.get('/activity', authorize('admin', 'manager', 'member'), getActivityReport);
router.post('/custom', authorize('admin', 'manager'), getCustomReport);
router.get('/export', authorize('admin', 'manager'), exportReport);

export default router;
