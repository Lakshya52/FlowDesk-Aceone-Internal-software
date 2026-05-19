import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore, MessageSnippet, UserSnippet } from '../store/chatStore';
import api from '../lib/api';
import { io } from 'socket.io-client';
import Avatar from '../components/common/Avatar';
import toast from 'react-hot-toast';
import {
    Search,
    MessageSquare,
    Paperclip,
    Send,
    Smile,
    Check,
    CheckCheck,
    X,
    FileText,
    Download,
    CornerUpRight,
    Trash2,
    Ban,
    Edit3,
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Cache for instant image previews using local blob URLs
const localPreviewCache = new Map<string, string>();

export default function ChatsPage() {
    const { user } = useAuthStore();
    const {
        conversations,
        activeConversationId,
        setActiveConversationId,
        setActiveChatUserId,
        fetchConversations,
        markAsRead,
        deleteConversation,
        handleConversationDeleted,
        handleMessageDeleted,
        isLoading,
        addConversation
    } = useChatStore();

    // Fetch conversations on mount
    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    // Local States
    const [messages, setMessages] = useState<MessageSnippet[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const [uploadingQueue, setUploadingQueue] = useState<{ id: string; name: string; progress: number; status: 'uploading' | 'completed' | 'failed' }[]>([]);
    const messagesCacheRef = useRef<Record<string, MessageSnippet[]>>({});
    const [typingUsers, setTypingUsers] = useState<{ id: string; name: string }[]>([]);
    const [users, setUsers] = useState<UserSnippet[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [messageInput, setMessageInput] = useState('');

    // Hover States for Pure React Hover Effects
    const [hoveredConvId, setHoveredConvId] = useState<string | null>(null);
    const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
    const [hoveredContactId, setHoveredContactId] = useState<string | null>(null);



    // Message Features
    const [replyingTo, setReplyingTo] = useState<MessageSnippet | null>(null);
    const [showComposerEmoji, setShowComposerEmoji] = useState(false);
    const [, setActiveReactionPicker] = useState<string | null>(null); // messageId
    const [forwardingMessage, setForwardingMessage] = useState<MessageSnippet | null>(null);
    const [activeReactionPickerId, setActiveReactionPickerId] = useState<string | null>(null);
    const [forwardSearchQuery, setForwardSearchQuery] = useState('');
    const [forwardSuccessConvIds, setForwardSuccessConvIds] = useState<string[]>([]);
    const [tempActiveConv, setTempActiveConv] = useState<any | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editMessageInput, setEditMessageInput] = useState('');

    // Mentions Autocomplete State
    const [showMentions, setShowMentions] = useState(false);
    const [mentionFilter, setMentionFilter] = useState('');
    const [mentionCursorPos, setMentionCursorPos] = useState(0);

    const socketRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<any>(null);

    // Fetch users for new conversation/group initialization on demand
    useEffect(() => {
        if (!searchQuery.trim()) {
            return;
        }
        if (users.length > 0) {
            return;
        }

        const fetchUsers = async () => {
            try {
                const { data } = await api.get('/auth/users?all=true');
                setUsers(data.users || []);
            } catch (err) {
                console.error('Failed to fetch users:', err);
            }
        };
        fetchUsers();
    }, [searchQuery, users.length]);

    // Set up active socket connections and listeners
    useEffect(() => {
        const socket = io(SOCKET_URL);
        socketRef.current = socket;

        const joinRooms = () => {
            if (user?._id) {
                socket.emit('join_user', user._id);
            }
            if (activeConversationId) {
                socket.emit('join_conversation', activeConversationId);
            }
        };

        if (socket.connected) {
            joinRooms();
        }

        socket.on('connect', () => {
            joinRooms();
        });

        socket.on('new_chat_message', (message: MessageSnippet) => {
            if (message.conversation === activeConversationId) {
                setMessages(prev => {
                    if (prev.some(m => m._id === message._id)) return prev;
                    return [...prev, message];
                });
                // Auto-read on server and update Zustand unread badges
                markAsRead(activeConversationId);
            }
        });

        socket.on('message_reaction_updated', ({ messageId, conversationId, reactions }: any) => {
            if (conversationId === activeConversationId) {
                setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
            }
        });

        socket.on('user_chat_typing', ({ conversationId, userName, userId }: any) => {
            if (conversationId === activeConversationId && userId !== user?._id) {
                setTypingUsers(prev => {
                    if (prev.some(u => u.id === userId)) return prev;
                    return [...prev, { id: userId, name: userName }];
                });
            }
        });

        socket.on('user_chat_stop_typing', ({ conversationId, userId }: any) => {
            if (conversationId === activeConversationId) {
                setTypingUsers(prev => prev.filter(u => u.id !== userId));
            }
        });

        socket.on('conversation_deleted', (deletedConversationId: string) => {
            handleConversationDeleted(deletedConversationId);
        });

        socket.on('message_deleted', (payload: any) => {
            handleMessageDeleted(payload);
            if (payload.conversationId === activeConversationId) {
                setMessages(prev => prev.map(m => m._id === payload.messageId ? {
                    ...m,
                    content: payload.content,
                    attachments: payload.attachments,
                    isDeleted: payload.isDeleted
                } : m));
            }
        });

        socket.on('message_edited', (editedMessage: MessageSnippet) => {
            if (editedMessage.conversation === activeConversationId) {
                setMessages(prev => prev.map(m => m._id === editedMessage._id ? editedMessage : m));
            }
            fetchConversations();
        });

        return () => {
            socket.disconnect();
        };
    }, [activeConversationId, user?._id]);

    // Fetch messages for active conversation
    useEffect(() => {
        // Optimistically render from cache if we have already visited this chat to avoid loading lag!
        if (activeConversationId && messagesCacheRef.current[activeConversationId]) {
            setMessages(messagesCacheRef.current[activeConversationId]);
            setLoadingMessages(false);
        } else {
            setMessages([]);
            setLoadingMessages(true);
        }

        if (!activeConversationId) {
            setActiveChatUserId(null);
            setLoadingMessages(false);
            return;
        }

        const fetchMessages = async () => {
            try {
                const { data } = await api.get(`/conversations/${activeConversationId}/messages`);
                const fetchedMsgs = data.messages || [];
                setMessages(fetchedMsgs);
                messagesCacheRef.current[activeConversationId] = fetchedMsgs;
                markAsRead(activeConversationId);

                // Set direct partner userId if direct chat
                const currentConversations = useChatStore.getState().conversations;
                const conv = currentConversations.find(c => c._id === activeConversationId);
                if (conv && conv.type === 'direct' && user) {
                    const other = conv.participants.find(p => p._id !== user._id);
                    if (other) {
                        setActiveChatUserId(other._id);
                    }
                } else {
                    setActiveChatUserId(null);
                }
            } catch (err) {
                console.error('Failed to fetch messages:', err);
            } finally {
                setLoadingMessages(false);
            }
        };

        fetchMessages();
        setTypingUsers([]);
    }, [activeConversationId, user?._id]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingUsers]);

    // Sync local messages state to Cache Ref
    useEffect(() => {
        if (activeConversationId) {
            messagesCacheRef.current[activeConversationId] = messages;
        }
    }, [messages, activeConversationId]);

    // Handle text input and typing status triggers
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setMessageInput(val);

        // Emit typing status
        if (socketRef.current && activeConversationId && user) {
            socketRef.current.emit('chat_typing', {
                conversationId: activeConversationId,
                userName: user.name
            });

            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                socketRef.current.emit('chat_stop_typing', {
                    conversationId: activeConversationId
                });
            }, 2000);
        }

        // Handle Mentions autocomplete trigger
        const cursorIdx = e.target.selectionStart;
        const textBeforeCursor = val.substring(0, cursorIdx);
        const lastWordMatch = textBeforeCursor.match(/@(\w*)$/);

        if (lastWordMatch) {
            setShowMentions(true);
            setMentionFilter(lastWordMatch[1].toLowerCase());
            setMentionCursorPos(cursorIdx - lastWordMatch[1].length - 1);
        } else {
            setShowMentions(false);
        }
    };

    // Insert @mention into input text
    const selectMention = (selectedUser: UserSnippet) => {
        const textBeforeMention = messageInput.substring(0, mentionCursorPos);
        const textAfterMention = messageInput.substring(mentionCursorPos + mentionFilter.length + 1);

        setMessageInput(`${textBeforeMention}@${selectedUser.name} ${textAfterMention}`);
        setShowMentions(false);
    };

    // Submit Text/Attachment Messages
    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!messageInput.trim() && !replyingTo) return;
        if (!activeConversationId) return;

        // Parse mentions list manually from string matching @Users
        const currentConv = conversations.find(c => c._id === activeConversationId) || tempActiveConv;
        const matchingMentions: string[] = [];
        if (currentConv) {
            currentConv.participants.forEach((p: any) => {
                if (messageInput.includes(`@${p.name}`)) {
                    matchingMentions.push(p._id);
                }
            });
        }

        try {
            const formData = new FormData();
            formData.append('content', messageInput.trim());
            if (replyingTo) {
                formData.append('parentMessageId', replyingTo._id);
            }
            if (matchingMentions.length > 0) {
                formData.append('mentions', JSON.stringify(matchingMentions));
            }

            const { data } = await api.post(
                `/conversations/${activeConversationId}/messages`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            setMessages(prev => {
                if (prev.some(m => m._id === data.message._id)) return prev;
                return [...prev, data.message];
            });
            setMessageInput('');
            setReplyingTo(null);

            // Stop typing status immediately
            if (socketRef.current && activeConversationId) {
                socketRef.current.emit('chat_stop_typing', { conversationId: activeConversationId });
            }

            // Sync conversation sidebar & promote empty chat to active recent chat list in background
            fetchConversations();
            setTempActiveConv(null);
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    // Submit file attachment uploads
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0 || !activeConversationId) return;

        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
        const rejected: string[] = [];
        const filesToUpload: File[] = [];

        for (let i = 0; i < fileList.length; i++) {
            if (fileList[i].size > MAX_FILE_SIZE) {
                rejected.push(`"${fileList[i].name}" exceeds the 50 MB size limit`);
            } else {
                filesToUpload.push(fileList[i]);
                // If it is an image, register a local object URL for instant, zero-delay rendering in bubbles
                if (fileList[i].type.startsWith('image/')) {
                    const objectUrl = URL.createObjectURL(fileList[i]);
                    const key = `${fileList[i].name}-${fileList[i].size}`;
                    localPreviewCache.set(key, objectUrl);
                }
            }
        }

        if (rejected.length > 0) {
            toast.error('The following files were not uploaded:\n\n' + rejected.join('\n'));
        }

        if (filesToUpload.length === 0) return;

        const initialQueue = filesToUpload.map((file, idx) => ({
            id: `${Date.now()}-${idx}`,
            name: file.name,
            progress: 0,
            status: 'uploading' as const
        }));

        setUploadingQueue(initialQueue);
        setIsUploadingFile(true);

        try {
            await Promise.all(
                filesToUpload.map(async (file, idx) => {
                    const queueId = initialQueue[idx].id;
                    const formData = new FormData();
                    formData.append('content', '');
                    formData.append('file', file);
                    if (replyingTo) {
                        formData.append('parentMessageId', replyingTo._id);
                    }

                    try {
                        const { data } = await api.post(
                            `/conversations/${activeConversationId}/messages`,
                            formData,
                            {
                                headers: { 'Content-Type': 'multipart/form-data' },
                                onUploadProgress: (progressEvent) => {
                                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                                    setUploadingQueue(prev =>
                                        prev.map(item => item.id === queueId ? { ...item, progress: percentCompleted } : item)
                                    );
                                }
                            }
                        );

                        setUploadingQueue(prev =>
                            prev.map(item => item.id === queueId ? { ...item, progress: 100, status: 'completed' } : item)
                        );

                        setMessages(prev => {
                            if (prev.some(m => m._id === data.message._id)) return prev;
                            return [...prev, data.message];
                        });
                    } catch (uploadError) {
                        setUploadingQueue(prev =>
                            prev.map(item => item.id === queueId ? { ...item, status: 'failed' } : item)
                        );
                        throw uploadError;
                    }
                })
            );

            setReplyingTo(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            // Sync conversation sidebar & promote empty chat to active recent chat list in background
            fetchConversations();
            setTempActiveConv(null);
        } catch (err) {
            console.error('Failed to upload some file attachments:', err);
        } finally {
            // Keep the queue status visible for a brief moment for premium UX, then clean up
            setTimeout(() => {
                setIsUploadingFile(false);
                setUploadingQueue([]);
            }, 1500);
        }
    };

    // React to messages
    const handleReactToMessage = async (messageId: string, emoji: string) => {
        try {
            await api.post(`/conversations/messages/${messageId}/react`, { emoji });
            setActiveReactionPicker(null);
        } catch (err) {
            console.error('Failed to react to message:', err);
        }
    };

    // Delete a specific message for everyone (WhatsApp style)
    const handleDeleteMessage = async (messageId: string) => {
        if (!window.confirm('Are you sure you want to delete this message for everyone?')) return;
        try {
            await api.delete(`/conversations/messages/${messageId}`);
            setMessages(prev => prev.map(m => m._id === messageId ? {
                ...m,
                content: 'This message was deleted',
                attachments: [],
                isDeleted: true
            } : m));
        } catch (err) {
            console.error('Failed to delete message:', err);
        }
    };

    // Edit message content
    const handleEditMessage = async (messageId: string) => {
        if (!editMessageInput.trim()) return;
        try {
            const { data } = await api.put(`/conversations/messages/${messageId}`, {
                content: editMessageInput.trim()
            });

            // Update local state
            setMessages(prev => prev.map(m => m._id === messageId ? data.message : m));
            setEditingMessageId(null);
            setEditMessageInput('');
        } catch (err) {
            console.error('Failed to edit message:', err);
        }
    };

    // Delete entire conversation (WhatsApp style)
    const handleDeleteConversation = async () => {
        if (!activeConversationId) return;
        if (!window.confirm('Are you sure you want to delete this entire chat? This action cannot be undone.')) return;
        try {
            await deleteConversation(activeConversationId);
            setMessages([]);
        } catch (err) {
            console.error('Failed to delete conversation:', err);
        }
    };

    // Forward a message to a specific conversation/chat
    const handleForwardMessage = async (targetConversationId: string) => {
        if (!forwardingMessage) return;
        try {
            const { data } = await api.post(`/conversations/messages/${forwardingMessage._id}/forward`, {
                targetConversationId
            });

            // Mark this conversation as successfully forwarded to
            setForwardSuccessConvIds(prev => [...prev, targetConversationId]);

            // If forwarded to current active chat, append the new message to current view
            if (targetConversationId === activeConversationId) {
                setMessages(prev => {
                    if (prev.some(m => m._id === data.message._id)) return prev;
                    return [...prev, data.message];
                });
            }

            // Sync with local conversations store list in background
            fetchConversations();
        } catch (err) {
            console.error('Failed to forward message:', err);
        }
    };

    // Start a new Direct Conversation or lookup an existing one
    const handleStartDirectChat = async (targetUserId: string) => {
        try {
            const { data } = await api.post('/conversations', {
                type: 'direct',
                participants: [targetUserId]
            });
            // Instantly add to conversations list in store (snappy, no loading lag)
            addConversation(data.conversation);
            setTempActiveConv(data.conversation);
            setActiveConversationId(data.conversation._id);
            setSearchQuery('');
            // Sync all conversations in the background to ensure absolute consistency
            fetchConversations();
        } catch (err) {
            console.error('Failed to start direct conversation:', err);
        }
    };



    // Helpers to sort & structure conversations list
    const matchesNameStart = (name: string, query: string) => {
        if (!query) return true;
        const lowerQuery = query.toLowerCase().trim();
        const parts = name.toLowerCase().split(/\s+/);
        return parts.some(part => part.startsWith(lowerQuery));
    };

    const filteredConversations = conversations.filter(c => {
        return matchesNameStart(c.name, searchQuery);
    });

    const matchingExternalUsers = searchQuery.trim() ? users.filter(u => {
        const inConversations = conversations.some(c => c.type === 'direct' && c.participants.some(p => p._id === u._id));
        const isSelf = u._id === user?._id;
        return !inConversations && !isSelf && matchesNameStart(u.name, searchQuery);
    }) : [];

    const activeConv = conversations.find(c => c._id === activeConversationId) || tempActiveConv;

    // Grouping messages by date header
    const formatMessageDateHeader = (dateStr: string) => {
        const msgDate = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (msgDate.toDateString() === today.toDateString()) return 'Today';
        if (msgDate.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return msgDate.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
    };

    // Render formatted content text with mentions highlights
    const renderMessageContent = (text: string) => {
        if (!text) return null;

        // Find @Name patterns
        const regex = /(@[A-Za-z0-9\s]+?)(?=\s|@|$)/g;
        const parts = text.split(regex);

        return parts.map((part, idx) => {
            if (part.startsWith('@')) {
                return (
                    <span
                        key={idx}
                        style={{
                            fontWeight: 700,
                            color: 'var(--color-primary)',
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'var(--color-primary-light)',
                            fontSize: '0.75rem',
                            display: 'inline-block',
                            margin: '2px 0',
                            border: '1px solid rgba(99, 102, 241, 0.2)'
                        }}
                    >
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    // Emoji reaction icons bar list
    const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

    return (
        <div style={{
            height: 'calc(100vh - 120px)',
            display: 'flex',
            borderRadius: 24,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            position: 'relative',
        }}>

            {/* LEFT PANEL: Chats List */}
            <div style={{
                width: 340,
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
            }}>

                {/* Search & Actions Header */}
                <div style={{
                    padding: 16,
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            margin: 0,
                            color: 'var(--color-text)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}>
                            <MessageSquare style={{ color: 'var(--color-primary)' }} size={22} />
                            Chat
                        </h2>
                    </div>

                    {/* Search Field */}
                    <div style={{ position: 'relative' }}>
                        <Search style={{
                            position: 'absolute',
                            left: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--color-text-tertiary)',
                        }} size={16} />
                        <input
                            type="text"
                            placeholder="Search chats or find colleagues..."
                            className="input"
                            style={{ paddingLeft: 36 }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Conversations Scroll Container */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                }}>
                    {isLoading ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '32px 16px',
                            gap: 12,
                        }}>
                            <div style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                border: '2px solid var(--color-surface-hover)',
                                borderTopColor: 'var(--color-primary)',
                                animation: 'chatsPageSpinner 1s linear infinite',
                            }} />
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                Loading conversations...
                            </span>
                        </div>
                    ) : (
                        <>
                            {/* Active Conversations */}
                            {filteredConversations.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {filteredConversations.map(c => {
                                        const isActive = c._id === activeConversationId;
                                        const showOnline = c.type === 'direct' && c.isOnline;
                                        const latestMsg = c.lastMessage;
                                        const isHovered = hoveredConvId === c._id;

                                        return (
                                            <div
                                                key={c._id}
                                                onClick={() => setActiveConversationId(c._id)}
                                                onMouseEnter={() => setHoveredConvId(c._id)}
                                                onMouseLeave={() => setHoveredConvId(null)}
                                                style={{
                                                    padding: 12,
                                                    borderRadius: 14,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    cursor: 'pointer',
                                                    background: isActive
                                                        ? 'var(--color-primary-light)'
                                                        : (isHovered ? 'var(--color-surface-hover)' : 'transparent'),
                                                    transition: 'background 0.2s',
                                                    border: isActive ? '1px solid rgba(99, 102, 241, 0.15)' : '1px solid transparent',
                                                }}
                                            >
                                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                                    <Avatar src={c.avatar} name={c.name} size={40} />
                                                    {showOnline && (
                                                        <span style={{
                                                            position: 'absolute',
                                                            bottom: 0,
                                                            right: 0,
                                                            width: 10,
                                                            height: 10,
                                                            background: '#10b981',
                                                            borderRadius: '50%',
                                                            border: '2px solid var(--color-surface)',
                                                        }} />
                                                    )}
                                                </div>

                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        marginBottom: 4,
                                                    }}>
                                                        <h4 style={{
                                                            fontSize: '0.875rem',
                                                            fontWeight: 600,
                                                            margin: 0,
                                                            color: 'var(--color-text)',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            maxWidth: '75%',
                                                        }}>
                                                            {c.name}
                                                        </h4>
                                                        {latestMsg && (
                                                            <span style={{
                                                                fontSize: '10px',
                                                                color: 'var(--color-text-tertiary)',
                                                            }}>
                                                                {new Date(latestMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                    }}>
                                                        <p style={{
                                                            fontSize: '0.75rem',
                                                            color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                                            margin: 0,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            maxWidth: '85%',
                                                        }}>
                                                            {latestMsg ? (
                                                                <>
                                                                    {latestMsg.sender._id === user?._id ? 'You: ' : `${latestMsg.sender.name}: `}
                                                                    {latestMsg.content || 'Sent an attachment'}
                                                                </>
                                                            ) : (
                                                                'No messages yet'
                                                            )}
                                                        </p>
                                                        {c.unreadCount > 0 && (
                                                            <span style={{
                                                                background: 'var(--color-danger)',
                                                                color: 'white',
                                                                fontSize: '10px',
                                                                fontWeight: 700,
                                                                borderRadius: '50%',
                                                                minWidth: 18,
                                                                height: 18,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                padding: '0 4px',
                                                            }}>
                                                                {c.unreadCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Lookup New FlowDesk Members */}
                            {matchingExternalUsers.length > 0 && (
                                <div style={{
                                    paddingTop: 12,
                                    borderTop: '1px solid var(--color-border)',
                                    marginTop: 8,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 4,
                                }}>
                                    <h5 style={{
                                        padding: '0 8px',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        color: 'var(--color-text-tertiary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        margin: '0 0 6px 0',
                                    }}>
                                        Start new chat
                                    </h5>
                                    {matchingExternalUsers.map(u => {
                                        const isHovered = hoveredContactId === u._id;
                                        return (
                                            <div
                                                key={u._id}
                                                onClick={() => handleStartDirectChat(u._id)}
                                                onMouseEnter={() => setHoveredContactId(u._id)}
                                                onMouseLeave={() => setHoveredContactId(null)}
                                                style={{
                                                    padding: 10,
                                                    borderRadius: 12,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    cursor: 'pointer',
                                                    background: isHovered ? 'var(--color-surface-hover)' : 'transparent',
                                                    transition: 'background 0.2s',
                                                }}
                                            >
                                                <Avatar src={u.avatar} name={u.name} size={32} />
                                                <div>
                                                    <h4 style={{
                                                        fontSize: '0.8125rem',
                                                        fontWeight: 600,
                                                        margin: 0,
                                                        color: 'var(--color-text)',
                                                    }}>{u.name}</h4>
                                                    <p style={{
                                                        fontSize: '10px',
                                                        color: 'var(--color-text-tertiary)',
                                                        margin: 0,
                                                        textTransform: 'capitalize',
                                                    }}>{u.role}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {filteredConversations.length === 0 && matchingExternalUsers.length === 0 && (
                                <div style={{
                                    padding: '32px 16px',
                                    textAlign: 'center',
                                    color: 'var(--color-text-tertiary)',
                                    fontSize: '0.75rem',
                                }}>
                                    No chats or members found
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* RIGHT PANEL: Messages Board */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--color-bg)',
            }}>

                {activeConv ? (
                    <>
                        {/* Conversation Header */}
                        <div style={{
                            height: 64,
                            padding: '0 24px',
                            borderBottom: '1px solid var(--color-border)',
                            background: 'var(--color-surface)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            zIndex: 10,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Avatar src={activeConv.avatar} name={activeConv.name} size={38} />
                                <div>
                                    <h3 style={{
                                        fontSize: '0.875rem',
                                        fontWeight: 700,
                                        margin: 0,
                                        color: 'var(--color-text)',
                                    }}>
                                        {activeConv.name}
                                    </h3>
                                    <p style={{
                                        fontSize: '10px',
                                        color: 'var(--color-text-tertiary)',
                                        margin: 0,
                                        fontWeight: 500,
                                    }}>
                                        {typingUsers.length > 0 ? (
                                            <span style={{ color: 'var(--color-primary)', animation: 'pulse-dot 1.5s infinite' }}>
                                                {typingUsers.map(u => u.name).join(', ')} typing...
                                            </span>
                                        ) : activeConv.type === 'direct' ? (
                                            activeConv.isOnline ? 'Online' : 'Offline'
                                        ) : (
                                            `Group · ${activeConv.participants?.length || 0} participants`
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Delete Chat Action Button */}
                            <button
                                onClick={handleDeleteConversation}
                                style={{
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--color-text-tertiary)',
                                    padding: '8px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                    e.currentTarget.style.color = 'var(--color-danger)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'none';
                                    e.currentTarget.style.color = 'var(--color-text-tertiary)';
                                }}
                                title="Delete Chat"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>

                        {/* Messages Log Panel */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16,
                        }}>
                            {loadingMessages ? (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 16,
                                    flex: 1,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    minHeight: '200px',
                                    height: '100%',
                                }}>
                                    <div style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: '50%',
                                        border: '3px solid var(--color-surface-hover)',
                                        borderTopColor: 'var(--color-primary)',
                                        animation: 'chatsPageSpinner 1s linear infinite',
                                    }} />
                                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                                        Loading your messages...
                                    </span>
                                    <style>{`
                                        @keyframes chatsPageSpinner {
                                            to { transform: rotate(360deg); }
                                        }
                                    `}</style>
                                </div>
                            ) : messages.length === 0 ? (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flex: 1,
                                    color: 'var(--color-text-tertiary)',
                                    fontSize: '0.875rem',
                                    textAlign: 'center',
                                    padding: '40px 20px',
                                }}>
                                    No messages yet. Send a message to start the conversation!
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = msg.sender._id === user?._id;
                                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                                    const isNewDate = !prevMsg || new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();
                                    const isSelfRead = msg.readBy?.length > 1;
                                    const isMsgHovered = hoveredMsgId === msg._id;

                                    return (
                                        <div key={msg._id} style={{ display: 'flex', flexDirection: 'column' }}>
                                            {/* Date Separator Header */}
                                            {isNewDate && (
                                                <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
                                                    <span style={{
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        color: 'var(--color-text-tertiary)',
                                                        background: 'var(--color-surface-hover)',
                                                        padding: '4px 12px',
                                                        borderRadius: 20,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em',
                                                    }}>
                                                        {formatMessageDateHeader(msg.createdAt)}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Message Bubble Row */}
                                            <div
                                                onMouseEnter={() => setHoveredMsgId(msg._id)}
                                                onMouseLeave={() => {
                                                    setHoveredMsgId(null);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                                                    alignItems: 'flex-end',
                                                    gap: 8,
                                                    width: '100%',
                                                    position: 'relative',
                                                }}
                                            >
                                                {/* Action Icons to the left of the bubble if it's sent by current user */}
                                                {isMe && (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        opacity: isMsgHovered || activeReactionPickerId === msg._id ? 1 : 0,
                                                        transition: 'opacity 0.2s',
                                                        marginLeft: 4,
                                                        marginRight: 4,
                                                        pointerEvents: isMsgHovered || activeReactionPickerId === msg._id ? 'auto' : 'none',
                                                        flexDirection: 'row-reverse',
                                                    }}>
                                                        {/* Smile reaction icon */}
                                                        <div style={{ position: 'relative' }}>
                                                            <button
                                                                onClick={() => setActiveReactionPickerId(activeReactionPickerId === msg._id ? null : msg._id)}
                                                                style={{
                                                                    border: 'none',
                                                                    background: 'none',
                                                                    cursor: 'pointer',
                                                                    padding: '4px',
                                                                    color: 'var(--color-text-tertiary)',
                                                                    borderRadius: '50%',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    transition: 'background 0.2s',
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                                                title="React to Message"
                                                            >
                                                                <Smile size={16} />
                                                            </button>

                                                            {/* Emoji reaction popup */}
                                                            {activeReactionPickerId === msg._id && (
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    bottom: '100%',
                                                                    right: 0,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 6,
                                                                    padding: '6px 8px',
                                                                    background: 'var(--color-surface)',
                                                                    border: '1px solid var(--color-border)',
                                                                    borderRadius: 12,
                                                                    boxShadow: 'var(--shadow-lg)',
                                                                    zIndex: 40,
                                                                    whiteSpace: 'nowrap',
                                                                    marginBottom: 6,
                                                                }}>
                                                                    {emojis.map(e => (
                                                                        <button
                                                                            key={e}
                                                                            onClick={() => {
                                                                                handleReactToMessage(msg._id, e);
                                                                                setActiveReactionPickerId(null);
                                                                            }}
                                                                            style={{
                                                                                border: 'none',
                                                                                background: 'none',
                                                                                cursor: 'pointer',
                                                                                padding: '2px 4px',
                                                                                fontSize: '1rem',
                                                                                transition: 'transform 0.1s',
                                                                            }}
                                                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.25)'}
                                                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                                        >
                                                                            {e}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Forward message icon */}
                                                        <button
                                                            onClick={() => {
                                                                setForwardingMessage(msg);
                                                                setForwardSuccessConvIds([]);
                                                            }}
                                                            style={{
                                                                border: 'none',
                                                                background: 'none',
                                                                cursor: 'pointer',
                                                                padding: '4px',
                                                                color: 'var(--color-text-tertiary)',
                                                                borderRadius: '50%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                transition: 'background 0.2s',
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                                            title="Forward Message"
                                                        >
                                                            <CornerUpRight size={16} />
                                                        </button>

                                                        {/* Edit message icon */}
                                                        {!msg.isDeleted && (
                                                            <button
                                                                onClick={() => {
                                                                    setEditingMessageId(msg._id);
                                                                    setEditMessageInput(msg.content);
                                                                }}
                                                                style={{
                                                                    border: 'none',
                                                                    background: 'none',
                                                                    cursor: 'pointer',
                                                                    padding: '4px',
                                                                    color: 'var(--color-text-tertiary)',
                                                                    borderRadius: '50%',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    transition: 'background 0.2s',
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                                                title="Edit Message"
                                                            >
                                                                <Edit3 size={16} />
                                                            </button>
                                                        )}

                                                        {/* Trash icon */}
                                                        {!msg.isDeleted && (
                                                            <button
                                                                onClick={() => handleDeleteMessage(msg._id)}
                                                                style={{
                                                                    border: 'none',
                                                                    background: 'none',
                                                                    cursor: 'pointer',
                                                                    padding: '4px',
                                                                    color: 'var(--color-danger)',
                                                                    borderRadius: '50%',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    transition: 'background 0.2s',
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                                                title="Delete for Everyone"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                <div style={{ position: 'relative', maxWidth: '70%' }}>
                                                    {/* Parent Reply Context Preview */}
                                                    {msg.parentMessage && (
                                                        <div style={{
                                                            marginBottom: 4,
                                                            padding: 8,
                                                            borderRadius: 10,
                                                            background: 'rgba(0, 0, 0, 0.05)',
                                                            borderLeft: '4px solid var(--color-border)',
                                                            fontSize: '11px',
                                                            color: 'var(--color-text-secondary)',
                                                        }}>
                                                            <span style={{ fontWeight: 600, display: 'block' }}>{msg.parentMessage.sender.name}</span>
                                                            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.parentMessage.content}</span>
                                                        </div>
                                                    )}

                                                    {/* Main Bubble Card */}
                                                    <div style={{
                                                        padding: '10px 14px',
                                                        borderRadius: isMe ? '16px 16px 0px 16px' : '16px 16px 16px 0px',
                                                        background: isMe ? 'var(--color-primary)' : 'var(--color-surface)',
                                                        color: isMe ? 'white' : 'var(--color-text)',
                                                        border: isMe ? 'none' : '1px solid var(--color-border)',
                                                        boxShadow: 'var(--shadow-sm)',
                                                        wordBreak: 'break-word',
                                                        fontSize: '0.875rem',
                                                    }}>
                                                        {msg.isDeleted ? (
                                                            <span style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 6,
                                                                fontStyle: 'italic',
                                                                opacity: 0.7,
                                                                fontSize: '0.8125rem',
                                                                color: isMe ? 'rgba(255, 255, 255, 0.8)' : 'var(--color-text-tertiary)'
                                                            }}>
                                                                <Ban size={14} />
                                                                This message was deleted
                                                            </span>
                                                        ) : editingMessageId === msg._id ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                                <textarea
                                                                    className="input"
                                                                    style={{
                                                                        width: '100%',
                                                                        minWidth: 200,
                                                                        height: 60,
                                                                        background: isMe ? 'rgba(255, 255, 255, 0.15)' : 'var(--color-bg)',
                                                                        color: isMe ? 'white' : 'var(--color-text)',
                                                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                                                        borderRadius: 8,
                                                                        fontSize: '0.875rem',
                                                                        padding: 8,
                                                                        resize: 'none',
                                                                    }}
                                                                    value={editMessageInput}
                                                                    onChange={(e) => setEditMessageInput(e.target.value)}
                                                                    autoFocus
                                                                />
                                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingMessageId(null);
                                                                            setEditMessageInput('');
                                                                        }}
                                                                        className="btn btn-ghost"
                                                                        style={{
                                                                            height: 24,
                                                                            padding: '0 8px',
                                                                            fontSize: '10px',
                                                                            color: isMe ? 'rgba(255, 255, 255, 0.8)' : 'var(--color-text-secondary)',
                                                                        }}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleEditMessage(msg._id)}
                                                                        className="btn btn-primary"
                                                                        style={{
                                                                            height: 24,
                                                                            padding: '0 12px',
                                                                            fontSize: '10px',
                                                                            borderRadius: 6,
                                                                            background: isMe ? 'white' : 'var(--color-primary)',
                                                                            color: isMe ? 'var(--color-primary)' : 'white',
                                                                            border: 'none',
                                                                            fontWeight: 700,
                                                                        }}
                                                                    >
                                                                        Save
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {/* Attachments rendering */}
                                                                {msg.attachments && msg.attachments.length > 0 && (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 6 }}>
                                                                        {msg.attachments.map(att => {
                                                                            const cacheKey = `${att.originalName || att.fileName || att.filename}-${att.fileSize || 0}`;
                                                                            const localUrl = localPreviewCache.get(cacheKey);
                                                                            const fileUrl = localUrl || (att.filePath ? `${SOCKET_URL}${att.filePath}` : `${SOCKET_URL}/uploads/${att.fileName || att.filename}`);
                                                                            const ext = (att.fileName || att.filename || att.originalName || '').split('.').pop()?.toLowerCase() || '';
                                                                            const isImage = att.fileType?.startsWith('image/') || att.contentType?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);

                                                                            if (isImage) {
                                                                                return (
                                                                                    <div key={att._id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', maxWidth: 220 }}>
                                                                                        <img src={fileUrl} alt={att.originalName} style={{ objectFit: 'cover', maxHeight: 150, width: '100%', borderRadius: 8, display: 'block' }} />
                                                                                        <a
                                                                                            href={fileUrl}
                                                                                            download={att.originalName}
                                                                                            style={{
                                                                                                position: 'absolute',
                                                                                                inset: 0,
                                                                                                background: 'rgba(0,0,0,0.4)',
                                                                                                display: 'flex',
                                                                                                alignItems: 'center',
                                                                                                justifyContent: 'center',
                                                                                                color: 'white',
                                                                                                textDecoration: 'none',
                                                                                            }}
                                                                                        >
                                                                                            <Download size={18} />
                                                                                        </a>
                                                                                    </div>
                                                                                );
                                                                            }

                                                                            return (
                                                                                <div key={att._id} style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: 8,
                                                                                    padding: 8,
                                                                                    borderRadius: 8,
                                                                                    background: isMe ? 'rgba(255,255,255,0.15)' : 'var(--color-bg)',
                                                                                    border: '1px solid rgba(0,0,0,0.05)',
                                                                                    color: 'inherit',
                                                                                }}>
                                                                                    <FileText size={20} style={{ color: isMe ? 'white' : 'var(--color-primary)' }} />
                                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                                        <p style={{ fontSize: '0.75rem', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.originalName}</p>
                                                                                        <p style={{ fontSize: '9px', opacity: 0.8, margin: 0 }}>{(att.fileSize / 1024).toFixed(1)} KB</p>
                                                                                    </div>
                                                                                    <a href={fileUrl} download={att.originalName} style={{ color: 'inherit', display: 'flex' }}>
                                                                                        <Download size={14} />
                                                                                    </a>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}

                                                                {/* Message Content Text */}
                                                                {msg.content && (
                                                                    <p style={{ margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                                                        {renderMessageContent(msg.content)}
                                                                        {msg.isEdited && (
                                                                            <span style={{
                                                                                fontSize: '10px',
                                                                                opacity: 0.7,
                                                                                marginLeft: 6,
                                                                                fontStyle: 'italic',
                                                                                color: 'inherit',
                                                                                display: 'inline-block'
                                                                            }}>
                                                                                (edited)
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                )}
                                                            </>
                                                        )}

                                                        {/* Message Metadata Footer */}
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'flex-end',
                                                            gap: 4,
                                                            marginTop: 4,
                                                        }}>
                                                            <span style={{
                                                                fontSize: '9px',
                                                                opacity: 0.7,
                                                                color: isMe ? 'rgba(255, 255, 255, 0.8)' : 'var(--color-text-tertiary)',
                                                            }}>
                                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            {isMe && (
                                                                isSelfRead ? (
                                                                    <CheckCheck size={12} style={{ color: '#93c5fd' }} />
                                                                ) : (
                                                                    <Check size={12} style={{ color: 'rgba(255,255,255,0.6)' }} />
                                                                )
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Message Reactions Pills */}
                                                    {msg.reactions && msg.reactions.length > 0 && (
                                                        <div style={{
                                                            display: 'flex',
                                                            flexWrap: 'wrap',
                                                            gap: 4,
                                                            marginTop: 4,
                                                            justifyContent: isMe ? 'flex-end' : 'flex-start',
                                                        }}>
                                                            {Object.entries(
                                                                msg.reactions.reduce((acc: Record<string, number>, cur) => {
                                                                    acc[cur.emoji] = (acc[cur.emoji] || 0) + 1;
                                                                    return acc;
                                                                }, {})
                                                            ).map(([emoji, count]) => (
                                                                <button
                                                                    key={emoji}
                                                                    onClick={() => handleReactToMessage(msg._id, emoji)}
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 2,
                                                                        padding: '2px 6px',
                                                                        borderRadius: 12,
                                                                        background: 'var(--color-surface)',
                                                                        border: '1px solid var(--color-border)',
                                                                        fontSize: '10px',
                                                                        cursor: 'pointer',
                                                                        boxShadow: 'var(--shadow-sm)',
                                                                    }}
                                                                    title={msg.reactions.filter(r => r.emoji === emoji).map(r => r.user.name).join(', ')}
                                                                >
                                                                    <span>{emoji}</span>
                                                                    <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{count}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action Icons to the right of the bubble if it's sent by another user */}
                                                {!isMe && (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        opacity: isMsgHovered || activeReactionPickerId === msg._id ? 1 : 0,
                                                        transition: 'opacity 0.2s',
                                                        marginLeft: 4,
                                                        marginRight: 4,
                                                        pointerEvents: isMsgHovered || activeReactionPickerId === msg._id ? 'auto' : 'none',
                                                    }}>
                                                        {/* Smile reaction icon */}
                                                        <div style={{ position: 'relative' }}>
                                                            <button
                                                                onClick={() => setActiveReactionPickerId(activeReactionPickerId === msg._id ? null : msg._id)}
                                                                style={{
                                                                    border: 'none',
                                                                    background: 'none',
                                                                    cursor: 'pointer',
                                                                    padding: '4px',
                                                                    color: 'var(--color-text-tertiary)',
                                                                    borderRadius: '50%',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    transition: 'background 0.2s',
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                                                title="React to Message"
                                                            >
                                                                <Smile size={16} />
                                                            </button>

                                                            {/* Emoji reaction popup */}
                                                            {activeReactionPickerId === msg._id && (
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    bottom: '100%',
                                                                    left: 0,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 6,
                                                                    padding: '6px 8px',
                                                                    background: 'var(--color-surface)',
                                                                    border: '1px solid var(--color-border)',
                                                                    borderRadius: 12,
                                                                    boxShadow: 'var(--shadow-lg)',
                                                                    zIndex: 40,
                                                                    whiteSpace: 'nowrap',
                                                                    marginBottom: 6,
                                                                }}>
                                                                    {emojis.map(e => (
                                                                        <button
                                                                            key={e}
                                                                            onClick={() => {
                                                                                handleReactToMessage(msg._id, e);
                                                                                setActiveReactionPickerId(null);
                                                                            }}
                                                                            style={{
                                                                                border: 'none',
                                                                                background: 'none',
                                                                                cursor: 'pointer',
                                                                                padding: '2px 4px',
                                                                                fontSize: '1rem',
                                                                                transition: 'transform 0.1s',
                                                                            }}
                                                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.25)'}
                                                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                                        >
                                                                            {e}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Forward message icon */}
                                                        <button
                                                            onClick={() => {
                                                                setForwardingMessage(msg);
                                                                setForwardSuccessConvIds([]);
                                                            }}
                                                            style={{
                                                                border: 'none',
                                                                background: 'none',
                                                                cursor: 'pointer',
                                                                padding: '4px',
                                                                color: 'var(--color-text-tertiary)',
                                                                borderRadius: '50%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                transition: 'background 0.2s',
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                                            title="Forward Message"
                                                        >
                                                            <CornerUpRight size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* COMPOSER PANEL */}
                        <div style={{
                            padding: 16,
                            borderTop: '1px solid var(--color-border)',
                            background: 'var(--color-surface)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            position: 'relative',
                        }}>

                            {/* Mentions Autocomplete Suggestions Box */}
                            {showMentions && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    left: 16,
                                    marginBottom: 8,
                                    width: 240,
                                    background: 'var(--color-surface)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 12,
                                    boxShadow: 'var(--shadow-lg)',
                                    maxHeight: 180,
                                    overflowY: 'auto',
                                    padding: 6,
                                    zIndex: 40,
                                }}>
                                    <div style={{
                                        padding: '4px 8px',
                                        fontSize: '9px',
                                        fontWeight: 700,
                                        color: 'var(--color-text-tertiary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        borderBottom: '1px solid var(--color-border)',
                                        marginBottom: 4,
                                    }}>
                                        Mention Team Member
                                    </div>
                                    {activeConv.participants
                                        .filter((p: any) => p._id !== user?._id && p.name.toLowerCase().includes(mentionFilter))
                                        .map((p: any) => (
                                            <div
                                                key={p._id}
                                                onClick={() => selectMention(p)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    padding: 6,
                                                    cursor: 'pointer',
                                                    borderRadius: 8,
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'var(--color-surface-hover)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'transparent';
                                                }}
                                            >
                                                <Avatar src={p.avatar} name={p.name} size={24} />
                                                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text)' }}>{p.name}</span>
                                            </div>
                                        ))}
                                </div>
                            )}

                            {/* File Upload Progress Bar */}
                            {isUploadingFile && uploadingQueue.length > 0 && (
                                <div style={{
                                    padding: '12px 16px',
                                    background: 'var(--color-surface)',
                                    borderRadius: 16,
                                    border: '1px solid var(--color-border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 10,
                                    marginBottom: 8,
                                    boxShadow: 'var(--shadow-md)',
                                    maxHeight: 180,
                                    overflowY: 'auto'
                                }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 2 }}>
                                        Uploading attachments ({uploadingQueue.filter(f => f.status === 'completed').length}/{uploadingQueue.length})
                                    </div>
                                    {uploadingQueue.map(file => (
                                        <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{
                                                width: 14,
                                                height: 14,
                                                borderRadius: '50%',
                                                border: '2px solid var(--color-surface-hover)',
                                                borderTopColor: file.status === 'failed' ? 'var(--color-danger)' : (file.status === 'completed' ? '#10b981' : 'var(--color-primary)'),
                                                animation: file.status === 'uploading' ? 'chatsPageSpinner 1s linear infinite' : 'none',
                                                flexShrink: 0,
                                            }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, fontSize: '11px' }}>
                                                    <span style={{
                                                        color: 'var(--color-text)',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        maxWidth: '80%'
                                                    }}>
                                                        {file.name}
                                                    </span>
                                                    <span style={{
                                                        fontWeight: 600,
                                                        color: file.status === 'failed' ? 'var(--color-danger)' : (file.status === 'completed' ? '#10b981' : 'var(--color-primary)')
                                                    }}>
                                                        {file.status === 'failed' ? 'Failed' : (file.status === 'completed' ? 'Done' : `${file.progress}%`)}
                                                    </span>
                                                </div>
                                                <div style={{ height: 4, borderRadius: 2, background: 'var(--color-surface-hover)', overflow: 'hidden' }}>
                                                    <div style={{
                                                        height: '100%',
                                                        width: `${file.progress}%`,
                                                        background: file.status === 'failed' ? 'var(--color-danger)' : (file.status === 'completed' ? '#10b981' : 'var(--color-primary)'),
                                                        transition: 'width 0.1s ease',
                                                    }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Reply preview bar */}
                            {replyingTo && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    borderRadius: 12,
                                    background: 'var(--color-surface-hover)',
                                    borderLeft: '4px solid var(--color-primary)',
                                    marginBottom: 4,
                                }}>
                                    <div style={{ fontSize: '12px' }}>
                                        <span style={{ fontWeight: 700, display: 'block', color: 'var(--color-text)' }}>
                                            Replying to {replyingTo.sender.name}
                                        </span>
                                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-secondary)', fontSize: '11px' }}>
                                            {replyingTo.content || 'Attachment asset'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setReplyingTo(null)}
                                        style={{
                                            border: 'none',
                                            background: 'none',
                                            cursor: 'pointer',
                                            padding: 4,
                                            color: 'var(--color-text-secondary)',
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Main Composer Form */}
                            <form onSubmit={handleSendMessage} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <input
                                    type="file"
                                    multiple
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="btn btn-secondary"
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 10,
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}
                                    title="Add attachment"
                                >
                                    <Paperclip size={18} />
                                </button>

                                {/* Compose Textarea */}
                                <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <textarea
                                        rows={1}
                                        value={messageInput}
                                        onChange={handleInputChange}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        placeholder="Type a message... Use @ to mention"
                                        className="input"
                                        style={{
                                            minHeight: 40,
                                            maxHeight: 120,
                                            paddingRight: 40,
                                            resize: 'none',
                                            paddingTop: 10,
                                        }}
                                    />
                                    {/* Simple Composer Emoji helper */}
                                    <button
                                        type="button"
                                        onClick={() => setShowComposerEmoji(!showComposerEmoji)}
                                        style={{
                                            position: 'absolute',
                                            right: 12,
                                            border: 'none',
                                            background: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--color-text-tertiary)',
                                        }}
                                    >
                                        {
                                            showComposerEmoji ? (
                                                <X size={18} />
                                            ) :
                                                (
                                                    <Smile size={18} />
                                                )
                                        }
                                    </button>

                                    {/* Inline emoji dropdown picker */}
                                    {showComposerEmoji && (
                                        <div style={{
                                            position: 'absolute',
                                            right: 0,
                                            bottom: '100%',
                                            marginBottom: 12,
                                            width: 250,
                                            background: 'var(--color-surface)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 16,
                                            boxShadow: 'var(--shadow-xl)',
                                            padding: 8,
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(6, 1fr)',
                                            gap: 4,
                                            zIndex: 40,
                                        }}>
                                            {['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🤫', '🤥', '😶', '😶‍🌫️', '😐', '😑', '😬', '🫨', '🫠', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😮‍', '😵', '😵‍💫', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🫶', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸', '❤️', '🩷', '🧡', '💛', '💚', '💙', '🩵', '💜', '🤎', '🖤', '🩶', '🤍', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🔥', '✨', '⭐', '🎈', '🎉', '🎊', '🎁', '🎂', '🎄', '🎆', '🎇', '🧨', '🎈', '🪄', '🧿', '🎨', '🎬', '🎤', '🎧', '🎷', '🎸', '🎹', '🎺', '🎻', '🥁', '🪘', '🎮', '🕹️', '🎰', '🎯', '🎳', '🏎️', '🏍️', '🚲', '🛴', '🛹', '🛼', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🛵', '🏍️', '🛴', '🚲', '🛺', '🚂', '🚆', '🚇', '🚊', '🏎️', '🚀', '🚁', '🛸', '🛫', '🛬', '✈️', '⛵', '🛥️', '🚢', '🗺️', '🧭', '🧭', '🧭', '🧭'].slice(0, 36).map(e => (
                                                <button
                                                    key={e}
                                                    type="button"
                                                    onClick={() => {
                                                        setMessageInput(prev => prev + e);
                                                        setShowComposerEmoji(false);
                                                    }}
                                                    style={{
                                                        border: 'none',
                                                        background: 'none',
                                                        cursor: 'pointer',
                                                        fontSize: '1.25rem',
                                                        padding: 4,
                                                    }}
                                                >
                                                    {e}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 10,
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    /* UNSELECTED LANDING PANEL VIEW */
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 32,
                        textAlign: 'center',
                    }}>
                        <div style={{
                            width: 80,
                            height: 80,
                            borderRadius: 24,
                            background: 'var(--color-primary-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-primary)',
                            marginBottom: 24,
                            boxShadow: 'var(--shadow-md)',
                        }}>
                            <MessageSquare size={38} />
                        </div>
                        <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            margin: '0 0 8px 0',
                            color: 'var(--color-text)',
                        }}>
                            FlowDesk Chat
                        </h3>
                        <p style={{
                            fontSize: '0.875rem',
                            color: 'var(--color-text-secondary)',
                            maxWidth: 320,
                            lineHeight: 1.6,
                            margin: '0 0 24px 0',
                        }}>
                            Start direct conversations with colleagues in real-time. Share file uploads, mention colleagues, and react to messages instantly.
                        </p>
                    </div>
                )
                }
            </div >



            {/* MODAL: Forward Message (WhatsApp style) */}
            {
                forwardingMessage && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        backdropFilter: 'blur(4px)',
                        padding: 16,
                    }}>
                        <div className="card" style={{
                            width: '100%',
                            maxWidth: 440,
                            padding: 24,
                            background: 'var(--color-surface)',
                            borderRadius: 16,
                            border: '1px solid var(--color-border)',
                            boxShadow: 'var(--shadow-xl)',
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: '80vh',
                        }}>
                            {/* Modal Header */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 20,
                            }}>
                                <h3 style={{
                                    fontSize: '1.125rem',
                                    fontWeight: 700,
                                    margin: 0,
                                    color: 'var(--color-text)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                }}>
                                    <CornerUpRight style={{ color: 'var(--color-primary)' }} size={20} />
                                    Forward Message
                                </h3>
                                <button
                                    onClick={() => setForwardingMessage(null)}
                                    style={{
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--color-text-secondary)',
                                        display: 'flex',
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Original Content Preview snippet */}
                            <div style={{
                                padding: '10px 12px',
                                background: 'var(--color-bg)',
                                borderLeft: '4px solid var(--color-primary)',
                                borderRadius: 8,
                                fontSize: '11px',
                                color: 'var(--color-text-secondary)',
                                marginBottom: 16,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                                <span style={{ fontWeight: 600, display: 'block', marginBottom: 2 }}>Original Message:</span>
                                {forwardingMessage.content || '[File Attachment]'}
                            </div>

                            {/* Search Input for Recipients */}
                            <div style={{ position: 'relative', marginBottom: 16 }}>
                                <Search size={14} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--color-text-tertiary)' }} />
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Search chats..."
                                    style={{ fontSize: '0.75rem', paddingLeft: 38, width: '100%', height: 40 }}
                                    value={forwardSearchQuery}
                                    onChange={(e) => setForwardSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Recipients List Wrapper */}
                            <div style={{
                                flex: 1,
                                maxHeight: 250,
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                border: '1px solid var(--color-border)',
                                borderRadius: 12,
                                padding: 8,
                                background: 'var(--color-bg)',
                            }}>
                                {conversations
                                    .filter(c => !forwardSearchQuery.trim() || c.name.toLowerCase().includes(forwardSearchQuery.toLowerCase()))
                                    .map(c => {
                                        const isSent = forwardSuccessConvIds.includes(c._id);
                                        return (
                                            <div
                                                key={c._id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: 8,
                                                    borderRadius: 8,
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'var(--color-surface)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'transparent';
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <Avatar src={c.avatar} name={c.name} size={32} />
                                                    <div>
                                                        <h4 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>{c.name}</h4>
                                                        <p style={{ fontSize: '9px', color: 'var(--color-text-tertiary)', margin: 0, textTransform: 'capitalize' }}>
                                                            {c.type === 'group' ? 'Group Chat' : 'Direct Chat'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {isSent ? (
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-success)' }}>
                                                        Sent ✅
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleForwardMessage(c._id)}
                                                        className="btn btn-primary"
                                                        style={{ height: 26, padding: '0 12px', fontSize: '9px', borderRadius: 8, fontWeight: 700 }}
                                                    >
                                                        Forward
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}

                                {conversations.filter(c => !forwardSearchQuery.trim() || c.name.toLowerCase().includes(forwardSearchQuery.toLowerCase())).length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-tertiary)', fontSize: '11px' }}>
                                        No matching chats found
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer done action button */}
                            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                                <button
                                    onClick={() => setForwardingMessage(null)}
                                    className="btn btn-secondary"
                                    style={{ flex: 1, fontSize: '0.75rem', fontWeight: 700 }}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
