import { Response } from 'express';
import Assignment from '../models/Assignment';
import Task from '../models/Task';
import Team from '../models/Team';
import User from '../models/User';
import ActivityLog from '../models/ActivityLog';
import { AuthRequest } from '../middlewares/auth';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id;
        const userRole = req.user!.role;
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
        const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Everyone sees all stats now
        const assignmentFilter: any = {};
        const taskFilter: any = {};
        const activityFilter: any = {};

        // Active assignments
        const activeAssignments = await Assignment.countDocuments({
            ...assignmentFilter,
            status: { $in: ['not_started', 'in_progress'] },
        });

        // Total assignments
        const totalAssignments = await Assignment.countDocuments(assignmentFilter);

        // Tasks due today
        const tasksDueToday = await Task.countDocuments({
            ...taskFilter,
            dueDate: { $gte: todayStart, $lt: todayEnd },
            status: { $ne: 'completed' },
        });

        // Overdue tasks
        const overdueTasks = await Task.countDocuments({
            ...taskFilter,
            dueDate: { $lt: todayStart },
            status: { $ne: 'completed' },
        });

        // Completed this week
        const completedThisWeek = await Task.countDocuments({
            ...taskFilter,
            status: 'completed',
            updatedAt: { $gte: weekStart },
        });

        // Total tasks
        const totalTasks = await Task.countDocuments(taskFilter);

        // Task status breakdown
        const tasksByStatus = await Task.aggregate([
            { $match: taskFilter },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);

        // Recent activity with pagination (7 per page as requested)
        const page = parseInt(req.query.page as string) || 1;
        const limit = 7;
        const skip = (page - 1) * limit;

        const recentActivity = await ActivityLog.find(activityFilter)
            .populate('user', 'name email avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalActivities = await ActivityLog.countDocuments(activityFilter);

        // Team workload (Available to everyone)
        const teamWorkload = await Task.aggregate([
            { $match: { status: { $ne: 'completed' } } },
            { $group: { _id: '$assignedTo', taskCount: { $sum: 1 } } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            {
                $project: {
                    _id: 0,
                    userId: '$_id',
                    name: '$user.name',
                    email: '$user.email',
                    avatar: '$user.avatar',
                    taskCount: 1,
                },
            },
            { $sort: { taskCount: -1 } },
            { $limit: 10 },
        ]);

        // Upcoming deadlines
        const upcomingDeadlines = await Task.find({
            ...taskFilter,
            dueDate: { $gte: todayStart },
            status: { $ne: 'completed' },
        })
            .populate('assignedTo', 'name email avatar')
            .populate('assignment', 'title')
            .sort({ dueDate: 1 })
            .limit(5);

        // Weekly completion data for trend chart
        const weeklyCompletionData = await Task.aggregate([
            {
                $match: {
                    ...taskFilter,
                    status: 'completed',
                    updatedAt: { $gte: weekStart }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
                    completed: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            stats: {
                activeAssignments,
                totalAssignments,
                tasksDueToday,
                overdueTasks,
                completedThisWeek,
                totalTasks,
            },
            tasksByStatus,
            recentActivity,
            totalActivities,
            currentPage: page,
            totalPages: Math.ceil(totalActivities / limit),
            teamWorkload,
            upcomingDeadlines,
            weeklyCompletionData,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCalendarEvents = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { start, end, userId, assignmentId } = req.query;
        const filter: any = {};

        if (start && end) {
            filter.dueDate = { $gte: new Date(start as string), $lte: new Date(end as string) };
        }
        if (userId) filter.assignedTo = userId;
        if (assignmentId) filter.assignment = assignmentId;

        // Everyone sees all calendar events now
        // (Removed role filtering)

        const tasks = await Task.find(filter)
            .populate('assignedTo', 'name email avatar')
            .populate('assignment', 'title')
            .sort({ dueDate: 1 });

        const assignments = await Assignment.find({
            ...(assignmentId ? { _id: assignmentId } : {}),
            // (Removed role filtering)
            ...(start && end
                ? { dueDate: { $gte: new Date(start as string), $lte: new Date(end as string) } }
                : {}),
        })
            .populate('createdBy', 'name email')
            .sort({ dueDate: 1 });

        res.json({ tasks, assignments });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


export const getReportFilters = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Everyone sees all report filters (teams and employees)
        const teams = await Team.find().select('name _id members manager').lean();
        const employees = await User.find().select('name _id email employeeId').lean();

        // Ensure we always return arrays and non-null values
        res.json({ 
            teams: Array.isArray(teams) ? teams : [], 
            employees: Array.isArray(employees) ? employees : [] 
        });
    } catch (error: any) {
        console.error('Error in getReportFilters:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getReports = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { startDate, endDate, teamId, employeeId } = req.query;
        const userRole = req.user!.role;
        const userId = req.user!._id;

        const dateFilter: any = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string),
            };
        }

        let baseMatch: any = { ...dateFilter };

        // Everyone sees all reports
        if (teamId) {
            const team = await Team.findById(teamId);
            baseMatch.assignedTo = { $in: team?.members || [] };
        } else if (employeeId) {
            baseMatch.assignedTo = employeeId;
        }

        // Productivity report
        const completedTasks = await Task.aggregate([
            { $match: { status: 'completed', ...baseMatch } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Task delay report
        const delayedTasks = await Task.find({
            ...baseMatch,
            dueDate: { $lt: new Date() },
            status: { $ne: 'completed' },
        })
            .populate('assignedTo', 'name email employeeId')
            .populate('assignment', 'title')
            .sort({ dueDate: 1 });

        // Assignment completion analytics (Filtered by team if provided)
        // Everyone sees assignment stats
        const assignmentFilter: any = {};
        if (teamId) {
            assignmentFilter.teams = teamId;
        }

        const assignmentStats = await Assignment.aggregate([
            { $match: assignmentFilter },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);

        // Per-user productivity
        const userProductivity = await Task.aggregate([
            { $match: { status: 'completed', ...baseMatch } },
            { $group: { _id: '$assignedTo', completed: { $sum: 1 } } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            {
                $project: {
                    _id: 0,
                    userId: '$_id',
                    name: '$user.name',
                    employeeId: '$user.employeeId',
                    completed: 1,
                },
            },
            { $sort: { completed: -1 } },
        ]);

        res.json({
            completedTasks,
            delayedTasks,
            assignmentStats,
            userProductivity,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const globalSearch = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { query } = req.query;
        if (!query) {
            res.json({ tasks: [], assignments: [], users: [], teams: [] });
            return;
        }

        const userId = req.user!._id;
        const userRole = req.user!.role;
        const searchRegex = new RegExp(query as string, 'i');

        // Base filters
        const taskFilter: any = { title: searchRegex };
        const assignmentFilter: any = { $or: [{ title: searchRegex }, { clientName: searchRegex }] };
        const userFilter: any = { $or: [{ name: searchRegex }, { email: searchRegex }, { employeeId: searchRegex }] };
        const teamFilter: any = { name: searchRegex };

        // Everyone sees all search results
        // (Removed role filtering)

        const [tasks, assignments, users, teams] = await Promise.all([
            Task.find(taskFilter).limit(5).populate('assignedTo', 'name').populate('assignment', 'title'),
            Assignment.find(assignmentFilter).limit(5),
            User.find(userFilter).limit(5).select('name email avatar role employeeId'),
            Team.find(teamFilter).limit(5).populate('manager', 'name'),
        ]);

        res.json({ tasks, assignments, users, teams });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
