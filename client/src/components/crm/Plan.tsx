import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, Phone, Target, Clock, AlertTriangle, Search, GripVertical } from 'lucide-react';
import { format, addDays } from 'date-fns';

const mockLeads = [
  { id: 1, name: 'John Doe', company: 'Acme Corp', priority: 'High', status: 'Callback Scheduled' },
  { id: 2, name: 'Jane Smith', company: 'Globex Inc', priority: 'High', status: 'Interested' },
  { id: 3, name: 'Michael Scott', company: 'Dunder Mifflin', priority: 'Medium', status: 'New' },
  { id: 4, name: 'Sarah Connor', company: 'Cyberdyne Systems', priority: 'High', status: 'Callback Scheduled' },
];

const timeBlocks = [
  { time: '09:00 AM', defaultText: 'Morning Catch-up & High Priority Callbacks' },
  { time: '10:00 AM', defaultText: 'Cold Calling - Tech Sector' },
  { time: '11:00 AM', defaultText: 'Follow-ups on recent emails' },
  { time: '12:00 PM', defaultText: 'Lunch Break' },
  { time: '01:00 PM', defaultText: 'Cold Calling - Retail Sector' },
  { time: '02:00 PM', defaultText: 'Client Meetings / Demos' },
  { time: '03:00 PM', defaultText: 'Admin work & CRM updating' },
  { time: '04:00 PM', defaultText: 'Final wrap-ups & Plan next day' },
];

const Plan = () => {
  const [selectedDate, setSelectedDate] = useState(addDays(new Date(), 1)); // Default to tomorrow
  const [goals, setGoals] = useState({ calls: '50', conversions: '5' });

  const handlePrevDay = () => setSelectedDate(addDays(selectedDate, -1));
  const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-end sm:justify-between gap-4"
        style={{ marginBottom: 24 }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            Daily Planner
          </h1>
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "0.875rem",
              marginTop: 4,
            }}
          >
            Structure your day, set goals, and queue up your priority leads.
          </p>
        </div>

        {/* Date Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '4px 8px' }}>
          <button className="btn btn-ghost btn-sm" onClick={handlePrevDay} style={{ padding: 4 }}>
            <ChevronLeft size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', fontWeight: 600, minWidth: 140, justifyContent: 'center' }}>
            <CalendarIcon size={16} color="var(--color-primary)" />
            {format(selectedDate, 'MMM dd, yyyy')}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleNextDay} style={{ padding: 4 }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column - Planning & Time Blocks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Goals Card */}
          <div className="card animate-fade-in" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Target size={20} color="var(--color-primary)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Daily Targets</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  Call Target
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 12, top: 10, color: 'var(--color-text-tertiary)' }}>
                    <Phone size={16} />
                  </div>
                  <input 
                    type="number" 
                    className="input" 
                    value={goals.calls} 
                    onChange={e => setGoals({...goals, calls: e.target.value})}
                    style={{ paddingLeft: 36, fontSize: '1rem', fontWeight: 600 }} 
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  Conversion Target
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 12, top: 10, color: 'var(--color-text-tertiary)' }}>
                    <CheckCircle2 size={16} />
                  </div>
                  <input 
                    type="number" 
                    className="input" 
                    value={goals.conversions} 
                    onChange={e => setGoals({...goals, conversions: e.target.value})}
                    style={{ paddingLeft: 36, fontSize: '1rem', fontWeight: 600 }} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Time Blocking */}
          <div className="card animate-fade-in" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Clock size={20} color="var(--color-info)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Time Blocking</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {timeBlocks.map((block, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ 
                    minWidth: 70, 
                    fontSize: '0.8125rem', 
                    fontWeight: 600, 
                    color: 'var(--color-text-secondary)',
                    paddingTop: 10
                  }}>
                    {block.time}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input 
                      type="text" 
                      className="input" 
                      defaultValue={block.defaultText}
                      placeholder="What are you doing this hour?"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Leads & Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Priority Lead Queue */}
          <div className="card animate-fade-in" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20} color="var(--color-warning)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Priority Queue</h3>
              </div>
              <span className="badge badge-medium">4 Leads</span>
            </div>

            <div style={{ position: 'relative', marginBottom: 16 }}>
              <div style={{ position: 'absolute', left: 12, top: 9, color: 'var(--color-text-tertiary)' }}>
                <Search size={16} />
              </div>
              <input type="text" className="input" placeholder="Search leads to add..." style={{ paddingLeft: 36 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {mockLeads.map((lead) => (
                <div 
                  key={lead.id}
                  style={{ 
                    border: '1px solid var(--color-border)', 
                    borderRadius: 8, 
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: 'var(--color-surface)',
                    cursor: 'grab'
                  }}
                >
                  <GripVertical size={16} color="var(--color-text-tertiary)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{lead.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{lead.company}</div>
                  </div>
                  <span className={`badge badge-${lead.priority.toLowerCase()}`}>
                    {lead.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="card animate-fade-in" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Daily Notes & Reminders</h3>
            <textarea 
              className="input" 
              placeholder="Jot down important reminders for tomorrow..."
              style={{ minHeight: 150, resize: 'vertical' }}
              defaultValue="1. Remember to ask Globex about the new budget approval.&#10;2. Follow up with Sarah C. regarding the contract."
            />
          </div>
          
          {/* Action Button */}
          <button className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 600 }}>
            Lock in Plan
          </button>
        </div>

      </div>
    </div>
  );
};

export default Plan;