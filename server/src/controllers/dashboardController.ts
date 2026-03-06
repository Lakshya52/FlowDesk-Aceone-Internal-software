import { Response } from 'express';
import Assignment from '../models/Assignment';
import Task from '../models/Task';
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

        // Base filters for role-based access
        const assignmentFilter: any = {};
        const taskFilter: any = {};
        if (userRole === 'member') {
            assignmentFilter.team = userId;
            taskFilter.assignedTo = userId;
        }

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

        // Recent activity
        const recentActivity = await ActivityLog.find()
            .populate('user', 'name email avatar')
            .sort({ createdAt: -1 })
            .limit(10);

        // Team workload (admin/manager only)
        let teamWorkload: any[] = [];
        if (userRole !== 'member') {
            teamWorkload = await Task.aggregate([
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
        }

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
            teamWorkload,
            upcomingDeadlines,
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

        if (req.user!.role === 'member') {
            filter.assignedTo = req.user!._id;
        }

        const tasks = await Task.find(filter)
            .populate('assignedTo', 'name email avatar')
            .populate('assignment', 'title')
            .sort({ dueDate: 1 });

        const assignments = await Assignment.find({
            ...(assignmentId ? { _id: assignmentId } : {}),
            ...(req.user!.role === 'member' ? { team: req.user!._id } : {}),
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

export const getReports = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { startDate, endDate } = req.query;
        const dateFilter: any = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string),
            };
        }

        // Productivity report
        const completedTasks = await Task.aggregate([
            { $match: { status: 'completed', ...dateFilter } },
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
            dueDate: { $lt: new Date() },
            status: { $ne: 'completed' },
        })
            .populate('assignedTo', 'name email')
            .populate('assignment', 'title')
            .sort({ dueDate: 1 });

        // Assignment completion analytics
        const assignmentStats = await Assignment.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);

        // Per-user productivity
        const userProductivity = await Task.aggregate([
            { $match: { status: 'completed', ...dateFilter } },
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
