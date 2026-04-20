import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import Avatar from '../components/common/Avatar';
import { useAuthStore } from '../store/authStore';
import { Search, Edit3, Trash2, X, Check } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const PRIORITY_LABELS: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
const STATUS_LABELS: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', completed: 'Completed' };

const TasksPage: React.FC = () => {
    const { user } = useAuthStore();
    const [tasks, setTasks] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [currentTab, setCurrentTab] = useState<'all' | 'my' | 'review'>('all');
    const [editingTask, setEditingTask] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});

    const isAdmin = user?.role === 'admin';
    const isManager = user?.role === 'manager';
    const isEmployee = user?.role === 'member';
    const canEdit = true; // Anyone who can see it can edit it (democratic model)

    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const params: any = {};
                if (search) params.search = search;
                if (currentTab === 'my') params.assignedTo = user?._id;
                if (currentTab === 'review') params.status = 'review';
                
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
    }, [search, currentTab, user?._id]);

    const updateStatus = async (taskId: string, status: string) => {
        try {
            // Completion workflow: If member marks as completed, it goes to review (handled by backend but UI should reflect intent)
            let targetStatus = status;
            if (isEmployee && status === 'completed') {
                targetStatus = 'review';
            }

            const { data } = await api.put(`/tasks/${taskId}`, { status: targetStatus });
            setTasks(prev => prev.map(t => t._id === taskId ? data.task : t));
        } catch { }
    };

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, status: string) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId) {
            const task = tasks.find(t => t._id === taskId);
            // Permissions check for drag and drop
            if (task && (canEdit || task.assignedTo?._id === user?._id)) {
                updateStatus(taskId, status);
            }
        }
        setDraggedTaskId(null);
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

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 32, borderBottom: '1px solid var(--color-border)', marginBottom: 24 }}>
                <button 
                    onClick={() => setCurrentTab('all')}
                    style={{ 
                        padding: '12px 4px', 
                        fontSize: '0.875rem', 
                        fontWeight: 500, 
                        color: currentTab === 'all' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        borderBottom: `2px solid ${currentTab === 'all' ? 'var(--color-primary)' : 'transparent'}`,
                        background: 'none',
                        borderTop: 'none',
                        borderLeft: 'none',
                        borderRight: 'none',
                        cursor: 'pointer'
                    }}
                >
                    All Tasks
                </button>
                <button 
                    onClick={() => setCurrentTab('my')}
                    style={{ 
                        padding: '12px 4px', 
                        fontSize: '0.875rem', 
                        fontWeight: 500, 
                        color: currentTab === 'my' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        borderBottom: `2px solid ${currentTab === 'my' ? 'var(--color-primary)' : 'transparent'}`,
                        background: 'none',
                        borderTop: 'none',
                        borderLeft: 'none',
                        borderRight: 'none',
                        cursor: 'pointer'
                    }}
                >
                    My Tasks
                </button>
                {(isAdmin || isManager) && (
                    <button 
                        onClick={() => setCurrentTab('review')}
                        style={{ 
                            padding: '12px 4px', 
                            fontSize: '0.875rem', 
                            fontWeight: 500, 
                            color: currentTab === 'review' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            borderBottom: `2px solid ${currentTab === 'review' ? 'var(--color-primary)' : 'transparent'}`,
                            background: 'none',
                            borderTop: 'none',
                            borderLeft: 'none',
                            borderRight: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        Under Review
                        {tasks.filter(t => t.status === 'review').length > 0 && (
                            <span style={{ 
                                backgroundColor: '#ef4444', 
                                color: 'white', 
                                fontSize: '0.7rem', 
                                padding: '2px 6px', 
                                borderRadius: 10,
                                minWidth: 18,
                                textAlign: 'center'
                            }}>
                                {tasks.filter(t => t.status === 'review').length}
                            </span>
                        )}
                    </button>
                )}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <div style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                    <input className="input" style={{ paddingLeft: 36 }} placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {/* Kanban Board */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 300, borderRadius: 12 }} />)}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, minHeight: 400 }}>
                    {columns.map(col => (
                        <div 
                            key={col.key} 
                            style={{ 
                                background: 'var(--color-surface-hover)', 
                                borderRadius: 12, 
                                padding: 12,
                                border: draggedTaskId ? `2px dashed ${col.color}40` : '2px solid transparent',
                                transition: 'all 0.2s ease'
                            }}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.key)}
                        >
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
                                        <div 
                                            key={t._id} 
                                            className="card" 
                                            style={{ 
                                                padding: '12px', 
                                                cursor: (canEdit || t.assignedTo?._id === user?._id) ? 'grab' : 'default',
                                                opacity: draggedTaskId === t._id ? 0.5 : 1,
                                                border: draggedTaskId === t._id ? `1px solid ${col.color}` : '1px solid var(--color-border)',
                                            }}
                                            draggable={canEdit || t.assignedTo?._id === user?._id}
                                            onDragStart={(e) => handleDragStart(e, t._id)}
                                        >
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
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                                        <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--color-primary)', fontWeight: 600 }}>
                                                            {t.assignment?.title}
                                                        </div>
                                                        <span className={`badge badge-${t.priority}`} style={{ fontSize: '0.625rem' }}>{PRIORITY_LABELS[t.priority]}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: 8, lineHeight: 1.4 }}>{t.title}</div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <Avatar src={t.assignedTo?.avatar} name={t.assignedTo?.name} size={20} />
                                                            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>{t.assignedTo?.name?.split(' ')[0]}</span>
                                                        </div>
                                                        <span style={{ fontSize: '0.6875rem', ...getDeadlineStyle(t.dueDate, t.status) }}>
                                                            {getDeadlineLabel(t.dueDate, t.status)}
                                                        </span>
                                                    </div>

                                                    {/* Actions row */}
                                                    <div style={{ marginTop: 8, borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
                                                        {t.status === 'review' && (isAdmin || isManager) ? (
                                                            <div style={{ display: 'flex', gap: 6 }}>
                                                                <button 
                                                                    className="btn btn-xs" 
                                                                    style={{ flex: 1, backgroundColor: '#22c55e', color: 'white', border: 'none' }}
                                                                    onClick={() => updateStatus(t._id, 'completed')}
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button 
                                                                    className="btn btn-xs" 
                                                                    style={{ flex: 1, backgroundColor: '#ef4444', color: 'white', border: 'none' }}
                                                                    onClick={() => updateStatus(t._id, 'in_progress')}
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                {(canEdit || t.assignedTo?._id === user?._id) && t.status !== 'completed' ? (
                                                                    <select
                                                                        className="select"
                                                                        style={{ fontSize: '0.75rem', padding: '4px 24px 4px 8px', flex: 1 }}
                                                                        value={t.status}
                                                                        onChange={e => updateStatus(t._id, e.target.value)}
                                                                    >
                                                                        {Object.entries(STATUS_LABELS).map(([k, v]) => {
                                                                            if (isEmployee && k === 'completed') return <option key={k} value="review">Mark for Review</option>;
                                                                            return <option key={k} value={k}>{v}</option>;
                                                                        })}
                                                                    </select>
                                                                ) : <div />}
                                                            </div>
                                                        )}
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
