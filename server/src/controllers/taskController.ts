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
        const { assignment, status, priority, assignedTo, search } = req.query;
        const filter: any = {};

        if (assignment) filter.assignment = assignment;
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (assignedTo) filter.assignedTo = assignedTo;
        if (search) {
            filter.title = { $regex: search, $options: 'i' };
        }

        // Members only see their tasks
        if (req.user!.role === 'member') {
            filter.assignedTo = req.user!._id;
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
            if (req.user!._id.toString() !== oldTask.createdBy.toString()) {
                await Notification.create({
                    user: oldTask.createdBy,
                    type: NotificationType.STATUS_CHANGED,
                    title: 'Task Status Updated',
                    message: `Task "${oldTask.title}" status changed to ${req.body.status} by ${req.user!.name}`,
                    link: `/assignments/${oldTask.assignment}/tasks/${oldTask._id}`,
                });
            }

            // Notify assignment creator (admin) if they are different from task creator and updater
            const AssignmentModel = mongoose.model('Assignment');
            const assignment = await AssignmentModel.findById(oldTask.assignment);
            if (assignment &&
                assignment.createdBy.toString() !== oldTask.createdBy.toString() &&
                assignment.createdBy.toString() !== req.user!._id.toString()) {
                await Notification.create({
                    user: assignment.createdBy,
                    type: NotificationType.STATUS_CHANGED,
                    title: 'Project Task Updated',
                    message: `Task "${oldTask.title}" in project "${assignment.title}" changed to ${req.body.status} by ${req.user!.name}`,
                    link: `/assignments/${oldTask.assignment}/tasks/${oldTask._id}`,
                });
            }
        }

        // Notify on reassignment
        if (req.body.assignedTo && req.body.assignedTo !== oldTask.assignedTo.toString()) {
            await Notification.create({
                user: req.body.assignedTo,
                type: NotificationType.TASK_ASSIGNED,
                title: 'Task Assigned to You',
                message: `You have been assigned task: ${oldTask.title}`,
                link: `/assignments/${oldTask.assignment}/tasks/${oldTask._id}`,
            });
        }

        await ActivityLog.create({
            action: 'Task updated',
            user: req.user!._id,
            entityType: EntityType.TASK,
            entityId: oldTask._id,
            metadata: { updates: Object.keys(req.body) },
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
