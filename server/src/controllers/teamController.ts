import { Response } from 'express';
import Team from '../models/Team';
import ActivityLog, { EntityType } from '../models/ActivityLog';
import { AuthRequest } from '../middlewares/auth';

export const createTeam = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const team = await Team.create({
            ...req.body,
            createdBy: req.user!._id,
        });

        await ActivityLog.create({
            action: 'Team created',
            user: req.user!._id,
            entityType: EntityType.USER,
            entityId: team._id,
            metadata: { teamName: team.name },
        });

        const populated = await Team.findById(team._id)
            .populate('manager', 'name email avatar')
            .populate('members', 'name email avatar role')
            .populate('createdBy', 'name email');

        res.status(201).json({ team: populated });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTeams = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const filter: any = {};

        // Managers only see their own teams
        if (req.user!.role === 'manager') {
            filter.manager = req.user!._id;
        }
        // Members see teams they belong to
        if (req.user!.role === 'member') {
            filter.members = req.user!._id;
        }

        const teams = await Team.find(filter)
            .populate('manager', 'name email avatar')
            .populate('members', 'name email avatar role')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.json({ teams });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTeam = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const team = await Team.findById(req.params.id)
            .populate('manager', 'name email avatar')
            .populate('members', 'name email avatar role')
            .populate('createdBy', 'name email');

        if (!team) {
            res.status(404).json({ message: 'Team not found' });
            return;
        }

        res.json({ team });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateTeam = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) {
            res.status(404).json({ message: 'Team not found' });
            return;
        }

        // Only admin or team manager can update
        if (req.user!.role !== 'admin' && team.manager.toString() !== req.user!._id.toString()) {
            res.status(403).json({ message: 'Not authorized to update this team' });
            return;
        }

        const updated = await Team.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' })
            .populate('manager', 'name email avatar')
            .populate('members', 'name email avatar role')
            .populate('createdBy', 'name email');

        await ActivityLog.create({
            action: 'Team updated',
            user: req.user!._id,
            entityType: EntityType.USER,
            entityId: team._id,
            metadata: { teamName: team.name, updates: Object.keys(req.body) },
        });

        res.json({ team: updated });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteTeam = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const team = await Team.findByIdAndDelete(req.params.id);
        if (!team) {
            res.status(404).json({ message: 'Team not found' });
            return;
        }

        await ActivityLog.create({
            action: 'Team deleted',
            user: req.user!._id,
            entityType: EntityType.USER,
            entityId: team._id,
            metadata: { teamName: team.name },
        });

        res.json({ message: 'Team deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateTeamMembers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) {
            res.status(404).json({ message: 'Team not found' });
            return;
        }

        // Only admin or team manager can update members
        if (req.user!.role !== 'admin' && team.manager.toString() !== req.user!._id.toString()) {
            res.status(403).json({ message: 'Not authorized to manage team members' });
            return;
        }

        const { members } = req.body;
        team.members = members;
        await team.save();

        const populated = await Team.findById(team._id)
            .populate('manager', 'name email avatar')
            .populate('members', 'name email avatar role')
            .populate('createdBy', 'name email');

        await ActivityLog.create({
            action: 'Team members updated',
            user: req.user!._id,
            entityType: EntityType.USER,
            entityId: team._id,
            metadata: { teamName: team.name, memberCount: members.length },
        });

        res.json({ team: populated });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
