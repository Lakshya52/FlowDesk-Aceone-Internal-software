import { Response } from 'express';
import mongooseLib from 'mongoose';
const mongoose = mongooseLib;
import Task from '../models/Task';
import Notification, { NotificationType } from '../models/Notification';
import ActivityLog, { EntityType } from '../models/ActivityLog';
import { AuthRequest } from '../middlewares/auth';

export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Sync project status to "In Progress" if it's currently "Not Started"
        const AssignmentModel = mongoose.model('Assignment');
        const assignment: any = await AssignmentModel.findById(req.body.assignment);
        
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

        const task = await Task.create({
            ...req.body,
            createdBy: req.user!._id,
        });

        if (assignment.status === 'not_started') {
            assignment.status = 'in_progress';
            await assignment.save();
        }

        // Notify assigned user
        if (task.assignedTo.toString() !== req.user!._id.toString()) {
            await Notification.create({
                user: task.assignedTo,
                type: NotificationType.TASK_ASSIGNED,
                title: 'New Task Assigned',
                message: `You have been assigned task: ${task.title}`,
                link: `/assignments/${task.assignment}?tab=tasks&taskId=${task._id}`,
            });
        }

        await ActivityLog.create({
            action: 'Task created',
            user: req.user!._id,
            entityType: EntityType.TASK,
            entityId: task._id,
            metadata: { title: task.title },
        });

        const populated = await Task.findById(task._id)
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name email')
            .populate('assignment', 'title');

        res.status(201).json({ task: populated });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { assignment: assignmentId, status, priority, assignedTo, search, companyId } = req.query;
        let andConditions: any[] = [];

        if (assignmentId) andConditions.push({ assignment: assignmentId });
        if (status) andConditions.push({ status: status });
        if (priority) andConditions.push({ priority: priority });
        if (assignedTo) andConditions.push({ assignedTo: assignedTo });
        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            // Search by task title OR by company name via assignment
            const AssignmentModel = (await import('../models/Assignment')).default;
            const CompanyModel = (await import('../models/Company')).default;
            const matchedCompany = await CompanyModel.findOne({ name: searchRegex });
            if (matchedCompany) {
                const companyAssignments = await AssignmentModel.find({ companyId: matchedCompany._id }).distinct('_id');
                andConditions.push({
                    $or: [
                        { title: searchRegex },
                        { assignment: { $in: companyAssignments } }
                    ]
                });
            } else {
                andConditions.push({ title: searchRegex });
            }
        }

        if (companyId) {
            const AssignmentModel = (await import('../models/Assignment')).default;
            const assignments = await AssignmentModel.find({ companyId }).distinct('_id');
            andConditions.push({ assignment: { $in: assignments } });
        }

        // Roles and permissions visibility enforcement
        if (req.user!.role === 'member') {
            // Employees see tasks assigned to them OR tasks in projects where they are in the team
            const AssignmentModel = (await import('../models/Assignment')).default;
            const myProjectIds = await AssignmentModel.find({ 
                $or: [
                    { team: req.user!._id },
                    { createdBy: req.user!._id }
                ]
            }).distinct('_id');

            andConditions.push({
                $or: [
                    { assignedTo: req.user!._id },
                    { assignment: { $in: myProjectIds } }
                ]
            });
        } else if (req.user!.role === 'manager') {
            // Managers see tasks in projects they manage OR projects they are part of
            const Team = (await import('../models/Team')).default;
            const AssignmentModel = (await import('../models/Assignment')).default;
            const managedTeams = await Team.find({ manager: req.user!._id }).distinct('_id');
            const myProjectIds = await AssignmentModel.find({
                $or: [
                    { createdBy: req.user!._id },
                    { teams: { $in: managedTeams } },
                    { team: req.user!._id }
                ]
            }).distinct('_id');

            andConditions.push({ assignment: { $in: myProjectIds } });
        }
        // Admins have no additional filters (see all)

        // Special handling for 'Under Review' filter
        if (status === 'review') {
            // Handled dynamically via `andConditions`
        }

        const filter = andConditions.length > 0 ? { $and: andConditions } : {};

        const tasks = await Task.find(filter)
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name email')
            .populate('assignment', 'title')
            .sort({ createdAt: -1 });

        res.json({ tasks });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name email')
            .populate('assignment', 'title')
            .populate('dependencies', 'title status');

        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        // Security check
        if (req.user!.role !== 'admin') {
            const AssignmentModel = (await import('../models/Assignment')).default;
            const assignment = await AssignmentModel.findById(task.assignment);
            
            const isMember = assignment?.team?.some((id: any) => id.toString() === req.user!._id.toString());
            const isManager = req.user!.role === 'manager'; // visibility handled at project level in reality, but for strictness:
            
            // If they are not in the team and not an admin/manager with project access
            if (!isMember && req.user!.role === 'member') {
                res.status(403).json({ message: 'Access denied' });
                return;
            }
        }

        res.json({ task });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const oldTask = await Task.findById(req.params.id);
        if (!oldTask) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        // Authorization check: Admin OR In Team OR Creator
        const AssignmentModel = mongoose.model('Assignment');
        const assignment: any = await AssignmentModel.findById(oldTask.assignment);
        const isProjectCreator = assignment?.createdBy.toString() === req.user!._id.toString();
        const isInProjectTeam = assignment?.team?.some((id: any) => id.toString() === req.user!._id.toString());
        
        if (req.user!.role !== 'admin' && !isProjectCreator && !isInProjectTeam) {
            res.status(403).json({ message: 'Insufficient permissions: You are not included in this project.' });
            return;
        }

        // Security check for status override
        if (req.user!.role === 'member') {
             // Member CANNOT set status to completed directly
             if (req.body.status === 'completed') {
                 req.body.status = 'review';
             }
        }
        
        // Everyone authorized above to update everything
        const userId = req.user!._id.toString();

        const task = await Task.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' })
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name email')
            .populate('assignment', 'title');

        // Notify on status change
        if (req.body.status && req.body.status !== oldTask.status) {
            // Notify assigned user
            await Notification.create({
                user: oldTask.assignedTo,
                type: NotificationType.STATUS_CHANGED,
                title: 'Task Status Updated',
                message: `Task "${oldTask.title}" status changed to ${req.body.status}`,
                link: `/assignments/${oldTask.assignment}?tab=tasks&taskId=${oldTask._id}`,
            });

            // Notify task creator (manager) if someone else updated it
            if (userId !== oldTask.createdBy.toString()) {
                await Notification.create({
                    user: oldTask.createdBy,
                    type: NotificationType.STATUS_CHANGED,
                    title: 'Task Status Updated',
                    message: `Task "${oldTask.title}" status changed to ${req.body.status} by ${req.user!.name}`,
                    link: `/assignments/${oldTask.assignment}?tab=tasks&taskId=${oldTask._id}`,
                });
            }
        }

        await ActivityLog.create({
            action: 'Task updated',
            user: req.user!._id,
            entityType: EntityType.TASK,
            entityId: oldTask._id,
            metadata: { updates: Object.keys(req.body), status: req.body.status },
        });

        res.json({ task });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        // Authorization check: Admin OR In Team OR Creator
        const AssignmentModel = mongoose.model('Assignment');
        const assignment: any = await AssignmentModel.findById(task.assignment);
        const isProjectCreator = assignment?.createdBy.toString() === req.user!._id.toString();
        const isInProjectTeam = assignment?.team?.some((id: any) => id.toString() === req.user!._id.toString());
        
        if (req.user!.role !== 'admin' && !isProjectCreator && !isInProjectTeam) {
            res.status(403).json({ message: 'Insufficient permissions: You are not included in this project.' });
            return;
        }

        await task.deleteOne();

        await ActivityLog.create({
            action: 'Task deleted',
            user: req.user!._id,
            entityType: EntityType.TASK,
            entityId: task._id,
            metadata: { title: task.title },
        });

        res.json({ message: 'Task deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
