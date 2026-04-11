"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectJoinRequest = exports.approveJoinRequest = exports.requestJoinTeam = exports.updateTeamMembers = exports.deleteTeam = exports.updateTeam = exports.getTeam = exports.getTeams = exports.createTeam = void 0;
const Team_1 = __importDefault(require("../models/Team"));
const ActivityLog_1 = __importStar(require("../models/ActivityLog"));
const createTeam = async (req, res) => {
    try {
        const team = await Team_1.default.create({
            ...req.body,
            createdBy: req.user._id,
        });
        await ActivityLog_1.default.create({
            action: 'Team created',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.USER,
            entityId: team._id,
            metadata: { teamName: team.name },
        });
        const populated = await Team_1.default.findById(team._id)
            .populate('manager', 'name email avatar')
            .populate('members', 'name email avatar role')
            .populate('createdBy', 'name email');
        res.status(201).json({ team: populated });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createTeam = createTeam;
const getTeams = async (req, res) => {
    try {
        const userRole = req.user.role;
        const userId = req.user._id;
        let query = {};
        if (userRole !== 'admin') {
            query = {
                $or: [
                    { manager: userId },
                    { members: userId }
                ]
            };
        }
        const teams = await Team_1.default.find(query)
            .populate('manager', 'name email avatar')
            .populate('members', 'name email avatar role')
            .populate('joinRequests', 'name email avatar role')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
        res.json({ teams });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getTeams = getTeams;
const getTeam = async (req, res) => {
    try {
        const team = await Team_1.default.findById(req.params.id)
            .populate('manager', 'name email avatar')
            .populate('members', 'name email avatar role')
            .populate('createdBy', 'name email');
        if (!team) {
            res.status(404).json({ message: 'Team not found' });
            return;
        }
        res.json({ team });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getTeam = getTeam;
const updateTeam = async (req, res) => {
    try {
        const team = await Team_1.default.findById(req.params.id);
        if (!team) {
            res.status(404).json({ message: 'Team not found' });
            return;
        }
        // Only admin or team manager can update
        if (req.user.role !== 'admin' && team.manager.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized to update this team' });
            return;
        }
        const updated = await Team_1.default.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' })
            .populate('manager', 'name email avatar')
            .populate('members', 'name email avatar role')
            .populate('createdBy', 'name email');
        await ActivityLog_1.default.create({
            action: 'Team updated',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.USER,
            entityId: team._id,
            metadata: { teamName: team.name, updates: Object.keys(req.body) },
        });
        res.json({ team: updated });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateTeam = updateTeam;
const deleteTeam = async (req, res) => {
    try {
        const team = await Team_1.default.findById(req.params.id);
        if (!team) {
            res.status(404).json({ message: 'Team not found' });
            return;
        }
        // Only admin or team manager can delete
        if (req.user.role !== 'admin' && team.manager.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized to delete this team' });
            return;
        }
        await team.deleteOne();
        await ActivityLog_1.default.create({
            action: 'Team deleted',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.USER,
            entityId: team._id,
            metadata: { teamName: team.name },
        });
        res.json({ message: 'Team deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteTeam = deleteTeam;
const updateTeamMembers = async (req, res) => {
    try {
        const team = await Team_1.default.findById(req.params.id);
        if (!team) {
            res.status(404).json({ message: 'Team not found' });
            return;
        }
        // Only admin or team manager can update members
        if (req.user.role !== 'admin' && team.manager.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized to manage team members' });
            return;
        }
        const { members } = req.body;
        team.members = members;
        await team.save();
        const populated = await Team_1.default.findById(team._id)
            .populate('manager', 'name email avatar')
            .populate('members', 'name email avatar role')
            .populate('createdBy', 'name email');
        await ActivityLog_1.default.create({
            action: 'Team members updated',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.USER,
            entityId: team._id,
            metadata: { teamName: team.name, memberCount: members.length },
        });
        res.json({ team: populated });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateTeamMembers = updateTeamMembers;
const requestJoinTeam = async (req, res) => {
    try {
        const team = await Team_1.default.findById(req.params.id);
        if (!team) {
            res.status(404).json({ message: 'Team not found' });
            return;
        }
        if (team.members.includes(req.user._id) || team.manager.toString() === req.user._id.toString()) {
            res.status(400).json({ message: 'Already a member of this team' });
            return;
        }
        if (team.joinRequests.includes(req.user._id)) {
            res.status(400).json({ message: 'Join request already sent' });
            return;
        }
        team.joinRequests.push(req.user._id);
        await team.save();
        const populated = await Team_1.default.findById(team._id)
            .populate('manager', 'name email avatar')
            .populate('members', 'name email avatar role')
            .populate('joinRequests', 'name email avatar role')
            .populate('createdBy', 'name email');
        res.json({ team: populated, message: 'Join request sent successfully.' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.requestJoinTeam = requestJoinTeam;
const approveJoinRequest = async (req, res) => {
    try {
        const team = await Team_1.default.findById(req.params.id);
        if (!team) {
            res.status(404).json({ message: 'Team not found' });
            return;
        }
        if (req.user.role !== 'admin' && team.manager.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized to approve join requests.' });
            return;
        }
        const userId = req.params.userId;
        const requestIndex = team.joinRequests.findIndex(id => id.toString() === userId);
        if (requestIndex === -1) {
            res.status(400).json({ message: 'Join request not found' });
            return;
        }
        team.joinRequests.splice(requestIndex, 1);
        if (!team.members.find(id => id.toString() === userId)) {
            //@ts-ignore
            team.members.push(userId);
        }
        await team.save();
        const populated = await Team_1.default.findById(team._id)
            .populate('manager', 'name email avatar')
            .populate('members', 'name email avatar role')
            .populate('joinRequests', 'name email avatar role')
            .populate('createdBy', 'name email');
        res.json({ team: populated, message: 'Request approved.' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.approveJoinRequest = approveJoinRequest;
const rejectJoinRequest = async (req, res) => {
    try {
        const team = await Team_1.default.findById(req.params.id);
        if (!team) {
            res.status(404).json({ message: 'Team not found' });
            return;
        }
        if (req.user.role !== 'admin' && team.manager.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized to reject join requests.' });
            return;
        }
        const userId = req.params.userId;
        const requestIndex = team.joinRequests.findIndex(id => id.toString() === userId);
        if (requestIndex === -1) {
            res.status(400).json({ message: 'Join request not found' });
            return;
        }
        team.joinRequests.splice(requestIndex, 1);
        await team.save();
        const populated = await Team_1.default.findById(team._id)
            .populate('manager', 'name email avatar')
            .populate('members', 'name email avatar role')
            .populate('joinRequests', 'name email avatar role')
            .populate('createdBy', 'name email');
        res.json({ team: populated, message: 'Request rejected.' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.rejectJoinRequest = rejectJoinRequest;
//# sourceMappingURL=teamController.js.map