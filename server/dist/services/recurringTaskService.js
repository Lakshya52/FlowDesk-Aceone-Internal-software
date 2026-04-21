"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startRecurringJob = exports.processTaskDeadlines = exports.processRecurringAssignments = void 0;
const Assignment_1 = __importDefault(require("../models/Assignment"));
const Task_1 = __importDefault(require("../models/Task"));
const notificationService_1 = require("./notificationService");
const Notification_1 = require("../models/Notification");
const processRecurringAssignments = async () => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Find all root recurring assignments
        // For simplicity, we assume an assignment with isRecurring: true and parentAssignmentId: null is a template/root
        const templates = await Assignment_1.default.find({
            isRecurring: true,
            parentAssignmentId: null,
            recurringStartDate: { $lte: new Date() }
        });
        for (const template of templates) {
            // Check if we already spawned an assignment for the current cycle
            const lastChild = await Assignment_1.default.findOne({
                parentAssignmentId: template._id
            }).sort({ startDate: -1 });
            let shouldSpawn = false;
            let nextStartDate = new Date(template.recurringStartDate);
            nextStartDate.setHours(0, 0, 0, 0);
            if (!lastChild) {
                // Never spawned before, and we are past or at start date
                if (nextStartDate <= today) {
                    shouldSpawn = true;
                }
            }
            else {
                // Calculate next date based on last child
                const lastDate = new Date(lastChild.startDate);
                lastDate.setHours(0, 0, 0, 0);
                nextStartDate = new Date(lastDate);
                if (template.recurringPattern === 'daily') {
                    nextStartDate.setDate(nextStartDate.getDate() + 1);
                }
                else if (template.recurringPattern === 'weekly') {
                    nextStartDate.setDate(nextStartDate.getDate() + 7);
                }
                else if (template.recurringPattern === 'monthly') {
                    nextStartDate.setMonth(nextStartDate.getMonth() + 1);
                }
                else if (template.recurringPattern === 'yearly') {
                    nextStartDate.setFullYear(nextStartDate.getFullYear() + 1);
                }
                // If nextStartDate is today or in the past, spawn it
                if (nextStartDate <= today) {
                    shouldSpawn = true;
                }
            }
            if (shouldSpawn) {
                // Calculate due date based on the duration of the template
                let newDueDate = null;
                if (template.startDate && template.dueDate) {
                    const templateStart = new Date(template.startDate);
                    const templateDue = new Date(template.dueDate);
                    // Only calculate if templateDue is valid and after templateStart
                    if (templateDue.getFullYear() > 1970) {
                        const durationMs = templateDue.getTime() - templateStart.getTime();
                        newDueDate = new Date(nextStartDate.getTime() + durationMs);
                    }
                }
                // Create new instance
                const newAssignment = new Assignment_1.default({
                    title: template.title,
                    clientName: template.clientName,
                    companyId: template.companyId,
                    description: template.description,
                    priority: template.priority,
                    status: 'not_started',
                    startDate: nextStartDate,
                    dueDate: newDueDate,
                    createdBy: template.createdBy,
                    team: template.team,
                    teams: template.teams,
                    isRecurring: false,
                    parentAssignmentId: template._id,
                });
                await newAssignment.save();
                // Clone tasks from template to new instance
                const templateTasks = await Task_1.default.find({ assignment: template._id });
                if (templateTasks.length > 0) {
                    const clonedTasks = templateTasks.map(t => ({
                        title: t.title,
                        description: t.description,
                        assignment: newAssignment._id,
                        assignedTo: t.assignedTo,
                        createdBy: t.createdBy,
                        dueDate: newDueDate, // Optionally set task due date to match assignment due date
                        priority: t.priority,
                        status: 'todo',
                        subtasks: t.subtasks.map(s => ({ title: s.title, completed: false })),
                        dependencies: [], // Reset dependencies for now as they relate to specific task IDs
                    }));
                    await Task_1.default.insertMany(clonedTasks);
                    console.log(`[Recurring] Cloned ${templateTasks.length} tasks to "${newAssignment.title}"`);
                }
                console.log(`[Recurring] Spawned new assignment "${newAssignment.title}" for date ${nextStartDate.toDateString()} from template ${template._id}`);
            }
        }
    }
    catch (error) {
        console.error('[Recurring] Error processing recurring assignments:', error);
    }
};
exports.processRecurringAssignments = processRecurringAssignments;
// Process tasks that are near deadline (24 hours)
const processTaskDeadlines = async () => {
    try {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        // Find tasks due within the next 24 hours that are NOT completed
        // Also check if they have already triggered the deadline notification (optional, but to avoid spam, we should probably record it. 
        // For now, let's keep it simple: just notify anything due between now and 24 hours from now)
        // A better approach is to check if it's due exactly between 23h and 24h from now to only run once per task.
        const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000);
        const soonTasks = await Task_1.default.find({
            dueDate: { $gte: in23Hours, $lte: tomorrow },
            status: { $ne: 'completed' },
            assignedTo: { $exists: true, $ne: null }
        }).populate('assignment', 'title');
        if (soonTasks.length > 0) {
            const payloads = soonTasks.map(task => ({
                user: task.assignedTo.toString(),
                type: Notification_1.NotificationType.DEADLINE_APPROACHING,
                title: 'Task Deadline Approaching',
                message: `Your task "${task.title}" is due in 24 hours.`,
                link: `/assignments/${task.assignment._id}?tab=tasks&taskId=${task._id}`
            }));
            await (0, notificationService_1.createNotifications)(payloads);
            console.log(`[Deadline Checker] Sent ${payloads.length} deadline notifications.`);
        }
    }
    catch (error) {
        console.error('[Deadline Checker] Error processing task deadlines:', error);
    }
};
exports.processTaskDeadlines = processTaskDeadlines;
// Start the background job
const startRecurringJob = () => {
    // Run once on start
    (0, exports.processRecurringAssignments)();
    (0, exports.processTaskDeadlines)();
    // Then run every hour
    setInterval(() => {
        (0, exports.processRecurringAssignments)();
        (0, exports.processTaskDeadlines)();
    }, 1000 * 60 * 60);
};
exports.startRecurringJob = startRecurringJob;
//# sourceMappingURL=recurringTaskService.js.map