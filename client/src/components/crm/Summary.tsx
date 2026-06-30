import { useState, useCallback } from 'react';
import {
  startOfWeek, endOfWeek, format, addWeeks, subWeeks,
  startOfMonth, addMonths, subMonths,
  startOfYear, addYears, subYears,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Download, FileText, AlertCircle, Inbox, TrendingUp, TrendingDown, Users, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useCrmSocket } from '../../hooks/useCrmSocket';

type Scope = 'weekly' | 'monthly' | 'yearly';

interface StatusBreakdown {
  new: number; attempted: number; connected: number; interested: number;
  callbackScheduled: number; meetingScheduled: number;
  notInterested: number; notReachable: number; doNotCall: number;
  closedWon: number; closedLost: number;
}
interface LeadsData {
  total: number; contacted: number; won: number;
  callDuration: number; callDurationLabel: string; callCount: number;
  contactedTrend: number | null; wonTrend: number | null;
  statusBreakdown: StatusBreakdown;
}
interface EventsData { total: number; trend: number | null }
interface ChartItem { name: string; contacted: number; won: number }
interface SummaryData {
  scope: Scope; dateRange: { start: string; end: string };
  leads: LeadsData; events: EventsData; conversionRate: number;
  chartData: ChartItem[];
}

interface UserItem { _id: string; name: string; role: string }

const SCOPE_TABS: { key: Scope; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

const Trend = ({ v }: { v: number | null }) => {
  if (v === null) return <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>{'\u2014'}</span>;
  if (v === 0) return <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>0%</span>;
  const up = v > 0;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 2,
        fontSize: 12, fontWeight: 500,
        color: up ? 'var(--color-success)' : 'var(--color-danger)',
      }}
    >
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{up ? '+' : ''}{v}%
    </span>
  );
};

const StatItem = ({ label, value, trend, sub }: { label: string; value: string | number; trend?: number | null; sub?: string }) => (
  <div
    style={{
      borderRight: '1px solid var(--color-border)',
      paddingLeft: 20, paddingRight: 20,
      minWidth: 0,
    }}
    className="first:pl-0 last:pr-0 last:border-r-0"
  >
    <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)', marginBottom: 2 }} className="truncate">
      {label}
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      {trend !== undefined && <Trend v={trend ?? null} />}
    </div>
    {sub && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{sub}</div>}
  </div>
);

const Summary = () => {
  useCrmSocket();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<Scope>('weekly');
  const [refDate, setRefDate] = useState(() => new Date());
  const [exporting, setExporting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const { user } = useAuthStore();

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const canSelectUser = isAdmin || isManager;

  const { data: users = [] } = useQuery<UserItem[]>({
    queryKey: ["users", "members"],
    queryFn: async () => {
      if (!canSelectUser) return [];
      const { data: res } = await api.get('/auth/users');
      return (res.users || []).filter((u: any) => u.role === 'member' || u.role === 'manager');
    },
    enabled: canSelectUser,
  });

  const getPeriodLabel = useCallback(() => {
    if (scope === 'weekly') {
      const s = startOfWeek(refDate, { weekStartsOn: 1 });
      const e = endOfWeek(refDate, { weekStartsOn: 1 });
      return `${format(s, 'MMM d')} \u2013 ${format(e, 'MMM d, yyyy')}`;
    }
    if (scope === 'monthly') return format(refDate, 'MMMM yyyy');
    return format(refDate, 'yyyy');
  }, [scope, refDate]);

  const navigate = useCallback((dir: -1 | 1) => {
    setRefDate(prev => {
      if (scope === 'weekly') return dir === -1 ? subWeeks(prev, 1) : addWeeks(prev, 1);
      if (scope === 'monthly') return dir === -1 ? subMonths(prev, 1) : addMonths(prev, 1);
      return dir === -1 ? subYears(prev, 1) : addYears(prev, 1);
    });
  }, [scope]);

  const getDateParam = useCallback(() => {
    if (scope === 'weekly') return format(startOfWeek(refDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    if (scope === 'monthly') return format(startOfMonth(refDate), 'yyyy-MM-dd');
    return format(startOfYear(refDate), 'yyyy-MM-dd');
  }, [scope, refDate]);

  const { data, isLoading: loading, error } = useQuery<SummaryData>({
    queryKey: ["crm-summary", scope, getDateParam(), selectedUserId],
    queryFn: async () => {
      const params: any = { scope, date: getDateParam() };
      if (selectedUserId) params.userId = selectedUserId;
      const { data: res } = await api.get('/crm-summary', { params });
      return res;
    },
  });

  const queryError = error ? (error as any)?.response?.data?.message || 'Failed to load summary' : null;

  const handleScopeChange = (s: Scope) => { setScope(s); setRefDate(new Date()); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: any = { scope, date: getDateParam() };
      if (selectedUserId) params.userId = selectedUserId;
      const res = await api.get('/crm-summary/export', {
        params,
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crm_reports_${scope}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally { setExporting(false); }
  };

  if (loading && !data) {
    return (
      <div style={{ maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="skeleton" style={{ height: 36, width: 240, borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 16, width: 320, borderRadius: 6 }} />
        <div style={{ display: 'flex', gap: 16 }}>
          <div className="skeleton" style={{ height: 36, width: 200, borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 36, width: 160, borderRadius: 8 }} />
        </div>
        <div className="skeleton" style={{ height: 80, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 280, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
      </div>
    );
  }

  if (queryError && !data) {
    return (
      <div style={{ maxWidth: 1200 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '60px 20px', textAlign: 'center' }}>
          <AlertCircle size={36} style={{ color: 'var(--color-danger)' }} />
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{queryError}</p>
          <button onClick={() => queryClient.invalidateQueries({ queryKey: ["crm-summary"] })} className="btn btn-primary btn-sm"><RefreshCw size={14} /> Try Again</button>
        </div>
      </div>
    );
  }

  const hasChartData = data && data.chartData && data.chartData.length > 0 && data.chartData.some(d => d.contacted > 0 || d.won > 0);
  const isReloading = loading && !!data;

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text)' }}>
            Summary
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            CRM performance overview for the selected period
          </p>
        </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => queryClient.invalidateQueries({ queryKey: ["crm-summary"] })} disabled={loading} className="btn btn-secondary w-full sm:w-auto" style={{ padding: '8px 12px' }} title="Refresh data">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={handleExport} disabled={exporting} className="btn btn-primary w-full sm:w-auto">
              <Download size={14} />
              {exporting ? 'Exporting\u2026' : 'Export Excel'}
            </button>
          </div>
      </div>

      {/* ── Scope tabs + period navigation + user selector ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 32, borderBottom: '1px solid var(--color-border)' }}>
          {SCOPE_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => handleScopeChange(t.key)}
              style={{
                padding: '8px 0',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: scope === t.key ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                borderBottom: scope === t.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                marginBottom: -1,
                transition: 'all 0.15s ease',
              }}
            >{t.label}</button>
          ))}
        </div>

        {canSelectUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={14} style={{ color: 'var(--color-text-tertiary)' }} />
            <select
              className="select"
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '4px 24px 4px 8px', minWidth: 150 }}
            >
              <option value="">All Users</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          {isReloading && (
            <RefreshCw size={14} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          )}
          <button
            onClick={() => setRefDate(new Date())}
            disabled={loading}
            className="btn btn-ghost w-full sm:w-auto"
            style={{ padding: '4px 10px', fontWeight: 600, fontSize: '0.75rem' }}
          >
            Today
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px', borderRadius: 6, background: 'var(--color-surface-hover)' }}>
            <button
              onClick={() => navigate(-1)}
              className="btn btn-ghost btn-sm"
              style={{ padding: '2px 6px', borderRadius: 4 }}
              aria-label="Previous"
            >
              <ChevronLeft size={15} />
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', minWidth: 160, textAlign: 'center' }}>
              {getPeriodLabel()}
            </span>
            <button
              onClick={() => navigate(1)}
              className="btn btn-ghost btn-sm"
              style={{ padding: '2px 6px', borderRadius: 4 }}
              aria-label="Next"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Error banner (reload failure with existing data) ── */}
      {queryError && data && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', marginBottom: 16, borderRadius: 10, background: 'var(--color-danger-light)', color: 'var(--color-danger)', fontSize: 13, fontWeight: 500 }}>
          <AlertCircle size={14} />
          <span>{queryError}</span>
          <button onClick={() => queryClient.invalidateQueries({ queryKey: ["crm-summary"] })} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--color-danger)', fontWeight: 600, cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {/* ── Stats row ── */}
      {data ? (
        <div
          className="card animate-fade-in"
          style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'stretch', overflowX: 'auto', minHeight: 80 }}
        >
          <StatItem label="Leads Total" value={data.leads.total} />
          <StatItem label="Leads Contacted" value={data.leads.contacted} trend={data.leads.contactedTrend} sub={`${data.leads.won} won`} />
          <StatItem label="Calls" value={data.leads.callCount} sub={data.leads.callDurationLabel} />
          <StatItem label="Leads Won" value={data.leads.won} trend={data.leads.wonTrend} />
          <StatItem label="Conversion Rate" value={`${data.conversionRate}%`} sub={`${data.leads.statusBreakdown.new} new`} />
          <StatItem label="Meetings" value={data.events.total} trend={data.events.trend} />
        </div>
      ) : (
        <div className="card" style={{ padding: '20px', marginBottom: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14 }}>No data</div>
      )}

      {/* ── Status Breakdown ── */}
      {data && (
        <div className="card animate-fade-in" style={{ padding: '16px 20px', marginBottom: 24, minHeight: 160 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <FileText size={14} style={{ color: 'var(--color-text-tertiary)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)' }}>Lead Status Breakdown</span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 10,
          }}>
            {[
              { key: 'new', label: 'New', color: '#6366f1' },
              { key: 'attempted', label: 'Attempted', color: '#8b5cf6' },
              { key: 'connected', label: 'Connected', color: '#3b82f6' },
              { key: 'interested', label: 'Interested', color: '#0ea5e9' },
              { key: 'callbackScheduled', label: 'Callback Scheduled', color: '#06b6d4' },
              { key: 'meetingScheduled', label: 'Meeting Scheduled', color: '#10b981' },
              { key: 'notInterested', label: 'Not Interested', color: '#f59e0b' },
              { key: 'notReachable', label: 'Not Reachable', color: '#f97316' },
              { key: 'doNotCall', label: 'Do Not Call', color: '#ef4444' },
              { key: 'closedWon', label: 'Closed / Won', color: '#22c55e' },
              { key: 'closedLost', label: 'Closed / Lost', color: '#dc2626' },
            ].map(s => {
              const val = (data.leads.statusBreakdown as any)[s.key] ?? 0;
              const pct = data.leads.total > 0 ? Math.round((val / data.leads.total) * 100) : 0;
              return (
                <div
                  key={s.key}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 4,
                    padding: '10px 12px', borderRadius: 10,
                    background: 'var(--color-surface-hover)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{s.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{val}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Chart ── */}
      <div className="card animate-fade-in" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>
            CRM Activity
            <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400, marginLeft: 6 }}>
              ({scope === 'weekly' ? 'per day' : scope === 'monthly' ? 'per week' : 'per month'})
            </span>
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-primary)' }} />
              Contacted
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-success)' }} />
              Won
            </span>
          </div>
        </div>

        {hasChartData ? (
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    fontSize: '0.8125rem',
                    boxShadow: 'var(--shadow-md)',
                  }}
                  cursor={{ fill: 'var(--color-surface-hover)' }}
                />
                <Bar dataKey="contacted" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="won" fill="var(--color-success)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ height: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Inbox size={32} style={{ color: 'var(--color-text-tertiary)' }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-tertiary)' }}>No activity this period</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Try a different time range or scope</p>
          </div>
        )}
      </div>

      {/* ── Breakdown table ── */}
      <div className="card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={14} style={{ color: 'var(--color-text-tertiary)' }} />
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)' }}>Period Breakdown</span>
        </div>

        <div style={{ overflowX: 'auto', minHeight: 160 }}>
          {data && data.chartData && data.chartData.length > 0 ? (
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Period', 'Contacted', 'Won', 'Conversion'].map(h => (
                    <th
                      key={h}
                      style={{
                        textAlign: h === 'Period' ? 'left' : 'right',
                        padding: '10px 20px',
                        fontWeight: 600,
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--color-text-tertiary)',
                      }}
                    >{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.chartData.map((row, i) => {
                  const rate = row.contacted > 0 ? Math.round((row.won / row.contacted) * 100) : 0;
                  const rateColor =
                    rate >= 50 ? 'var(--color-success)' :
                    rate >= 25 ? 'var(--color-warning)' :
                    rate > 0 ? 'var(--color-danger)' : 'var(--color-text-tertiary)';
                  const rateBg =
                    rate >= 50 ? 'var(--color-success-light)' :
                    rate >= 25 ? 'var(--color-warning-light)' :
                    rate > 0 ? 'var(--color-danger-light)' : 'var(--color-surface-hover)';
                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        transition: 'background 0.15s ease',
                      }}
                      className="hover:bg-(--color-surface-hover)"
                    >
                      <td style={{ padding: '10px 20px', fontWeight: 500, color: 'var(--color-text)' }}>{row.name}</td>
                      <td style={{ padding: '10px 20px', textAlign: 'right', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                        {row.contacted || '\u2014'}
                      </td>
                      <td style={{ padding: '10px 20px', textAlign: 'right', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                        {row.won || '\u2014'}
                      </td>
                      <td style={{ padding: '10px 20px', textAlign: 'right' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 500,
                            color: rateColor,
                            background: rateBg,
                          }}
                        >{rate}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
              No data to display
            </div>
          )}
        </div>

        <div style={{ padding: '8px 20px', borderTop: '1px solid var(--color-border)', fontSize: 10, color: 'var(--color-text-tertiary)', textAlign: 'right' }}>
          Generated {format(new Date(), 'MMM d, yyyy h:mm a')} {'\u2014'} {user?.name || 'Current User'}
        </div>
      </div>
    </div>
  );
};

export default Summary;
