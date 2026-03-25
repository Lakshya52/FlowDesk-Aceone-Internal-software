import { Response } from 'express';
import mongoose from 'mongoose';
import Task from '../models/Task';
import Assignment from '../models/Assignment';
import ActivityLog from '../models/ActivityLog';
import Attachment from '../models/Attachment';
import Team from '../models/Team';
import User from '../models/User';
import { AuthRequest } from '../middlewares/auth';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

/**
 * Helper to get role-based constraints and shared filters
 */
const getBaseFilters = async (req: AuthRequest) => {
    const userRole = req.user!.role;
    const userId = req.user!._id;
    const { teamId, employeeId, projectId, status, startDate, endDate } = req.query;

    let userFilter: any = {};
    let teamFilter: any = {};
    let assignmentFilter: any = {};
    let taskMatch: any = {};

    // 1. Role-based scoping
    if (userRole === 'member') {
        userFilter._id = userId;
        teamFilter.members = userId;
        assignmentFilter.team = userId;
        taskMatch.assignedTo = userId;
    } else if (userRole === 'manager') {
        const managedTeams = await Team.find({ manager: userId }).distinct('_id');
        const managedMembers = await Team.find({ manager: userId }).distinct('members');
        
        if (teamId) {
            teamFilter._id = new mongoose.Types.ObjectId(teamId as string);
            const team = await Team.findById(teamId);
            userFilter._id = { $in: team?.members || [] };
        } else {
            teamFilter._id = { $in: managedTeams };
            userFilter._id = { $in: managedMembers };
        }
        
        assignmentFilter.$or = [
            { createdBy: userId },
            { teams: { $in: managedTeams } }
        ];
    } else if (userRole === 'admin') {
        if (teamId) {
            teamFilter._id = new mongoose.Types.ObjectId(teamId as string);
        }
        if (employeeId) {
            userFilter._id = new mongoose.Types.ObjectId(employeeId as string);
        }
    }

    // 2. Query-based filters
    if (status) taskMatch.status = status;
    if (projectId) taskMatch.assignment = new mongoose.Types.ObjectId(projectId as string);
    if (employeeId) taskMatch.assignedTo = new mongoose.Types.ObjectId(employeeId as string);

    if (startDate && endDate) {
        taskMatch.createdAt = {
            $gte: new Date(startDate as string),
            $lte: new Date(endDate as string)
        };
    }

    return { userFilter, teamFilter, assignmentFilter, taskMatch };
};

export const getEmployeeTrackingReport = async (req: AuthRequest, res: Response) => {
    try {
        const { taskMatch } = await getBaseFilters(req);

        const employeeAggregation = await Task.aggregate([
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
        
        const totals = await Task.aggregate([
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

        const dailyTrends = await Task.aggregate([
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
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getWorkloadReport = async (req: AuthRequest, res: Response) => {
    try {
        const { taskMatch, userFilter } = await getBaseFilters(req);

        // Filter for active tasks unless status is explicitly requested as 'completed'
        const activeTaskMatch = { ...taskMatch };
        if (!activeTaskMatch.status) {
            activeTaskMatch.status = { $ne: 'completed' };
        }

        const workloadDistribution = await Task.aggregate([
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

        const totalEmployees = await User.countDocuments(userFilter);

        // Actual Heatmap logic for the last 28 days
        const twentyEightDaysAgo = new Date();
        twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
        
        const heatmapRaw = await Task.aggregate([
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
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getActivityReport = async (req: AuthRequest, res: Response) => {
    try {
        const { taskMatch, assignmentFilter } = await getBaseFilters(req);

        // Attachment Activity
        const fileCountPerProject = await Attachment.aggregate([
            { $match: { assignment: { $exists: true } } },
            { $group: { _id: '$assignment', fileCount: { $sum: 1 } } },
            { $lookup: { from: 'assignments', localField: '_id', foreignField: '_id', as: 'project' } },
            { $unwind: '$project' },
            { $project: { title: '$project.title', fileCount: 1 } },
            { $sort: { fileCount: -1 } },
            { $limit: 10 }
        ]);

        // Activity Logs
        const activityDistribution = await ActivityLog.aggregate([
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 }
        ]);

        const recentActivities = await ActivityLog.find()
            .populate('user', 'name avatar')
            .sort({ createdAt: -1 })
            .limit(15);

        const totalActivities = await ActivityLog.countDocuments();

        res.json({ 
            data: { 
                fileCountPerProject, 
                activityDistribution, 
                recentActivities, 
                totalActivities 
            } 
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};



export const exportReport = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { type, reportType } = req.query;
        if (!type || !reportType) {
            res.status(400).json({ message: 'Missing type or reportType query parameters' });
            return;
        }

        const { taskMatch } = await getBaseFilters(req);
        
        let dataToExport: any[] = [];
        let columns: { header: string; key: string; width?: number }[] = [];

        if (reportType === 'employee') {
            const employeeAggregation = await Task.aggregate([
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
        } else if (reportType === 'workload') {
             dataToExport = await Task.aggregate([
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
        } else if (reportType === 'activity') {
            dataToExport = await ActivityLog.aggregate([
                { $group: { _id: '$action', count: { $sum: 1 } } }
            ]);
            columns = [
                { header: 'Action', key: '_id', width: 30 },
                { header: 'Count', key: 'count', width: 15 }
            ];
        } else {
            const tasks = await Task.find(taskMatch).populate('assignedTo', 'name').populate('assignment', 'title').lean();
            dataToExport = tasks.map((t: any) => ({
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
            const rows = dataToExport.map(row => 
                columns.map(c => {
                    const val = row[c.key] !== undefined ? row[c.key] : '';
                    return `"${String(val).replace(/"/g, '""')}"`;
                }).join(',')
            );
            res.send([headerRow, ...rows].join('\n'));
            return;
        }

        if (type === 'excel') {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
            
            const workbook = new ExcelJS.Workbook();
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
            
            const doc = new PDFDocument({ margin: 30 });
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

    } catch (error: any) {
        console.error('Export Error:', error);
        res.status(500).json({ message: error.message });
    }
};
