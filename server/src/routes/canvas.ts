import express from 'express';
import { getNotes, createNote, updateNote, deleteNote } from '../controllers/canvasController';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

router.use(authenticate); // All canvas routes require authentication

router.get('/', getNotes);
router.post('/', createNote);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);

export default router;
