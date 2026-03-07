import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import {
    FolderKanban,
    AlertTriangle,
    CheckCircle2,
    Clock,
    TrendingUp,
    Users,
    CalendarClock,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, differenceInDays } from 'date-fns';

interface DashboardData {
    stats: {
        activeAssignments: number;
        totalAssignments: number;
        tasksDueToday: number;
        overdueTasks: number;
        completedThisWeek: number;
        totalTasks: number;
    };
    tasksByStatus: { _id: string; count: number }[];
    recentActivity: any[];
    teamWorkload: any[];
    upcomingDeadlines: any[];
}

const STATUS_COLORS: Record<string, string> = {
    todo: '#94a3b8',
    in_progress: '#3b82f6',
    review: '#f59e0b',
    completed: '#22c55e',
};

const STATUS_LABELS: Record<string, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    completed: 'Completed',
};

const DashboardPage: React.FC = () => {
    const { user } = useAuthStore();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [myTasks, setMyTasks] = useState<any[]>([]);
    const [myTeams, setMyTeams] = useState<any[]>([]);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [dashRes, tasksRes, teamsRes] = await Promise.all([
                    api.get('/dashboard/stats'),
                    api.get('/tasks'),
                    api.get('/teams'),
                ]);
                setData(dashRes.data);
                // Filter tasks assigned to current user that are not completed, sorted by due date
                const allTasks = tasksRes.data.tasks || [];
                const upcoming = allTasks
                    .filter((t: any) => t.assignedTo?._id === user?._id && t.status !== 'completed')
                    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
                setMyTasks(upcoming);
                setMyTeams(teamsRes.data.teams || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    const getUrgencyColor = (dueDate: string) => {
        const days = differenceInDays(new Date(dueDate), new Date());
        if (days < 0) return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', label: 'Overdue' };
        if (days === 0) return { bg: '#fffbeb', border: '#fde68a', text: '#d97706', label: 'Due Today' };
        if (days <= 2) return { bg: '#fffbeb', border: '#fde68a', text: '#d97706', label: `${days}d left` };
        if (days <= 7) return { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', label: `${days}d left` };
        return { bg: 'var(--color-surface-hover)', border: 'var(--color-border)', text: 'var(--color-text-secondary)', label: `${days}d left` };
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />
                    ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                    <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
                    <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
                </div>
            </div>
        );
    }

    if (!data) return null;

    const statCards = [
        {
            label: 'Active Projects',
            value: data.stats.activeAssignments,
            total: data.stats.totalAssignments,
            icon: FolderKanban,
            color: '#6366f1',
            bg: 'var(--color-primary-light)',
        },
        {
            label: 'Due Today',
            value: data.stats.tasksDueToday,
            icon: Clock,
            color: '#3b82f6',
            bg: 'var(--color-info-light)',
        },
        {
            label: 'Overdue Tasks',
            value: data.stats.overdueTasks,
            icon: AlertTriangle,
            color: '#ef4444',
            bg: 'var(--color-danger-light)',
        },
        {
            label: 'Completed This Week',
            value: data.stats.completedThisWeek,
            icon: CheckCircle2,
            color: '#22c55e',
            bg: 'var(--color-success-light)',
        },
    ];

    const pieData = data.tasksByStatus.map(s => ({
        name: STATUS_LABELS[s._id] || s._id,
        value: s.count,
        color: STATUS_COLORS[s._id] || '#94a3b8',
    }));

    const workloadData = data.teamWorkload.map(w => ({
        name: w.name.split(' ')[0],
        tasks: w.taskCount,
    }));

    return (
        <div style={{ maxWidth: 1200 }}>
            {/* Greeting */}
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                    Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}
                </h1>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
                    Here's what's happening with your projects today.
                </p>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 32 }}>
                {statCards.map((card) => (
                    <div
                        key={card.label}
                        className="card animate-fade-in"
                        style={{
                            padding: '24px',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            cursor: 'default',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>{card.label}</div>
                                <div style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color: 'var(--color-text-primary)' }}>
                                    {card.value}
                                    {card.total !== undefined && (
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-tertiary)', marginLeft: 6 }}>/ {card.total}</span>
                                    )}
                                </div>
                            </div>
                            <div style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                background: card.bg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: `0 4px 12px ${card.color}20`
                            }}>
                                <card.icon size={22} color={card.color} strokeWidth={2.5} />
                            </div>
                        </div>
                        <div style={{
                            position: 'absolute',
                            right: -10,
                            bottom: -10,
                            width: 80,
                            height: 80,
                            background: card.color,
                            opacity: 0.03,
                            borderRadius: '50%',
                            filter: 'blur(20px)'
                        }} />
                    </div>
                ))}
            </div>

            {/* My Deadlines Section */}
            {myTasks.length > 0 && (
                <div className="card" style={{ padding: '20px', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <CalendarClock size={18} color="var(--color-primary)" />
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>My Deadlines</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>{myTasks.length} pending</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {myTasks.slice(0, 8).map((task: any) => {
                            const urgency = getUrgencyColor(task.dueDate);
                            return (
                                <div key={task._id} style={{
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    background: urgency.bg,
                                    border: `1px solid ${urgency.border}`,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}>
                                    <div>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{task.title}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                            {task.assignment?.title}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{
                                            fontSize: '0.6875rem', fontWeight: 600, color: urgency.text,
                                            padding: '2px 8px', borderRadius: 4,
                                            background: `${urgency.text}15`,
                                        }}>
                                            {urgency.label}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: urgency.text, fontWeight: 500 }}>
                                            {format(new Date(task.dueDate), 'MMM d')}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* My Teams Section */}
            {myTeams.length > 0 && (
                <div className="card" style={{ padding: '20px', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <Users size={18} color="var(--color-primary)" />
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>My Teams</h3>
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {myTeams.map((team: any) => (
                            <div key={team._id} style={{
                                padding: '10px 16px', borderRadius: 10,
                                background: 'var(--color-surface-hover)',
                                border: '1px solid var(--color-border)',
                                display: 'flex', alignItems: 'center', gap: 10,
                            }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: 8,
                                    background: 'linear-gradient(135deg, var(--color-primary), #a78bfa)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontSize: '0.75rem', fontWeight: 600,
                                }}>
                                    {team.name?.charAt(0)}
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{team.name}</div>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>
                                        {team.members?.length || 0} members · {team.manager?.name}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 24 }}>
                {/* Team Workload */}
                {workloadData.length > 0 && (
                    <div className="card" style={{ padding: '20px' }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 16 }}>Team Workload</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={workloadData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                                <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--color-surface)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 8,
                                        fontSize: '0.8125rem',
                                    }}
                                />
                                <Bar dataKey="tasks" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Task Status Pie */}
                <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 16 }}>Task Status</h3>
                    {pieData.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <ResponsiveContainer width="50%" height={180}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                                        {pieData.map((entry, index) => (
                                            <Cell key={index} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {pieData.map((item) => (
                                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem' }}>
                                        <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color }} />
                                        <span style={{ color: 'var(--color-text-secondary)' }}>{item.name}</span>
                                        <span style={{ fontWeight: 600 }}>{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>
                            No task data yet
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Upcoming Deadlines */}
                <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 16 }}>Upcoming Deadlines</h3>
                    {data.upcomingDeadlines.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>
                            <CheckCircle2 size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                            <div>No upcoming deadlines</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {data.upcomingDeadlines.map((task: any) => (
                                <div key={task._id} style={{
                                    padding: '10px 12px',
                                    borderRadius: 8,
                                    background: 'var(--color-surface-hover)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}>
                                    <div>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{task.title}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                            {task.assignment?.title} · {task.assignedTo?.name}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-warning)', fontWeight: 500 }}>
                                        {format(new Date(task.dueDate), 'MMM d')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Activity */}
                <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 16 }}>Recent Activity</h3>
                    {data.recentActivity.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>
                            <TrendingUp size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                            <div>No recent activity</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {data.recentActivity.map((act: any) => (
                                <div key={act._id} style={{
                                    padding: '8px 0',
                                    borderBottom: '1px solid var(--color-border)',
                                    display: 'flex',
                                    gap: 10,
                                    alignItems: 'flex-start',
                                }}>
                                    <div style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        background: 'var(--color-primary)',
                                        marginTop: 7,
                                        flexShrink: 0,
                                    }} />
                                    <div>
                                        <div style={{ fontSize: '0.8125rem' }}>
                                            <span style={{ fontWeight: 500 }}>{act.user?.name}</span>{' '}
                                            <span style={{ color: 'var(--color-text-secondary)' }}>{act.action.toLowerCase()}</span>
                                        </div>
                                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>
                                            {format(new Date(act.createdAt), 'MMM d, h:mm a')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
