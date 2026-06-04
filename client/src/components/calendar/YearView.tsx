import React from 'react';
import { format, addMonths, startOfYear, endOfMonth, startOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, } from 'date-fns';
import { useCalendarStore } from '../../store/calendarStore';

interface YearViewProps {
  events: any[];
}

const YearView: React.FC<YearViewProps> = ({  }) => {
  const { currentDate, setCurrentDate, setCurrentView } = useCalendarStore();
  
  const yearStart = startOfYear(currentDate);
  const months = Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));

  // const getEventCountForDay = (date: Date) => {
  //   const dayStart = startOfDay(date);
  //   const dayEnd = endOfDay(date);
  //   return events.filter(event => {
  //     const eStart = new Date(event.startDate);
  //     const eEnd = new Date(event.endDate);
  //     return isSameDay(eStart, date) || isSameDay(eEnd, date) || (eStart < dayStart && eEnd > dayEnd);
  //   }).length;
  // };

  // const getHeatmapColor = (count: number) => {
  //   if (count === 0) return { backgroundColor: 'transparent', color: 'var(--color-text)' };
  //   if (count <= 2) return { backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', fontWeight: 500 };
  //   if (count <= 4) return { backgroundColor: 'var(--color-primary)', color: '#ffffff', fontWeight: 'bold' };
  //   return { backgroundColor: 'var(--color-primary-hover)', color: '#ffffff', fontWeight: 'bold' };
  // };

  const renderMonth = (monthDate: Date) => {
    const mStart = startOfMonth(monthDate);
    const mEnd = endOfMonth(mStart);
    const startDate = startOfWeek(mStart);
    const endDate = endOfWeek(mEnd);

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return (
      <div key={monthDate.toString()} style={{ backgroundColor: 'var(--color-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <h3 
          style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '16px', cursor: 'pointer', transition: 'color 0.2s' }}
          onClick={() => {
            setCurrentDate(monthDate);
            setCurrentView('month');
          }}
          onMouseOver={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
          onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-text)'}
        >
          {format(monthDate, 'MMMM')}
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '4px', marginBottom: '8px' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>{d}</div>
          ))}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '4px' }}>
          {days.map((d, i) => {
            const isCurrentMonth = isSameMonth(d, monthDate);
            const isToday = isSameDay(d, new Date());
            
            return (
              <div 
                key={i} 
                onClick={() => {
                  if (isCurrentMonth) {
                    setCurrentDate(d);
                    setCurrentView('day');
                  }
                }}
                style={{
                  aspectRatio: '1 / 1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  borderRadius: '50%',
                  cursor: isCurrentMonth ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  color: !isCurrentMonth ? 'transparent' : 'var(--color-text)',
                  backgroundColor: 'transparent',
                  fontWeight: isCurrentMonth && isToday ? 'bold' : 'normal',
                  border: isCurrentMonth && isToday ? '2px solid var(--color-primary)' : '2px solid transparent'
                }}
                onMouseOver={(e) => {
                  if (isCurrentMonth) {
                    e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                  }
                }}
                onMouseOut={(e) => {
                  if (isCurrentMonth) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {isCurrentMonth ? format(d, 'd') : ''}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ flex: 1, backgroundColor: 'var(--color-bg)', overflowY: 'auto', padding: '24px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
          {months.map(renderMonth)}
        </div>
      </div>
    </div>
  );
};

export default YearView;
