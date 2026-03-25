import { Router } from 'express';
import { createAssignment, getAssignments, getAssignment, updateAssignment, deleteAssignment } from '../controllers/assignmentController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.post('/', authorize('admin', 'manager'), createAssignment);
router.get('/', getAssignments);
router.get('/:id', getAssignment);
router.put('/:id', authorize('admin', 'manager'), updateAssignment);
router.delete('/:id', authorize('admin', 'manager'), deleteAssignment);

export default router;
