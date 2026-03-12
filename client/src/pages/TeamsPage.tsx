import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import Avatar from '../components/common/Avatar';
import { useAuthStore } from '../store/authStore';
import { Plus, Users, Trash2, UserPlus, UserMinus, Crown } from 'lucide-react';

const TeamsPage: React.FC = () => {
    const { user } = useAuthStore();
    const [teams, setTeams] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', manager: '' });
    const [saving, setSaving] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<any>(null);
    const [showMembers, setShowMembers] = useState(false);

    const isAdmin = user?.role === 'admin';

    const fetchTeams = async () => {
        try {
            const [tRes, uRes] = await Promise.all([
                api.get('/teams'),
                api.get('/auth/users'),
            ]);
            setTeams(tRes.data.teams || []);
            setUsers(uRes.data.users || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchTeams(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/teams', form);
            setShowCreate(false);
            setForm({ name: '', description: '', manager: '' });
            fetchTeams();
        } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (teamId: string) => {
        if (!window.confirm('Delete this team? This cannot be undone.')) return;
        try {
            await api.delete(`/teams/${teamId}`);
            fetchTeams();
        } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    };

    const handleToggleMember = async (team: any, userId: string) => {
        const currentMembers = team.members?.map((m: any) => m._id) || [];
        const isMember = currentMembers.includes(userId);
        const newMembers = isMember
            ? currentMembers.filter((id: string) => id !== userId)
            : [...currentMembers, userId];
        try {
            const { data } = await api.put(`/teams/${team._id}/members`, { members: newMembers });
            setTeams(prev => prev.map(t => t._id === team._id ? data.team : t));
            setSelectedTeam(data.team);
        } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    };

    const handleRequestJoin = async (teamId: string) => {
        try {
            const { data } = await api.post(`/teams/${teamId}/request-join`);
            setTeams(prev => prev.map(t => t._id === teamId ? data.team : t));
            alert(data.message || 'Join request sent.');
        } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    };

    const handleApproveRequest = async (teamId: string, userId: string) => {
        try {
            const { data } = await api.post(`/teams/${teamId}/requests/${userId}/approve`);
            setTeams(prev => prev.map(t => t._id === teamId ? data.team : t));
            if (selectedTeam?._id === teamId) setSelectedTeam(data.team);
        } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    };

    const handleRejectRequest = async (teamId: string, userId: string) => {
        try {
            const { data } = await api.post(`/teams/${teamId}/requests/${userId}/reject`);
            setTeams(prev => prev.map(t => t._id === teamId ? data.team : t));
            if (selectedTeam?._id === teamId) setSelectedTeam(data.team);
        } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    };

    const canManageTeam = (team: any) => {
        return isAdmin || team.manager?._id === user?._id;
    };

    return (
        <div style={{ maxWidth: 1200 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Teams</h1>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        {teams.length} team{teams.length !== 1 ? 's' : ''}
                    </p>
                </div>
                {isAdmin && (
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                        <Plus size={16} /> New Team
                    </button>
                )}
            </div>

            {/* Teams Grid */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 12 }} />)}
                </div>
            ) : teams.length === 0 ? (
                <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                    <Users size={48} style={{ margin: '0 auto 12px', color: 'var(--color-text-tertiary)', opacity: 0.3 }} />
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>No teams found</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                        {isAdmin ? 'Create your first team to organize members.' : 'You are not part of any team yet.'}
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                    {teams.map(team => (
                        <div key={team._id} className="card animate-fade-in" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
                            {/* Team color accent */}
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, var(--color-primary), #a78bfa)' }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{team.name}</h3>
                                    </div>
                                    {team.description && (
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: 8 }}>{team.description}</p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    {canManageTeam(team) && (
                                        <button className="btn btn-ghost btn-xs" style={{ color: 'var(--color-primary)' }}
                                            onClick={() => { setSelectedTeam(team); setShowMembers(true); }}>
                                            <UserPlus size={14} /> Manage
                                        </button>
                                    )}
                                    {(!canManageTeam(team) && !team.members?.find((m: any) => m._id === user?._id) && !team.joinRequests?.find((m: any) => m._id === user?._id)) && (
                                        <button className="btn btn-primary btn-xs"
                                            onClick={() => handleRequestJoin(team._id)}>
                                            Request to Join
                                        </button>
                                    )}
                                    {(!canManageTeam(team) && team.joinRequests?.find((m: any) => m._id === user?._id)) && (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', padding: '4px 8px', background: 'var(--color-surface-hover)', borderRadius: 12 }}>
                                            Requested
                                        </span>
                                    )}
                                    {isAdmin && (
                                        <button className="btn btn-ghost btn-xs" style={{ color: 'var(--color-error)' }}
                                            onClick={() => handleDelete(team._id)}>
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Manager */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 10px', background: 'var(--color-surface-hover)', borderRadius: 8 }}>
                                <Crown size={14} style={{ color: '#f59e0b' }} />
                                <Avatar src={team.manager?.avatar} name={team.manager?.name} size={24} />
                                <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{team.manager?.name}</span>
                                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>Manager</span>
                            </div>

                            {/* Members */}
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Members ({team.members?.length || 0})
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {team.members?.length === 0 ? (
                                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>No members yet</span>
                                ) : (
                                    team.members?.slice(0, 8).map((m: any) => (
                                        <div key={m._id} style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                                            borderRadius: 20, background: 'var(--color-surface-hover)', fontSize: '0.75rem', fontWeight: 500,
                                        }}>
                                            <Avatar src={m.avatar} name={m.name} size={20} />
                                            {m.name}
                                        </div>
                                    ))
                                )}
                                {team.members?.length > 8 && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', padding: '4px 8px' }}>
                                        +{team.members.length - 8} more
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Team Modal */}
            {showCreate && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
                }} onClick={() => setShowCreate(false)}>
                    <div className="card animate-fade-in" style={{ width: '100%', maxWidth: 480, padding: 28 }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 20 }}>Create Team</h2>
                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4, color: 'var(--color-text-secondary)' }}>Team Name *</label>
                                <input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. IT Team, Finance Team" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4, color: 'var(--color-text-secondary)' }}>Description</label>
                                <textarea className="input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Team description..." style={{ resize: 'vertical' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4, color: 'var(--color-text-secondary)' }}>Team Manager *</label>
                                <select className="select" required value={form.manager} onChange={e => setForm({ ...form, manager: e.target.value })}>
                                    <option value="">Select manager...</option>
                                    {users.filter(u => u.role === 'manager' || u.role === 'admin').map(u => (
                                        <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Team'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Members Modal */}
            {showMembers && selectedTeam && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
                }} onClick={() => setShowMembers(false)}>
                    <div className="card animate-fade-in" style={{ width: '100%', maxWidth: 480, padding: 28 }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 4 }}>Manage Members</h2>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: 20 }}>{selectedTeam.name}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflow: 'auto', marginBottom: 20 }}>
                            {users.filter(u => u.role === 'member').map(u => {
                                const isMember = selectedTeam.members?.some((m: any) => m._id === u._id);
                                return (
                                    <div key={u._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: isMember ? 'var(--color-primary-light)' : 'var(--color-surface-hover)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <Avatar src={u.avatar} name={u.name} size={32} />
                                            <div>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{u.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{u.email}</div>
                                            </div>
                                        </div>
                                        <button
                                            className={`btn btn-xs ${isMember ? 'btn-secondary' : 'btn-primary'}`}
                                            onClick={() => handleToggleMember(selectedTeam, u._id)}
                                        >
                                            {isMember ? <><UserMinus size={12} /> Remove</> : <><UserPlus size={12} /> Add</>}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        {selectedTeam.joinRequests && selectedTeam.joinRequests.length > 0 && (
                            <div style={{ marginTop: 24 }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Join Requests ({selectedTeam.joinRequests.length})
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflow: 'auto', marginBottom: 20 }}>
                                    {selectedTeam.joinRequests.map((u: any) => (
                                        <div key={u._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'var(--color-surface-hover)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <Avatar src={u.avatar} name={u.name} size={32} />
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{u.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{u.email}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                    className="btn btn-xs btn-primary"
                                                    onClick={() => handleApproveRequest(selectedTeam._id, u._id)}
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    className="btn btn-xs btn-secondary"
                                                    style={{ color: 'var(--color-error)' }}
                                                    onClick={() => handleRejectRequest(selectedTeam._id, u._id)}
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setShowMembers(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamsPage;
