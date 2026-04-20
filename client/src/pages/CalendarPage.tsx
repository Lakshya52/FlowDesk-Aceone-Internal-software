import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { ChevronLeft, ChevronRight, X, Calendar, Layers, Columns, Clock, ChevronDown } from 'lucide-react';
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
    addWeeks,
    subWeeks,
    addYears,
    subYears,
    eachDayOfInterval,
    eachMonthOfInterval,
    startOfYear,
    endOfYear,
} from 'date-fns';

interface Holiday {
    date: string; // YYYY-MM-DD
    name: string;
    category: 'Festival' | 'National / Gazetted';
}

const HOLIDAYS: Holiday[] = [
    { date: '2026-01-01', name: "New Year's Day", category: 'Festival' },
    { date: '2026-01-14', name: 'Makar Sankranti / Pongal', category: 'Festival' },
    { date: '2026-01-26', name: 'Republic Day', category: 'National / Gazetted' },
    { date: '2026-02-15', name: 'Maha Shivaratri', category: 'Festival' },
    { date: '2026-03-04', name: 'Holi', category: 'Festival' },
    { date: '2026-03-21', name: 'Eid-ul-Fitr / Ramzan Id*', category: 'Festival' },
    { date: '2026-03-26', name: 'Rama Navami', category: 'Festival' },
    { date: '2026-03-31', name: 'Mahavir Jayanti', category: 'Festival' },
    { date: '2026-04-03', name: 'Good Friday', category: 'Festival' },
    { date: '2026-04-05', name: 'Easter Sunday', category: 'Festival' },
    { date: '2026-04-14', name: 'Vaisakhi / Ambedkar Jayanti', category: 'Festival' },
    { date: '2026-05-27', name: 'Eid-ul-Adha / Bakrid', category: 'Festival' },
    { date: '2026-06-26', name: 'Muharram / Ashura', category: 'Festival' },
    { date: '2026-08-15', name: 'Independence Day', category: 'National / Gazetted' },
    { date: '2026-08-26', name: 'Milad-un-Nabi/Onam', category: 'Festival' },
    { date: '2026-08-28', name: 'Raksha Bandhan', category: 'Festival' },
    { date: '2026-09-04', name: 'Janmashtami', category: 'Festival' },
    { date: '2026-09-14', name: 'Ganesh Chaturthi', category: 'Festival' },
    { date: '2026-10-02', name: 'Gandhi Jayanti', category: 'National / Gazetted' },
    { date: '2026-10-19', name: 'Maha Ashtami', category: 'Festival' },
    { date: '2026-10-20', name: 'Dussehra (Vijayadashami)', category: 'Festival' },
    { date: '2026-11-08', name: 'Diwali / Deepavali', category: 'National / Gazetted' },
    { date: '2026-11-09', name: 'Govardhan Puja', category: 'Festival' },
    { date: '2026-11-11', name: 'Bhai Duj', category: 'Festival' },
    { date: '2026-11-24', name: 'Guru Nanak Jayanti', category: 'National / Gazetted' },
    { date: '2026-12-25', name: 'Christmas Day', category: 'Festival' },
];

const getHolidayColor = (category: string) => {
    switch (category) {
        case 'National / Gazetted': return '#ef4444'; // Red
        case 'Festival': return '#25f85ac4'; // Purple
        default: return 'var(--color-text-secondary)';
    }
};

const CalendarPage: React.FC = () => {
    const navigate = useNavigate();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [view, setView] = useState<'year' | 'month' | 'week' | 'day'>('month');
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);

    const handlePrev = () => {
        if (view === 'year') setCurrentMonth(subYears(currentMonth, 1));
        else if (view === 'month') setCurrentMonth(subMonths(currentMonth, 1));
        else if (view === 'week') setCurrentMonth(subWeeks(currentMonth, 1));
        else if (view === 'day') setCurrentMonth(addDays(currentMonth, -1));
    };

    const handleNext = () => {
        if (view === 'year') setCurrentMonth(addYears(currentMonth, 1));
        else if (view === 'month') setCurrentMonth(addMonths(currentMonth, 1));
        else if (view === 'week') setCurrentMonth(addWeeks(currentMonth, 1));
        else if (view === 'day') setCurrentMonth(addDays(currentMonth, 1));
    };

    const handleToday = () => {
        setCurrentMonth(new Date());
    };

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

    const getHolidayForDay = (date: Date) => {
        return HOLIDAYS.find(h => isSameDay(new Date(h.date), date));
    };

    const formatHeaderDate = () => {
        if (view === 'year') return format(currentMonth, 'yyyy');
        if (view === 'month') return format(currentMonth, 'MMMM yyyy');
        if (view === 'week') {
            const start = startOfWeek(currentMonth);
            const end = endOfWeek(currentMonth);
            return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
        }
        return format(currentMonth, 'MMMM d, yyyy');
    };

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const renderMonthView = (targetDate: Date, isMini = false) => {
        const monthStart = startOfMonth(targetDate);
        const monthEnd = endOfMonth(targetDate);
        const calStart = startOfWeek(monthStart);
        const calEnd = endOfWeek(monthEnd);

        const days: Date[] = [];
        let day = calStart;
        while (day <= calEnd) {
            days.push(day);
            day = addDays(day, 1);
        }

        return (
            <div className={isMini ? "" : "card"} style={{ overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--color-border)' }}>
                    {dayNames.map(name => (
                        <div key={name} style={{
                            padding: isMini ? '4px' : '10px 12px',
                            fontSize: isMini ? '0.625rem' : '0.75rem',
                            fontWeight: 600,
                            color: name === 'Sun' ? '#ef4444' : 'var(--color-text-secondary)',
                            textAlign: 'center',
                            textTransform: 'uppercase',
                        }}>
                            {isMini ? name[0] : name}
                        </div>
                    ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {days.map((date, idx) => {
                        const dayEvents = getEventsForDay(date);
                        const isCurrentMonth = isSameMonth(date, targetDate);
                        const today = isToday(date);
                        const holiday = getHolidayForDay(date);
                        const isSunday = date.getDay() === 0;

                        return (
                            <div
                                key={idx}
                                className="calendar-day"
                                style={{
                                    height: isMini ? 40 : 120,
                                    padding: isMini ? 2 : 8,
                                    borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid var(--color-border)',
                                    borderBottom: '1px solid var(--color-border)',
                                    opacity: isCurrentMonth ? 1 : 0.3,
                                    background: holiday
                                        ? `${getHolidayColor(holiday.category).slice(0, 7)}1a`
                                        : (today ? 'var(--color-primary-light)' : (isSunday ? '#ef44440a' : 'transparent')),
                                    boxShadow: today ? 'inset 0 0 0 2px var(--color-primary)' : 'none',
                                    cursor: 'pointer',
                                    position: 'relative',
                                }}
                                onClick={() => {
                                    if (isMini) {
                                        setCurrentMonth(date);
                                        setView('month');
                                    } else {
                                        setSelectedDay(date);
                                    }
                                }}
                            >
                                <div style={{
                                    fontSize: isMini ? '0.6875rem' : '0.8125rem',
                                    fontWeight: today ? 700 : 400,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'start'
                                }}>
                                    <span>{format(date, 'd')}</span>
                                    {!isMini && holiday && (
                                        <span style={{ fontSize: '0.625rem', color: getHolidayColor(holiday.category), textAlign: 'right', maxWidth: '70%', lineHeight: 1.1 }}>
                                            {holiday.name}
                                        </span>
                                    )}
                                    {isMini && holiday && <div style={{ width: 4, height: 4, borderRadius: '50%', background: getHolidayColor(holiday.category) }} />}
                                </div>
                                {!isMini && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                                        {dayEvents.slice(0, 2).map((ev, i) => (
                                            <div key={i} style={{ fontSize: '0.625rem', padding: '1px 4px', borderRadius: 3, background: 'var(--color-surface-hover)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {ev.title}
                                            </div>
                                        ))}
                                        {dayEvents.length > 2 && <div style={{ fontSize: '0.625rem', color: 'var(--color-text-tertiary)' }}>+{dayEvents.length - 2} more</div>}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderYearView = () => {
        const months = eachMonthOfInterval({
            start: startOfYear(currentMonth),
            end: endOfYear(currentMonth)
        });

        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 24 }}>
                {months.map((m, i) => (
                    <div key={i} className="card" style={{ padding: 12 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 12, textAlign: 'center', color: 'var(--color-primary)' }}>
                            {format(m, 'MMMM')}
                        </div>
                        {renderMonthView(m, true)}
                    </div>
                ))}
            </div>
        );
    };

    const renderWeekView = () => {
        const start = startOfWeek(currentMonth);
        const days = eachDayOfInterval({ start, end: endOfWeek(currentMonth) });

        return (
            <div className="card" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(7, 1fr)', 
                height: 'calc(100vh - 280px)', 
                minHeight: 600,
                overflow: 'hidden' 
            }}>
                {days.map((date, i) => {
                    const dayEvents = getEventsForDay(date);
                    const holiday = getHolidayForDay(date);
                    const isSunday = date.getDay() === 0;
                    const today = isToday(date);

                    return (
                        <div key={i} style={{
                            borderRight: i === 6 ? 'none' : '1px solid var(--color-border)',
                            background: holiday ? `${getHolidayColor(holiday.category).slice(0, 7)}0d` : (isSunday ? '#ef444405' : 'transparent'),
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            overflow: 'hidden'
                        }}>
                            <div style={{ padding: 12, borderBottom: '1px solid var(--color-border)', textAlign: 'center', background: today ? 'var(--color-primary-light)' : 'transparent', flexShrink: 0 }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isSunday ? '#ef4444' : 'var(--color-text-secondary)' }}>
                                    {format(date, 'EEE')}
                                </div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: today ? 'var(--color-primary)' : 'inherit' }}>
                                    {format(date, 'd')}
                                </div>
                            </div>
                            <div style={{ flex: 1, padding: 10, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 40 }}>
                                {holiday && (
                                    <div style={{ padding: '6px 10px', borderRadius: 8, background: `${getHolidayColor(holiday.category).slice(0, 7)}1a`, color: getHolidayColor(holiday.category), fontSize: '0.75rem', fontWeight: 600 }}>
                                        {holiday.name}
                                    </div>
                                )}
                                {dayEvents.map((ev, j) => (
                                    <div key={j} className="card" style={{ padding: 8, fontSize: '0.75rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
                                        <div style={{ fontWeight: 600 }}>{ev.title}</div>
                                        <div style={{ fontSize: '0.625rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>{ev.type === 'task' ? 'Task' : 'Assignment'}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderDayView = () => {
        const dayEvents = getEventsForDay(currentMonth);
        const holiday = getHolidayForDay(currentMonth);
        const isSunday = currentMonth.getDay() === 0;

        const hours = Array.from({ length: 24 }, (_, i) => i);
        const now = new Date();
        const isSelectedDayToday = isToday(currentMonth);

        const getEventsForHour = (hour: number) => {
            return dayEvents.filter(ev => {
                const date = new Date(ev.dueDate);
                // Only show in hour slot if it's NOT a default midnight timestamp
                // or if it specifically matches the hour
                return date.getHours() === hour && (date.getHours() !== 0 || date.getMinutes() !== 0);
            });
        };

        const allDayEvents = dayEvents.filter(ev => {
            const date = new Date(ev.dueDate);
            // Defaulting to all-day if it's midnight
            return date.getHours() === 0 && date.getMinutes() === 0;
        });

        return (
            <div className="card" style={{ maxWidth: 1000, margin: '0 auto', height: 'calc(100vh - 280px)', minHeight: 600, display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 24, overflow: 'hidden' }}>
                {/* Day Header */}
                <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--color-border)', background: 'linear-gradient(to right, var(--color-surface), var(--color-bg))', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 64, height: 64, borderRadius: 16, background: isSunday ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-primary-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: isSunday ? '#ef4444' : 'var(--color-primary)' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>{format(currentMonth, 'EEE')}</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{format(currentMonth, 'd')}</span>
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{format(currentMonth, 'MMMM yyyy')}</h2>
                                {holiday && (
                                    <div style={{ color: getHolidayColor(holiday.category), fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <X size={12} style={{ transform: 'rotate(45deg)' }} />
                                        {holiday.name}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* All Day Section */}
                {(allDayEvents.length > 0 || holiday) && (
                    <div style={{ padding: '12px 32px', background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'start', gap: 16, flexShrink: 0 }}>
                        <div style={{ width: 80, fontSize: '0.625rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', paddingTop: 8 }}>All Day</div>
                        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {holiday && (
                                <div style={{ padding: '6px 12px', borderRadius: 10, background: `${getHolidayColor(holiday.category).slice(0, 7)}1a`, color: getHolidayColor(holiday.category), fontWeight: 700, fontSize: '0.8125rem', border: `1px solid ${getHolidayColor(holiday.category).slice(0, 7)}20` }}>
                                    ✨ {holiday.name}
                                </div>
                            )}
                            {allDayEvents.map((ev, i) => (
                                <div key={i} style={{ padding: '6px 12px', borderRadius: 10, background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, boxShadow: 'var(--shadow-sm)' }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.type === 'task' ? 'var(--color-info)' : 'var(--color-warning)' }} />
                                    {ev.title}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px', position: 'relative' }}>
                    {/* Current Time Indicator Line */}
                    {isSelectedDayToday && (
                        <div style={{ 
                            position: 'absolute', 
                            top: `${(now.getHours() * 80) + (now.getMinutes() / 60 * 80)}px`, 
                            left: 112, 
                            right: 32, 
                            height: 2, 
                            background: '#ef4444', 
                            zIndex: 10,
                            pointerEvents: 'none'
                        }}>
                            <div style={{ position: 'absolute', left: -80, top: -10, background: '#ef4444', color: 'white', fontSize: '0.625rem', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                                {format(now, 'h:mm aa')}
                            </div>
                            <div style={{ position: 'absolute', left: -4, top: -4, width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                        </div>
                    )}

                    {hours.map(hour => {
                        const hourEvents = getEventsForHour(hour);
                        return (
                            <div key={hour} style={{ display: 'flex', height: 80, borderBottom: '1px dashed var(--color-border-light)', position: 'relative' }}>
                                <div style={{ 
                                    width: 80, 
                                    paddingTop: 12, 
                                    fontSize: '0.75rem', 
                                    fontWeight: 700, 
                                    color: 'var(--color-text-tertiary)',
                                    textAlign: 'right',
                                    paddingRight: 16
                                }}>
                                    {format(new Date().setHours(hour, 0), 'h aa')}
                                </div>
                                <div style={{ flex: 1, padding: '4px 8px', display: 'flex', gap: 8 }}>
                                    {hourEvents.map((ev, i) => (
                                        <div key={i} className="group cursor-pointer" style={{ 
                                            flex: 1,
                                            padding: '12px', 
                                            background: ev.type === 'task' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(245, 158, 11, 0.05)',
                                            color: ev.type === 'task' ? 'var(--color-info)' : 'var(--color-warning)',
                                            borderLeft: `5px solid ${ev.type === 'task' ? 'var(--color-info)' : 'var(--color-warning)'}`,
                                            borderRadius: '0 12px 12px 0',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                                            height: 'fit-content',
                                            alignSelf: 'start',
                                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 4 }}>
                                                <span style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.7 }}>{ev.type}</span>
                                                <span style={{ fontSize: '0.625rem', padding: '2px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>{ev.status}</span>
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text)' }}>{ev.title}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    
                    {dayEvents.length === 0 && !holiday && (
                        <div style={{ 
                            padding: '100px 0',
                            textAlign: 'center',
                        }}>
                             <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--color-text-tertiary)' }}>
                                <Calendar size={32} />
                             </div>
                            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text)' }}>Your schedule is clear</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)', marginTop: 4 }}>No events or deadlines for this day.</div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={{ maxWidth: 1100 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Calendar</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 4, 
                        background: 'var(--color-surface)', 
                        borderRadius: 12, 
                        padding: '4px',
                        border: '1px solid var(--color-border)',
                        height: 40
                    }}>
                        <button 
                            className="btn-ghost rounded-lg cursor-pointer w-8 h-8 p-0" 
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 32, color: 'var(--color-text-secondary)' }}
                            onClick={handlePrev}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span style={{ 
                            fontSize: '0.8125rem', 
                            fontWeight: 700, 
                            minWidth: view === 'week' ? 180 : 130, 
                            textAlign: 'center',
                            color: 'var(--color-text)'
                        }}>
                            {formatHeaderDate()}
                        </span>
                        <button 
                            className="btn-ghost rounded-lg cursor-pointer w-8 h-8 p-0" 
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 32, color: 'var(--color-text-secondary)' }}
                            onClick={handleNext}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button 
                            className="btn btn-secondary shadow-sm" 
                            style={{ height: 40, minHeight: 40, borderRadius: 12, padding: '0 16px', fontSize: '0.75rem', fontWeight: 800 }}
                            onClick={handleToday}
                        >
                            Today
                        </button>
                        
                        <div className="relative">
                            <button
                                onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
                                className="btn btn-primary shadow-lg shadow-primary/20"
                                style={{ height: 40, minHeight: 40, borderRadius: 12, padding: '0 16px', fontSize: '0.75rem', fontWeight: 800, gap: 8 }}
                            >
                                <Calendar size={16} />
                                <span style={{ textTransform: 'uppercase', letterSpacing: '0.02em' }}>{view} View</span>
                                <ChevronDown
                                    size={14}
                                    className={`transition-transform duration-300 ${isViewDropdownOpen ? "rotate-180" : ""}`}
                                />
                            </button>

                            {isViewDropdownOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setIsViewDropdownOpen(false)}
                                    ></div>
                                    <div className="absolute right-0 mt-2 w-52 bg-surface rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] z-50 animate-fade-in p-2 backdrop-blur-xl border border-border/50">
                                        {[
                                            { id: 'year', label: 'Yearly', icon: <Layers size={16} />, color: 'primary' },
                                            { id: 'month', label: 'Monthly', icon: <Calendar size={16} />, color: 'success' },
                                            { id: 'week', label: 'Weekly', icon: <Columns size={16} />, color: 'info' },
                                            { id: 'day', label: 'Daily', icon: <Clock size={16} />, color: 'warning' }
                                        ].map((v) => (
                                            <button
                                                key={v.id}
                                                onClick={() => {
                                                    setView(v.id as any);
                                                    setIsViewDropdownOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold transition-all rounded-xl group/item mb-1 ${
                                                    view === v.id ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-hover'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 cursor-pointer hover:bg-(--color-primary) w-full rounded-xl my-2 ">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform ${
                                                        view === v.id ? 'bg-primary/20' : 'bg-surface-hover'
                                                    }`}>
                                                        {v.icon}
                                                    </div>
                                                    {v.label}
                                                </div>
                                                {view === v.id && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ minHeight: '60vh' }}>
                {loading ? null : (
                    <>
                        {view === 'year' && renderYearView()}
                        {view === 'month' && renderMonthView(currentMonth)}
                        {view === 'week' && renderWeekView()}
                        {view === 'day' && renderDayView()}
                    </>
                )}
            </div>

            <div style={{
                marginTop: 20,
                padding: '12px 16px',
                background: 'var(--color-surface)',
                borderRadius: 12,
                border: '1px solid var(--color-border)',
                display: 'flex',
                gap: 24,
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Holiday Categories:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: getHolidayColor('National / Gazetted') }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>National / Gazetted Holiday</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: getHolidayColor('Festival') }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Festival</span>
                </div>
            </div>

            {selectedDay && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
                }} onClick={() => setSelectedDay(null)}>
                    <div className="card animate-fade-in" style={{ width: '100%', maxWidth: 450, padding: 24 }} onClick={e => e.stopPropagation()}>

                        {/* main card header and close button */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{format(selectedDay, 'MMMM d, yyyy')}</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDay(null)}>
                                <X size={20} style={{ transform: 'rotate(90deg)' }} />
                            </button>
                        </div>

                        {/* list of tasks or events and deadlines etc */}
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>
                                Events & Deadlines
                            </div>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                                maxHeight: '60dvh',
                                overflowY: 'auto',
                                paddingRight: 4, // prevents scrollbar overlap
                            }}>
                                {getEventsForDay(selectedDay).length === 0 ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-tertiary)', background: 'var(--color-surface-hover)', borderRadius: 12 }}>
                                        No events for this day
                                    </div>
                                ) : (
                                    getEventsForDay(selectedDay).map((ev, i) => (
                                        <div
                                            key={i}
                                            className="card"
                                            style={{
                                                padding: '12px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => {
                                                const path = ev.type === 'task'
                                                    ? `/assignments/${ev.assignment}?tab=tasks&taskId=${ev._id}`
                                                    : `/assignments/${ev._id}`;
                                                navigate(path);
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{
                                                    width: 8, height: 8, borderRadius: '50%',
                                                    background: ev.type === 'task' ? 'var(--color-info)' : 'var(--color-warning)'
                                                }} />
                                                <div>
                                                    <div style={{
                                                        fontSize: '0.875rem', fontWeight: 600,
                                                        textDecoration: ev.status === 'completed' ? 'line-through' : 'none',
                                                        opacity: ev.status === 'completed' ? 0.6 : 1
                                                    }}>{ev.title}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{ev.type === 'task' ? 'Task' : 'Project Assignment'}</div>
                                                </div>
                                            </div>
                                            <div className={`badge badge-${ev.status === 'completed' ? 'success' : 'info'}`} style={{ fontSize: '0.6875rem' }}>
                                                {ev.status}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* buttons on the bottom card */}
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => navigate('/assignments')}>
                                Create Project
                            </button>
                            <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setSelectedDay(null)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarPage;
