import { useState, useEffect } from 'react';
import { Phone, Building, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import api from '../../lib/api';

interface Lead {
    _id: string;
    name: string;
    phone?: string;
    companyName?: string;
    status: string;
    priority: string;
    callCount: number;
    callDuration: number;
    lastCallAt?: string;
    campaignId?: { _id: string; name: string };
    createdAt: string;
    source: string;
}

const STATUS_LABELS: Record<string, string> = {
    new: 'New',
    attempted: 'Attempted',
    connected: 'Connected',
    interested: 'Interested',
    callback_scheduled: 'Callback Scheduled',
    meeting_scheduled: 'Meeting Scheduled',
    not_interested: 'Not Interested',
    not_reachable: 'Not Reachable',
    do_not_call: 'Do Not Call',
    closed_won: 'Closed / Won',
    closed_lost: 'Closed / Lost',
};

const STATUS_COLORS: Record<string, string> = {
    new: '#7f1d1d',
    attempted: '#d946ef',
    connected: '#ef4444',
    interested: '#06b6d4',
    callback_scheduled: '#f472b6',
    meeting_scheduled: '#64748b',
    not_interested: '#3b82f6',
    not_reachable: '#22c55e',
    do_not_call: '#0f172a',
    closed_won: '#f97316',
    closed_lost: '#0ea5e9',
};

const AVATAR_COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const formatDateShort = (d?: string) => {
    if (!d) return 'Never';
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const CrmDashboard = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const { data } = await api.get('/leads', { params: { limit: 10000 } });
                if (data.success) setLeads(data.leads);
            } catch (err) {
                console.error('Failed to load leads', err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
            </div>
        );
    }

    const total = leads.length;
    const won = leads.filter(l => l.status === 'closed_won').length;
    const lost = leads.filter(l => l.status === 'closed_lost').length;
    const activeLeads = leads.filter(l => !['closed_won', 'closed_lost', 'do_not_call', 'not_interested'].includes(l.status)).length;
    const successRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

    const kpis = [
        {
            label: 'Converted Leads',
            value: String(won),
            subtitle: `${total > 0 ? Math.round(won / total * 100) : 0}% of total`,
            subtitleColor: 'var(--color-success)',
            bg: 'var(--color-success-light)',
            color: 'var(--color-success)',
        },
        {
            label: 'Lost Leads',
            value: String(lost),
            subtitle: `${total > 0 ? Math.round(lost / total * 100) : 0}% of total`,
            subtitleColor: 'var(--color-danger)',
            bg: 'var(--color-danger-light)',
            color: 'var(--color-danger)',
        },
        {
            label: 'Active Leads',
            value: String(activeLeads),
            bg: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
        },
        {
            label: 'Success Rate',
            value: `${successRate}%`,
            bg: 'var(--color-info-light)',
            color: 'var(--color-info)',
        },
        {
            label: 'Call Duration',
            value: formatDuration(leads.reduce((sum, l) => sum + (l.callDuration || 0), 0)),
            bg: '#f3e8ff',
            color: '#8b5cf6',
        },
    ];

    const statusOrder = ['new', 'attempted', 'connected', 'interested', 'callback_scheduled', 'meeting_scheduled', 'not_interested', 'not_reachable', 'do_not_call', 'closed_won', 'closed_lost'];
    const statusCounts: Record<string, number> = {};
    leads.forEach(l => { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1; });

    const lifecycleData = statusOrder.map(s => ({
        name: STATUS_LABELS[s] || s,
        value: statusCounts[s] || 0,
        color: STATUS_COLORS[s] || '#94a3b8',
        statusKey: s,
    }));

    const recentLeads = [...leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

    return (
        <div style={{ maxWidth: 1200 }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-end sm:justify-between gap-4" style={{ marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Dashboard</h1>
                    <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: 4 }}>
                        Here's an overview of your CRM leads and queue.
                    </p>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
                {kpis.map((kpi, idx) => (
                    <div
                        key={idx}
                        className="card animate-fade-in"
                        style={{ padding: "24px", transition: "transform 0.2s ease, box-shadow 0.2s ease", overflow: "hidden" }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.08)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                                    {kpi.label}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                    <div style={{ fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, color: "var(--color-text)" }}>
                                        {kpi.value}
                                    </div>
                                    {kpi.subtitle && (
                                        <span style={{ fontSize: "0.875rem", fontWeight: 500, color: kpi.subtitleColor }}>{kpi.subtitle}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card" style={{ padding: "20px", marginBottom: 24 }}>
                <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: 16 }}>Leads Lifecycle</h3>
                <div style={{ height: 260, marginBottom: 24 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={lifecycleData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                            <XAxis dataKey="name" hide />
                            <YAxis axisLine tickLine tick={false} stroke="var(--color-border)" />
                            <Tooltip
                                contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: "0.8125rem" }}
                            />
                            <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                                {lifecycleData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 8px', fontSize: '0.75rem', fontWeight: 500 }}>
                    {lifecycleData.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, color: item.color }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: item.color }} />
                            <span>{item.name} ({item.value})</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
                    <h3 style={{ fontSize: "0.875rem", fontWeight: 600 }}>Recent Leads</h3>
                </div>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {recentLeads.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>
                            No leads yet
                        </div>
                    ) : (
                        recentLeads.map((lead, idx) => (
                            <div
                                key={lead._id}
                                style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    {/* <div style={{
                                        width: 34, height: 34, borderRadius: '50%', background: AVATAR_COLORS[idx % AVATAR_COLORS.length],
                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.7rem', fontWeight: 600, flexShrink: 0,
                                    }}>
                                        {getInitials(lead.name)}
                                    </div> */}
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>{lead.name}</span>
                                            <span className={`badge badge-${lead.status === 'new' ? 'todo' : lead.status === 'closed_won' ? 'done' : lead.status === 'closed_lost' ? 'not_started' : 'in_progress'}`} style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
                                                {lead.status.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                                            {lead.phone && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                    <Phone size={11} /> {lead.phone}
                                                </span>
                                            )}
                                            {lead.companyName && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                    <Building size={11} /> {lead.companyName}
                                                </span>
                                            )}
                                            <span>Calls: {lead.callCount}</span>
                                            <span>Added {formatDateShort(lead.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>
                                {lead.campaignId && typeof lead.campaignId === 'object' && (
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', background: 'var(--color-surface)', padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                                        {lead.campaignId.name}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default CrmDashboard;