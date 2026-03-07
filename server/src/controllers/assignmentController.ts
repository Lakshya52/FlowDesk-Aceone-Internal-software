import { Response } from 'express';
import Assignment from '../models/Assignment';
import ActivityLog, { EntityType } from '../models/ActivityLog';
import { AuthRequest } from '../middlewares/auth';

export const createAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { teams: teamIds, team: memberIds = [], ...rest } = req.body;

        let allMemberIds = [...memberIds];

        if (teamIds && Array.isArray(teamIds) && teamIds.length > 0) {
            const Team = (await import('../models/Team')).default;
            const teams = await Team.find({ _id: { $in: teamIds } });
            const teamMemberIds = teams.flatMap(t => t.members.map(m => m.toString()));
            allMemberIds = Array.from(new Set([...allMemberIds, ...teamMemberIds]));
        }

        const assignment = await Assignment.create({
            ...rest,
            teams: teamIds,
            team: allMemberIds,
            createdBy: req.user!._id,
        });

        await ActivityLog.create({
            action: 'Assignment created',
            user: req.user!._id,
            entityType: EntityType.ASSIGNMENT,
            entityId: assignment._id,
            metadata: { title: assignment.title },
        });

        const populated = await Assignment.findById(assignment._id)
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
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAssignments = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { status, priority, search } = req.query;
        const filter: any = {};

        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { clientName: { $regex: search, $options: 'i' } },
            ];
        }

        // Members only see assignments they're on
        if (req.user!.role === 'member') {
            filter.team = req.user!._id;
        }

        const assignments = await Assignment.find(filter)
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
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const assignment = await Assignment.findById(req.params.id)
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
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const assignment = await Assignment.findById(req.params.id);

        if (!assignment) {
            res.status(404).json({ message: 'Assignment not found' });
            return;
        }

        // Only admin or creator can update
        if (req.user!.role !== 'admin' && assignment.createdBy.toString() !== req.user!._id.toString()) {
            res.status(403).json({ message: 'Not authorized to update this assignment' });
            return;
        }

        Object.assign(assignment, req.body);

        // Auto-assign Team Members if teams were updated
        if (req.body.teams || req.body.team) {
            let allMemberIds = [...(req.body.team || assignment.team.map((id: any) => id.toString()))];
            const teamIds = req.body.teams || assignment.teams;

            if (teamIds && Array.isArray(teamIds) && teamIds.length > 0) {
                const Team = (await import('../models/Team')).default;
                const teams = await Team.find({ _id: { $in: teamIds } });
                const teamMemberIds = teams.flatMap(t => t.members.map(m => m.toString()));
                allMemberIds = Array.from(new Set([...allMemberIds, ...teamMemberIds]));
            }
            assignment.team = allMemberIds as any;
            assignment.teams = teamIds as any;
        }

        await assignment.save();

        const updated = await Assignment.findById(assignment._id)
            .populate('createdBy', 'name email')
            .populate('team', 'name email avatar')
            .populate({
                path: 'teams',
                populate: [
                    { path: 'manager', select: 'name email avatar' },
                    { path: 'members', select: 'name email avatar role' },
                ],
            });

        await ActivityLog.create({
            action: 'Assignment updated',
            user: req.user!._id,
            entityType: EntityType.ASSIGNMENT,
            entityId: updated!._id,
            metadata: { updates: Object.keys(req.body) },
        });

        res.json({ assignment: updated });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        console.log(`🗑️ Attempting to delete assignment: ${req.params.id} by user: ${req.user?._id}`);
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) {
            res.status(404).json({ message: 'Assignment not found' });
            return;
        }

        // Only admin or creator can delete
        if (req.user!.role !== 'admin' && assignment.createdBy.toString() !== req.user!._id.toString()) {
            res.status(403).json({ message: 'Not authorized to delete this assignment' });
            return;
        }

        await assignment.deleteOne();

        await ActivityLog.create({
            action: 'Assignment deleted',
            user: req.user!._id,
            entityType: EntityType.ASSIGNMENT,
            entityId: assignment._id,
            metadata: { title: assignment.title },
        });

        res.json({ message: 'Assignment deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
