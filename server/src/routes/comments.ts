import { Router } from 'express';
import { createComment, getComments, deleteComment, searchUsers } from '../controllers/commentController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.post('/', createComment);
router.get('/', getComments);
router.delete('/:id', deleteComment);
router.get('/users/search', searchUsers);

export default router;
