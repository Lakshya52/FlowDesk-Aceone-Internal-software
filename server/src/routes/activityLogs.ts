import { Router } from 'express';
import { getCrmActivityLogs } from '../controllers/activityLogController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getCrmActivityLogs);

export default router;
