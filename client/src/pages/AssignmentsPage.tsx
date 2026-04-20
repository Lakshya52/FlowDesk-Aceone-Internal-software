import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Avatar from '../components/common/Avatar';
import { useAuthStore } from '../store/authStore';
import { Plus, Search, FolderKanban, Users } from 'lucide-react';
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
    const [showCreate, setShowCreate] = useState(false);
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
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [allTeams, setAllTeams] = useState<any[]>([]);
    const [allCompanies, setAllCompanies] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [companySearch, setCompanySearch] = useState('');
    const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

    const isAdmin = user?.role === 'admin';
    const canCreate = true; // Everyone can create projects

    const fetchAssignments = async () => {
        try {
            const params: any = {};
            if (search) params.search = search;
            if (statusFilter) params.status = statusFilter;
            const { data } = await api.get('/assignments', { params });
            setAssignments(data.assignments || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAssignments(); }, [search, statusFilter]);

    useEffect(() => {
        if (showCreate) {
            Promise.all([
                api.get('/auth/users'),
                api.get('/teams'),
                api.get('/companies'),
            ]).then(([uRes, tRes, cRes]) => {
                setAllUsers(uRes.data.users || []);
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
        }
    }, [showCreate]);

    const filteredCompanies = allCompanies.filter(c =>
        c.name.toLowerCase().includes(companySearch.toLowerCase())
    );

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data } = await api.post('/assignments', {
                ...form,
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
        setForm(prev => ({
            ...prev,
            teams: prev.teams.includes(id) ? prev.teams.filter(t => t !== id) : [...prev.teams, id],
        }));
    };

    return (
        <div style={{ maxWidth: 1200 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Projects</h1>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        {assignments.length} Project{assignments.length !== 1 ? 's' : ''}
                    </p>
                </div>
                {canCreate && (
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                        <Plus size={16} /> New Project
                    </button>
                )}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, maxWidth: 320, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                    <input className="input" style={{ paddingLeft: 36 }} placeholder="Search Projects..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="select" style={{ width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="">All Statuses</option>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </div>

            {/* Project List */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)}
                </div>
            ) : assignments.length === 0 ? (
                <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                    <FolderKanban size={48} style={{ margin: '0 auto 12px', color: 'var(--color-text-tertiary)', opacity: 0.3 }} />
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>No Projects found</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                        {isAdmin ? 'Create your first Project to get started.' : 'No Projects have been assigned to you yet.'}
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {assignments.map(a => (
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
                                        {a.isRecurring && <span className="badge" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>Recurring</span>}
                                        <span className={`badge badge-${a.priority}`}>{PRIORITY_LABELS[a.priority]}</span>
                                        <span className={`badge badge-${a.status}`}>{STATUS_LABELS[a.status]}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                                        {a.clientName && <span>Client: {a.clientName} · </span>}
                                        <span>{a.dueDate ? `Due ${format(new Date(a.dueDate), 'MMM d, yyyy')}` : 'No Due Date'}</span>
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
                                                    <Plus size={14} color="var(--color-primary)" />
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
                                    <select className="select" value={form.isRecurring ? 'true' : 'false'} onChange={e => setForm({ ...form, isRecurring: e.target.value === 'true' })}>
                                        <option value="false">Normal Project</option>
                                        <option value="true">Recurring Project</option>
                                    </select>
                                </div>
                                {form.isRecurring && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4, color: 'var(--color-text-secondary)' }}>Recurring Pattern</label>
                                        <select className="select" value={form.recurringPattern} onChange={e => setForm({ ...form, recurringPattern: e.target.value as any })}>
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="yearly">Yearly</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {form.isRecurring && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4, color: 'var(--color-text-secondary)' }}>Recurring Start Date *</label>
                                    <input className="input" type="date" required={form.isRecurring} value={form.recurringStartDate} onChange={e => setForm({ ...form, recurringStartDate: e.target.value })} />
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

                            {/* Assign Teams */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 8, color: 'var(--color-text-secondary)' }}>Assign Teams</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {allTeams.map(t => (
                                        <button
                                            key={t._id}
                                            type="button"
                                            className={`btn btn-sm ${form.teams.includes(t._id) ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => toggleTeam(t._id)}
                                        >
                                            <Users size={12} /> {t.name}
                                        </button>
                                    ))}
                                    {allTeams.length === 0 && <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>No teams created yet</span>}
                                </div>
                            </div>

                            {/* Individual Members (Hidden for Admin) */}
                            {!isAdmin && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 8, color: 'var(--color-text-secondary)' }}>Individual Members</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {allUsers.map(u => (
                                            <button
                                                key={u._id}
                                                type="button"
                                                className={`btn btn-sm ${form.team.includes(u._id) ? 'btn-primary' : 'btn-secondary'}`}
                                                onClick={() => toggleTeamMember(u._id)}
                                            >
                                                {u.name}
                                            </button>
                                        ))}
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
