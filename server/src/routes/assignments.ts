import { Router } from 'express';
import { createAssignment, getAssignments, getAssignment, updateAssignment, deleteAssignment, updateAssignmentCanvas } from '../controllers/assignmentController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.post('/', authorize('admin', 'manager', 'member'), createAssignment);
router.get('/', getAssignments);
router.get('/:id', getAssignment);
router.put('/:id', authorize('admin', 'manager'), updateAssignment);
router.patch('/:id/canvas', updateAssignmentCanvas);
router.delete('/:id', authorize('admin', 'manager'), deleteAssignment);

export default router;
