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
exports.deleteTask = exports.updateTask = exports.getTask = exports.getTasks = exports.createTask = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const mongoose = mongoose_1.default;
const Task_1 = __importDefault(require("../models/Task"));
const Notification_1 = __importStar(require("../models/Notification"));
const ActivityLog_1 = __importStar(require("../models/ActivityLog"));
const createTask = async (req, res) => {
    try {
        const task = await Task_1.default.create({
            ...req.body,
            createdBy: req.user._id,
        });
        // Notify assigned user
        if (task.assignedTo.toString() !== req.user._id.toString()) {
            await Notification_1.default.create({
                user: task.assignedTo,
                type: Notification_1.NotificationType.TASK_ASSIGNED,
                title: 'New Task Assigned',
                message: `You have been assigned task: ${task.title}`,
                link: `/assignments/${task.assignment}/tasks/${task._id}`,
            });
        }
        await ActivityLog_1.default.create({
            action: 'Task created',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.TASK,
            entityId: task._id,
            metadata: { title: task.title },
        });
        const populated = await Task_1.default.findById(task._id)
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name email')
            .populate('assignment', 'title');
        res.status(201).json({ task: populated });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createTask = createTask;
const getTasks = async (req, res) => {
    try {
        const { assignment, status, priority, assignedTo, search } = req.query;
        const filter = {};
        if (assignment)
            filter.assignment = assignment;
        if (status)
            filter.status = status;
        if (priority)
            filter.priority = priority;
        if (assignedTo)
            filter.assignedTo = assignedTo;
        if (search) {
            filter.title = { $regex: search, $options: 'i' };
        }
        // Members only see their tasks
        if (req.user.role === 'member') {
            filter.assignedTo = req.user._id;
        }
        const tasks = await Task_1.default.find(filter)
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name email')
            .populate('assignment', 'title')
            .sort({ createdAt: -1 });
        res.json({ tasks });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getTasks = getTasks;
const getTask = async (req, res) => {
    try {
        const task = await Task_1.default.findById(req.params.id)
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name email')
            .populate('assignment', 'title')
            .populate('dependencies', 'title status');
        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }
        res.json({ task });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getTask = getTask;
const updateTask = async (req, res) => {
    try {
        const oldTask = await Task_1.default.findById(req.params.id);
        if (!oldTask) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }
        const task = await Task_1.default.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' })
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name email')
            .populate('assignment', 'title');
        // Notify on status change
        if (req.body.status && req.body.status !== oldTask.status) {
            // Notify assigned user
            await Notification_1.default.create({
                user: oldTask.assignedTo,
                type: Notification_1.NotificationType.STATUS_CHANGED,
                title: 'Task Status Updated',
                message: `Task "${oldTask.title}" status changed to ${req.body.status}`,
                link: `/assignments/${oldTask.assignment}/tasks/${oldTask._id}`,
            });
            // Notify task creator (manager) if someone else updated it
            if (req.user._id.toString() !== oldTask.createdBy.toString()) {
                await Notification_1.default.create({
                    user: oldTask.createdBy,
                    type: Notification_1.NotificationType.STATUS_CHANGED,
                    title: 'Task Status Updated',
                    message: `Task "${oldTask.title}" status changed to ${req.body.status} by ${req.user.name}`,
                    link: `/assignments/${oldTask.assignment}/tasks/${oldTask._id}`,
                });
            }
            // Notify assignment creator (admin) if they are different from task creator and updater
            const AssignmentModel = mongoose.model('Assignment');
            const assignment = await AssignmentModel.findById(oldTask.assignment);
            if (assignment &&
                assignment.createdBy.toString() !== oldTask.createdBy.toString() &&
                assignment.createdBy.toString() !== req.user._id.toString()) {
                await Notification_1.default.create({
                    user: assignment.createdBy,
                    type: Notification_1.NotificationType.STATUS_CHANGED,
                    title: 'Project Task Updated',
                    message: `Task "${oldTask.title}" in project "${assignment.title}" changed to ${req.body.status} by ${req.user.name}`,
                    link: `/assignments/${oldTask.assignment}/tasks/${oldTask._id}`,
                });
            }
        }
        // Notify on reassignment
        if (req.body.assignedTo && req.body.assignedTo !== oldTask.assignedTo.toString()) {
            await Notification_1.default.create({
                user: req.body.assignedTo,
                type: Notification_1.NotificationType.TASK_ASSIGNED,
                title: 'Task Assigned to You',
                message: `You have been assigned task: ${oldTask.title}`,
                link: `/assignments/${oldTask.assignment}/tasks/${oldTask._id}`,
            });
        }
        await ActivityLog_1.default.create({
            action: 'Task updated',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.TASK,
            entityId: oldTask._id,
            metadata: { updates: Object.keys(req.body) },
        });
        res.json({ task });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateTask = updateTask;
const deleteTask = async (req, res) => {
    try {
        const task = await Task_1.default.findByIdAndDelete(req.params.id);
        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }
        await ActivityLog_1.default.create({
            action: 'Task deleted',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.TASK,
            entityId: task._id,
            metadata: { title: task.title },
        });
        res.json({ message: 'Task deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteTask = deleteTask;
//# sourceMappingURL=taskController.js.map