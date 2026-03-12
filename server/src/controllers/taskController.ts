import { Response } from 'express';
import mongooseLib from 'mongoose';
const mongoose = mongooseLib;
import Task from '../models/Task';
import Notification, { NotificationType } from '../models/Notification';
import ActivityLog, { EntityType } from '../models/ActivityLog';
import { AuthRequest } from '../middlewares/auth';

export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const task = await Task.create({
            ...req.body,
            createdBy: req.user!._id,
        });

        // Sync project status to "In Progress" if it's currently "Not Started"
        const AssignmentModel = mongoose.model('Assignment');
        const assignment = await AssignmentModel.findById(task.assignment);
        if (assignment && assignment.status === 'not_started') {
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
                link: `/assignments/${task.assignment}/tasks/${task._id}`,
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
        const { assignment: assignmentId, status, priority, assignedTo, search } = req.query;
        const filter: any = {};

        if (assignmentId) filter.assignment = assignmentId;
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (assignedTo) filter.assignedTo = assignedTo;
        if (search) {
            filter.title = { $regex: search, $options: 'i' };
        }

        // Roles and permissions
        if (req.user!.role === 'member') {
            if (assignmentId) {
                const AssignmentModel = mongoose.model('Assignment');
                const assignment = await AssignmentModel.findById(assignmentId);
                const isPartOfTeam = assignment?.team?.some((id: any) => id.toString() === req.user!._id.toString());
                
                if (!isPartOfTeam) {
                    filter.assignedTo = req.user!._id;
                }
            } else {
                filter.assignedTo = req.user!._id;
            }
        }

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

        const userRole = req.user!.role;
        const userId = req.user!._id.toString();

        // Permission check
        if (userRole === 'member') {
            // Member can only update tasks assigned to them
            if (oldTask.assignedTo.toString() !== userId) {
                res.status(403).json({ message: 'You can only update tasks assigned to you.' });
                return;
            }
            // Member can only update status or spent time/subtasks
            const allowedUpdates = ['status', 'timeSpent', 'subtasks'];
            const updates = Object.keys(req.body);
            const isAllowed = updates.every(u => allowedUpdates.includes(u));
            if (!isAllowed) {
                res.status(403).json({ message: 'You only have permission to update task status and progress.' });
                return;
            }
        }

        // Completion workflow: If member marks as completed, set to review
        if (userRole === 'member' && req.body.status === 'completed') {
            req.body.status = 'review';
        }

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
                link: `/assignments/${oldTask.assignment}/tasks/${oldTask._id}`,
            });

            // Notify task creator (manager) if someone else updated it
            if (userId !== oldTask.createdBy.toString()) {
                await Notification.create({
                    user: oldTask.createdBy,
                    type: NotificationType.STATUS_CHANGED,
                    title: 'Task Status Updated',
                    message: `Task "${oldTask.title}" status changed to ${req.body.status} by ${req.user!.name}`,
                    link: `/assignments/${oldTask.assignment}/tasks/${oldTask._id}`,
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
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

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
