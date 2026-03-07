import { Router } from 'express';
import { createTeam, getTeams, getTeam, updateTeam, deleteTeam, updateTeamMembers, requestJoinTeam, approveJoinRequest, rejectJoinRequest } from '../controllers/teamController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.post('/', authorize('admin'), createTeam);
router.get('/', getTeams);
router.get('/:id', getTeam);
router.put('/:id', authorize('admin', 'manager'), updateTeam);
router.delete('/:id', authorize('admin'), deleteTeam);
router.put('/:id/members', authorize('admin', 'manager'), updateTeamMembers);
router.post('/:id/request-join', requestJoinTeam);
router.post('/:id/requests/:userId/approve', authorize('admin', 'manager'), approveJoinRequest);
router.post('/:id/requests/:userId/reject', authorize('admin', 'manager'), rejectJoinRequest);

export default router;
