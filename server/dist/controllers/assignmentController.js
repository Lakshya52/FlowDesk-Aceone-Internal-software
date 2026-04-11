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
exports.deleteAssignment = exports.updateAssignment = exports.getAssignment = exports.getAssignments = exports.createAssignment = void 0;
const Assignment_1 = __importDefault(require("../models/Assignment"));
const ActivityLog_1 = __importStar(require("../models/ActivityLog"));
const createAssignment = async (req, res) => {
    try {
        const { teams: teamIds, team: memberIds = [], ...rest } = req.body;
        let allMemberIds = [...memberIds];
        if (teamIds && Array.isArray(teamIds) && teamIds.length > 0) {
            const Team = (await Promise.resolve().then(() => __importStar(require('../models/Team')))).default;
            const teams = await Team.find({ _id: { $in: teamIds } });
            // Include both team manager and all members
            const teamInvites = teams.flatMap(t => [
                t.manager.toString(),
                ...t.members.map(m => m.toString())
            ]);
            allMemberIds = Array.from(new Set([...allMemberIds, ...teamInvites]));
        }
        const assignment = await Assignment_1.default.create({
            ...rest,
            teams: teamIds,
            team: allMemberIds,
            createdBy: req.user._id,
        });
        await ActivityLog_1.default.create({
            action: 'Assignment created',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.ASSIGNMENT,
            entityId: assignment._id,
            metadata: { title: assignment.title },
        });
        const populated = await Assignment_1.default.findById(assignment._id)
            .populate('createdBy', 'name email')
            .populate('team', 'name email avatar')
            .populate({
            path: 'teams',
            populate: [
                { path: 'manager', select: 'name email avatar' },
                { path: 'members', select: 'name email avatar role' },
            ],
        });
        res.status(201).json({ assignment: populated });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createAssignment = createAssignment;
const getAssignments = async (req, res) => {
    try {
        const { status, priority, search } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        if (priority)
            filter.priority = priority;
        let searchFilter = {};
        if (search) {
            searchFilter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { clientName: { $regex: search, $options: 'i' } },
            ];
        }
        let roleFilter = {};
        if (req.user.role === 'member') {
            roleFilter.$or = [
                { team: req.user._id },
                { createdBy: req.user._id }
            ];
        }
        else if (req.user.role === 'manager') {
            const Team = (await Promise.resolve().then(() => __importStar(require('../models/Team')))).default;
            const managedTeams = await Team.find({ manager: req.user._id }).distinct('_id');
            roleFilter.$or = [
                { createdBy: req.user._id },
                { teams: { $in: managedTeams } },
                { team: req.user._id }
            ];
        }
        // Combine all filters using $and to avoid overwriting $or
        const finalFilter = { ...filter };
        const conditions = [];
        if (Object.keys(searchFilter).length > 0)
            conditions.push(searchFilter);
        if (Object.keys(roleFilter).length > 0)
            conditions.push(roleFilter);
        if (conditions.length > 0) {
            finalFilter.$and = conditions;
        }
        const assignments = await Assignment_1.default.find(finalFilter)
            .populate('createdBy', 'name email')
            .populate('team', 'name email avatar')
            .populate({
            path: 'teams',
            populate: [
                { path: 'manager', select: 'name email avatar' },
                { path: 'members', select: 'name email avatar role' },
            ],
        })
            .sort({ createdAt: -1 });
        res.json({ assignments });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAssignments = getAssignments;
const getAssignment = async (req, res) => {
    try {
        const assignment = await Assignment_1.default.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('team', 'name email avatar')
            .populate({
            path: 'teams',
            populate: [
                { path: 'manager', select: 'name email avatar' },
                { path: 'members', select: 'name email avatar role' },
            ],
        });
        if (!assignment) {
            res.status(404).json({ message: 'Assignment not found' });
            return;
        }
        res.json({ assignment });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAssignment = getAssignment;
const updateAssignment = async (req, res) => {
    try {
        const assignment = await Assignment_1.default.findById(req.params.id);
        if (!assignment) {
            res.status(404).json({ message: 'Assignment not found' });
            return;
        }
        // Only admin or creator can update
        if (req.user.role !== 'admin' && assignment.createdBy.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized to update this assignment' });
            return;
        }
        Object.assign(assignment, req.body);
        // Auto-assign Team Members if teams were updated
        if (req.body.teams || req.body.team) {
            let allMemberIds = [...(req.body.team || assignment.team.map((id) => id.toString()))];
            const teamIds = req.body.teams || assignment.teams;
            if (teamIds && Array.isArray(teamIds) && teamIds.length > 0) {
                const Team = (await Promise.resolve().then(() => __importStar(require('../models/Team')))).default;
                const teams = await Team.find({ _id: { $in: teamIds } });
                // Include both team manager and all members
                const teamInvites = teams.flatMap(t => [
                    t.manager.toString(),
                    ...t.members.map(m => m.toString())
                ]);
                allMemberIds = Array.from(new Set([...allMemberIds, ...teamInvites]));
            }
            assignment.team = allMemberIds;
            assignment.teams = teamIds;
        }
        await assignment.save();
        const updated = await Assignment_1.default.findById(assignment._id)
            .populate('createdBy', 'name email')
            .populate('team', 'name email avatar')
            .populate({
            path: 'teams',
            populate: [
                { path: 'manager', select: 'name email avatar' },
                { path: 'members', select: 'name email avatar role' },
            ],
        });
        await ActivityLog_1.default.create({
            action: 'Assignment updated',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.ASSIGNMENT,
            entityId: updated._id,
            metadata: { updates: Object.keys(req.body) },
        });
        res.json({ assignment: updated });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateAssignment = updateAssignment;
const deleteAssignment = async (req, res) => {
    try {
        console.log(`🗑️ Attempting to delete assignment: ${req.params.id} by user: ${req.user?._id}`);
        const assignment = await Assignment_1.default.findById(req.params.id);
        if (!assignment) {
            res.status(404).json({ message: 'Assignment not found' });
            return;
        }
        // Only admin or creator can delete
        if (req.user.role !== 'admin' && assignment.createdBy.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized to delete this assignment' });
            return;
        }
        await assignment.deleteOne();
        await ActivityLog_1.default.create({
            action: 'Assignment deleted',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.ASSIGNMENT,
            entityId: assignment._id,
            metadata: { title: assignment.title },
        });
        res.json({ message: 'Assignment deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteAssignment = deleteAssignment;
//# sourceMappingURL=assignmentController.js.map