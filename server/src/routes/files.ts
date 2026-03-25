import { Router } from 'express';
import { uploadFile, getFiles, downloadFile, deleteFile } from '../controllers/fileController';
import { authenticate } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.use(authenticate);

router.post('/', upload.single('file'), uploadFile);
router.get('/', getFiles);
router.get('/:id/download', downloadFile);
router.delete('/:id', deleteFile);

export default router;
