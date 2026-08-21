import React, { useState, useMemo } from 'react';
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
  Info,
  Users,
  Phone,
  IndianRupee,
  X,
  Eye
} from 'lucide-react';
import { useBookings } from '../../context/BookingsContext';
import './CalendarView.css';

function formatINR(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
}

function getSlotType(timeSlot = '') {
  const lower = timeSlot.toLowerCase();
  if (lower.includes('morning')) return 'morning';
  if (lower.includes('evening')) return 'evening';
  return 'fullday';
}

function getSlotLabel(timeSlot = '') {
  const type = getSlotType(timeSlot);
  if (type === 'morning') return 'Morning Slot';
  if (type === 'evening') return 'Evening Slot';
  return 'Full Day';
}

export default function CalendarView() {
  const { bookings, isLoading } = useBookings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState(null); // { date: 'YYYY-MM-DD', bookings: [] }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Map of dateString -> array of active bookings
  const bookingsByDate = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      // Exclude Cancelled bookings from blocking calendar slots
      if ((b.bookingStatus || '').toLowerCase() === 'cancelled') return;
      if (!b.eventDate) return;

      if (!map[b.eventDate]) {
        map[b.eventDate] = [];
      }
      map[b.eventDate].push(b);
    });
    return map;
  }, [bookings]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Helper to format ISO YYYY-MM-DD
  const formatISO = (y, m, d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${y}-${pad(m + 1)}-${pad(d)}`;
  };

  // Calculate calendar grid days
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const calendarCells = [];
  
  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthTotalDays - i;
    const prevDate = new Date(year, month - 1, d);
    const dateString = formatISO(prevDate.getFullYear(), prevDate.getMonth(), d);
    calendarCells.push({
      dayNumber: d,
      isCurrentMonth: false,
      dateString,
      dayBookings: bookingsByDate[dateString] || []
    });
  }

  // Current month days
  const today = new Date();
  for (let i = 1; i <= totalDays; i++) {
    const isToday = 
      today.getFullYear() === year && 
      today.getMonth() === month && 
      today.getDate() === i;

    const dateString = formatISO(year, month, i);
    calendarCells.push({
      dayNumber: i,
      isCurrentMonth: true,
      isToday,
      dateString,
      dayBookings: bookingsByDate[dateString] || []
    });
  }

  // Next month leading days to round out to full weeks (multiples of 7)
  const remainingCells = (calendarCells.length % 7 === 0) ? 0 : 7 - (calendarCells.length % 7);
  for (let i = 1; i <= remainingCells; i++) {
    const nextDate = new Date(year, month + 1, i);
    const dateString = formatISO(nextDate.getFullYear(), nextDate.getMonth(), i);
    calendarCells.push({
      dayNumber: i,
      isCurrentMonth: false,
      dateString,
      dayBookings: bookingsByDate[dateString] || []
    });
  }

  // Calculate monthly stats for banner
  const currentMonthBookingsCount = useMemo(() => {
    const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return bookings.filter(b =>
      b.eventDate &&
      b.eventDate.startsWith(currentMonthPrefix) &&
      (b.bookingStatus || '').toLowerCase() !== 'cancelled'
    ).length;
  }, [bookings, year, month]);

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
            <span className="legend-text">Available (Both Slots Open)</span>
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
          <span>{currentMonthBookingsCount} Scheduled in {monthNames[month]}</span>
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
          {calendarCells.map((cell, index) => {
            const hasBookings = cell.dayBookings.length > 0;
            const hasFullDay = cell.dayBookings.some(b => getSlotType(b.timeSlot) === 'fullday');
            const morningBookings = cell.dayBookings.filter(b => getSlotType(b.timeSlot) === 'morning');
            const eveningBookings = cell.dayBookings.filter(b => getSlotType(b.timeSlot) === 'evening');

            const isFullyBlocked = hasFullDay || (morningBookings.length > 0 && eveningBookings.length > 0);
            const isPartialBlocked = !isFullyBlocked && (morningBookings.length > 0 || eveningBookings.length > 0);

            return (
              <div
                key={index}
                className={`calendar-cell ${!cell.isCurrentMonth ? 'cell-inactive' : ''} ${cell.isToday ? 'cell-today' : ''} ${hasBookings ? 'cell-has-events' : ''}`}
                onClick={() => {
                  if (hasBookings) {
                    setSelectedDayEvents({ date: cell.dateString, bookings: cell.dayBookings });
                  }
                }}
              >
                <div className="cell-header">
                  <span className={`cell-day-number ${cell.isToday ? 'badge-today' : ''}`}>
                    {cell.dayNumber}
                  </span>

                  {cell.isCurrentMonth && (
                    <>
                      {!hasBookings && (
                        <span className="cell-status-tag tag-available">Available</span>
                      )}
                      {isFullyBlocked && (
                        <span className="cell-status-tag tag-fullday">Reserved</span>
                      )}
                      {isPartialBlocked && (
                        <span className="cell-status-tag tag-partial">1 Slot Open</span>
                      )}
                    </>
                  )}
                </div>

                <div className="cell-slots-container">
                  {cell.isCurrentMonth && (
                    <>
                      {!hasBookings ? (
                        <div className="slot-open-indicator">
                          <span className="slot-dot"></span>
                          <span>Both slots open</span>
                        </div>
                      ) : (
                        <div className="cell-events-list">
                          {cell.dayBookings.map((b) => {
                            const slotType = getSlotType(b.timeSlot);
                            return (
                              <div
                                key={b.id}
                                className={`calendar-event-chip chip-${slotType}`}
                                title={`${b.customerName} - ${b.occasion} (${getSlotLabel(b.timeSlot)})`}
                              >
                                <div className="chip-header-line">
                                  <span className="chip-slot-dot"></span>
                                  <span className="chip-client-name">{b.customerName}</span>
                                </div>
                                <div className="chip-occasion">{b.occasion}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Calendar Notice */}
      <div className="calendar-footer-notice">
        <Info size={16} />
        <span>
          Click on any reserved date to inspect full reservation details, guest estimates, slot allocation, and contract balance.
        </span>
      </div>

      {/* Selected Day Event Details Modal */}
      {selectedDayEvents && (
        <div className="confirm-dialog-overlay animate-fade-in" onClick={() => setSelectedDayEvents(null)}>
          <div
            className="confirm-dialog-box calendar-day-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '560px' }}
          >
            <div className="calendar-day-modal-header">
              <div>
                <div className="modal-badge">
                  <Calendar size={12} />
                  <span>
                    {new Date(selectedDayEvents.date + 'T00:00:00').toLocaleDateString('en-IN', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <h3 className="modal-title" style={{ fontSize: '18px', marginTop: '4px' }}>
                  Day Reservations ({selectedDayEvents.bookings.length})
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedDayEvents(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="calendar-day-modal-body">
              {selectedDayEvents.bookings.map((b) => {
                const slotType = getSlotType(b.timeSlot);
                return (
                  <div key={b.id} className="calendar-booking-detail-card">
                    <div className="detail-card-top">
                      <div className="detail-card-slot">
                        <span className={`legend-indicator slot-${slotType}`}></span>
                        <strong>{getSlotLabel(b.timeSlot)}</strong>
                      </div>
                      <span className={`badge ${
                        (b.bookingStatus || '').toLowerCase() === 'confirmed'
                          ? 'badge-confirmed'
                          : (b.bookingStatus || '').toLowerCase() === 'completed'
                          ? 'badge-gold'
                          : 'badge-pending'
                      }`}>
                        {b.bookingStatus || 'Confirmed'}
                      </span>
                    </div>

                    <div className="detail-card-client">
                      <div className="detail-client-name">{b.customerName}</div>
                      <div className="detail-client-meta">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={12} />
                          {b.phoneNumber}
                        </span>
                        {b.estimatedGuests && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Users size={12} />
                            {b.estimatedGuests} guests
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="detail-card-occasion">
                      <strong>Occasion:</strong> {b.occasion}
                    </div>

                    <div className="detail-card-financials">
                      <div>
                        <span>Contract: </span>
                        <strong>{formatINR(b.totalAmount)}</strong>
                      </div>
                      <div>
                        <span>Paid: </span>
                        <strong style={{ color: '#34d399' }}>{formatINR(b.totalPaid)}</strong>
                      </div>
                      <div>
                        <span>Due: </span>
                        <strong style={{ color: Number(b.balanceAmount) > 0 ? '#fbbf24' : '#34d399' }}>
                          {formatINR(b.balanceAmount)}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="modal-actions-footer" style={{ marginTop: '16px', paddingTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedDayEvents(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
