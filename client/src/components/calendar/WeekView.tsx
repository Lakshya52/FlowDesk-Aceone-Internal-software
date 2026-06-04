import React, { useState, useEffect } from 'react';
import { startOfWeek, endOfWeek, addDays, format, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { useCalendarStore } from '../../store/calendarStore';


interface WeekViewProps {
  events: any[];
}

const WeekView: React.FC<WeekViewProps> = ({ events }) => {
  const { currentDate, openEventModal, openEventDrawer } = useCalendarStore();
  
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);
  
  const startDate = startOfWeek(currentDate);
  const endDate = endOfWeek(currentDate);
  
  const days = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--color-surface)', overflowX: 'auto', overflowY: 'hidden' }}>
      <div style={{ minWidth: '700px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', flexShrink: 0 }}>
          <div style={{ width: '64px', borderRight: '1px solid var(--color-border)' }}></div>
        {days.map(day => {
          const isToday = isSameDay(day, new Date());
          return (
            <div key={day.toString()} style={{ flex: 1, padding: '8px 0', textAlign: 'center', borderRight: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>
                {format(day, 'EEE')}
              </div>
              <div style={{
                fontSize: '18px',
                marginTop: '4px',
                width: '32px',
                height: '32px',
                margin: '4px auto 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                backgroundColor: isToday ? 'var(--color-primary)' : 'transparent',
                color: isToday ? '#ffffff' : 'var(--color-text)',
                fontWeight: isToday ? 'bold' : 'normal'
              }}>
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time Grid */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex' }} >
        <div style={{ width: '64px', flexShrink: 0, backgroundColor: 'var(--color-bg)', borderRight: '1px solid var(--color-border)', height: 'fit-content' }} className='this'>
          {hours.map(hour => (
            <div key={hour} style={{ height: '64px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: '8px', paddingTop: '4px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
            </div>
          ))}
        </div>
        
        <div style={{ flex: 1, display: 'flex', position: 'relative', height: 'fit-content' }}>
          {days.map((day, idx) => {
            // Get events for this day
            const dayStart = startOfDay(day);
            const dayEnd = endOfDay(day);
            const dayEvents = events.filter(e => {
              const eStart = new Date(e.startDate);
              const eEnd = new Date(e.endDate);
              return !e.allDay && (isSameDay(eStart, day) || isSameDay(eEnd, day) || (eStart < dayStart && eEnd > dayEnd));
            });
            
            return (
              <div key={day.toString()} style={{ flex: 1, borderRight: idx === days.length - 1 ? 'none' : '1px solid var(--color-border)', position: 'relative' }}>
                {hours.map(hour => (
                  <div 
                    key={hour} 
                    style={{ height: '64px', borderBottom: '1px solid var(--color-surface-hover)', cursor: 'pointer', transition: 'background-color 0.2s' }}
                    onClick={() => {
                      const newDate = new Date(day);
                      newDate.setHours(hour);
                      openEventModal(undefined, newDate);
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-light)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  ></div>
                ))}
                
                {/* Render Events */}
                {dayEvents.map(event => {
                  const start = new Date(event.startDate);
                  const end = new Date(event.endDate);
                  const dayStartTime = startOfDay(day);
                  const dayEndTime = endOfDay(day);
                  const actualStart = start < dayStartTime ? dayStartTime : start;
                  const actualEnd = end > dayEndTime ? dayEndTime : end;
                  const top = (actualStart.getHours() * 64) + (actualStart.getMinutes() / 60 * 64);
                  const durationHours = (actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60);
                  const height = Math.max(durationHours * 64, 24); // min height 24px
                  
                  return (
                    <div 
                      key={event._id}
                      onClick={(e) => { e.stopPropagation(); openEventDrawer(event._id); }}
                      style={{
                        position: 'absolute',
                        left: '4px',
                        right: '4px',
                        borderRadius: '4px',
                        padding: '4px',
                        fontSize: '12px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'all 0.2s',
                        top: `${top}px`,
                        height: `${height}px`,
                        backgroundColor: `${event.calendar?.color || '#6366f1'}30`,
                        borderLeft: `3px solid ${event.calendar?.color || '#6366f1'}`,
                        color: 'var(--color-text)'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.filter = 'brightness(0.95)')}
                      onMouseOut={(e) => (e.currentTarget.style.filter = 'none')}
                    >
                      <div style={{ fontWeight: 600, fontSize: '10px' }}>{format(start, 'HH:mm')}</div>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</div>
                    </div>
                  );
                })}
                
                {/* Current Time Line */}
                {isSameDay(day, now) && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: `${(now.getHours() * 64) + (now.getMinutes() / 60 * 64)}px`,
                    height: '2px',
                    backgroundColor: 'var(--color-danger)',
                    zIndex: 20,
                    pointerEvents: 'none'
                  }}>
                    <div style={{
                      position: 'absolute',
                      left: '-4px',
                      top: '-4px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-danger)'
                    }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
};

export default WeekView;
