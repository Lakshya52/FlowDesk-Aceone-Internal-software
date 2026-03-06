import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
    isToday,
} from 'date-fns';

const CalendarPage: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const start = startOfWeek(startOfMonth(currentMonth));
                const end = endOfWeek(endOfMonth(currentMonth));
                const { data } = await api.get('/dashboard/calendar', {
                    params: { start: start.toISOString(), end: end.toISOString() },
                });
                setEvents([
                    ...(data.tasks || []).map((t: any) => ({ ...t, type: 'task' })),
                    ...(data.assignments || []).map((a: any) => ({ ...a, type: 'assignment' })),
                ]);
            } catch { }
            finally { setLoading(false); }
        };
        fetch();
    }, [currentMonth]);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
        days.push(day);
        day = addDays(day, 1);
    }

    const getEventsForDay = (date: Date) => {
        return events.filter(e => {
            const eDate = new Date(e.dueDate);
            return isSameDay(eDate, date);
        });
    };

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div style={{ maxWidth: 1100 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Calendar</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                        <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 600, minWidth: 140, textAlign: 'center' }}>
                        {format(currentMonth, 'MMMM yyyy')}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                        <ChevronRight size={16} />
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setCurrentMonth(new Date())}>Today</button>
                </div>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--color-border)' }}>
                    {dayNames.map(name => (
                        <div key={name} style={{
                            padding: '10px 12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--color-text-secondary)',
                            textAlign: 'center',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            {name}
                        </div>
                    ))}
                </div>
                {loading ? null : null}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {days.map((date, idx) => {
                        const dayEvents = getEventsForDay(date);
                        const isCurrentMonth = isSameMonth(date, currentMonth);
                        const today = isToday(date);

                        return (
                            <div
                                key={idx}
                                style={{
                                    minHeight: 100,
                                    padding: 8,
                                    borderBottom: '1px solid var(--color-border)',
                                    borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--color-border)' : 'none',
                                    opacity: isCurrentMonth ? 1 : 0.4,
                                    background: today ? 'var(--color-primary-light)' : 'transparent',
                                }}
                            >
                                <div style={{
                                    fontSize: '0.8125rem',
                                    fontWeight: today ? 700 : 400,
                                    color: today ? 'var(--color-primary)' : 'var(--color-text)',
                                    marginBottom: 4,
                                }}>
                                    {format(date, 'd')}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {dayEvents.slice(0, 3).map((ev, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                fontSize: '0.6875rem',
                                                padding: '2px 6px',
                                                borderRadius: 4,
                                                background: ev.type === 'task' ? 'var(--color-info-light)' : 'var(--color-warning-light)',
                                                color: ev.type === 'task' ? 'var(--color-info)' : 'var(--color-warning)',
                                                fontWeight: 500,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                cursor: 'default',
                                            }}
                                            title={ev.title}
                                        >
                                            {ev.title}
                                        </div>
                                    ))}
                                    {dayEvents.length > 3 && (
                                        <div style={{ fontSize: '0.625rem', color: 'var(--color-text-tertiary)', paddingLeft: 6 }}>
                                            +{dayEvents.length - 3} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CalendarPage;
