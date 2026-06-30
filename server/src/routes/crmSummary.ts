import { Router } from 'express';
import { getCrmSummary, exportCrmSummary } from '../controllers/crmSummaryController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'manager', 'member'), getCrmSummary);
router.get('/export', authorize('admin', 'manager', 'member'), exportCrmSummary);

export default router;
