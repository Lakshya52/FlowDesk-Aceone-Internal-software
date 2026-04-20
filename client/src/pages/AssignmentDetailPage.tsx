/// <reference types="react" />
/// <reference types="react-dom" />
import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import Avatar from '../components/common/Avatar';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, Plus, Paperclip, MessageSquare, Upload, Download, Trash2, Send, Users, Edit3, FolderKanban, RefreshCw, Eye, Loader2, Reply } from 'lucide-react';
import { format } from 'date-fns';
import ProjectCanvas from '../components/assignments/ProjectCanvas';

const PRIORITY_LABELS: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
const STATUS_LABELS: Record<string, string> = { not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed', delayed: 'Delayed' };
const TASK_STATUS_LABELS: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', completed: 'Completed' };

const AssignmentDetailPage = (): React.JSX.Element | null => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuthStore();
    const [assignment, setAssignment] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [files, setFiles] = useState<any[]>([]);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'tasks' | 'files' | 'chat' | 'notes'>('tasks');
    // const [comment, setComment] = useState('');
    const [chatInput, setChatInput] = useState('');
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [taskForm, setTaskForm] = useState({ title: '', description: '', assignedTo: '', dueDate: '', priority: 'medium' });
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [updatingTeam, setUpdatingTeam] = useState(false);
    const [editingTask, setEditingTask] = useState<string | null>(null);
    const [editTaskForm, setEditTaskForm] = useState<any>({});
    const [stagedFiles, setStagedFiles] = useState<any[]>([]);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatFileRef = useRef<HTMLInputElement>(null);
    const whiteboardRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<any>(null);
    const [typingUsers, setTypingUsers] = useState<any>({});
    const typingTimeoutRef = useRef<any>(null);
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
    const [selectedMentions, setSelectedMentions] = useState<Set<string>>(new Set());
    const [replyTo, setReplyTo] = useState<any>(null);
    const [mentionIndex, setMentionIndex] = useState(0);

    // Auto-switch tabs and scroll based on URL params
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab === 'chat' || tab === 'tasks' || tab === 'files' || tab === 'notes') {
            setActiveTab(tab as any);
        }
    }, [location.search]);

    useEffect(() => {
        if (activeTab === 'notes') {
            setTimeout(() => {
                whiteboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [activeTab]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const msgId = params.get('msgId');
        
        if (activeTab === 'chat' && msgId && chatMessages.length > 0) {
            // Need a slight delay to ensure elements are mounted
            setTimeout(() => {
                scrollToOriginalMessage(msgId);
                
                // Clear the msgId from URL so it doesn't repeatedly scroll on re-renders,
                // but keep the tab
                window.history.replaceState(null, '', `/assignments/${id}?tab=chat`);
            }, 500);
        }
    }, [location.search, activeTab, chatMessages.length, id]);

    const assignmentMembers = React.useMemo(() => {
        if (!assignment) return [];
        const individualMembers = assignment.team || [];
        const teamManagers = (assignment.teams || []).map((t: any) => t.manager).filter(Boolean);
        const teamMembers = (assignment.teams || []).flatMap((t: any) => t.members || []);
        
        // Combine all members and deduplicate by _id
        const all = [...individualMembers, ...teamManagers, ...teamMembers];
        const unique = Array.from(new Map(all.map(u => [u?._id, u])).values()).filter(Boolean);
        return unique;
    }, [assignment]);

    const filteredMentionUsers = React.useMemo(() => {
        return assignmentMembers.filter((u: any) => u.name.toLowerCase().includes(mentionQuery.toLowerCase()));
    }, [assignmentMembers, mentionQuery]);

    useEffect(() => {
        setMentionIndex(0);
    }, [mentionQuery, showMentionDropdown]);

    const handleMentionSelect = (u: any) => {
        const lastAtIndex = chatInput.lastIndexOf('@');
        const beforeMention = chatInput.substring(0, lastAtIndex);
        const afterMention = chatInput.substring(lastAtIndex + mentionQuery.length + 1);
        const newVal = beforeMention + `@${u.name} ` + afterMention;
        setChatInput(newVal);
        setSelectedMentions(prev => new Set(prev).add(u._id));
        setShowMentionDropdown(false);
    };

    const scrollToOriginalMessage = (parentId: string) => {
        const el = document.getElementById(`chat-msg-${parentId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Double blink effect for the entire message row just like WhatsApp
            el.style.transition = 'background-color 0.4s ease';
            
            const blink = () => {
                el.style.backgroundColor = 'var(--color-chat-highlight)';
                setTimeout(() => {
                    el.style.backgroundColor = 'transparent';
                }, 150);
            };

            blink();
            setTimeout(blink, 400); // for twice blinking effect
        }
    };

    const canEdit = true; // Everyone can edit and manage tasks

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
        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
        const socket = io(socketUrl);
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

        socket.on('user_typing', ({ userName, userId }: any) => {
            setTypingUsers((prev: any) => ({ ...prev, [userId]: userName }));
        });

        socket.on('user_stop_typing', ({ userId }: any) => {
            setTypingUsers((prev: any) => {
                const next = { ...prev };
                delete next[userId];
                return next;
            });
        });

        return () => {
            socket.emit('stop_typing', { assignmentId: id });
            socket.disconnect();
        };
    }, [id]);

    useEffect(() => {
        const draft = localStorage.getItem(`chat_draft_${id}`);
        if (draft) setChatInput(draft);
        
        const replyDraft = localStorage.getItem(`reply_draft_${id}`);
        if (replyDraft) {
            try {
                setReplyTo(JSON.parse(replyDraft));
            } catch (e) {
                console.error('Failed to parse reply draft');
            }
        }
    }, [id]);

    useEffect(() => {
        localStorage.setItem(`chat_draft_${id}`, chatInput);
    }, [id, chatInput]);

    useEffect(() => {
        if (replyTo) {
            localStorage.setItem(`reply_draft_${id}`, JSON.stringify(replyTo));
        } else {
            localStorage.removeItem(`reply_draft_${id}`);
        }
    }, [id, replyTo]);

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
        if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
        try {
            await api.delete(`/assignments/${id}`);
            navigate('/assignments');
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to delete project please try again later');
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

    // const addComment = async (e: React.FormEvent) => {
    //     e.preventDefault();
    //     if (!comment.trim()) return;
    //     try {
    //         const { data } = await api.post('/comments', { content: comment, assignmentId: id });
    //         setComments(prev => [data.comment, ...prev]);
    //         setComment('');
    //     } catch { }
    // };

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
        setUploadingFileName(file.name);
        setIsUploadingFile(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('assignmentId', id!);
        try {
            const { data } = await api.post('/files', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setFiles(prev => [data.attachment, ...prev]);
        } catch { }
        finally {
            setIsUploadingFile(false);
            setUploadingFileName(null);
            if (e.target) e.target.value = '';
        }
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
        if (!chatInput.trim() && stagedFiles.length === 0) return;

        setIsUploadingFile(true);
        try {
            let attachmentIds: string[] = [];

            // Upload files only on send
            if (stagedFiles.length > 0) {
                const uploadPromises = stagedFiles.map(fileObject => {
                    const formData = new FormData();
                    formData.append('file', fileObject.file);
                    formData.append('assignmentId', id!);
                    return api.post('/files', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                });

                const uploadResults = await Promise.all(uploadPromises);
                attachmentIds = uploadResults.map(res => res.data.attachment._id);
            }

            await api.post('/chat', {
                content: chatInput,
                assignmentId: id,
                attachments: attachmentIds,
                mentions: Array.from(selectedMentions),
                parentMessageId: replyTo?._id
            });

            setChatInput('');
            setSelectedMentions(new Set());
            setReplyTo(null);
            setStagedFiles([]);
            localStorage.removeItem(`chat_draft_${id}`);
            localStorage.removeItem(`reply_draft_${id}`);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to send message');
        } finally {
            setIsUploadingFile(false);
        }
    };

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    const ALLOWED_EXTENSIONS = new Set([
        // Images
        '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff', '.tif',
        // Documents
        '.pdf', '.doc', '.docx', '.odt', '.rtf', '.txt', '.md',
        // Spreadsheets & Financial
        '.xls', '.xlsx', '.xlsm', '.xlsb', '.csv', '.tsv', '.ods',
        '.xbrl', '.ixbrl', '.ofx', '.qfx', '.qif', '.qbo', '.iif',
        // Presentations
        '.ppt', '.pptx', '.odp',
        // Archives
        '.zip', '.rar', '.7z', '.tar', '.gz',
        // Web / Code
        '.html', '.htm', '.css', '.js', '.ts', '.tsx', '.jsx', '.json', '.xml', '.yaml', '.yml',
        '.php', '.py', '.java', '.c', '.cpp', '.cs', '.rb', '.go', '.rs', '.sql', '.sh', '.bat',
        // Design
        '.fig', '.sketch', '.psd', '.ai', '.eps', '.indd',
        // Misc
        '.ics', '.vcf', '.eml', '.msg',
    ]);

    const sendChatFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        const newStagedFiles = [...stagedFiles];
        const rejected: string[] = [];

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const ext = '.' + file.name.split('.').pop()?.toLowerCase();

            if (file.size > MAX_FILE_SIZE) {
                rejected.push(`"${file.name}" exceeds the 10 MB size limit`);
                continue;
            }
            if (!ALLOWED_EXTENSIONS.has(ext)) {
                rejected.push(`"${file.name}" is not an allowed file type (${ext})`);
                continue;
            }

            newStagedFiles.push({
                id: Math.random().toString(36).substr(2, 9),
                file: file,
                originalName: file.name,
                fileType: file.type,
                fileSize: file.size
            });
        }

        if (rejected.length > 0) {
            alert('The following files were not added:\n\n' + rejected.join('\n'));
        }

        setStagedFiles(newStagedFiles);
        if (chatFileRef.current) chatFileRef.current.value = '';
    };

    const handleChatInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const cursorPosition = e.target.selectionStart || 0;
        setChatInput(val);
        localStorage.setItem(`chat_draft_${id}`, val);

        // Mention logic
        const lastAtIndex = val.lastIndexOf('@', cursorPosition - 1);
        if (lastAtIndex !== -1) {
            const query = val.substring(lastAtIndex + 1, cursorPosition).toLowerCase();
            if (!query.includes(' ')) {
                setMentionQuery(query);
                setShowMentionDropdown(true);
                setMentionPosition({ top: -150, left: Math.min(cursorPosition * 8, 300) });
            } else {
                setShowMentionDropdown(false);
            }
        } else {
            setShowMentionDropdown(false);
        }

        if (socketRef.current) {
            socketRef.current.emit('typing', { assignmentId: id, userName: user?.name });

            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                socketRef.current.emit('stop_typing', { assignmentId: id });
            }, 3000);
        }
    };

    const removeStagedFile = (tempId: string) => {
        setStagedFiles(prev => prev.filter(f => f.id !== tempId));
    };

    // Calculate assignment progress from tasks
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const progressPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

    if (loading) return <div style={{ display: 'flex', flexDirection: 'column', gap: 16 } as React.CSSProperties}><div className="skeleton" style={{ height: 120 }} /><div className="skeleton" style={{ height: 400 }} /></div>;
    if (!assignment) return (
        <div style={{ padding: 64, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 } as React.CSSProperties}>
            <FolderKanban size={48} style={{ opacity: 0.2 }} />
            <div>
                <h2 style={{ fontWeight: 700 }}>Project not found</h2>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>The project might have been deleted or you don't have permission to view it.</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/assignments')}>
                Back to Projects
            </button>
        </div>
    );

    const tabs = [
        { key: 'tasks', label: 'Tasks', count: tasks.length },
        { key: 'chat', label: 'Chat', count: chatMessages.length },
        { key: 'files', label: 'Files', count: files.length },
        { key: 'notes', label: 'Whiteboard', count: 0, new: true },
    ];

    return (
        <div style={{ maxWidth: 1000 }}>
            {comments ? null : null}
            {/* Back button */}
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => navigate('/assignments')}>
                <ArrowLeft size={16} /> Back to Projects
            </button>

            {/* Project header */}
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
                            <span>Due: <strong>{assignment.dueDate ? format(new Date(assignment.dueDate), 'MMM d, yyyy') : 'No Due Date'}</strong></span>
                        </div>
                    </div>
                    {canEdit && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <select className="select" style={{ width: 160 }} value={assignment.status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateStatus(e.target.value)}>
                                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }} onClick={handleDelete} title="Delete Project">
                                <Trash2 size={18} />
                            </button>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } as React.CSSProperties}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' } as React.CSSProperties}>
                        {assignment.team?.map((m: any) => (
                            <span key={m._id} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                                borderRadius: 6, background: 'var(--color-surface-hover)', fontSize: '0.75rem', fontWeight: 500,
                            }}>
                                <Avatar src={m.avatar} name={m.name} size={20} />
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
                        {t.label} 
                        {t.key !== 'notes' ? (
                            <span style={{ fontWeight: 400, fontSize: '0.75rem', opacity: 0.6, marginLeft: 6 }}>({t.count})</span>
                        ) : (
                            <span style={{ 
                                fontSize: '0.6rem', 
                                background: '#22c55e', 
                                color: 'white', 
                                padding: '2px 6px', 
                                borderRadius: 10, 
                                marginLeft: 8,
                                fontWeight: 700,
                                textTransform: 'uppercase'
                            }}>New</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Notes/Whiteboard Tab */}
            {activeTab === 'notes' && (
                <div ref={whiteboardRef} style={{ marginBottom: 40 }}>
                    <div style={{ marginBottom: 16 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>Project Whiteboard</h3>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                            Collaborative space for visual notes and brainstorming. All project members can see and edit these notes.
                        </p>
                    </div>
                    <ProjectCanvas 
                        assignmentId={id!} 
                        initialData={assignment.canvasData} 
                    />
                </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
                <div>
                    {canEdit && (
                        <button className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }} onClick={() => setShowTaskForm(!showTaskForm)}>
                            <Plus size={14} /> Add Task
                        </button>
                    )}
                    {showTaskForm && (
                        <form onSubmit={createTask} className="card" style={{ padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 14 } as React.CSSProperties}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Task Title *</label>
                                <input className="input" required placeholder="Enter task title" value={taskForm.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTaskForm({ ...taskForm, title: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Description</label>
                                <textarea className="input" rows={2} placeholder="Enter task description..." value={taskForm.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTaskForm({ ...taskForm, description: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Assign To *</label>
                                    <select className="select" required value={taskForm.assignedTo} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}>
                                        <option value="">Select member...</option>
                                        {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Due Date *</label>
                                    <input className="input" type="date" required value={taskForm.dueDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Priority</label>
                                    <select className="select" value={taskForm.priority} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                                        {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
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
                            {tasks
                                .map(t => (
                                    <div key={t._id} className="card" style={{ padding: '14px 18px' }}>
                                        {editingTask === t._id ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 } as React.CSSProperties}>
                                                <input className="input" value={editTaskForm.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTaskForm({ ...editTaskForm, title: e.target.value })} />
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                                    <select className="select" value={editTaskForm.assignedTo} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditTaskForm({ ...editTaskForm, assignedTo: e.target.value })}>
                                                        {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                                                    </select>
                                                    <input className="input" type="date" value={editTaskForm.dueDate?.split('T')[0]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTaskForm({ ...editTaskForm, dueDate: e.target.value })} />
                                                    <select className="select" value={editTaskForm.priority} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditTaskForm({ ...editTaskForm, priority: e.target.value })}>
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
                                                    {/* Anyone can change status now */}
                                                    {t.status !== 'completed' && (
                                                        <select
                                                            className="select"
                                                            style={{ fontSize: '0.75rem', padding: '4px 24px 4px 8px', width: 120 }}
                                                            value={t.status}
                                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateTaskStatus(t._id, e.target.value)}
                                                        >
                                                            {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => {
                                                                return <option key={k} value={k}>{v}</option>;
                                                            })}
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
                    } as React.CSSProperties}>
                        {chatMessages.length === 0 ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--color-text-tertiary)' } as React.CSSProperties}>
                                <MessageSquare size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
                                <div style={{ fontSize: '0.875rem' }}>No messages yet. Start the conversation!</div>
                            </div>
                        ) : (
                            chatMessages.map((msg: any) => {
                                const isOwnMessage = msg.sender?._id === user?._id;
                                return (
                                    <div key={msg._id} id={`chat-msg-${msg._id}`} style={{
                                        display: 'flex', gap: 10,
                                        flexDirection: (isOwnMessage ? 'row-reverse' : 'row') as any,
                                    }}>
                                        <Avatar src={msg.sender?.avatar} name={msg.sender?.name} size={32} />
                                        <div style={{ maxWidth: '60%', width: 'fit-content' }}>
                                            <div style={{
                                                fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginBottom: 4,
                                                textAlign: isOwnMessage ? 'right' : 'left',
                                            }}>
                                                {msg.sender?.name} · {format(new Date(msg.createdAt), 'h:mm a')}
                                            </div>
                                            {msg.parentMessage && (
                                                <div 
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        color: 'var(--color-text-tertiary)',
                                                        background: 'rgba(0,0,0,0.05)',
                                                        padding: '4px 8px',
                                                        borderRadius: 4,
                                                        marginBottom: 4,
                                                        borderLeft: '2px solid var(--color-primary)',
                                                        maxWidth: '100%',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        cursor: 'pointer',
                                                        transition: 'background 0.2s'
                                                    }}
                                                    onClick={() => scrollToOriginalMessage(msg.parentMessage._id)}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.1)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                                                    title="Go to message"
                                                >
                                                    Replying to {msg.parentMessage.sender?.name}: {msg.parentMessage.content}
                                                </div>
                                            )}
                                            {msg.content && (
                                                <div
                                                    className="chat-bubble"
                                                    style={{
                                                        padding: '10px 14px', borderRadius: 12, fontSize: '0.875rem',
                                                        background: isOwnMessage ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                                                        color: isOwnMessage ? 'white' : 'var(--color-text)',
                                                        borderTopRightRadius: isOwnMessage ? 4 : 12,
                                                        borderTopLeftRadius: isOwnMessage ? 12 : 4,
                                                        position: 'relative'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        const btn = e.currentTarget.querySelector('.reply-btn') as HTMLElement;
                                                        if (btn) {
                                                            btn.style.opacity = '1';
                                                            btn.style.visibility = 'visible';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        const btn = e.currentTarget.querySelector('.reply-btn') as HTMLElement;
                                                        if (btn) {
                                                            btn.style.opacity = '0';
                                                            btn.style.visibility = 'hidden';
                                                        }
                                                    }}
                                                >
                                                    {(() => {
                                                        const mentionNames = (msg.mentions || []).map((m: any) => typeof m === 'string' ? '' : m.name).filter(Boolean);
                                                        if (mentionNames.length === 0) {
                                                            return msg.content.split(/(@\w+)/g).map((part: string, i: number) => {
                                                                if (part.startsWith('@')) {
                                                                    return <span key={i} style={{ fontWeight: 700, color: isOwnMessage ? 'white' : 'var(--color-primary)' }}>{part}</span>;
                                                                }
                                                                return part;
                                                            });
                                                        }
                                                        const regex = new RegExp(`(@(?:${mentionNames.map((n: string) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}))`, 'g');
                                                        return msg.content.split(regex).map((part: string, i: number) => {
                                                            if (part.startsWith('@')) {
                                                                const name = part.substring(1);
                                                                if (mentionNames.includes(name)) {
                                                                    return <span key={i} style={{ fontWeight: 700, color: isOwnMessage ? 'white' : 'var(--color-primary)' }}>{part}</span>;
                                                                }
                                                            }
                                                            return part;
                                                        });
                                                    })()}
                                                    <button
                                                        className="reply-btn"
                                                        onClick={() => setReplyTo(msg)}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            right: isOwnMessage ? 'auto' : -36,
                                                            left: isOwnMessage ? -36 : 'auto',
                                                            display: 'flex',
                                                            background: 'var(--color-surface)',
                                                            border: '1px solid var(--color-border)',
                                                            borderRadius: '50%',
                                                            width: 28,
                                                            height: 28,
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer',
                                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                                            color: 'var(--color-primary)',
                                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                            zIndex: 10,
                                                            opacity: 0,
                                                            visibility: 'hidden'
                                                        }}
                                                        title="Reply"
                                                    >
                                                        <Reply size={14} />
                                                    </button>
                                                </div>
                                            )}
                                            {/* Attachments in message */}
                                            {msg.attachments?.map((att: any) => {
                                                const isImage = att.fileType?.startsWith('image/');
                                                const fileUrl = `${import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'}/uploads/${att.fileName}`;

                                                return (
                                                    <div
                                                        key={att._id}
                                                        style={{
                                                            marginTop: 6,
                                                            padding: isImage ? '4px' : '8px 12px',
                                                            borderRadius: 10,
                                                            background: isOwnMessage ? 'rgba(255,255,255,0.1)' : 'var(--color-surface)',
                                                            border: '1px solid var(--color-border)',
                                                            display: 'flex',
                                                            flexDirection: 'column' as any,
                                                            gap: 4,
                                                            cursor: 'pointer',
                                                            maxWidth: '100%',
                                                            boxShadow: 'var(--shadow-sm)'
                                                        }}
                                                        onClick={() => window.open(fileUrl, '_blank')}
                                                    >
                                                        {isImage ? (
                                                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                                                <img
                                                                    src={fileUrl}
                                                                    alt={att.originalName}
                                                                    style={{
                                                                        maxHeight: 100,
                                                                        maxWidth: 240,
                                                                        borderRadius: 6,
                                                                        display: 'block',
                                                                        objectFit: 'cover'
                                                                    }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); window.open(fileUrl, '_blank'); }}
                                                                    style={{
                                                                        position: 'absolute', bottom: 6, right: 6,
                                                                        background: 'rgba(0,0,0,0.6)', color: 'white',
                                                                        border: 'none', borderRadius: 6, cursor: 'pointer',
                                                                        padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4,
                                                                        fontSize: '0.6875rem', fontWeight: 500,
                                                                        backdropFilter: 'blur(4px)'
                                                                    }}
                                                                >
                                                                    <Eye size={12} /> Preview
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                <div style={{
                                                                    width: 32, height: 32, borderRadius: 8,
                                                                    background: 'var(--color-surface-hover)',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    color: 'var(--color-primary)'
                                                                }}>
                                                                    {getFileIcon(att.fileType)}
                                                                </div>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                        {att.originalName}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>
                                                                        {(att.fileSize / 1024).toFixed(1)} KB
                                                                    </div>
                                                                </div>
                                                                <Download size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        {Object.values(typingUsers).length > 0 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic', padding: '0 8px' }}>
                                {Object.values(typingUsers).join(', ')} {Object.values(typingUsers).length === 1 ? 'is' : 'are'} typing...
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Reply Preview */}
                    {replyTo && (
                        <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-primary-light)', borderTop: '1px solid var(--color-border)' }}>
                            <div style={{ fontSize: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 2 }}>
                                    <Reply size={12} />
                                    <span>Replying to {replyTo.sender?.name}</span>
                                </div>
                                <div style={{ color: 'var(--color-text-secondary)', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{replyTo.content}</div>
                            </div>
                            <button className="btn btn-ghost btn-xs" onClick={() => setReplyTo(null)}>Cancel</button>
                        </div>
                    )}

                    {/* Staged files area */}
                    {stagedFiles.length > 0 && (
                        <div style={{ padding: '8px 16px', display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-hover)' }}>
                            {stagedFiles.map(f => (
                                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--color-surface)', borderRadius: 16, fontSize: '0.75rem', border: '1px solid var(--color-border)' }}>
                                    <span>{getFileIcon(f.fileType)}</span>
                                    <span style={{ maxWidth: 100, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.originalName}</span>
                                    <button type="button" onClick={() => removeStagedFile(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', color: 'var(--color-text-tertiary)' }}>
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Chat input */}
                    <form onSubmit={sendChatMessage} style={{
                        display: 'flex', gap: 8, padding: '12px 0', borderTop: '1px solid var(--color-border)', alignItems: 'center',
                        position: 'relative'
                    }}>
                        <input type="file" ref={chatFileRef} style={{ display: 'none' }} multiple onChange={sendChatFile} />
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => chatFileRef.current?.click()} title="Attach files" disabled={isUploadingFile}>
                            <Paperclip size={16} />
                        </button>
                        {isUploadingFile ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-primary)', fontSize: '0.875rem', fontWeight: 500 }}>
                                <Loader2 className="animate-spin" size={18} />
                                Sending {stagedFiles.length > 0 ? stagedFiles[0].originalName + (stagedFiles.length > 1 ? ` (+${stagedFiles.length - 1} more)` : '') : 'message'}...
                            </div>
                        ) : (
                            <>
                                {showMentionDropdown && (
                                    <div className="card shadow-lg animate-fade-in" style={{
                                        position: 'absolute',
                                        bottom: 'calc(100% + 10px)',
                                        left: mentionPosition.left,
                                        width: 220,
                                        zIndex: 100,
                                        padding: '4px 0',
                                        maxHeight: 200,
                                        overflow: 'auto'
                                    }}>
                                        {filteredMentionUsers.length === 0 ? (
                                            <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>No users found</div>
                                        ) : (
                                            filteredMentionUsers.map((u: any, idx: number) => (
                                                <div
                                                    key={u._id}
                                                    style={{ 
                                                        padding: '8px 12px', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: 8, 
                                                        cursor: 'pointer', 
                                                        transition: 'background 0.15s',
                                                        background: mentionIndex === idx ? 'var(--color-surface-hover)' : 'transparent'
                                                    }}
                                                    onClick={() => handleMentionSelect(u)}
                                                    onMouseEnter={() => setMentionIndex(idx)}
                                                >
                                                    <Avatar src={u.avatar} name={u.name} size={24} />
                                                    <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{u.name}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                <input
                                    className="input"
                                    style={{ flex: 1 }}
                                    placeholder="Type a message..."
                                    value={chatInput}
                                    onChange={handleChatInputChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            setShowMentionDropdown(false);
                                        } else if (e.key === 'ArrowDown' && showMentionDropdown) {
                                            e.preventDefault();
                                            setMentionIndex(prev => (prev + 1) % filteredMentionUsers.length);
                                        } else if (e.key === 'ArrowUp' && showMentionDropdown) {
                                            e.preventDefault();
                                            setMentionIndex(prev => (prev - 1 + filteredMentionUsers.length) % filteredMentionUsers.length);
                                        } else if (e.key === 'Enter' && showMentionDropdown) {
                                            e.preventDefault();
                                            if (filteredMentionUsers[mentionIndex]) {
                                                handleMentionSelect(filteredMentionUsers[mentionIndex]);
                                            }
                                        }
                                    }}
                                />
                            </>
                        )}
                        <button type="submit" className="btn btn-primary btn-sm" disabled={(!chatInput.trim() && stagedFiles.length === 0) || isUploadingFile}>
                            <Send size={14} /> Send
                        </button>
                    </form>
                </div>
            )
            }

            {/* Files Tab */}
            {
                activeTab === 'files' && (
                    <div>
                        {isUploadingFile && activeTab === 'files' ? (
                            <div style={{
                                marginBottom: 16, padding: '12px 16px', borderRadius: 12,
                                background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                                display: 'flex', alignItems: 'center', gap: 12, fontWeight: 500, fontSize: '0.875rem',
                                border: '1px solid var(--color-primary)'
                            }}>
                                <div style={{ width: 18, height: 18, border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                Uploading: <span style={{ textDecoration: 'underline' }}>{uploadingFileName}</span>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                                    <Upload size={14} /> Upload File
                                    <input type="file" style={{ display: 'none' }} onChange={uploadFile} />
                                </label>
                                <button className="btn btn-ghost btn-sm" onClick={async () => { const { data } = await api.get(`/files?assignmentId=${id}`); setFiles(data.attachments || []); }} title="Refresh files">
                                    <RefreshCw size={14} /> Refresh
                                </button>
                            </div>
                        )}
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
                )
            }

            {/* Manage Team Modal */}
            {
                showTeamModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
                    }} onClick={() => setShowTeamModal(false)}>
                        <div className="card animate-fade-in" style={{ width: '100%', maxWidth: 400, padding: 24 }} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 16 }}>Manage Team Members</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflow: 'auto', marginBottom: 20 } as React.CSSProperties}>
                                {users.map(u => {
                                    const isMember = assignment.team?.some((m: any) => m._id === u._id);
                                    return (
                                        <div key={u._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'var(--color-surface-hover)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <Avatar src={u.avatar} name={u.name} size={28} />
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
                )
            }
        </div >
    );
};

export default AssignmentDetailPage;
