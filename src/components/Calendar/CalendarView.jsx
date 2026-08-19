import React, { useState } from 'react';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Sun, 
  Moon, 
  Clock, 
  CheckCircle, 
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import './CalendarView.css';

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate calendar grid days
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Generate day matrix
  const calendarCells = [];
  
  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarCells.push({
      dayNumber: prevMonthTotalDays - i,
      isCurrentMonth: false,
      dateString: `${year}-${month}-${prevMonthTotalDays - i}`
    });
  }

  // Current month days
  const today = new Date();
  for (let i = 1; i <= totalDays; i++) {
    const isToday = 
      today.getFullYear() === year && 
      today.getMonth() === month && 
      today.getDate() === i;

    calendarCells.push({
      dayNumber: i,
      isCurrentMonth: true,
      isToday,
      dateString: `${year}-${month + 1}-${i}`
    });
  }

  // Next month leading days to round out to full weeks (multiples of 7)
  const remainingCells = 35 - calendarCells.length > 0 ? 35 - calendarCells.length : (42 - calendarCells.length);
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({
      dayNumber: i,
      isCurrentMonth: false,
      dateString: `${year}-${month + 2}-${i}`
    });
  }

  return (
    <div className="calendar-view-container animate-fade-in">
      {/* Calendar Header */}
      <div className="view-header-bar">
        <div className="view-header-title-group">
          <h2 className="view-heading">Hall Availability Calendar</h2>
          <p className="view-subheading">
            Visual schedule for Main AC Hall, Dining Hall, and Lawn reservations.
          </p>
        </div>

        <div className="calendar-controls">
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleToday}>
            Today
          </button>
          <div className="calendar-nav-buttons">
            <button 
              type="button" 
              className="calendar-arrow-btn" 
              onClick={handlePrevMonth}
              aria-label="Previous Month"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="calendar-month-label">
              {monthNames[month]} {year}
            </span>
            <button 
              type="button" 
              className="calendar-arrow-btn" 
              onClick={handleNextMonth}
              aria-label="Next Month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Legend & Slot Timing Bar */}
      <div className="card calendar-legend-card">
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-indicator available"></span>
            <span className="legend-text">Available (All Slots Open)</span>
          </div>
          <div className="legend-item">
            <span className="legend-indicator slot-morning"></span>
            <span className="legend-text">Morning Slot (07:00 AM – 02:00 PM)</span>
          </div>
          <div className="legend-item">
            <span className="legend-indicator slot-evening"></span>
            <span className="legend-text">Evening Slot (04:00 PM – 11:00 PM)</span>
          </div>
          <div className="legend-item">
            <span className="legend-indicator slot-fullday"></span>
            <span className="legend-text">Full Day Reserved</span>
          </div>
        </div>

        <div className="legend-badge">
          <Sparkles size={13} />
          <span>Interactive Calendar Engine</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card calendar-grid-card">
        <div className="calendar-days-header">
          {daysOfWeek.map((day) => (
            <div key={day} className="day-name-cell">
              {day}
            </div>
          ))}
        </div>

        <div className="calendar-grid-body">
          {calendarCells.map((cell, index) => (
            <div
              key={index}
              className={`calendar-cell ${!cell.isCurrentMonth ? 'cell-inactive' : ''} ${cell.isToday ? 'cell-today' : ''}`}
            >
              <div className="cell-header">
                <span className={`cell-day-number ${cell.isToday ? 'badge-today' : ''}`}>
                  {cell.dayNumber}
                </span>
                {cell.isCurrentMonth && (
                  <span className="cell-status-tag">Available</span>
                )}
              </div>
              <div className="cell-slots">
                {cell.isCurrentMonth && (
                  <div className="slot-open-indicator">
                    <span className="slot-dot"></span>
                    <span>Both slots open</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Notice */}
      <div className="calendar-footer-notice">
        <Info size={16} />
        <span>
          Dates with real bookings from the database will display customer name, occasion type, and slot allocation badges in Phase 2.
        </span>
      </div>
    </div>
  );
}
