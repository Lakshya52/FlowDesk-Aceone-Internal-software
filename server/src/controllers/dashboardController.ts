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

        // Base filters for role-based access
        const assignmentFilter: any = {};
        const taskFilter: any = {};
        const activityFilter: any = {};

        if (userRole === 'member') {
            assignmentFilter.team = userId; 
            taskFilter.assignedTo = userId;
            // Activity related to their team
            const userTeams = await Team.find({ members: userId }).distinct('_id');
            activityFilter['$or'] = [
                { user: userId },
                { team: { $in: userTeams } }
            ];
        } else if (userRole === 'manager') {
            const managedTeams = await Team.find({ manager: userId }).distinct('_id');
            const managedMembers = await Team.find({ manager: userId }).distinct('members');
            
            // Managers see assignments they created OR where their team is assigned
            assignmentFilter['$or'] = [
                { createdBy: userId },
                { teams: { $in: managedTeams } }
            ];
            
            // Managers see tasks they assigned OR assigned to their team members
            taskFilter['$or'] = [
                { assignedTo: { $in: managedMembers } },
                { createdBy: userId }, // Case where they assigned a task directly
                { assignedTo: userId } // Case where they are working on a task
            ];
            
            activityFilter['$or'] = [
                { team: { $in: managedTeams } },
                { user: { $in: managedMembers } },
                { user: userId }
            ];
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

        // Team workload (admin/manager only)
        let teamWorkload: any[] = [];
        if (userRole === 'admin') {
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
        } else if (userRole === 'manager') {
            const managedMembers = await Team.find({ manager: userId }).distinct('members');
            teamWorkload = await Task.aggregate([
                { $match: { assignedTo: { $in: managedMembers }, status: { $ne: 'completed' } } },
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

        // Upcoming deadlines (role-based)
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


export const getReportFilters = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userRole = req.user!.role;
        const userId = req.user!._id;

        let teams: any[] = [];
        let employees: any[] = [];

        if (userRole === 'admin') {
            teams = await Team.find().select('name members manager');
            employees = await User.find().select('name email employeeId');
        } else if (userRole === 'manager') {
            teams = await Team.find({ manager: userId }).select('name members manager');
            const teamIds = teams.map(t => t._id);
            const teamMembers = await Team.find({ _id: { $in: teamIds } }).distinct('members');
            employees = await User.find({ _id: { $in: [...teamMembers, userId] } }).select('name email employeeId');
        }

        res.json({ teams, employees });
    } catch (error: any) {
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

        // Role-based constraints
        if (userRole === 'member') {
            baseMatch.assignedTo = userId;
        } else if (userRole === 'manager') {
            const managedTeams = await Team.find({ manager: userId }).distinct('_id');
            const managedMembers = await Team.find({ manager: userId }).distinct('members');

            if (teamId) {
                if (!managedTeams.map(id => id.toString()).includes(teamId as string)) {
                    res.status(403).json({ message: 'Forbidden' });
                    return;
                }
                const team = await Team.findById(teamId);
                baseMatch.assignedTo = { $in: team?.members || [] };
            } else if (employeeId) {
                if (!managedMembers.map(id => id.toString()).includes(employeeId as string)) {
                    res.status(403).json({ message: 'Forbidden' });
                    return;
                }
                baseMatch.assignedTo = employeeId;
            } else {
                baseMatch.assignedTo = { $in: managedMembers };
            }
        } else if (userRole === 'admin') {
            if (teamId) {
                const team = await Team.findById(teamId);
                baseMatch.assignedTo = { $in: team?.members || [] };
            } else if (employeeId) {
                baseMatch.assignedTo = employeeId;
            }
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
        const assignmentFilter: any = {};
        if (teamId) {
            assignmentFilter.teams = teamId;
        } else if (userRole === 'manager') {
            const managedTeams = await Team.find({ manager: userId }).distinct('_id');
            assignmentFilter.teams = { $in: managedTeams };
        } else if (userRole === 'member') {
            // Check if the user is in the 'team' array (participants)
            assignmentFilter.team = userId;
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

        if (userRole === 'member') {
            taskFilter.assignedTo = userId;
            assignmentFilter.team = userId;
            const myTeams = await Team.find({ members: userId }).distinct('_id');
            teamFilter._id = { $in: myTeams };
            // Members can see users only in their teams? Let's say all users for now or filter by team
            const teamMembers = await Team.find({ members: userId }).distinct('members');
            userFilter._id = { $in: teamMembers };
        } else if (userRole === 'manager') {
            const managedTeams = await Team.find({ manager: userId }).distinct('_id');
            const managedMembers = await Team.find({ manager: userId }).distinct('members');
            // Can see all their managed stuff
            taskFilter.assignedTo = { $in: [...managedMembers, userId] };
            assignmentFilter.$or.push({ teams: { $in: managedTeams } });
            teamFilter.$or = [{ manager: userId }, { _id: { $in: managedTeams } }];
            userFilter._id = { $in: managedMembers };
        }

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
