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
            // Include both team manager and all members
            const teamInvites = teams.flatMap(t => [
                t.manager.toString(),
                ...t.members.map(m => m.toString())
            ]);
            allMemberIds = Array.from(new Set([...allMemberIds, ...teamInvites]));
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
            .populate('companyId', 'name industry')
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
        const { status, priority, search, companyId, isBlueprint } = req.query;
        const filter: any = {};

        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (companyId) filter.companyId = companyId;
        
        // Blueprint filtering
        if (isBlueprint === 'true') {
            filter.isRecurring = true;
            filter.parentAssignmentId = null;
        } else if (isBlueprint === 'false') {
            // Non-blueprint means: either not recurring OR has a parent assignment
            filter.$or = [
                { isRecurring: { $ne: true } },
                { parentAssignmentId: { $exists: true, $ne: null } }
            ];
        }
        
        let searchFilter: any = {};
        if (search) {
            searchFilter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { clientName: { $regex: search, $options: 'i' } },
            ];
        }

        let roleFilter: any = {};
        if (req.user!.role === 'member') {
            roleFilter.$or = [
                { team: req.user!._id },
                { createdBy: req.user!._id }
            ];
        } else if (req.user!.role === 'manager') {
            const Team = (await import('../models/Team')).default;
            const managedTeams = await Team.find({ manager: req.user!._id }).distinct('_id');
            roleFilter.$or = [
                { createdBy: req.user!._id },
                { teams: { $in: managedTeams } },
                { team: req.user!._id }
            ];
        } else {
            // Admin sees all
            roleFilter = {};
        }

        // Combine all filters using $and to avoid overwriting $or
        const finalFilter: any = { ...filter };
        const conditions = [];
        if (Object.keys(searchFilter).length > 0) conditions.push(searchFilter);
        if (Object.keys(roleFilter).length > 0) conditions.push(roleFilter);
        
        if (conditions.length > 0) {
            finalFilter.$and = conditions;
        }

        const assignments = await Assignment.find(finalFilter)
            .populate('createdBy', 'name email')
            .populate('team', 'name email avatar')
            .populate('companyId', 'name industry')
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
            .populate('companyId', 'name industry')
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

        // Authorization check: Admin OR In Team OR Creator
        const isCreator = assignment.createdBy.toString() === req.user!._id.toString();
        const isInTeam = assignment.team?.some((id: any) => id.toString() === req.user!._id.toString());
        
        if (req.user!.role !== 'admin' && !isCreator && !isInTeam) {
            res.status(403).json({ message: 'Insufficient permissions: You are not included in this project.' });
            return;
        }

        // Capture changes for detailed logging
        const changes: Record<string, { old: any, new: any }> = {};
        Object.keys(req.body).forEach(key => {
            const oldValue = (assignment as any)[key];
            const newValue = req.body[key];
            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                changes[key] = { old: oldValue, new: newValue };
            }
        });

        // Sanitize ObjectId fields: convert empty strings to null
        const sanitizedBody: any = { ...req.body };
        if (sanitizedBody.companyId === '') sanitizedBody.companyId = null;

        Object.assign(assignment, sanitizedBody);

        // Auto-assign Team Members if teams were updated or manual team list changed
        if (req.body.teams || req.body.team) {
            const teamIds = req.body.teams || assignment.teams;
            
            // Get the list of individual member IDs provided in the request
            // If not provided, fall back to current list (handle populated vs unpopulated)
            let manualMemberIds: string[] = [];
            if (req.body.team) {
                manualMemberIds = req.body.team.map((id: any) => id.toString());
            } else {
                manualMemberIds = (assignment.team || []).map((m: any) => 
                    (m._id || m).toString()
                );
            }

            let allMemberIds = [...manualMemberIds];

            if (teamIds && Array.isArray(teamIds) && teamIds.length > 0) {
                const Team = (await import('../models/Team')).default;
                const teams = await Team.find({ _id: { $in: teamIds } });
                
                // Include both team manager and all members
                const teamInvites = teams.flatMap(t => [
                    t.manager.toString(),
                    ...t.members.map(m => m.toString())
                ]);

                // Merge with manual IDs, but respect the fact that some might have been 
                // explicitly removed from the manual list (optional behavior)
                // For now, keep the policy: Team members ALWAYS have access.
                allMemberIds = Array.from(new Set([...allMemberIds, ...teamInvites]));
            }
            
            assignment.team = allMemberIds as any;
            assignment.teams = teamIds as any;
        }

        await assignment.save();

        const updated = await Assignment.findById(assignment._id)
            .populate('createdBy', 'name email')
            .populate('team', 'name email avatar')
            .populate('companyId', 'name industry')
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
            metadata: { 
                title: updated!.title,
                changes 
            },
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

        // Authorization check: Admin OR In Team OR Creator
        const isCreator = assignment.createdBy.toString() === req.user!._id.toString();
        const isInTeam = assignment.team?.some((id: any) => id.toString() === req.user!._id.toString());
        
        if (req.user!.role !== 'admin' && !isCreator && !isInTeam) {
            res.status(403).json({ message: 'Insufficient permissions: You are not included in this project.' });
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

export const updateAssignmentCanvas = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { canvasData } = req.body;

        const assignment = await Assignment.findById(id);

        if (!assignment) {
            res.status(404).json({ message: 'Assignment not found' });
            return;
        }

        // Everyone authorized to update canvas
        // (Removed role/creator/team check)

        const oldCanvasData = assignment.canvasData || [];
        const newCanvasData = canvasData || [];
        
        let changeSummary = 'Modified canvas';
        if (Array.isArray(oldCanvasData) && Array.isArray(newCanvasData)) {
            if (newCanvasData.length > oldCanvasData.length) changeSummary = 'Added note(s) to canvas';
            else if (newCanvasData.length < oldCanvasData.length) changeSummary = 'Removed note(s) from canvas';
            else changeSummary = 'Rearranged/Edited notes on canvas';
        }

        assignment.canvasData = canvasData;
        assignment.markModified('canvasData');
        await assignment.save();
        
        await ActivityLog.create({
            action: 'Canvas updated',
            user: req.user!._id,
            entityType: EntityType.ASSIGNMENT,
            entityId: assignment._id,
            metadata: { 
                summary: changeSummary,
                noteCount: newCanvasData.length,
                previousCount: oldCanvasData.length
            },
        });

        res.json({ success: true, message: 'Canvas data updated' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
