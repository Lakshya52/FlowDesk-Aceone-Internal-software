import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, Plus, Paperclip, MessageSquare, Upload, Download, Trash2, Clock, Send, Users, Edit3, Crown } from 'lucide-react';
import { format } from 'date-fns';

const PRIORITY_LABELS: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
const STATUS_LABELS: Record<string, string> = { not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed', delayed: 'Delayed' };
const TASK_STATUS_LABELS: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', completed: 'Completed' };

const AssignmentDetailPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [assignment, setAssignment] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [files, setFiles] = useState<any[]>([]);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'tasks' | 'files' | 'discussion' | 'chat'>('tasks');
    const [comment, setComment] = useState('');
    const [chatInput, setChatInput] = useState('');
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [taskForm, setTaskForm] = useState({ title: '', description: '', assignedTo: '', dueDate: '', priority: 'medium' });
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [updatingTeam, setUpdatingTeam] = useState(false);
    const [editingTask, setEditingTask] = useState<string | null>(null);
    const [editTaskForm, setEditTaskForm] = useState<any>({});
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatFileRef = useRef<HTMLInputElement>(null);
    const socketRef = useRef<any>(null);

    const isAdmin = user?.role === 'admin';
    const isManager = user?.role === 'manager';
    const canEdit = isAdmin || isManager;

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return '🖼️';
        if (type === 'application/pdf') return '📄';
        if (type.includes('spreadsheet') || type.includes('excel')) return '📊';
        if (type.includes('word') || type.includes('document')) return '📝';
        return '📎';
    };

    const getDueDateColor = (dueDate: string) => {
        const due = new Date(dueDate);
        const now = new Date();
        const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return '#ef4444';
        if (diffDays <= 2) return '#f59e0b';
        return 'var(--color-text-secondary)';
    };

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [aRes, tRes, cRes, fRes, uRes, chatRes] = await Promise.all([
                    api.get(`/assignments/${id}`),
                    api.get(`/tasks?assignment=${id}`),
                    api.get(`/comments?assignmentId=${id}`),
                    api.get(`/files?assignmentId=${id}`),
                    api.get('/auth/users'),
                    api.get(`/chat?assignmentId=${id}`),
                ]);
                setAssignment(aRes.data.assignment);
                setTasks(tRes.data.tasks || []);
                setComments(cRes.data.comments || []);
                setFiles(fRes.data.attachments || []);
                setUsers(uRes.data.users || []);
                setChatMessages(chatRes.data.messages || []);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchAll();

        // Socket connection
        // const socket = io('http://localhost:5000');
        const socket = io('https://flowdesk-backend-l5tt.onrender.com');
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('✅ Socket connected successfully with ID:', socket.id);
            socket.emit('join_assignment', id);
        });

        socket.on('connect_error', (err: any) => {
            console.error('❌ Socket connection error:', err.message);
        });

        socket.on('error', (err: any) => {
            console.error('❌ Socket error:', err);
        });

        socket.on('new_message', (message: any) => {
            setChatMessages(prev => {
                // Check if message already exists to avoid duplicates (e.g. from the person who sent it)
                if (prev.some(m => m._id === message._id)) return prev;
                return [...prev, message];
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [id]);

    useEffect(() => {
        if (activeTab === 'chat') {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, activeTab]);

    const updateStatus = async (status: string) => {
        try {
            const { data } = await api.put(`/assignments/${id}`, { status });
            setAssignment(data.assignment);
        } catch { }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) return;
        try {
            await api.delete(`/assignments/${id}`);
            navigate('/assignments');
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to delete assignment');
        }
    };

    const handleUpdateTeam = async (teamIds: string[]) => {
        setUpdatingTeam(true);
        try {
            const { data } = await api.put(`/assignments/${id}`, { team: teamIds });
            setAssignment(data.assignment);
            setShowTeamModal(false);
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to update team');
        } finally {
            setUpdatingTeam(false);
        }
    };

    const addComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;
        try {
            const { data } = await api.post('/comments', { content: comment, assignmentId: id });
            setComments(prev => [data.comment, ...prev]);
            setComment('');
        } catch { }
    };

    const createTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/tasks', { ...taskForm, assignment: id });
            setTasks(prev => [data.task, ...prev]);
            setShowTaskForm(false);
            setTaskForm({ title: '', description: '', assignedTo: '', dueDate: '', priority: 'medium' });
        } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    };

    const updateTask = async (taskId: string, updates: any) => {
        try {
            const { data } = await api.put(`/tasks/${taskId}`, updates);
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

    const updateTaskStatus = async (taskId: string, status: string) => {
        try {
            const { data } = await api.put(`/tasks/${taskId}`, { status });
            setTasks(prev => prev.map(t => t._id === taskId ? data.task : t));
        } catch { }
    };

    const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('assignmentId', id!);
        try {
            const { data } = await api.post('/files', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setFiles(prev => [data.attachment, ...prev]);
        } catch { }
    };

    const downloadFile = async (fileId: string, originalName: string) => {
        try {
            const response = await api.get(`/files/${fileId}/download`, { responseType: 'blob' });
            // Use the Content-Type from the response to preserve original format
            const contentType = response.headers['content-type'] || 'application/octet-stream';
            const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', originalName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch { }
    };

    const sendChatMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        try {
            await api.post('/chat', { content: chatInput, assignmentId: id });
            setChatInput('');
        } catch { }
    };

    const sendChatFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('assignmentId', id!);
        formData.append('content', '');
        try {
            await api.post('/chat', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            // Refresh files list since chat uploads go to assignment files
            const fRes = await api.get(`/files?assignmentId=${id}`);
            setFiles(fRes.data.attachments || []);
        } catch { }
        if (chatFileRef.current) chatFileRef.current.value = '';
    };

    // Calculate assignment progress from tasks
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const progressPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

    if (loading) return <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}><div className="skeleton" style={{ height: 120 }} /><div className="skeleton" style={{ height: 400 }} /></div>;
    if (!assignment) return <div style={{ padding: 48, textAlign: 'center' }}>Assignment not found</div>;

    const tabs = [
        { key: 'tasks', label: 'Tasks', count: tasks.length },
        { key: 'chat', label: 'Chat', count: chatMessages.length },
        { key: 'files', label: 'Files', count: files.length },
        { key: 'discussion', label: 'Discussion', count: comments.length },
    ];

    return (
        <div style={{ maxWidth: 1000 }}>
            {/* Back button */}
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => navigate('/assignments')}>
                <ArrowLeft size={16} /> Back to Assignments
            </button>

            {/* Assignment header */}
            <div className="card" style={{ padding: '24px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{assignment.title}</h1>
                            <span className={`badge badge-${assignment.priority}`}>{PRIORITY_LABELS[assignment.priority]}</span>
                        </div>
                        {assignment.description && <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 12 }}>{assignment.description}</p>}
                        <div style={{ display: 'flex', gap: 20, fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                            <span>Client: <strong>{assignment.clientName}</strong></span>
                            <span>Start: {format(new Date(assignment.startDate), 'MMM d, yyyy')}</span>
                            <span>Due: <strong>{format(new Date(assignment.dueDate), 'MMM d, yyyy')}</strong></span>
                        </div>
                    </div>
                    {canEdit && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <select className="select" style={{ width: 160 }} value={assignment.status} onChange={e => updateStatus(e.target.value)}>
                                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                            {isAdmin && (
                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }} onClick={handleDelete} title="Delete Assignment">
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        <span>Progress</span>
                        <span>{completedTasks}/{tasks.length} tasks · {progressPercent}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--color-surface-hover)', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${progressPercent}%`,
                            background: progressPercent === 100 ? '#22c55e' : 'linear-gradient(90deg, var(--color-primary), #a78bfa)',
                            transition: 'width 0.5s ease',
                        }} />
                    </div>
                </div>

                {/* Teams */}
                {assignment.teams?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                            Assigned Teams
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {assignment.teams.map((t: any) => (
                                <div key={t._id} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                                    borderRadius: 8, background: 'var(--color-primary-light)', fontSize: '0.75rem', fontWeight: 500,
                                    border: '1px solid var(--color-primary)',
                                }}>
                                    <Users size={12} />
                                    {t.name}
                                    <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 4 }}>({t.members?.length || 0})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Team Members */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {assignment.team?.map((m: any) => (
                            <span key={m._id} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                                borderRadius: 6, background: 'var(--color-surface-hover)', fontSize: '0.75rem', fontWeight: 500,
                            }}>
                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 600 }}>
                                    {m.name?.charAt(0)}
                                </div>
                                {m.name}
                            </span>
                        ))}
                    </div>
                    {canEdit && (
                        <button className="btn btn-ghost btn-xs" style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }} onClick={() => setShowTeamModal(true)}>
                            Manage Team
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border)', marginBottom: 20 }}>
                {tabs.map(t => (
                    <button
                        key={t.key}
                        className="btn btn-ghost"
                        onClick={() => setActiveTab(t.key as any)}
                        style={{
                            borderRadius: 0,
                            borderBottom: activeTab === t.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                            color: activeTab === t.key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            fontWeight: activeTab === t.key ? 600 : 400,
                            paddingBottom: 12,
                        }}
                    >
                        {t.label} <span style={{ fontWeight: 400, fontSize: '0.75rem', opacity: 0.6 }}>({t.count})</span>
                    </button>
                ))}
            </div>

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
                <div>
                    {canEdit && (
                        <button className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }} onClick={() => setShowTaskForm(!showTaskForm)}>
                            <Plus size={14} /> Add Task
                        </button>
                    )}
                    {showTaskForm && (
                        <form onSubmit={createTask} className="card" style={{ padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <input className="input" required placeholder="Task title" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} />
                            <textarea className="input" rows={2} placeholder="Description..." value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                <select className="select" required value={taskForm.assignedTo} onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })}>
                                    <option value="">Assign to...</option>
                                    {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                                </select>
                                <input className="input" type="date" required value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
                                <select className="select" value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowTaskForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary btn-sm">Create Task</button>
                            </div>
                        </form>
                    )}
                    {tasks.length === 0 ? (
                        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>No tasks yet</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {tasks.map(t => (
                                <div key={t._id} className="card" style={{ padding: '14px 18px' }}>
                                    {editingTask === t._id ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <input className="input" value={editTaskForm.title} onChange={e => setEditTaskForm({ ...editTaskForm, title: e.target.value })} />
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                                <select className="select" value={editTaskForm.assignedTo} onChange={e => setEditTaskForm({ ...editTaskForm, assignedTo: e.target.value })}>
                                                    {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                                                </select>
                                                <input className="input" type="date" value={editTaskForm.dueDate?.split('T')[0]} onChange={e => setEditTaskForm({ ...editTaskForm, dueDate: e.target.value })} />
                                                <select className="select" value={editTaskForm.priority} onChange={e => setEditTaskForm({ ...editTaskForm, priority: e.target.value })}>
                                                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                                </select>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                <button className="btn btn-ghost btn-xs" onClick={() => setEditingTask(null)}>Cancel</button>
                                                <button className="btn btn-primary btn-xs" onClick={() => updateTask(t._id, editTaskForm)}>Save</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                    <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{t.title}</span>
                                                    <span className={`badge badge-${t.priority}`}>{PRIORITY_LABELS[t.priority]}</span>
                                                    <span className={`badge badge-${t.status}`}>{TASK_STATUS_LABELS[t.status]}</span>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                                    Assigned to {t.assignedTo?.name} · <span style={{ color: getDueDateColor(t.dueDate) }}>Due {format(new Date(t.dueDate), 'MMM d')}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {/* Anyone assigned or admin/manager can change status */}
                                                {(canEdit || t.assignedTo?._id === user?._id) && t.status !== 'completed' && (
                                                    <select
                                                        className="select"
                                                        style={{ fontSize: '0.75rem', padding: '4px 24px 4px 8px', width: 120 }}
                                                        value={t.status}
                                                        onChange={e => updateTaskStatus(t._id, e.target.value)}
                                                    >
                                                        {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                                    </select>
                                                )}
                                                {canEdit && (
                                                    <>
                                                        <button className="btn btn-ghost btn-xs" onClick={() => {
                                                            setEditingTask(t._id);
                                                            setEditTaskForm({
                                                                title: t.title,
                                                                assignedTo: t.assignedTo?._id,
                                                                dueDate: t.dueDate,
                                                                priority: t.priority,
                                                            });
                                                        }}>
                                                            <Edit3 size={13} />
                                                        </button>
                                                        <button className="btn btn-ghost btn-xs" style={{ color: 'var(--color-error)' }} onClick={() => deleteTask(t._id)}>
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: 500 }}>
                    {/* Messages area */}
                    <div style={{
                        flex: 1, overflowY: 'auto', padding: '16px 0',
                        display: 'flex', flexDirection: 'column', gap: 12,
                    }}>
                        {chatMessages.length === 0 ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--color-text-tertiary)' }}>
                                <MessageSquare size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
                                <div style={{ fontSize: '0.875rem' }}>No messages yet. Start the conversation!</div>
                            </div>
                        ) : (
                            chatMessages.map((msg: any) => {
                                const isOwnMessage = msg.sender?._id === user?._id;
                                return (
                                    <div key={msg._id} style={{
                                        display: 'flex', gap: 10,
                                        flexDirection: isOwnMessage ? 'row-reverse' : 'row',
                                    }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                            background: isOwnMessage
                                                ? 'linear-gradient(135deg, var(--color-primary), #a78bfa)'
                                                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'white', fontSize: '0.75rem', fontWeight: 600,
                                        }}>
                                            {msg.sender?.name?.charAt(0)}
                                        </div>
                                        <div style={{ maxWidth: '70%' }}>
                                            <div style={{
                                                fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginBottom: 4,
                                                textAlign: isOwnMessage ? 'right' : 'left',
                                            }}>
                                                {msg.sender?.name} · {format(new Date(msg.createdAt), 'h:mm a')}
                                            </div>
                                            {msg.content && (
                                                <div style={{
                                                    padding: '10px 14px', borderRadius: 12, fontSize: '0.875rem',
                                                    background: isOwnMessage ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                                                    color: isOwnMessage ? 'white' : 'var(--color-text)',
                                                    borderTopRightRadius: isOwnMessage ? 4 : 12,
                                                    borderTopLeftRadius: isOwnMessage ? 12 : 4,
                                                }}>
                                                    {msg.content}
                                                </div>
                                            )}
                                            {/* Attachments in message */}
                                            {msg.attachments?.map((att: any) => (
                                                <div key={att._id} style={{
                                                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                                                    marginTop: 4, borderRadius: 8,
                                                    background: 'var(--color-surface-hover)', cursor: 'pointer',
                                                    border: '1px solid var(--color-border)',
                                                }} onClick={() => downloadFile(att._id, att.originalName)}>
                                                    <span>{getFileIcon(att.fileType)}</span>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{att.originalName}</div>
                                                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>{(att.fileSize / 1024).toFixed(1)} KB</div>
                                                    </div>
                                                    <Download size={14} style={{ color: 'var(--color-primary)' }} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Chat input */}
                    <form onSubmit={sendChatMessage} style={{
                        display: 'flex', gap: 8, padding: '12px 0', borderTop: '1px solid var(--color-border)',
                    }}>
                        <input type="file" ref={chatFileRef} style={{ display: 'none' }} onChange={sendChatFile} />
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => chatFileRef.current?.click()} title="Attach file">
                            <Paperclip size={16} />
                        </button>
                        <input
                            className="input"
                            style={{ flex: 1 }}
                            placeholder="Type a message..."
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                        />
                        <button type="submit" className="btn btn-primary btn-sm" disabled={!chatInput.trim()}>
                            <Send size={14} /> Send
                        </button>
                    </form>
                </div>
            )}

            {/* Files Tab */}
            {activeTab === 'files' && (
                <div>
                    <label className="btn btn-secondary btn-sm" style={{ marginBottom: 16, cursor: 'pointer' }}>
                        <Upload size={14} /> Upload File
                        <input type="file" style={{ display: 'none' }} onChange={uploadFile} />
                    </label>
                    {files.length === 0 ? (
                        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>No files uploaded</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {files.map(f => (
                                <div key={f._id} className="card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{ fontSize: '1.25rem' }}>{getFileIcon(f.fileType)}</span>
                                        <div>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{f.originalName}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                                {(f.fileSize / 1024).toFixed(1)} KB · {f.uploadedBy?.name} · {format(new Date(f.createdAt), 'MMM d, yyyy')}
                                            </div>
                                        </div>
                                    </div>
                                    <button className="btn btn-ghost btn-sm" onClick={() => downloadFile(f._id, f.originalName)} title="Download">
                                        <Download size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Discussion Tab */}
            {activeTab === 'discussion' && (
                <div>
                    <form onSubmit={addComment} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                        <input className="input" placeholder="Write a comment..." value={comment} onChange={e => setComment(e.target.value)} />
                        <button type="submit" className="btn btn-primary btn-sm" disabled={!comment.trim()}>Post</button>
                    </form>
                    {comments.length === 0 ? (
                        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>No comments yet</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {comments.map(c => (
                                <div key={c._id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                        background: 'linear-gradient(135deg, var(--color-primary), #a78bfa)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontSize: '0.75rem', fontWeight: 600,
                                    }}>
                                        {c.author?.name?.charAt(0)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{c.author?.name}</span>
                                            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>{format(new Date(c.createdAt), 'MMM d, h:mm a')}</span>
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{c.content}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Manage Team Modal */}
            {showTeamModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
                }} onClick={() => setShowTeamModal(false)}>
                    <div className="card animate-fade-in" style={{ width: '100%', maxWidth: 400, padding: 24 }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 16 }}>Manage Team Members</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflow: 'auto', marginBottom: 20 }}>
                            {users.map(u => {
                                const isMember = assignment.team?.some((m: any) => m._id === u._id);
                                return (
                                    <div key={u._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'var(--color-surface-hover)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                                                {u.name?.charAt(0)}
                                            </div>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{u.name}</span>
                                        </div>
                                        <button
                                            className={`btn btn-xs ${isMember ? 'btn-secondary' : 'btn-primary'}`}
                                            disabled={updatingTeam}
                                            onClick={() => {
                                                const currentIds = assignment.team?.map((m: any) => m._id) || [];
                                                const nextIds = isMember ? currentIds.filter((tid: string) => tid !== u._id) : [...currentIds, u._id];
                                                handleUpdateTeam(nextIds);
                                            }}
                                        >
                                            {isMember ? 'Remove' : 'Add'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setShowTeamModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssignmentDetailPage;
