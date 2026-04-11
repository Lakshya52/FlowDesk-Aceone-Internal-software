"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportReport = exports.getActivityReport = exports.getWorkloadReport = exports.getEmployeeTrackingReport = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Task_1 = __importDefault(require("../models/Task"));
const ActivityLog_1 = __importDefault(require("../models/ActivityLog"));
const Attachment_1 = __importDefault(require("../models/Attachment"));
const Team_1 = __importDefault(require("../models/Team"));
const User_1 = __importDefault(require("../models/User"));
const exceljs_1 = __importDefault(require("exceljs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
/**
 * Helper to get role-based constraints and shared filters
 */
const getBaseFilters = async (req) => {
    const userRole = req.user.role;
    const userId = req.user._id;
    const { teamId, employeeId, projectId, status, startDate, endDate } = req.query;
    let userFilter = {};
    let teamFilter = {};
    let assignmentFilter = {};
    let taskMatch = {};
    // 1. Role-based scoping
    if (userRole === 'member') {
        userFilter._id = userId;
        teamFilter.members = userId;
        assignmentFilter.team = userId;
        taskMatch.assignedTo = userId;
    }
    else if (userRole === 'manager') {
        const managedTeams = await Team_1.default.find({ manager: userId }).distinct('_id');
        const managedMembers = await Team_1.default.find({ manager: userId }).distinct('members');
        if (teamId) {
            teamFilter._id = new mongoose_1.default.Types.ObjectId(teamId);
            const team = await Team_1.default.findById(teamId);
            userFilter._id = { $in: team?.members || [] };
        }
        else {
            teamFilter._id = { $in: managedTeams };
            userFilter._id = { $in: managedMembers };
        }
        assignmentFilter.$or = [
            { createdBy: userId },
            { teams: { $in: managedTeams } }
        ];
    }
    else if (userRole === 'admin') {
        if (teamId) {
            teamFilter._id = new mongoose_1.default.Types.ObjectId(teamId);
        }
        if (employeeId) {
            userFilter._id = new mongoose_1.default.Types.ObjectId(employeeId);
        }
    }
    // 2. Query-based filters
    if (status)
        taskMatch.status = status;
    if (projectId)
        taskMatch.assignment = new mongoose_1.default.Types.ObjectId(projectId);
    if (employeeId)
        taskMatch.assignedTo = new mongoose_1.default.Types.ObjectId(employeeId);
    if (startDate && endDate) {
        taskMatch.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }
    return { userFilter, teamFilter, assignmentFilter, taskMatch };
};
const getEmployeeTrackingReport = async (req, res) => {
    try {
        const { taskMatch } = await getBaseFilters(req);
        const employeeAggregation = await Task_1.default.aggregate([
            { $match: taskMatch },
            {
                $group: {
                    _id: '$assignedTo',
                    tasks: { $push: '$_id' },
                    assignments: { $addToSet: '$assignment' },
                    activeDays: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } } }
                }
            },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            {
                $project: {
                    name: '$user.name',
                    avatar: '$user.avatar',
                    taskCount: { $size: '$tasks' },
                    assignmentCount: { $size: '$assignments' },
                    activeDaysCount: { $size: '$activeDays' }
                }
            },
            { $sort: { activeDaysCount: -1, taskCount: -1 } }
        ]);
        const totalEmployees = employeeAggregation.length;
        const totals = await Task_1.default.aggregate([
            { $match: taskMatch },
            {
                $group: {
                    _id: null,
                    uniqueAssignments: { $addToSet: '$assignment' },
                    totalTasks: { $sum: 1 }
                }
            }
        ]);
        const overallTotalAssignments = totals[0]?.uniqueAssignments.length || 0;
        const overallTotalTasks = totals[0]?.totalTasks || 0;
        const avgActiveDays = totalEmployees > 0
            ? Math.round(employeeAggregation.reduce((acc, curr) => acc + curr.activeDaysCount, 0) / totalEmployees)
            : 0;
        const dailyTrends = await Task_1.default.aggregate([
            { $match: taskMatch },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
                    tasksHandled: { $sum: 1 },
                    uniqueEmployees: { $addToSet: '$assignedTo' }
                }
            },
            { $project: { _id: 1, tasksHandled: 1, activeEmployees: { $size: '$uniqueEmployees' } } },
            { $sort: { _id: 1 } },
            { $limit: 30 }
        ]);
        res.json({
            data: {
                employeeStats: employeeAggregation,
                overallStats: {
                    totalEmployees,
                    totalAssignments: overallTotalAssignments,
                    totalTasks: overallTotalTasks,
                    avgActiveDays
                },
                dailyTrends
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getEmployeeTrackingReport = getEmployeeTrackingReport;
const getWorkloadReport = async (req, res) => {
    try {
        const { taskMatch, userFilter } = await getBaseFilters(req);
        // Filter for active tasks unless status is explicitly requested as 'completed'
        const activeTaskMatch = { ...taskMatch };
        if (!activeTaskMatch.status) {
            activeTaskMatch.status = { $ne: 'completed' };
        }
        const workloadDistribution = await Task_1.default.aggregate([
            { $match: activeTaskMatch },
            {
                $group: {
                    _id: '$assignedTo',
                    taskCount: { $sum: 1 },
                    urgentCount: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } }
                }
            },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $project: { name: '$user.name', taskCount: 1, urgentCount: 1 } },
            { $sort: { taskCount: -1 } }
        ]);
        const totalEmployees = await User_1.default.countDocuments(userFilter);
        // Actual Heatmap logic for the last 28 days
        const twentyEightDaysAgo = new Date();
        twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
        const heatmapRaw = await Task_1.default.aggregate([
            { $match: { ...taskMatch, updatedAt: { $gte: twentyEightDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
                    tasks: { $sum: 1 }
                }
            }
        ]);
        res.json({
            data: {
                workloadDistribution,
                totalEmployees,
                heatmapRaw
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getWorkloadReport = getWorkloadReport;
const getActivityReport = async (req, res) => {
    try {
        const { taskMatch, assignmentFilter } = await getBaseFilters(req);
        // Attachment Activity
        const fileCountPerProject = await Attachment_1.default.aggregate([
            { $match: { assignment: { $exists: true } } },
            { $group: { _id: '$assignment', fileCount: { $sum: 1 } } },
            { $lookup: { from: 'assignments', localField: '_id', foreignField: '_id', as: 'project' } },
            { $unwind: '$project' },
            { $project: { title: '$project.title', fileCount: 1 } },
            { $sort: { fileCount: -1 } },
            { $limit: 10 }
        ]);
        // Activity Logs
        const activityDistribution = await ActivityLog_1.default.aggregate([
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 }
        ]);
        const recentActivities = await ActivityLog_1.default.find()
            .populate('user', 'name avatar')
            .sort({ createdAt: -1 })
            .limit(15);
        const totalActivities = await ActivityLog_1.default.countDocuments();
        res.json({
            data: {
                fileCountPerProject,
                activityDistribution,
                recentActivities,
                totalActivities
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getActivityReport = getActivityReport;
const exportReport = async (req, res) => {
    try {
        const { type, reportType } = req.query;
        if (!type || !reportType) {
            res.status(400).json({ message: 'Missing type or reportType query parameters' });
            return;
        }
        const { taskMatch } = await getBaseFilters(req);
        let dataToExport = [];
        let columns = [];
        if (reportType === 'employee') {
            const employeeAggregation = await Task_1.default.aggregate([
                { $match: taskMatch },
                {
                    $group: {
                        _id: '$assignedTo',
                        tasks: { $push: '$_id' },
                        assignments: { $addToSet: '$assignment' },
                        activeDays: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } } }
                    }
                },
                { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
                { $unwind: '$user' },
                {
                    $project: {
                        name: '$user.name',
                        taskCount: { $size: '$tasks' },
                        assignmentCount: { $size: '$assignments' },
                        activeDaysCount: { $size: '$activeDays' }
                    }
                },
                { $sort: { activeDaysCount: -1, taskCount: -1 } }
            ]);
            dataToExport = employeeAggregation;
            columns = [
                { header: 'Employee', key: 'name', width: 30 },
                { header: 'Assignments Worked On', key: 'assignmentCount', width: 25 },
                { header: 'Tasks Handled', key: 'taskCount', width: 20 },
                { header: 'Active Days', key: 'activeDaysCount', width: 20 }
            ];
        }
        else if (reportType === 'workload') {
            dataToExport = await Task_1.default.aggregate([
                { $match: taskMatch },
                { $group: { _id: '$assignedTo', taskCount: { $sum: 1 } } },
                { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
                { $unwind: '$user' },
                { $project: { name: '$user.name', taskCount: 1 } }
            ]);
            columns = [
                { header: 'Employee Name', key: 'name', width: 30 },
                { header: 'Task Count', key: 'taskCount', width: 15 }
            ];
        }
        else if (reportType === 'activity') {
            dataToExport = await ActivityLog_1.default.aggregate([
                { $group: { _id: '$action', count: { $sum: 1 } } }
            ]);
            columns = [
                { header: 'Action', key: '_id', width: 30 },
                { header: 'Count', key: 'count', width: 15 }
            ];
        }
        else {
            const tasks = await Task_1.default.find(taskMatch).populate('assignedTo', 'name').populate('assignment', 'title').lean();
            dataToExport = tasks.map((t) => ({
                title: t.title,
                status: t.status,
                priority: t.priority,
                assignedTo: t.assignedTo?.name || 'Unassigned',
                project: t.assignment?.title || 'No Project'
            }));
            columns = [
                { header: 'Task Title', key: 'title', width: 40 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Priority', key: 'priority', width: 15 },
                { header: 'Assigned To', key: 'assignedTo', width: 25 },
                { header: 'Project', key: 'project', width: 30 }
            ];
        }
        const filename = `report_${reportType}_${Date.now()}`;
        if (type === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
            const headerRow = columns.map(c => c.header).join(',');
            const rows = dataToExport.map(row => columns.map(c => {
                const val = row[c.key] !== undefined ? row[c.key] : '';
                return `"${String(val).replace(/"/g, '""')}"`;
            }).join(','));
            res.send([headerRow, ...rows].join('\n'));
            return;
        }
        if (type === 'excel') {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
            const workbook = new exceljs_1.default.Workbook();
            const worksheet = workbook.addWorksheet('Report');
            worksheet.columns = columns;
            dataToExport.forEach(row => worksheet.addRow(row));
            await workbook.xlsx.write(res);
            res.end();
            return;
        }
        if (type === 'pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
            const doc = new pdfkit_1.default({ margin: 30 });
            doc.pipe(res);
            doc.fontSize(16).text(`FlowDesk Report - ${String(reportType).toUpperCase()}`, { align: 'center' });
            doc.moveDown();
            doc.fontSize(12);
            dataToExport.forEach((row, idx) => {
                const text = columns.map(c => `${c.header}: ${row[c.key]}`).join(' | ');
                doc.text(`${idx + 1}. ${text}`);
                doc.moveDown(0.5);
            });
            doc.end();
            return;
        }
        res.status(400).json({ message: 'Invalid export type' });
    }
    catch (error) {
        console.error('Export Error:', error);
        res.status(500).json({ message: error.message });
    }
};
exports.exportReport = exportReport;
//# sourceMappingURL=reportController.js.map