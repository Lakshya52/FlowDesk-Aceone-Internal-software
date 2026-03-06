import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { Download, AlertTriangle } from 'lucide-react';

const COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#22c55e'];
const STATUS_LABELS: Record<string, string> = { not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed', delayed: 'Delayed' };

const ReportsPage: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

    useEffect(() => {
        const fetch = async () => {
            try {
                const params: any = {};
                if (dateRange.startDate) params.startDate = dateRange.startDate;
                if (dateRange.endDate) params.endDate = dateRange.endDate;
                const { data: d } = await api.get('/dashboard/reports', { params });
                setData(d);
            } catch { }
            finally { setLoading(false); }
        };
        fetch();
    }, [dateRange]);

    const exportCSV = (items: any[], filename: string) => {
        if (!items.length) return;
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

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 300, borderRadius: 12 }} />)}
        </div>
    );

    if (!data) return null;

    const assignmentPieData = (data.assignmentStats || []).map((s: any) => ({
        name: STATUS_LABELS[s._id] || s._id,
        value: s.count,
    }));

    return (
        <div style={{ maxWidth: 1100 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Reports</h1>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>Analytics and productivity insights</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input className="input" type="date" style={{ width: 150 }} value={dateRange.startDate} onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })} />
                    <span style={{ color: 'var(--color-text-tertiary)' }}>to</span>
                    <input className="input" type="date" style={{ width: 150 }} value={dateRange.endDate} onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })} />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 20 }}>
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
                            No data available for this period
                        </div>
                    )}
                </div>

                {/* Assignment Status Pie */}
                <div className="card" style={{ padding: 20 }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 16 }}>Assignment Status</h3>
                    {assignmentPieData.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={assignmentPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                                        {assignmentPieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                                {assignmentPieData.map((item: any, i: number) => (
                                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                                        <span style={{ color: 'var(--color-text-secondary)' }}>{item.name}: {item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>No data</div>
                    )}
                </div>
            </div>

            {/* User Productivity */}
            {data.userProductivity?.length > 0 && (
                <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>User Productivity</h3>
                        <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(data.userProductivity, 'user_productivity')}>
                            <Download size={14} /> Export
                        </button>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={data.userProductivity}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                            <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} allowDecimals={false} />
                            <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
                            <Bar dataKey="completed" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Delayed Tasks */}
            <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Overdue Tasks</h3>
                    <span className="badge badge-urgent">{data.delayedTasks?.length || 0} overdue</span>
                </div>
                {data.delayedTasks?.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>No overdue tasks 🎉</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {data.delayedTasks?.map((t: any) => (
                            <div key={t._id} style={{
                                padding: '10px 14px', borderRadius: 8, background: 'var(--color-danger-light)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-danger)' }}>
                                        <AlertTriangle size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                                        {t.title}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                                        {t.assignment?.title} · {t.assignedTo?.name}
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-danger)' }}>
                                    Due {format(new Date(t.dueDate), 'MMM d')}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportsPage;
