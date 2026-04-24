import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Avatar from '../components/common/Avatar';
import { useAuthStore } from '../store/authStore';
import { Plus, Search, FolderKanban, Users, Filter, User, X, Building2 } from 'lucide-react';
import { format } from 'date-fns';

const PRIORITY_LABELS: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
const STATUS_LABELS: Record<string, string> = { not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed', delayed: 'Delayed' };

const AssignmentsPage: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [companyFilter, setCompanyFilter] = useState('');
    const [filterCompanies, setFilterCompanies] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'ongoing' | 'completed' | 'blueprints'>('ongoing');
    const [showCreate, setShowCreate] = useState(false);

    // Admin filter state
    const [filterMode, setFilterMode] = useState<'All' | 'My Projects' | 'By Team' | 'By Person' | 'By Company'>('All');
    const [filterTeamId, setFilterTeamId] = useState('');
    const [filterUserId, setFilterUserId] = useState('');
    const [filterTeams, setFilterTeams] = useState<any[]>([]);
    const [filterUsers, setFilterUsers] = useState<any[]>([]);
    const [form, setForm] = useState({
        title: '',
        clientName: '',
        companyId: '',
        description: '',
        priority: 'medium',
        status: 'not_started',
        startDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        noDueDate: false,
        team: [] as string[],
        teams: [] as string[],
        isRecurring: false,
        recurringPattern: 'monthly' as any,
        recurringStartDate: ''
    });
    // const [selectedTeamForMembers, setSelectedTeamForMembers] = useState<string | null>(null);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [allTeams, setAllTeams] = useState<any[]>([]);
    const [allCompanies, setAllCompanies] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [companySearch, setCompanySearch] = useState('');
    const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

    const isAdmin = user?.role === 'admin';
    const canCreate = true; // Everyone can create projects

    const fetchAssignments = async () => {
        setLoading(true);
        try {
            const params: any = {};

            if (activeTab === 'blueprints') {
                params.isBlueprint = 'true';
            } else if (activeTab === 'ongoing') {
                params.isBlueprint = 'false';
                // Only add status if there's a specific filter
                if (statusFilter) {
                    params.status = statusFilter;
                }
            } else if (activeTab === 'completed') {
                params.status = 'completed';
                // Specifically don't set isBlueprint to show ALL completed items
            }

            if (search) params.search = search;
            if (companyFilter) params.companyId = companyFilter;

            console.log('📡 Fetching assignments with params:', params);
            const { data } = await api.get('/assignments', { params });
            console.log('✅ Assignments fetched:', data);

            let result = data.assignments || [];

            // Filter ongoing to exclude completed if no specific status filter is set
            if (activeTab === 'ongoing' && !statusFilter) {
                result = result.filter((a: any) => a.status !== 'completed');
            }

            console.log('📊 Final result after filtering:', result);
            setAssignments(result);
        } catch (e) {
            console.error('❌ Error fetching assignments:', e);
        }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAssignments(); }, [search, statusFilter, activeTab, companyFilter]);

    // Fetch teams and users for admin filter dropdowns
    useEffect(() => {
        if (isAdmin) {
            Promise.all([
                api.get('/teams?all=true'),
                api.get('/auth/users?all=true'),
                api.get('/companies'),
            ]).then(([tRes, uRes, cRes]) => {
                setFilterTeams(tRes.data.teams || []);
                setFilterUsers(uRes.data.users || []);
                // Flatten companies for filter dropdown
                const flatCompanies: any[] = [];
                const flatten = (items: any[]) => {
                    items.forEach(item => {
                        const { children, ...rest } = item;
                        flatCompanies.push(rest);
                        if (children) flatten(children);
                    });
                };
                flatten(cRes.data.companies || []);
                setFilterCompanies(flatCompanies);
            }).catch(e => console.error('Failed to load filter data', e));
        }
    }, [isAdmin]);

    // Apply admin filters client-side
    const filteredAssignments = React.useMemo(() => {
        if (!isAdmin || filterMode === 'All') return assignments;

        return assignments.filter((a: any) => {
            if (filterMode === 'My Projects') {
                const inTeam = a.team?.some((m: any) => {
                    const memberId = (m._id || m)?.toString?.() || '';
                    return memberId === user?._id;
                });
                const isCreator = a.createdBy?._id?.toString?.() === user?._id ||
                    a.createdBy?.toString?.() === user?._id;
                return inTeam || isCreator;
            }
            if (filterMode === 'By Team' && filterTeamId) {
                return a.teams?.some((t: any) => {
                    const teamId = (t._id || t)?.toString?.() || '';
                    return teamId === filterTeamId;
                });
            }
            if (filterMode === 'By Person' && filterUserId) {
                return a.team?.some((m: any) => {
                    const memberId = (m._id || m)?.toString?.() || '';
                    return memberId === filterUserId;
                });
            }
            if (filterMode === 'By Company' && companyFilter) {
                const assignmentCompanyId = a.companyId?._id?.toString() || a.companyId?.toString();
                return assignmentCompanyId === companyFilter;
            }
            return true;
        });
    }, [assignments, filterMode, filterTeamId, filterUserId, companyFilter, isAdmin, user]);

    useEffect(() => {
        if (showCreate) {
            Promise.all([
                api.get('/auth/users?all=true'),
                api.get('/teams?all=true'),
                api.get('/companies'),
            ]).then(([uRes, tRes, cRes]) => {
                // console.log("All Users Data : " + JSON.stringify(uRes.data.users));
                setAllUsers(uRes.data.users || []);
                // console.log("All Teams Data : " + JSON.stringify(tRes.data.teams));
                setAllTeams(tRes.data.teams || []);

                // Flatten companies so children are selectable
                const flatCompanies: any[] = [];
                const flatten = (items: any[]) => {
                    items.forEach(item => {
                        const { children, ...rest } = item;
                        flatCompanies.push(rest);
                        if (children) flatten(children);
                    });
                };
                flatten(cRes.data.companies || []);
                setAllCompanies(flatCompanies);
            });

            // Auto-add project creator
            if (user?._id) {
                setForm(prev => ({
                    ...prev,
                    team: Array.from(new Set([...prev.team, user._id]))
                }));
            }
        }
    }, [showCreate, user]);

    const filteredCompanies = allCompanies.filter(c =>
        c.name.toLowerCase().includes(companySearch.toLowerCase())
    );

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const creatorTeam = user?._id ? Array.from(new Set([...form.team, user._id])) : form.team;
            const { data } = await api.post('/assignments', {
                ...form,
                team: creatorTeam,
                // Ensure dates are sent correctly if provided
                dueDate: form.noDueDate ? null : form.dueDate,
                recurringStartDate: form.isRecurring ? form.recurringStartDate : undefined,
                recurringPattern: form.isRecurring ? form.recurringPattern : undefined
            });
            setShowCreate(false);
            setForm({
                title: '', clientName: '', companyId: '', description: '', priority: 'medium',
                status: 'not_started',
                startDate: new Date().toISOString().split('T')[0],
                dueDate: '', noDueDate: false, team: [], teams: [],
                isRecurring: false, recurringPattern: 'monthly', recurringStartDate: ''
            });
            setCompanySearch('');
            // Redirect to the newly created project
            if (data.assignment?._id) {
                navigate(`/assignments/${data.assignment._id}`);
            } else {
                fetchAssignments();
            }
        } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
        finally { setSaving(false); }
    };

    const handleQuickAddCompany = async (name: string) => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            const { data } = await api.post('/companies', { name });
            const newCompany = data.company;
            setAllCompanies(prev => [...prev, newCompany]);
            setForm(prev => ({ ...prev, clientName: newCompany.name, companyId: newCompany._id }));
            setCompanySearch(newCompany.name);
            setShowCompanyDropdown(false);
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to add company');
        } finally {
            setSaving(false);
        }
    };

    const toggleTeamMember = (id: string) => {
        setForm(prev => ({
            ...prev,
            team: prev.team.includes(id) ? prev.team.filter(t => t !== id) : [...prev.team, id],
        }));
    };

    const toggleTeam = (id: string) => {
        setForm(prev => {
            const teamSelected = prev.teams.includes(id);
            const nextTeams = teamSelected ? prev.teams.filter(t => t !== id) : [...prev.teams, id];
            const team = allTeams.find(t => t._id === id);
            const managerId = team?.manager?._id;
            const nextTeamMembers = new Set(prev.team);

            // Auto-add manager when team is selected
            // if (!teamSelected && managerId) {
            //     nextTeamMembers.add(managerId);
            // }

            // If unselecting team, keep the manager if they're still relevant from other teams
            if (teamSelected && managerId) {
                const stillRelevantManager = nextTeams.some(tid => {
                    const selectedTeam = allTeams.find(t => t._id === tid);
                    return selectedTeam?.manager?._id === managerId;
                });
                if (!stillRelevantManager) {
                    nextTeamMembers.delete(managerId);
                }
            }

            // Auto-add project creator
            if (user?._id) {
                nextTeamMembers.add(user._id);
            }

            return {
                ...prev,
                teams: nextTeams,
                team: Array.from(nextTeamMembers),
            };
        });
    };

    // const getTeamMembers = (teamId: string) => {
    //     const team = allTeams.find(t => t._id === teamId);
    //     if (!team) return [];
    //     return team.members || [];
    // };

    // const selectAllTeamMembers = (teamId: string) => {
    //     const members = getTeamMembers(teamId);
    //     const memberIds = members.map((m: any) => m._id);
    //     setForm(prev => ({
    //         ...prev,
    //         team: [...new Set([...prev.team, ...memberIds])],
    //     }));
    // };
    const selectAllTeamMembers = (teamId: string) => {
        const team = allTeams.find(t => t._id === teamId);
        if (!team) return;

        const memberIds = [
            ...(team.members?.map((m: any) => m._id) || []),
            team.manager?._id
        ].filter(Boolean);

        setForm(prev => ({
            ...prev,
            team: Array.from(
                new Set([
                    ...prev.team,
                    ...memberIds,
                    user?._id // ✅ always keep creator
                ])
            )
        }));
    };

    // const deselectAllTeamMembers = (teamId: string) => {
    //     const members = getTeamMembers(teamId);
    //     const memberIds = members.map((m: any) => m._id);
    //     setForm(prev => ({
    //         ...prev,
    //         team: prev.team.filter(id => !memberIds.includes(id)),
    //     }));
    // };
    const deselectAllTeamMembers = (teamId: string) => {
        const team = allTeams.find(t => t._id === teamId);
        if (!team) return;

        const memberIds = [
            ...(team.members?.map((m: any) => m._id) || []),
            team.manager?._id
        ].filter(Boolean);

        setForm(prev => ({
            ...prev,
            team: prev.team.filter(id =>
                !memberIds.includes(id) || id === user?._id // ✅ keep creator
            )
        }));
    };

    // 1. Collect all users who are in ANY team
    const usersInAnyTeam = new Set(
        allTeams.flatMap(team => [
            ...(team.members?.map((m: any) => m._id.toString()) || []),
            team.manager?._id?.toString()
        ].filter(Boolean))
    );

    // 2. Filter users NOT in any team
    const usersNotInAnyTeam = allUsers.filter(
        u =>
            !usersInAnyTeam.has(u._id.toString()) && // not in any team
            u._id !== user?._id                     // not the creator
    );
    // const usersNotInAnyTeam = allUsers.filter(
    //     user => !usersInAnyTeam.has(user._id.toString())
    // );

    // const allMembersSelected =
    //     usersNotInAnyTeam.length > 0 &&
    //     usersNotInAnyTeam.every(u => form.team.includes(u._id));

    return (
        <div style={{ maxWidth: 1200 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Projects</h1>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        {filteredAssignments.length} Project{filteredAssignments.length !== 1 ? 's' : ''}
                        {isAdmin && filterMode !== 'All' && ` (filtered from ${assignments.length})`}
                    </p>
                </div>
                {canCreate && (
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                        <Plus size={16} /> New Project
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--color-border)', marginBottom: 20 }}>
                <button
                    onClick={() => { setActiveTab('ongoing'); setStatusFilter(''); }}
                    style={{
                        padding: '8px 4px',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: activeTab === 'ongoing' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        borderBottom: `2px solid ${activeTab === 'ongoing' ? 'var(--color-primary)' : 'transparent'}`,
                        transition: 'all 0s.2s'
                    }}
                >
                    Ongoing
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    style={{
                        padding: '8px 4px',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: activeTab === 'completed' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        borderBottom: `2px solid ${activeTab === 'completed' ? 'var(--color-primary)' : 'transparent'}`,
                        transition: 'all 0.2s'
                    }}
                >
                    Completed
                </button>
                <button
                    onClick={() => setActiveTab('blueprints')}
                    style={{
                        padding: '8px 4px',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: activeTab === 'blueprints' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        borderBottom: `2px solid ${activeTab === 'blueprints' ? 'var(--color-primary)' : 'transparent'}`,
                        transition: 'all 0.2s'
                    }}
                >
                    Recurring Blueprints
                </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                <div style={{ flex: 1, maxWidth: 360, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                    <input
                        className="input"
                        style={{
                            paddingLeft: 40,
                            height: 40,
                            borderRadius: 10,
                            fontSize: '0.875rem',
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                        }}
                        placeholder="Search projects..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                {activeTab === 'ongoing' && (
                    <div style={{ position: 'relative' }}>
                        <select
                            style={{
                                width: 160,
                                height: 40,
                                padding: '0 12px',
                                borderRadius: 10,
                                fontSize: '0.8125rem',
                                fontWeight: 500,
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-surface)',
                                color: 'var(--color-text)',
                                cursor: 'pointer',
                            }}
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Status</option>
                            {Object.entries(STATUS_LABELS)
                                .filter(([k]) => k !== 'completed')
                                .map(([k, v]) => <option key={k} value={k}>{v}</option>)
                            }
                        </select>
                    </div>
                )}
            </div>

            {/* Admin Filters */}
            {isAdmin && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 20,
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    flexWrap: 'wrap',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Filter size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filter</span>
                    </div>

                    <div style={{ width: 1, height: 20, background: 'var(--color-border)', flexShrink: 0 }} />

                    {/* Filter mode pills */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {[
                            { key: 'All', label: 'All', icon: <FolderKanban size={12} /> },
                            { key: 'My Projects', label: 'My Projects', icon: <User size={12} /> },
                            { key: 'By Team', label: 'By Team', icon: <Users size={12} /> },
                            { key: 'By Person', label: 'By Person', icon: <User size={12} /> },
                            { key: 'By Company', label: 'By Company', icon: <Building2 size={12} /> },
                        ].map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => {
                                    setFilterMode(opt.key as any);
                                    if (opt.key === 'All' || opt.key === 'My Projects') {
                                        setFilterTeamId('');
                                        setFilterUserId('');
                                    }
                                    if (opt.key !== 'company') {
                                        setCompanyFilter('');
                                    }
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '6px 12px',
                                    borderRadius: 20,
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    background: filterMode === opt.key
                                        ? 'var(--color-primary)'
                                        : 'var(--color-surface-hover)',
                                    color: filterMode === opt.key
                                        ? 'white'
                                        : 'var(--color-text-secondary)',
                                }}
                            >
                                {opt.icon} {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Team dropdown */}
                    {filterMode === 'By Team' && (
                        <div style={{ position: 'relative' }}>
                            <select
                                style={{
                                    width: 180,
                                    fontSize: '0.75rem',
                                    height: 32,
                                    borderRadius: 8,
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-bg)',
                                    color: 'var(--color-text)',
                                    padding: '0 10px',
                                    cursor: 'pointer',
                                }}
                                value={filterTeamId}
                                onChange={e => setFilterTeamId(e.target.value)}
                            >
                                <option value="">Select team...</option>
                                {filterTeams.map(t => (
                                    <option key={t._id} value={t._id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Person dropdown */}
                    {filterMode === 'By Person' && (
                        <div style={{ position: 'relative' }}>
                            <select
                                style={{
                                    width: 180,
                                    fontSize: '0.75rem',
                                    height: 32,
                                    borderRadius: 8,
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-bg)',
                                    color: 'var(--color-text)',
                                    padding: '0 10px',
                                    cursor: 'pointer',
                                }}
                                value={filterUserId}
                                onChange={e => setFilterUserId(e.target.value)}
                            >
                                <option value="">Select person...</option>
                                {filterUsers.map(u => (
                                    <option key={u._id} value={u._id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Company dropdown */}
                    {filterMode === 'By Company' && (
                        <div style={{ position: 'relative' }}>
                            <select
                                style={{
                                    width: 180,
                                    fontSize: '0.75rem',
                                    height: 32,
                                    borderRadius: 8,
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-bg)',
                                    color: 'var(--color-text)',
                                    padding: '0 10px',
                                    cursor: 'pointer',
                                }}
                                value={companyFilter}
                                onChange={e => setCompanyFilter(e.target.value)}
                            >
                                <option value="">Select company...</option>
                                {filterCompanies.map(c => (
                                    <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Clear filter button */}
                    {(filterMode !== 'All' || companyFilter) && (
                        <button
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '6px 10px',
                                borderRadius: 20,
                                fontSize: '0.7rem',
                                fontWeight: 500,
                                border: 'none',
                                cursor: 'pointer',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                marginLeft: 'auto',
                                transition: 'all 0.15s ease',
                            }}
                            onClick={() => {
                                setFilterMode('All');
                                setFilterTeamId('');
                                setFilterUserId('');
                                setCompanyFilter('');
                            }}
                        >
                            <X size={12} /> Clear
                        </button>
                    )}
                </div>
            )}

            {/* Project List */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)}
                </div>
            ) : filteredAssignments.length === 0 ? (
                <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                    <FolderKanban size={48} style={{ margin: '0 auto 12px', color: 'var(--color-text-tertiary)', opacity: 0.3 }} />
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>
                        {filterMode !== 'All' || companyFilter ? 'No projects match this filter' : 'No Projects found'}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                        {filterMode !== 'All' || companyFilter
                            ? 'Try a different filter or clear to see all projects.'
                            : (isAdmin ? 'Create your first Project to get started.' : 'No Projects have been assigned to you yet.')
                        }
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filteredAssignments.map(a => (
                        <div
                            key={a._id}
                            className="card"
                            style={{ padding: '16px 20px', cursor: 'pointer' }}
                            onClick={() => navigate(`/assignments/${a._id}`)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                        <span style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{a.title}</span>
                                        {a.isRecurring && !a.parentAssignmentId && (
                                            <span className="badge" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>Blueprint</span>
                                        )}
                                        {a.parentAssignmentId && (
                                            <span className="badge" style={{ background: '#f0fdf4', color: '#16a34a' }}>Recurring Instance</span>
                                        )}
                                        <span className={`badge badge-${a.priority}`}>{PRIORITY_LABELS[a.priority]}</span>
                                        {activeTab !== 'blueprints' && <span className={`badge badge-${a.status}`}>{STATUS_LABELS[a.status]}</span>}
                                    </div>
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                                        {a.clientName && <span>Client: {a.clientName}</span>}
                                        {activeTab === 'blueprints' ? (
                                            <span style={{ textTransform: 'capitalize' }}>Pattern: {a.recurringPattern}</span>
                                        ) : (
                                            <span>
                                                {a.status === 'completed' ? null : (
                                                    <span> · {a.dueDate && new Date(a.dueDate).getFullYear() > 1970 ? `Due ${format(new Date(a.dueDate), 'MMM d, yyyy')}` : 'No Due Date'}</span>
                                                )}
                                            </span>

                                        )}
                                    </div>
                                    {/* Teams badges */}
                                    {a.teams?.length > 0 && (
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {a.teams.map((t: any) => (
                                                <span key={t._id} style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                                                    borderRadius: 4, background: 'var(--color-primary-light)', fontSize: '0.6875rem', fontWeight: 500,
                                                    color: 'var(--color-primary)',
                                                }}>
                                                    <Users size={10} /> {t.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                    {a.team?.slice(0, 3).map((member: any, i: number) => (
                                        <Avatar
                                            key={member._id}
                                            src={member.avatar}
                                            name={member.name}
                                            size={28}
                                            style={{
                                                border: '2px solid var(--color-surface)',
                                                marginLeft: i > 0 ? -8 : 0,
                                                zIndex: 10 - i
                                            }}
                                        />
                                    ))}
                                    {a.team?.length > 3 && (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginLeft: 4 }}>
                                            +{a.team.length - 3}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreate && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
                }} onClick={() => setShowCreate(false)}>
                    <div className="card animate-fade-in" style={{ width: '100%', maxWidth: 560, padding: 28, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 20 }}>Create Project</h2>
                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4, color: 'var(--color-text-secondary)' }}>Title *</label>
                                <input className="input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Project title" />
                            </div>
                            <div style={{ position: 'relative' }}>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4, color: 'var(--color-text-secondary)' }}>Company / Client *</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        className="input"
                                        required
                                        value={companySearch || form.clientName}
                                        onChange={e => {
                                            setCompanySearch(e.target.value);
                                            setShowCompanyDropdown(true);
                                            setForm(prev => ({ ...prev, clientName: e.target.value, companyId: '' }));
                                        }}
                                        onFocus={() => setShowCompanyDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowCompanyDropdown(false), 200)}
                                        placeholder="Search or enter company name"
                                    />
                                    {showCompanyDropdown && (companySearch || allCompanies.length > 0) && (
                                        <div
                                            style={{
                                                position: 'absolute', top: '100%', left: 0, right: 0,
                                                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                                                borderRadius: '0 0 8px 8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                zIndex: 10, maxHeight: 200, overflowY: 'auto'
                                            }}
                                        >
                                            {filteredCompanies.length > 0 ? (
                                                filteredCompanies.map(c => (
                                                    <div
                                                        key={c._id}
                                                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.875rem' }}
                                                        className="hover-bg"
                                                        onClick={() => {
                                                            setForm(prev => ({ ...prev, clientName: c.name, companyId: c._id }));
                                                            setCompanySearch(c.name);
                                                            setShowCompanyDropdown(false);
                                                        }}
                                                    >
                                                        {c.name}
                                                        {c.parentCompanyId && (
                                                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', marginLeft: 6 }}>
                                                                (Subsidiary)
                                                            </span>
                                                        )}
                                                    </div>
                                                ))
                                            ) : companySearch ? (
                                                <div
                                                    style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-primary-light)' }}
                                                    className="hover-bg"
                                                    onClick={() => handleQuickAddCompany(companySearch)}
                                                >
                                                    <Plus size={16} color="var(--color-primary)" />
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-primary)' }}>
                                                        Add <strong>"{companySearch}"</strong> as new company
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ padding: '8px 12px', fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
                                                    Type to search or add a company
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4, color: 'var(--color-text-secondary)' }}>Assignment Type</label>
                                    <select className="select" value={form.isRecurring ? 'true' : 'false'} onChange={e => {
                                        const isRec = e.target.value === 'true';
                                        const updates: any = { isRecurring: isRec };
                                        if (isRec && form.recurringPattern === 'daily') {
                                            updates.recurringStartDate = new Date().toISOString().split('T')[0];
                                        }
                                        setForm({ ...form, ...updates });
                                    }}>
                                        <option value="false">Transactional Project</option>
                                        <option value="true">Recurring Project</option>
                                    </select>
                                </div>
                                {form.isRecurring && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4, color: 'var(--color-text-secondary)' }}>Recurring Pattern</label>
                                        <select className="select" value={form.recurringPattern} onChange={e => {
                                            const pattern = e.target.value;
                                            const updates: any = { recurringPattern: pattern };
                                            if (pattern === 'daily') {
                                                updates.recurringStartDate = new Date().toISOString().split('T')[0];
                                            }
                                            setForm({ ...form, ...updates });
                                        }}>
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="yearly">Yearly</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {form.isRecurring && form.recurringPattern !== 'daily' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4, color: 'var(--color-text-secondary)' }}>Recurring Start Date *</label>
                                    <input className="input" type="date" required={form.isRecurring && form.recurringPattern !== 'daily'} value={form.recurringStartDate} onChange={e => setForm({ ...form, recurringStartDate: e.target.value })} />
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: 4 }}>The first instance will be created on this date.</p>
                                </div>
                            )}



                            <div>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4, color: 'var(--color-text-secondary)' }}>Description</label>
                                <textarea className="input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description..." style={{ resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4, color: 'var(--color-text-secondary)' }}>Priority</label>
                                    <select className="select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                        {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4, color: 'var(--color-text-secondary)' }}>Start Date *</label>
                                    <input className="input" type="date" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4, color: 'var(--color-text-secondary)' }}>Due Date *</label>
                                    <input className="input" type="date" required={!form.noDueDate} disabled={form.noDueDate} value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <input
                                            type="checkbox"
                                            id="noDueDate"
                                            checked={form.noDueDate}
                                            onChange={e => setForm({ ...form, noDueDate: e.target.checked })}
                                        />
                                        <label htmlFor="noDueDate" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>No due date</label>
                                    </div>
                                </div>
                            </div>

                            {/* Step 1: Select Team */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 8, color: 'var(--color-text-secondary)' }}>Assign Teams</label>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
                                    Manager is automatically added when you select a team.
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {allTeams.map(t => (
                                        <button
                                            key={t._id}
                                            type="button"
                                            className={`btn btn-sm ${form.teams.includes(t._id) ? 'btn-primary' : 'btn-secondary'}`}
                                            // onClick={() => {
                                            //     toggleTeam(t._id);
                                            //     setSelectedTeamForMembers(t._id);
                                            // }}
                                            onClick={() => toggleTeam(t._id)}
                                        >
                                            <Users size={12} /> {t.name}
                                        </button>
                                    ))}
                                    {allTeams.length === 0 && <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>No teams created yet</span>}
                                </div>
                            </div>


                            {form.teams.length > 0 && (
                                <div style={{ marginTop: 16 }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                        marginBottom: 8,
                                        color: 'var(--color-text-secondary)'
                                    }}>
                                        Team Members
                                    </label>

                                    {form.teams.map(teamId => {
                                        // const team = allTeams.find(t => t._id === teamId);
                                        // if (!team) return null;

                                        const team = allTeams.find(t => t._id === teamId);
                                        if (!team) return null;

                                        const manager = team.manager;
                                        const members = team.members || [];

                                        const memberIds = [
                                            ...(team.members?.map((m: any) => m._id) || []),
                                            team.manager?._id
                                        ].filter(Boolean);

                                        const allMembersSelected =
                                            memberIds.length > 0 &&
                                            memberIds.every(id => form.team.includes(id));

                                        return (
                                            <div key={teamId} style={{
                                                marginBottom: 12,
                                                padding: 12,
                                                border: '1px solid var(--color-border)',
                                                borderRadius: 8
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    marginBottom: 8
                                                }}>
                                                    <strong>{team.name}</strong>

                                                    {/* <button
                                                        type="button"
                                                        className="btn btn-sm btn-primary"
                                                        onClick={() => selectAllTeamMembers(teamId)}
                                                    >
                                                        Select All
                                                    </button> */}
                                                    {allMembersSelected ? (
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-secondary"
                                                            onClick={() => deselectAllTeamMembers(teamId)}
                                                        >
                                                            Deselect All
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-primary"
                                                            onClick={() => selectAllTeamMembers(teamId)}
                                                        >
                                                            Select All
                                                        </button>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>

                                                    {/* Manager */}
                                                    {manager && (
                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm ${form.team.includes(manager._id)
                                                                ? 'btn-primary'
                                                                : 'btn-secondary'
                                                                }`}
                                                            onClick={() => toggleTeamMember(manager._id)}
                                                        >
                                                            {manager.name} (Manager)
                                                        </button>
                                                    )}

                                                    {/* Members */}
                                                    {members.map((m: any) => (
                                                        <button
                                                            key={m._id}
                                                            type="button"
                                                            className={`btn btn-sm ${form.team.includes(m._id)
                                                                ? 'btn-primary'
                                                                : 'btn-secondary'
                                                                }`}
                                                            onClick={() => toggleTeamMember(m._id)}
                                                        >
                                                            {m.name}
                                                        </button>
                                                    ))}

                                                    {members.length === 0 && !manager && (
                                                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>
                                                            No members in this team
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Step 2: Select Members from Selected Team */}
                            {/* {form.teams.length > 0 && (
                                <div style={{ marginTop: 16 }}>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 8, color: 'var(--color-text-secondary)' }}>2. Select Members</label>

                                    {/* Team selector for viewing members
                                    <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                                        {form.teams.map(teamId => {
                                            const team = allTeams.find(t => t._id === teamId);
                                            if (!team) return null;
                                            return (
                                                <button
                                                    key={teamId}
                                                    type="button"
                                                    className={`btn btn-sm ${selectedTeamForMembers === teamId ? 'btn-primary' : 'btn-secondary'}`}
                                                    onClick={() => setSelectedTeamForMembers(teamId)}
                                                >
                                                    {team.name}
                                                    {team.manager?.name && (
                                                        <span style={{ marginLeft: 6, fontSize: '0.7rem', opacity: 0.8 }}>
                                                            ({team.manager.name})
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Members of the selected team 
                                    {selectedTeamForMembers && form.teams.includes(selectedTeamForMembers) && (() => {
                                        const team = allTeams.find(t => t._id === selectedTeamForMembers);
                                        if (!team) return null;
                                        const manager = team.manager;
                                        const members = team.members || [];
                                        const allMembersSelected = members.length > 0 && members.every((m: any) => form.team.includes(m._id));

                                        return (
                                            <div style={{ padding: 12, border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-surface)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{team.name} Members</span>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        {!allMembersSelected ? (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-primary"
                                                                onClick={() => selectAllTeamMembers(selectedTeamForMembers)}
                                                            >
                                                                Select All
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-secondary"
                                                                onClick={() => deselectAllTeamMembers(selectedTeamForMembers)}
                                                            >
                                                                Deselect All
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* All members including manager 
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                    {manager && (
                                                        <button
                                                            key={manager._id}
                                                            type="button"
                                                            className={`btn btn-sm ${form.team.includes(manager._id) ? 'btn-primary' : 'btn-secondary'}`}
                                                            onClick={() => toggleTeamMember(manager._id)}
                                                        >
                                                            {manager.name} {manager._id === user?._id ? '(You)' : ''}
                                                        </button>
                                                    )}
                                                    {members.map((member: any) => (
                                                        <button
                                                            key={member._id}
                                                            type="button"
                                                            className={`btn btn-sm ${form.team.includes(member._id) ? 'btn-primary' : 'btn-secondary'}`}
                                                            onClick={() => toggleTeamMember(member._id)}
                                                        >
                                                            {member.name}{member._id === user?._id ? ' (You)' : ''}
                                                        </button>
                                                    ))}
                                                    {!manager && members.length === 0 && (
                                                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>No members in this team</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )} */}

                            {/* Other Individual Members (not in any selected team) */}
                            {allUsers.length > 0 && (
                                // previous logic
                                // <div style={{ marginTop: 16 }}>
                                //     <label style={{ 
                                //         display: 'block', 
                                //         fontSize: '0.8125rem', 
                                //         fontWeight: 500, 
                                //         marginBottom: 8, 
                                //         color: 'var(--color-text-secondary)' 
                                //     }}>
                                //         Add Other Members (not in any teams)
                                //     </label>
                                //     <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                //         {allUsers
                                //             .filter(u => {
                                //                 const isInSelectedTeam = form.teams.some(teamId => {
                                //                     const team = allTeams.find(t => t._id === teamId);
                                //                     return team?.members?.some((m: any) => m._id === u._id);
                                //                 });
                                //                 return !isInSelectedTeam;
                                //             })
                                //             .map(u => (
                                //                 <button
                                //                     key={u._id}
                                //                     type="button"
                                //                     className={`btn btn-sm ${form.team.includes(u._id) ? 'btn-primary' : 'btn-secondary'}`}
                                //                     onClick={() => toggleTeamMember(u._id)}
                                //                 >
                                //                     {u.name}
                                //                 </button>
                                //             ))}
                                //         {allUsers.every(u => form.teams.some(teamId => {
                                //             const team = allTeams.find(t => t._id === teamId);
                                //             return team?.members?.some((m: any) => m._id === u._id);
                                //         })) && (
                                //                 <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>All members are in selected teams</span>
                                //             )}
                                //     </div>
                                // </div>
                                <div style={{ marginTop: 16 }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                        marginBottom: 8,
                                        color: 'var(--color-text-secondary)'
                                    }}>
                                        Add Other Users (not in any team)
                                    </label>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {usersNotInAnyTeam.map(u => (
                                            <button
                                                key={u._id}
                                                type="button"
                                                className={`btn btn-sm ${form.team.includes(u._id)
                                                    ? 'btn-primary'
                                                    : 'btn-secondary'
                                                    }`}
                                                onClick={() => toggleTeamMember(u._id)}
                                            >
                                                {u.name} ({u.role})
                                            </button>
                                        ))}

                                        {usersNotInAnyTeam.length === 0 && (
                                            <span style={{
                                                fontSize: '0.8125rem',
                                                color: 'var(--color-text-tertiary)'
                                            }}>
                                                All users are already assigned to teams
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Project'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssignmentsPage;
