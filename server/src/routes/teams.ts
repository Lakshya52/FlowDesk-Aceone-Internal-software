import { Router } from 'express';
import { createTeam, getTeams, getTeam, updateTeam, deleteTeam, updateTeamMembers } from '../controllers/teamController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.post('/', authorize('admin'), createTeam);
router.get('/', getTeams);
router.get('/:id', getTeam);
router.put('/:id', authorize('admin', 'manager'), updateTeam);
router.delete('/:id', authorize('admin'), deleteTeam);
router.put('/:id/members', authorize('admin', 'manager'), updateTeamMembers);

export default router;
