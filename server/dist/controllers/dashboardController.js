"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReports = exports.getReportFilters = exports.getCalendarEvents = exports.getDashboardStats = void 0;
const Assignment_1 = __importDefault(require("../models/Assignment"));
const Task_1 = __importDefault(require("../models/Task"));
const Team_1 = __importDefault(require("../models/Team"));
const User_1 = __importDefault(require("../models/User"));
const ActivityLog_1 = __importDefault(require("../models/ActivityLog"));
const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
        const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        // Base filters for role-based access
        const assignmentFilter = {};
        const taskFilter = {};
        if (userRole === 'member') {
            assignmentFilter.team = userId; // team is an array of IDs, Mongoose handles this with direct match
            taskFilter.assignedTo = userId;
        }
        // Active assignments
        const activeAssignments = await Assignment_1.default.countDocuments({
            ...assignmentFilter,
            status: { $in: ['not_started', 'in_progress'] },
        });
        // Total assignments
        const totalAssignments = await Assignment_1.default.countDocuments(assignmentFilter);
        // Tasks due today
        const tasksDueToday = await Task_1.default.countDocuments({
            ...taskFilter,
            dueDate: { $gte: todayStart, $lt: todayEnd },
            status: { $ne: 'completed' },
        });
        // Overdue tasks
        const overdueTasks = await Task_1.default.countDocuments({
            ...taskFilter,
            dueDate: { $lt: todayStart },
            status: { $ne: 'completed' },
        });
        // Completed this week
        const completedThisWeek = await Task_1.default.countDocuments({
            ...taskFilter,
            status: 'completed',
            updatedAt: { $gte: weekStart },
        });
        // Total tasks
        const totalTasks = await Task_1.default.countDocuments(taskFilter);
        // Task status breakdown
        const tasksByStatus = await Task_1.default.aggregate([
            { $match: taskFilter },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        // Recent activity
        const recentActivity = await ActivityLog_1.default.find()
            .populate('user', 'name email avatar')
            .sort({ createdAt: -1 })
            .limit(10);
        // Team workload (admin/manager only)
        let teamWorkload = [];
        if (userRole !== 'member') {
            teamWorkload = await Task_1.default.aggregate([
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
        const upcomingDeadlines = await Task_1.default.find({
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getDashboardStats = getDashboardStats;
const getCalendarEvents = async (req, res) => {
    try {
        const { start, end, userId, assignmentId } = req.query;
        const filter = {};
        if (start && end) {
            filter.dueDate = { $gte: new Date(start), $lte: new Date(end) };
        }
        if (userId)
            filter.assignedTo = userId;
        if (assignmentId)
            filter.assignment = assignmentId;
        if (req.user.role === 'member') {
            filter.assignedTo = req.user._id;
        }
        const tasks = await Task_1.default.find(filter)
            .populate('assignedTo', 'name email avatar')
            .populate('assignment', 'title')
            .sort({ dueDate: 1 });
        const assignments = await Assignment_1.default.find({
            ...(assignmentId ? { _id: assignmentId } : {}),
            ...(req.user.role === 'member' ? { team: req.user._id } : {}),
            ...(start && end
                ? { dueDate: { $gte: new Date(start), $lte: new Date(end) } }
                : {}),
        })
            .populate('createdBy', 'name email')
            .sort({ dueDate: 1 });
        res.json({ tasks, assignments });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getCalendarEvents = getCalendarEvents;
const getReportFilters = async (req, res) => {
    try {
        const userRole = req.user.role;
        const userId = req.user._id;
        let teams = [];
        let employees = [];
        if (userRole === 'admin') {
            teams = await Team_1.default.find().select('name');
            employees = await User_1.default.find().select('name email employeeId');
        }
        else if (userRole === 'manager') {
            teams = await Team_1.default.find({ manager: userId }).select('name');
            const teamIds = teams.map(t => t._id);
            const teamMembers = await Team_1.default.find({ _id: { $in: teamIds } }).distinct('members');
            employees = await User_1.default.find({ _id: { $in: teamMembers } }).select('name email employeeId');
        }
        res.json({ teams, employees });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getReportFilters = getReportFilters;
const getReports = async (req, res) => {
    try {
        const { startDate, endDate, teamId, employeeId } = req.query;
        const userRole = req.user.role;
        const userId = req.user._id;
        const dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }
        let baseMatch = { ...dateFilter };
        // Role-based constraints
        if (userRole === 'member') {
            baseMatch.assignedTo = userId;
        }
        else if (userRole === 'manager') {
            const managedTeams = await Team_1.default.find({ manager: userId }).distinct('_id');
            const managedMembers = await Team_1.default.find({ manager: userId }).distinct('members');
            if (teamId) {
                if (!managedTeams.map(id => id.toString()).includes(teamId)) {
                    res.status(403).json({ message: 'Forbidden' });
                    return;
                }
                const team = await Team_1.default.findById(teamId);
                baseMatch.assignedTo = { $in: team?.members || [] };
            }
            else if (employeeId) {
                if (!managedMembers.map(id => id.toString()).includes(employeeId)) {
                    res.status(403).json({ message: 'Forbidden' });
                    return;
                }
                baseMatch.assignedTo = employeeId;
            }
            else {
                baseMatch.assignedTo = { $in: managedMembers };
            }
        }
        else if (userRole === 'admin') {
            if (teamId) {
                const team = await Team_1.default.findById(teamId);
                baseMatch.assignedTo = { $in: team?.members || [] };
            }
            else if (employeeId) {
                baseMatch.assignedTo = employeeId;
            }
        }
        // Productivity report
        const completedTasks = await Task_1.default.aggregate([
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
        const delayedTasks = await Task_1.default.find({
            ...baseMatch,
            dueDate: { $lt: new Date() },
            status: { $ne: 'completed' },
        })
            .populate('assignedTo', 'name email employeeId')
            .populate('assignment', 'title')
            .sort({ dueDate: 1 });
        // Assignment completion analytics (Filtered by team if provided)
        const assignmentFilter = {};
        if (teamId)
            assignmentFilter.teams = teamId;
        else if (userRole === 'manager') {
            const managedTeams = await Team_1.default.find({ manager: userId }).distinct('_id');
            assignmentFilter.teams = { $in: managedTeams };
        }
        else if (userRole === 'member') {
            assignmentFilter.team = userId;
        }
        const assignmentStats = await Assignment_1.default.aggregate([
            { $match: assignmentFilter },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);
        // Per-user productivity
        const userProductivity = await Task_1.default.aggregate([
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getReports = getReports;
//# sourceMappingURL=dashboardController.js.map