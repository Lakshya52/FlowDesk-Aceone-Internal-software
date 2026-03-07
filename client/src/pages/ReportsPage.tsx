import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { Download, Users, User as UserIcon } from 'lucide-react';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
const STATUS_LABELS: Record<string, string> = { not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed', delayed: 'Delayed' };

const ReportsPage: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
    const [filters, setFilters] = useState({ teamId: '', employeeId: '' });
    const [filterOptions, setFilterOptions] = useState<{ teams: any[], employees: any[] }>({ teams: [], employees: [] });
    const user = JSON.parse(localStorage.getItem('flowdesk_user') || '{}');

    useEffect(() => {
        const fetchFilters = async () => {
            if (user.role === 'admin' || user.role === 'manager') {
                try {
                    const { data: f } = await api.get('/dashboard/report-filters');
                    setFilterOptions(f);
                } catch { }
            }
        };
        fetchFilters();
    }, []);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const params: any = { ...filters };
                if (dateRange.startDate) params.startDate = dateRange.startDate;
                if (dateRange.endDate) params.endDate = dateRange.endDate;
                const { data: d } = await api.get('/dashboard/reports', { params });
                setData(d);
            } catch { }
            finally { setLoading(false); }
        };
        fetch();
    }, [dateRange, filters]);

    const exportCSV = (items: any[], filename: string) => {
        if (!items || !items.length) return;
        const headers = Object.keys(items[0]).join(',');
        const rows = items.map(item => Object.values(item).join(','));
        const csv = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const assignmentPieData = (data?.assignmentStats || []).map((s: any) => ({
        name: STATUS_LABELS[s._id] || s._id,
        value: s.count,
    }));

    const totalTasks = data?.assignmentStats?.reduce((acc: number, s: any) => acc + s.count, 0) || 0;
    const completedTasksCount = data?.assignmentStats?.find((s: any) => s._id === 'completed')?.count || 0;
    const completionRate = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

    return (
        <div style={{ maxWidth: 1100 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Reports</h1>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        {user.role === 'admin' ? 'Organization-wide' : user.role === 'manager' ? 'Team' : 'Personal'} analytics and productivity insights
                    </p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '4px 12px', borderRadius: 8 }}>
                        <input className="input-minimal" type="date" value={dateRange.startDate} onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })} />
                        <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem' }}>to</span>
                        <input className="input-minimal" type="date" value={dateRange.endDate} onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })} />
                    </div>
                </div>
            </div>

            {(user.role === 'admin' || user.role === 'manager') && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                        <Users size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                        <select
                            className="input"
                            style={{ paddingLeft: 36 }}
                            value={filters.teamId}
                            onChange={e => setFilters({ ...filters, teamId: e.target.value, employeeId: '' })}
                        >
                            <option value="">All Teams</option>
                            {filterOptions.teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                        <UserIcon size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                        <select
                            className="input"
                            style={{ paddingLeft: 36 }}
                            value={filters.employeeId}
                            onChange={e => setFilters({ ...filters, employeeId: e.target.value, teamId: '' })}
                        >
                            <option value="">All Employees</option>
                            {filterOptions.employees.map(e => <option key={e._id} value={e._id}>{e.name} ({e.employeeId})</option>)}
                        </select>
                    </div>
                    <button className="btn btn-ghost" onClick={() => { setFilters({ teamId: '', employeeId: '' }); setDateRange({ startDate: '', endDate: '' }); }}>
                        Reset
                    </button>
                </div>
            )}

            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 12 }} />)}
                </div>
            ) : data ? (
                <>
                    {/* Summary Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                            <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Total Tasks</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{totalTasks}</div>
                        </div>
                        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                            <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Completed</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-success)' }}>{completedTasksCount}</div>
                        </div>
                        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                            <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Completion Rate</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>{completionRate}%</div>
                        </div>
                        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                            <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Overdue</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-danger)' }}>{data.delayedTasks?.length || 0}</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 20 }}>
                        {/* Productivity Chart */}
                        <div className="card" style={{ padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Tasks Completed Over Time</h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(data.completedTasks, 'productivity_report')}>
                                    <Download size={14} /> Export
                                </button>
                            </div>
                            {data.completedTasks?.length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <LineChart data={data.completedTasks}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                        <XAxis dataKey="_id" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                                        <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} allowDecimals={false} />
                                        <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.8125rem' }} />
                                        <Line type="monotone" dataKey="count" stroke="var(--color-primary)" strokeWidth={2} dot={{ fill: 'var(--color-primary)', r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>
                                    No data available
                                </div>
                            )}
                        </div>

                        {/* Assignment Status Pie */}
                        <div className="card" style={{ padding: 20 }}>
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 16 }}>Task Distribution by Status</h3>
                            {assignmentPieData.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie data={assignmentPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                {assignmentPieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
                                        {assignmentPieData.map((item: any, i: number) => (
                                            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
                                                <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                                                <span style={{ color: 'var(--color-text-secondary)' }}>{item.name}: {item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>No data available</div>
                            )}
                        </div>
                    </div>

                    {/* User Productivity */}
                    {user.role !== 'member' && data.userProductivity?.length > 0 && (
                        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Employee Performance</h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(data.userProductivity, 'employee_productivity')}>
                                    <Download size={14} /> Export
                                </button>
                            </div>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={data.userProductivity}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                                    <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }}
                                        formatter={(value, _name, props) => [value, 'Tasks Completed', `ID: ${props.payload.employeeId}`]}
                                    />
                                    <Bar dataKey="completed" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Overdue Tasks */}
                    <div className="card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Overdue / Delayed</h3>
                            <span className="badge badge-urgent">{data.delayedTasks?.length || 0} Urgent</span>
                        </div>
                        {data.delayedTasks?.length === 0 ? (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>No overdue tasks 🎉</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {data.delayedTasks?.map((t: any) => (
                                    <div key={t._id} style={{
                                        padding: '12px 16px', borderRadius: 10, background: 'var(--color-danger-light)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        border: '1px solid rgba(239, 68, 68, 0.1)'
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-danger)' }}>
                                                {t.title}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                                                {t.assignment?.title} · <strong>{t.assignedTo?.name}</strong> ({t.assignedTo?.employeeId})
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-danger)' }}>
                                                Due {format(new Date(t.dueDate), 'MMM d, yyyy')}
                                            </div>
                                            <div style={{ fontSize: '0.625rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                                                {Math.ceil((new Date().getTime() - new Date(t.dueDate).getTime()) / (1000 * 3600 * 24))} days overdue
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Failed to load data</div>
            )}
        </div>
    );
};

export default ReportsPage;
