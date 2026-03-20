import { Response } from 'express';
import mongoose from 'mongoose';
import Task from '../models/Task';
import Assignment from '../models/Assignment';
import ActivityLog from '../models/ActivityLog';
import Attachment from '../models/Attachment';
import Team from '../models/Team';
import User from '../models/User';
import { AuthRequest } from '../middlewares/auth';

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

export const getTimeTrackingReport = async (req: AuthRequest, res: Response) => {
    try {
        const { taskMatch } = await getBaseFilters(req);

        // Core Aggregations
        const totals = await Task.aggregate([
            { $match: taskMatch },
            { 
                $group: { 
                    _id: null, 
                    totalTimeSpent: { $sum: '$timeSpent' }, 
                    totalEstimatedTime: { $sum: '$timeEstimate' },
                    count: { $sum: 1 }
                } 
            }
        ]);

        const totalTimeSpent = totals[0]?.totalTimeSpent || 0;
        const totalEstimatedTime = totals[0]?.totalEstimatedTime || 0;
        const efficiency = totalEstimatedTime > 0 ? Math.round((totalTimeSpent / totalEstimatedTime) * 100) : 100;

        const dailyTrends = await Task.aggregate([
            { $match: taskMatch },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
                    totalHours: { $sum: '$timeSpent' }
                }
            },
            { $sort: { _id: 1 } },
            { $limit: 30 }
        ]);

        const projectComparison = await Task.aggregate([
            { $match: taskMatch },
            { 
                $group: { 
                    _id: '$assignment', 
                    actualTime: { $sum: '$timeSpent' }, 
                    estimatedTime: { $sum: '$timeEstimate' } 
                } 
            },
            { $lookup: { from: 'assignments', localField: '_id', foreignField: '_id', as: 'project' } },
            { $unwind: '$project' },
            { $project: { title: '$project.title', actualTime: 1, estimatedTime: 1 } },
            { $sort: { actualTime: -1 } }
        ]);

        res.json({ 
            data: { 
                totalTimeSpent, 
                totalEstimatedTime, 
                efficiency, 
                dailyTrends, 
                projectComparison 
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

        res.json({ 
            data: { 
                workloadDistribution, 
                totalEmployees 
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

export const getCustomReport = async (req: AuthRequest, res: Response) => {
    try {
        const { metric, dimension, startDate, endDate, teamId, employeeId, projectId, status } = req.body;
        
        let match: any = {};
        if (status) match.status = status;
        if (projectId) match.assignment = new mongoose.Types.ObjectId(projectId);
        if (employeeId) match.assignedTo = new mongoose.Types.ObjectId(employeeId);
        
        if (startDate && endDate) {
            match.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        let group: any = { _id: `$${dimension}` };
        if (metric === 'taskCount') group.value = { $sum: 1 };
        else if (metric === 'timeSpent') group.value = { $sum: '$timeSpent' };
        else if (metric === 'completionRate') group.value = { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } };

        const data = await Task.aggregate([
            { $match: match },
            { $group: group },
            { $sort: { value: -1 } },
            { $limit: 15 }
        ]);

        res.json({ data });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const exportReport = async (req: AuthRequest, res: Response) => {
    try {
        const { type, reportType } = req.query;
        const url = meta.process.env.CLIENT_URL;
        res.json({ 
            message: `Exporting ${reportType} as ${type}...`,
            url: `${url}/download/${reportType}_${Date.now()}.${type}` 
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
