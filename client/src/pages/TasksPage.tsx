import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Search, CheckSquare, Edit3, Trash2, X, Check } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const PRIORITY_LABELS: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
const STATUS_LABELS: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', completed: 'Completed' };

const TasksPage: React.FC = () => {
    const { user } = useAuthStore();
    const [tasks, setTasks] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [editingTask, setEditingTask] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});

    const isAdmin = user?.role === 'admin';
    const isManager = user?.role === 'manager';
    const canEdit = isAdmin || isManager;

    useEffect(() => {
        const fetch = async () => {
            try {
                const params: any = {};
                if (search) params.search = search;
                if (statusFilter) params.status = statusFilter;
                if (priorityFilter) params.priority = priorityFilter;
                const [tRes, uRes] = await Promise.all([
                    api.get('/tasks', { params }),
                    api.get('/auth/users'),
                ]);
                setTasks(tRes.data.tasks || []);
                setUsers(uRes.data.users || []);
            } catch { }
            finally { setLoading(false); }
        };
        fetch();
    }, [search, statusFilter, priorityFilter]);

    const updateStatus = async (taskId: string, status: string) => {
        try {
            const { data } = await api.put(`/tasks/${taskId}`, { status });
            setTasks(prev => prev.map(t => t._id === taskId ? data.task : t));
        } catch { }
    };

    const saveEdit = async (taskId: string) => {
        try {
            const { data } = await api.put(`/tasks/${taskId}`, editForm);
            setTasks(prev => prev.map(t => t._id === taskId ? data.task : t));
            setEditingTask(null);
        } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    };

    const deleteTask = async (taskId: string) => {
        if (!window.confirm('Delete this task?')) return;
        try {
            await api.delete(`/tasks/${taskId}`);
            setTasks(prev => prev.filter(t => t._id !== taskId));
        } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    };

    const getDeadlineStyle = (dueDate: string, status: string) => {
        if (status === 'completed') return { color: '#22c55e' };
        const days = differenceInDays(new Date(dueDate), new Date());
        if (days < 0) return { color: '#ef4444', fontWeight: 600 };
        if (days === 0) return { color: '#d97706', fontWeight: 600 };
        if (days <= 2) return { color: '#f59e0b' };
        return { color: 'var(--color-text-tertiary)' };
    };

    const getDeadlineLabel = (dueDate: string, status: string) => {
        if (status === 'completed') return format(new Date(dueDate), 'MMM d');
        const days = differenceInDays(new Date(dueDate), new Date());
        if (days < 0) return `${Math.abs(days)}d overdue`;
        if (days === 0) return 'Due today';
        if (days <= 2) return `${days}d left`;
        return format(new Date(dueDate), 'MMM d');
    };

    // Group tasks by status for board view
    const grouped = {
        todo: tasks.filter(t => t.status === 'todo'),
        in_progress: tasks.filter(t => t.status === 'in_progress'),
        review: tasks.filter(t => t.status === 'review'),
        completed: tasks.filter(t => t.status === 'completed'),
    };

    const columns = [
        { key: 'todo', label: 'To Do', color: '#94a3b8' },
        { key: 'in_progress', label: 'In Progress', color: '#3b82f6' },
        { key: 'review', label: 'Review', color: '#f59e0b' },
        { key: 'completed', label: 'Completed', color: '#22c55e' },
    ];

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Tasks</h1>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>{tasks.length} total tasks</p>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <div style={{ flex: 1, maxWidth: 280, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                    <input className="input" style={{ paddingLeft: 36 }} placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="select" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="">All Statuses</option>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select className="select" style={{ width: 160 }} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
                    <option value="">All Priorities</option>
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </div>

            {/* Kanban Board */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 300, borderRadius: 12 }} />)}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, minHeight: 400 }}>
                    {columns.map(col => (
                        <div key={col.key} style={{ background: 'var(--color-surface-hover)', borderRadius: 12, padding: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '0 4px' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{col.label}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>
                                    {(grouped as any)[col.key]?.length || 0}
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {(grouped as any)[col.key]?.length === 0 ? (
                                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.75rem' }}>
                                        No tasks
                                    </div>
                                ) : (
                                    (grouped as any)[col.key].map((t: any) => (
                                        <div key={t._id} className="card" style={{ padding: '12px', cursor: 'default' }}>
                                            {editingTask === t._id ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    <input className="input" style={{ fontSize: '0.8125rem' }} value={editForm.title}
                                                        onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                                                    <select className="select" style={{ fontSize: '0.75rem' }} value={editForm.assignedTo}
                                                        onChange={e => setEditForm({ ...editForm, assignedTo: e.target.value })}>
                                                        {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                                                    </select>
                                                    <input className="input" type="date" style={{ fontSize: '0.75rem' }}
                                                        value={editForm.dueDate?.split('T')[0]}
                                                        onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })} />
                                                    <select className="select" style={{ fontSize: '0.75rem' }} value={editForm.priority}
                                                        onChange={e => setEditForm({ ...editForm, priority: e.target.value })}>
                                                        {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                                    </select>
                                                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                                        <button className="btn btn-ghost btn-xs" onClick={() => setEditingTask(null)}>
                                                            <X size={12} />
                                                        </button>
                                                        <button className="btn btn-primary btn-xs" onClick={() => saveEdit(t._id)}>
                                                            <Check size={12} /> Save
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: 8 }}>{t.title}</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                                        <span className={`badge badge-${t.priority}`} style={{ fontSize: '0.6875rem' }}>{PRIORITY_LABELS[t.priority]}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <div style={{
                                                                width: 20, height: 20, borderRadius: '50%',
                                                                background: 'var(--color-primary)', color: 'white',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: '0.6rem', fontWeight: 600,
                                                            }}>
                                                                {t.assignedTo?.name?.charAt(0)}
                                                            </div>
                                                            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>{t.assignedTo?.name?.split(' ')[0]}</span>
                                                        </div>
                                                        <span style={{ fontSize: '0.6875rem', ...getDeadlineStyle(t.dueDate, t.status) }}>
                                                            {getDeadlineLabel(t.dueDate, t.status)}
                                                        </span>
                                                    </div>

                                                    {/* Actions row */}
                                                    <div style={{ marginTop: 8, borderTop: '1px solid var(--color-border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        {(canEdit || t.assignedTo?._id === user?._id) && col.key !== 'completed' ? (
                                                            <select
                                                                className="select"
                                                                style={{ fontSize: '0.75rem', padding: '4px 24px 4px 8px', flex: 1 }}
                                                                value={t.status}
                                                                onChange={e => updateStatus(t._id, e.target.value)}
                                                            >
                                                                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                                            </select>
                                                        ) : <div />}
                                                        {canEdit && (
                                                            <div style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
                                                                <button className="btn btn-ghost btn-xs" onClick={() => {
                                                                    setEditingTask(t._id);
                                                                    setEditForm({
                                                                        title: t.title,
                                                                        assignedTo: t.assignedTo?._id,
                                                                        dueDate: t.dueDate,
                                                                        priority: t.priority,
                                                                    });
                                                                }}>
                                                                    <Edit3 size={12} />
                                                                </button>
                                                                <button className="btn btn-ghost btn-xs" style={{ color: 'var(--color-error)' }}
                                                                    onClick={() => deleteTask(t._id)}>
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TasksPage;
