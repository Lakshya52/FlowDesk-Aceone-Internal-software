import { Router } from 'express';
import { sendMessage, getMessages, deleteMessage } from '../controllers/chatController';
import { authenticate } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.use(authenticate);

router.post('/', upload.single('file'), sendMessage);
router.get('/', getMessages);
router.delete('/:id', deleteMessage);

export default router;
