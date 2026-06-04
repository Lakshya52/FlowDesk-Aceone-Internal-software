import React, { useState, useEffect } from "react";
import { format, isSameDay, startOfDay, endOfDay } from "date-fns";
import { useCalendarStore } from "../../store/calendarStore";

interface DayViewProps {
  events: any[];
}

const DayView: React.FC<DayViewProps> = ({ events }) => {
  const { currentDate, openEventModal, openEventDrawer } = useCalendarStore();

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayStart = startOfDay(currentDate);
  const dayEnd = endOfDay(currentDate);

  const dayEvents = events.filter((e) => {
    const eStart = new Date(e.startDate);
    const eEnd = new Date(e.endDate);
    return (
      !e.allDay &&
      (isSameDay(eStart, currentDate) ||
        isSameDay(eEnd, currentDate) ||
        (eStart < dayStart && eEnd > dayEnd))
    );
  });

  const allDayEvents = events.filter((e) => {
    const eStart = new Date(e.startDate);
    const eEnd = new Date(e.endDate);
    return (
      e.allDay &&
      (isSameDay(eStart, currentDate) ||
        isSameDay(eEnd, currentDate) ||
        (eStart < dayStart && eEnd > dayEnd))
    );
  });

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "var(--color-surface)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderBottom: "1px solid var(--color-border)",
          backgroundColor: "var(--color-bg)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div
            style={{
              width: "64px",
              borderRight: "1px solid var(--color-border)",
            }}
          ></div>
          <div style={{ flex: 1, padding: "12px 16px" }}>
            <div
              style={{
                fontSize: "14px",
                color: "var(--color-text-secondary)",
                fontWeight: 500,
                textTransform: "uppercase",
              }}
            >
              {format(currentDate, "EEEE")}
            </div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "var(--color-text)",
              }}
            >
              {format(currentDate, "MMMM d, yyyy")}
            </div>
          </div>
        </div>

        {/* All day events section */}
        {allDayEvents.length > 0 && (
          <div
            style={{
              display: "flex",
              backgroundColor: "var(--color-surface)",
              borderBottom: "1px solid var(--color-border)",
              minHeight: "40px",
            }}
          >
            <div
              style={{
                width: "64px",
                borderRight: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                color: "var(--color-text-secondary)",
                fontWeight: 500,
              }}
            >
              All Day
            </div>
            <div
              style={{
                flex: 1,
                padding: "4px",
                display: "flex",
                flexWrap: "wrap",
                gap: "4px",
              }}
            >
              {allDayEvents.map((event) => (
                <div
                  key={event._id}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEventDrawer(event._id);
                  }}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                    boxShadow: "var(--shadow-sm)",
                    backgroundColor: `${event.calendar?.color || "#6366f1"}30`,
                    color: "var(--color-text)",
                    borderLeft: `3px solid ${event.calendar?.color || "#6366f1"}`,
                  }}
                >
                  {event.title}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Time Grid */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex" }}>
        <div
          style={{
            width: "64px",
            flexShrink: 0,
            backgroundColor: "var(--color-bg)",
            borderRight: "1px solid var(--color-border)",
            height: "fit-content",
          }}
          className="this"
        >
          {hours.map((hour) => (
            <div
              key={hour}
              style={{
                height: "80px",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "flex-end",
                paddingRight: "8px",
                paddingTop: "4px",
                fontSize: "12px",
                color: "var(--color-text-secondary)",
              }}
            >
              {hour === 0
                ? "12 AM"
                : hour < 12
                  ? `${hour} AM`
                  : hour === 12
                    ? "12 PM"
                    : `${hour - 12} PM`}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, position: "relative", height: "fit-content" }}>
          {hours.map((hour) => (
            <div
              key={hour}
              style={{
                height: "80px",
                borderBottom: "1px solid var(--color-surface-hover)",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setHours(hour);
                openEventModal(undefined, newDate);
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "var(--color-primary-light)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            ></div>
          ))}

          {/* Render Events */}
          {dayEvents.map((event) => {
            const start = new Date(event.startDate);
            const end = new Date(event.endDate);
            const dayStartTime = startOfDay(currentDate);
            const dayEndTime = endOfDay(currentDate);
            const actualStart = start < dayStartTime ? dayStartTime : start;
            const actualEnd = end > dayEndTime ? dayEndTime : end;
            const top =
              actualStart.getHours() * 80 +
              (actualStart.getMinutes() / 60) * 80;
            const durationHours =
              (actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60);
            const height = Math.max(durationHours * 80, 24);

            return (
              <div
                key={event._id}
                onClick={(e) => {
                  e.stopPropagation();
                  openEventDrawer(event._id);
                }}
                style={{
                  position: "absolute",
                  left: "8px",
                  right: "16px",
                  borderRadius: "4px",
                  padding: "8px",
                  fontSize: "14px",
                  overflow: "hidden",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-md)",
                  transition: "all 0.2s",
                  border: "1px solid var(--color-surface-hover)",
                  top: `${top}px`,
                  height: `${height}px`,
                  backgroundColor: `${event.calendar?.color || "#6366f1"}20`,
                  borderLeft: `4px solid ${event.calendar?.color || "#6366f1"}`,
                  color: "var(--color-text)",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.boxShadow = "var(--shadow-lg)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.boxShadow = "var(--shadow-md)")
                }
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: "var(--color-text)",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{event.title}</span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {format(start, "h:mm a")} - {format(end, "h:mm a")}
                  </span>
                </div>
                {event.description && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--color-text-secondary)",
                      marginTop: "4px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {event.description}
                  </div>
                )}
                {event.location && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--color-text-secondary)",
                      marginTop: "4px",
                    }}
                  >
                    📍 {event.location}
                  </div>
                )}
              </div>
            );
          })}

          {/* Current Time Line */}
          {isSameDay(currentDate, now) && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${now.getHours() * 80 + (now.getMinutes() / 60) * 80}px`,
                height: "2px",
                backgroundColor: "var(--color-danger)",
                zIndex: 20,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "-4px",
                  top: "-4px",
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: "var(--color-danger)",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DayView;
