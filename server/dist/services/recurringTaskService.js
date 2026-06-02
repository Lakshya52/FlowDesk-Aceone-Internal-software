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
        const now = new Date();
        // Find all root recurring assignments where recurringStartDate has been reached
        const templates = await Assignment_1.default.find({
            isRecurring: true,
            parentAssignmentId: null,
        });
        for (const template of templates) {
            if (template.recurringPattern === 'daily') {
                await processDailyTemplate(template, now);
            }
            // weekly, monthly, yearly — coming soon
        }
    }
    catch (error) {
        console.error('[Recurring] Error processing recurring assignments:', error);
    }
};
exports.processRecurringAssignments = processRecurringAssignments;
const processDailyTemplate = async (template, now) => {
    // Parse recurringTime (e.g. "09:30"), default to "00:00"
    const [hours, minutes] = (template.recurringTime || '00:00').split(':').map(Number);
    // Build start-of-day for recurringStartDate
    const recurringStart = new Date(template.recurringStartDate);
    recurringStart.setHours(0, 0, 0, 0);
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);
    // Don't process if recurringStartDate is in the future
    if (recurringStart > todayMidnight) {
        console.log(`[Recurring Daily] "${template.title}" starts on ${recurringStart.toDateString()}, skipping.`);
        return;
    }
    // Find the last spawned instance
    const lastChild = await Assignment_1.default.findOne({
        parentAssignmentId: template._id,
        isRecurring: false,
    }).sort({ startDate: -1 });
    let shouldSpawn = false;
    let nextSpawnTime;
    if (!lastChild) {
        // First instance — scheduled time is recurringStartDate + recurringTime
        nextSpawnTime = new Date(recurringStart);
        nextSpawnTime.setHours(hours, minutes, 0, 0);
        if (now >= nextSpawnTime) {
            shouldSpawn = true;
        }
    }
    else {
        // Next instance = last spawn date + 24 hours, at the same time
        const lastSpawnDate = new Date(lastChild.startDate);
        nextSpawnTime = new Date(lastSpawnDate);
        nextSpawnTime.setDate(nextSpawnTime.getDate() + 1);
        nextSpawnTime.setHours(hours, minutes, 0, 0);
        if (now >= nextSpawnTime) {
            shouldSpawn = true;
        }
    }
    if (!shouldSpawn) {
        console.log(`[Recurring Daily] "${template.title}" next spawn at ${nextSpawnTime.toISOString()}, not yet.`);
        return;
    }
    // Create the new instance
    const newAssignment = new Assignment_1.default({
        title: template.title,
        clientName: template.clientName,
        companyId: template.companyId,
        description: template.description,
        priority: template.priority,
        status: 'not_started',
        startDate: nextSpawnTime,
        dueDate: null,
        createdBy: template.createdBy,
        team: template.team,
        teams: template.teams,
        isRecurring: false,
        parentAssignmentId: template._id,
    });
    await newAssignment.save();
    // Clone tasks from template
    const templateTasks = await Task_1.default.find({ assignment: template._id });
    if (templateTasks.length > 0) {
        const clonedTasks = templateTasks.map((t) => ({
            title: t.title,
            description: t.description,
            assignment: newAssignment._id,
            assignedTo: t.assignedTo,
            createdBy: t.createdBy,
            dueDate: null,
            priority: t.priority,
            status: 'todo',
            subtasks: t.subtasks.map((s) => ({ title: s.title, completed: false })),
            dependencies: [],
        }));
        await Task_1.default.insertMany(clonedTasks);
        console.log(`[Recurring Daily] Cloned ${templateTasks.length} tasks to "${newAssignment.title}"`);
    }
    console.log(`[Recurring Daily] Spawned "${newAssignment.title}" at ${nextSpawnTime.toISOString()}`);
};
// Process tasks that are near deadline (24 hours)
const processTaskDeadlines = async () => {
    try {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000);
        const soonTasks = await Task_1.default.find({
            dueDate: { $gte: in23Hours, $lte: tomorrow },
            status: { $ne: 'completed' },
            assignedTo: { $exists: true, $ne: null }
        }).populate('assignment', 'title');
        if (soonTasks.length > 0) {
            const payloads = soonTasks.map((task) => ({
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
    // Run once on server start
    (0, exports.processRecurringAssignments)();
    (0, exports.processTaskDeadlines)();
    // Run every hour — fine for daily pattern since we check exact timestamps
    // For daily: spawns only when `now >= nextSpawnTime`, so no duplicates
    setInterval(() => {
        (0, exports.processRecurringAssignments)();
        (0, exports.processTaskDeadlines)();
    }, 1000 * 60 * 60);
};
exports.startRecurringJob = startRecurringJob;
//# sourceMappingURL=recurringTaskService.js.map