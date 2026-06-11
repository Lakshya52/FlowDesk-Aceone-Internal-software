import express from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  moveEvent,
  searchEvents
} from '../controllers/calendarEventController';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

router.use(authenticate);

router.get('/search', searchEvents);
router.get('/:id', getEventById);
router.get('/', getEvents);
router.post('/', createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);
router.put('/:id/move', moveEvent);

export default router;
