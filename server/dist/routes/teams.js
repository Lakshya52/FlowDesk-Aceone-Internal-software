"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const teamController_1 = require("../controllers/teamController");
const auth_1 = require("../middlewares/auth");
const Team_1 = __importDefault(require("../models/Team"));
const User_1 = __importDefault(require("../models/User"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/', (0, auth_1.authorize)('admin'), teamController_1.createTeam);
router.get('/', teamController_1.getTeams);
router.get('/:id', teamController_1.getTeam);
router.put('/:id', (0, auth_1.authorize)('admin', 'manager'), teamController_1.updateTeam);
router.delete('/:id', (0, auth_1.authorize)('admin'), teamController_1.deleteTeam);
router.put('/:id/members', (0, auth_1.authorize)('admin', 'manager'), teamController_1.updateTeamMembers);
router.post('/:id/request-join', teamController_1.requestJoinTeam);
router.post('/:id/requests/:userId/approve', (0, auth_1.authorize)('admin', 'manager'), teamController_1.approveJoinRequest);
router.post('/:id/requests/:userId/reject', (0, auth_1.authorize)('admin', 'manager'), teamController_1.rejectJoinRequest);
// server/src/routes/teams.ts
// Assign or remove a team manager — admin only
router.put('/:id/manager', (0, auth_1.authorize)('admin'), async (req, res) => {
    try {
        const { managerId } = req.body; // null = remove manager
        const team = await Team_1.default.findById(req.params.id);
        if (!team) {
            res.status(404).json({ message: 'Team not found' });
            return;
        }
        if (managerId) {
            const managerUser = await User_1.default.findById(managerId);
            if (!managerUser) {
                res.status(404).json({ message: 'User not found' });
                return;
            }
            if (managerUser.role !== 'manager') {
                res.status(400).json({ message: 'User must have the Manager role' });
                return;
            }
            team.manager = managerId;
        }
        else {
            team.manager = undefined;
        }
        await team.save();
        const populated = await Team_1.default.findById(team._id)
            .populate('members', 'name email avatar role')
            .populate('manager', 'name email avatar')
            .populate('joinRequests', 'name email avatar');
        res.json({ team: populated });
    }
    catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=teams.js.map