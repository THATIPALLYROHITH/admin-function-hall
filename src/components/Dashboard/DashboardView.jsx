import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarCheck2,
  Building,
  Users,
  Car,
  Utensils,
  Plus,
  Sparkles,
  ArrowRight,
  Calendar,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  FileText,
  Phone,
  BarChart3,
  Wallet,
  ShieldCheck,
  Check,
  Zap,
  Activity,
  Layers
} from 'lucide-react';
import { useEnquiries } from '../../context/EnquiriesContext';
import { useBookings } from '../../context/BookingsContext';
import {
  subscribePayments,
  createPayment
} from '../../services/paymentsService';
import {
  subscribeExpenses,
  createExpense
} from '../../services/expensesService';
import BookingModal from '../Bookings/BookingModal';
import EnquiryModal from '../Enquiries/EnquiryModal';
import ExpenseModal from '../Accounts/ExpenseModal';
import IncomeModal from '../Accounts/IncomeModal';
import BookingDetailDrawer from '../Bookings/BookingDetailDrawer';
import EmptyState from '../Common/EmptyState';
import './DashboardView.css';

// Currency formatting helper for Indian Rupee format (e.g. ₹1,50,000)
export function formatINR(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getShortSlot(timeSlot) {
  if (!timeSlot) return '—';
  if (timeSlot.toLowerCase().includes('morning')) return 'Morning';
  if (timeSlot.toLowerCase().includes('evening')) return 'Evening';
  if (timeSlot.toLowerCase().includes('full')) return 'Full Day';
  return timeSlot;
}

export default function DashboardView({ onNavigate }) {
  const { enquiries, addEnquiry } = useEnquiries();
  const { bookings, createBooking } = useBookings();

  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // Modals state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [detailDrawerBooking, setDetailDrawerBooking] = useState(null);

  // Toasts
  const [successToast, setSuccessToast] = useState('');
  const [errorToast, setErrorToast] = useState('');

  const showSuccess = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4500);
  };

  const showError = (msg) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(''), 5000);
  };

  // Real-time payments & expenses subscriptions
  useEffect(() => {
    const unsubPayments = subscribePayments(
      (data) => setPayments(data),
      (err) => console.error('Payments stream error in Dashboard:', err)
    );

    const unsubExpenses = subscribeExpenses(
      (data) => setExpenses(data),
      (err) => console.error('Expenses stream error in Dashboard:', err)
    );

    return () => {
      if (typeof unsubPayments === 'function') unsubPayments();
      if (typeof unsubExpenses === 'function') unsubExpenses();
    };
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning, Owner';
    if (hour < 17) return 'Good Afternoon, Owner';
    return 'Good Evening, Owner';
  }, []);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  // 1. OPERATIONS SNAPSHOT
  const todayEvents = useMemo(() => {
    return bookings.filter((b) => {
      const isCancelled = (b.bookingStatus || '').toLowerCase() === 'cancelled';
      return !isCancelled && b.eventDate === todayStr;
    });
  }, [bookings, todayStr]);

  const upcomingEvents = useMemo(() => {
    return bookings
      .filter((b) => {
        const isCancelled = (b.bookingStatus || '').toLowerCase() === 'cancelled';
        return !isCancelled && b.eventDate >= todayStr;
      })
      .sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || ''));
  }, [bookings, todayStr]);

  const newEnquiries = useMemo(() => {
    return enquiries.filter((e) => (e.status || '').toLowerCase() === 'new');
  }, [enquiries]);

  const contactedEnquiries = useMemo(() => {
    return enquiries.filter((e) => (e.status || '').toLowerCase() === 'contacted');
  }, [enquiries]);

  const quotedEnquiries = useMemo(() => {
    return enquiries.filter((e) => (e.status || '').toLowerCase() === 'quoted');
  }, [enquiries]);

  const convertedEnquiries = useMemo(() => {
    return enquiries.filter((e) => (e.status || '').toLowerCase() === 'converted' || Boolean(e.bookingId));
  }, [enquiries]);

  // 2. FINANCIAL SNAPSHOT (This Month)
  const currentMonthFinancials = useMemo(() => {
    const currentMonthKey = todayStr.slice(0, 7);
    const monthPayments = payments.filter(
      (p) => p.status !== 'Voided' && (p.paymentDate || '').slice(0, 7) === currentMonthKey
    );
    const monthExpenses = expenses.filter(
      (e) => (e.expenseDate || '').slice(0, 7) === currentMonthKey
    );

    const income = monthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const expense = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netProfit = income - expense;

    // Current Outstanding Receivables across all active bookings
    const activeWithDue = bookings.filter((b) => {
      const isCancelled = (b.bookingStatus || '').toLowerCase() === 'cancelled';
      return !isCancelled && (Number(b.balanceAmount) || 0) > 0;
    });
    const totalOutstanding = activeWithDue.reduce((sum, b) => sum + (Number(b.balanceAmount) || 0), 0);

    const monthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

    return {
      monthName,
      income,
      expense,
      netProfit,
      totalOutstanding,
      dueBookingsCount: activeWithDue.length
    };
  }, [payments, expenses, bookings, todayStr]);

  // 3. BOOKING PIPELINE BREAKDOWN
  const bookingStats = useMemo(() => {
    const confirmed = bookings.filter((b) => (b.bookingStatus || '').toLowerCase() === 'confirmed').length;
    const tentative = bookings.filter((b) => (b.bookingStatus || '').toLowerCase() === 'tentative').length;
    const completed = bookings.filter((b) => (b.bookingStatus || '').toLowerCase() === 'completed').length;
    const cancelled = bookings.filter((b) => (b.bookingStatus || '').toLowerCase() === 'cancelled').length;

    return {
      confirmed,
      tentative,
      completed,
      cancelled,
      total: bookings.length
    };
  }, [bookings]);

  // 4. ACTIONABLE "NEEDS ATTENTION" ALERTS
  const attentionItems = useMemo(() => {
    const items = [];

    // Alert: New inquiries awaiting response
    if (newEnquiries.length > 0) {
      items.push({
        id: 'new-enquiries',
        type: 'alert',
        main: `${newEnquiries.length} new customer ${newEnquiries.length === 1 ? 'inquiry' : 'inquiries'} awaiting response`,
        sub: 'Incoming leads requiring first owner contact',
        actionLabel: 'View Inquiries',
        onAction: () => onNavigate?.('enquiries')
      });
    }

    // Alert: Quoted/Contacted inquiries ready for conversion
    const pipelineCount = contactedEnquiries.length + quotedEnquiries.length;
    if (pipelineCount > 0) {
      items.push({
        id: 'pipeline-enquiries',
        type: 'info',
        main: `${pipelineCount} quoted/contacted ${pipelineCount === 1 ? 'inquiry' : 'inquiries'} in pipeline`,
        sub: 'Prospective clients engaged and ready for booking',
        actionLabel: 'Convert',
        onAction: () => onNavigate?.('enquiries')
      });
    }

    // Alert: Upcoming event with balance due in next 14 days
    const next14DaysStr = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const upcomingNearDue = upcomingEvents.filter((b) => {
      const balance = Number(b.balanceAmount) || 0;
      return balance > 0 && b.eventDate <= next14DaysStr;
    });

    if (upcomingNearDue.length > 0) {
      const totalNearDue = upcomingNearDue.reduce((sum, b) => sum + (Number(b.balanceAmount) || 0), 0);
      items.push({
        id: 'upcoming-due',
        type: 'alert',
        main: `${upcomingNearDue.length} upcoming ${upcomingNearDue.length === 1 ? 'event has' : 'events have'} balance due (${formatINR(totalNearDue)})`,
        sub: 'Events in next 14 days awaiting full settlement',
        actionLabel: 'View Receivables',
        onAction: () => onNavigate?.('receivables')
      });
    }

    // Alert: Active booking with ₹0 advance paid
    const unpaidActive = bookings.filter((b) => {
      const isCancelled = (b.bookingStatus || '').toLowerCase() === 'cancelled';
      const paid = Number(b.totalPaid) || 0;
      return !isCancelled && paid === 0;
    });

    if (unpaidActive.length > 0) {
      items.push({
        id: 'unpaid-active',
        type: 'info',
        main: `${unpaidActive.length} active ${unpaidActive.length === 1 ? 'booking has' : 'bookings have'} ₹0 advance paid`,
        sub: 'Provisional holds without recorded payments',
        actionLabel: 'Collect Due',
        onAction: () => onNavigate?.('receivables')
      });
    }

    return items;
  }, [newEnquiries, contactedEnquiries, quotedEnquiries, upcomingEvents, bookings, onNavigate]);

  // Modal Handlers
  const handleSaveBooking = async (bookingPayload) => {
    try {
      const created = await createBooking(bookingPayload);
      showSuccess(`Booking for "${created.customerName}" created successfully.`);
      setIsBookingModalOpen(false);
    } catch (err) {
      showError(err.message || 'Failed to create booking.');
    }
  };

  const handleSaveEnquiry = async (enquiryPayload) => {
    try {
      const created = await addEnquiry(enquiryPayload);
      showSuccess(`Inquiry for "${created.customerName}" added successfully.`);
      setIsEnquiryModalOpen(false);
    } catch (err) {
      showError(err.message || 'Failed to add inquiry.');
    }
  };

  const handleSaveExpense = async (expensePayload) => {
    try {
      const created = await createExpense(expensePayload);
      showSuccess(`Expense of ${formatINR(created.amount)} (${created.category}) recorded.`);
      setIsExpenseModalOpen(false);
    } catch (err) {
      showError(err.message || 'Failed to record expense.');
    }
  };

  const handleSaveIncome = async (incomePayload) => {
    try {
      const created = await createPayment(incomePayload);
      showSuccess(`Income of ${formatINR(created.amount)} (${created.category}) recorded.`);
      setIsIncomeModalOpen(false);
    } catch (err) {
      showError(err.message || 'Failed to record income receipt.');
    }
  };

  return (
    <div className="dashboard-container animate-fade-in">
      {/* Toast: Success */}
      {successToast && (
        <div className="enquiry-toast animate-fade-in">
          <CheckCircle2 size={18} className="toast-icon" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Toast: Error */}
      {errorToast && (
        <div className="enquiry-toast enquiry-toast-error animate-fade-in">
          <span className="toast-icon" style={{ color: '#fb7185' }}>⚠</span>
          <span>{errorToast}</span>
        </div>
      )}

      {/* 1. Header / Welcome Area */}
      <div className="dashboard-exec-header">
        <div className="exec-header-left">
          <div className="exec-header-badge">
            <Sparkles size={12} />
            <span>VLNS Gardens • Owner Control Center</span>
          </div>
          <h2 className="exec-header-title">{greeting}</h2>
          <p className="exec-header-subtitle">
            Here's what's happening at VLNS Gardens today.
          </p>
        </div>

        <div className="exec-header-right">
          <div className="exec-date-badge">
            <Calendar size={14} style={{ color: 'var(--brand-gold-light)' }} />
            <span>{todayFormatted}</span>
          </div>
          <div className="welcome-sync-badge" style={{ margin: 0 }}>
            <div className="sync-dot"></div>
            <span>Live Sync</span>
          </div>
        </div>
      </div>

      {/* 2. Quick Actions Bar */}
      <div className="exec-quick-actions-bar">
        <span className="quick-actions-tag">
          <Zap size={13} style={{ color: 'var(--brand-gold)' }} />
          <span>Shortcuts:</span>
        </span>
        <button
          type="button"
          className="exec-action-btn exec-action-btn-gold"
          onClick={() => setIsBookingModalOpen(true)}
        >
          <Plus size={13} />
          <span>New Booking</span>
        </button>
        <button
          type="button"
          className="exec-action-btn"
          onClick={() => setIsEnquiryModalOpen(true)}
        >
          <Plus size={13} />
          <span>New Inquiry</span>
        </button>
        <button
          type="button"
          className="exec-action-btn"
          onClick={() => setIsIncomeModalOpen(true)}
          style={{ color: '#34d399' }}
        >
          <Plus size={13} />
          <span>Record Income</span>
        </button>
        <button
          type="button"
          className="exec-action-btn"
          onClick={() => setIsExpenseModalOpen(true)}
          style={{ color: '#f87171' }}
        >
          <Plus size={13} />
          <span>Record Expense</span>
        </button>
        <button
          type="button"
          className="exec-action-btn"
          onClick={() => onNavigate?.('receivables')}
        >
          <Clock size={13} style={{ color: '#fbbf24' }} />
          <span>Receivables</span>
        </button>
        <button
          type="button"
          className="exec-action-btn"
          onClick={() => onNavigate?.('financial-reports')}
        >
          <BarChart3 size={13} style={{ color: 'var(--brand-gold-light)' }} />
          <span>Reports & Insights</span>
        </button>
      </div>

      {/* 3. Needs Attention — Priority Section (Near the Top) */}
      <div className="priority-attention-box">
        <div className="attention-header-strip">
          <div className="attention-label-wrap">
            <AlertCircle size={15} style={{ color: 'var(--brand-gold)' }} />
            <span>Needs Attention & Action</span>
          </div>
          {attentionItems.length > 0 ? (
            <span className="badge badge-pending">{attentionItems.length} Action Items</span>
          ) : (
            <span className="badge badge-confirmed">All Clear</span>
          )}
        </div>

        {attentionItems.length > 0 ? (
          <div className="attention-cards-grid">
            {attentionItems.map((item) => (
              <div
                key={item.id}
                className={`attention-pill ${item.type === 'alert' ? 'attention-pill-alert' : ''}`}
              >
                <div className="attention-pill-left">
                  <div className="attention-pill-icon">
                    <AlertCircle size={16} />
                  </div>
                  <div className="attention-pill-texts">
                    <span className="attention-pill-main">{item.main}</span>
                    <span className="attention-pill-sub">{item.sub}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="attention-btn"
                  onClick={item.onAction}
                >
                  <span>{item.actionLabel}</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="attention-clean-state">
            <Check size={16} />
            <span>Everything looks good — no immediate actions required.</span>
          </div>
        )}
      </div>

      {/* 4. Two-Level Business Snapshot */}
      <div className="snapshot-deck">
        {/* Level A: Operations Snapshot */}
        <div className="snapshot-deck-title">
          <Building size={14} style={{ color: 'var(--brand-gold)' }} />
          <span>Operations Snapshot • Today & Active</span>
        </div>

        <div className="operations-snapshot-grid">
          {/* Today's Events */}
          <div
            className="op-card"
            onClick={() => onNavigate?.('calendar')}
            title="Click to view Availability Calendar"
          >
            <div className="op-card-top">
              <span className="op-card-title">Today's Events</span>
              <div className="op-card-icon" style={{ background: 'rgba(217, 119, 6, 0.15)', color: 'var(--brand-gold-light)' }}>
                <CalendarCheck2 size={16} />
              </div>
            </div>
            <div className="op-card-val">{todayEvents.length}</div>
            <div className="op-card-footer">
              <span>{todayEvents.length > 0 ? todayEvents.map((b) => b.customerName).join(', ') : 'Venue Available'}</span>
              <span className="badge badge-gold" style={{ fontSize: '10px', padding: '1px 6px' }}>Today</span>
            </div>
          </div>

          {/* Upcoming Events */}
          <div
            className="op-card"
            onClick={() => onNavigate?.('bookings')}
            title="Click to view Bookings"
          >
            <div className="op-card-top">
              <span className="op-card-title">Upcoming Events</span>
              <div className="op-card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                <Calendar size={16} />
              </div>
            </div>
            <div className="op-card-val">{upcomingEvents.length}</div>
            <div className="op-card-footer">
              <span>Scheduled reservations</span>
              <span className="badge badge-confirmed" style={{ fontSize: '10px', padding: '1px 6px' }}>Active</span>
            </div>
          </div>

          {/* New Enquiries */}
          <div
            className="op-card"
            onClick={() => onNavigate?.('enquiries')}
            title="Click to view Inquiries"
          >
            <div className="op-card-top">
              <span className="op-card-title">New Inquiries</span>
              <div className="op-card-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                <MessageSquare size={16} />
              </div>
            </div>
            <div className="op-card-val">{newEnquiries.length}</div>
            <div className="op-card-footer">
              <span>Awaiting response</span>
              <span className="badge badge-new" style={{ fontSize: '10px', padding: '1px 6px' }}>Leads</span>
            </div>
          </div>

          {/* Outstanding Receivables */}
          <div
            className="op-card"
            onClick={() => onNavigate?.('receivables')}
            title="Click to open Receivables Management"
          >
            <div className="op-card-top">
              <span className="op-card-title">Outstanding Due</span>
              <div className="op-card-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                <Clock size={16} />
              </div>
            </div>
            <div className="op-card-val" style={{ color: '#fbbf24' }}>
              {formatINR(currentMonthFinancials.totalOutstanding)}
            </div>
            <div className="op-card-footer">
              <span>{currentMonthFinancials.dueBookingsCount} active bookings with due</span>
              <span className="badge badge-pending" style={{ fontSize: '10px', padding: '1px 6px' }}>Manage →</span>
            </div>
          </div>
        </div>

        {/* Level B: Financial Ribbon (This Month) */}
        <div className="financial-ribbon-card">
          <div className="fin-ribbon-left">
            <Wallet size={18} style={{ color: '#34d399' }} />
            <div>
              <div className="fin-ribbon-title">This Month Financial Overview</div>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{currentMonthFinancials.monthName}</span>
            </div>
          </div>

          <div className="fin-ribbon-metrics">
            <div className="fin-metric-cell">
              <span className="fin-metric-label">Income</span>
              <span className="fin-metric-amount" style={{ color: '#34d399' }}>
                {formatINR(currentMonthFinancials.income)}
              </span>
            </div>

            <div className="fin-metric-cell">
              <span className="fin-metric-label">Expenses</span>
              <span className="fin-metric-amount" style={{ color: '#f87171' }}>
                {formatINR(currentMonthFinancials.expense)}
              </span>
            </div>

            <div className="fin-metric-cell">
              <span className="fin-metric-label">Net Profit</span>
              <span className="fin-metric-amount" style={{ color: currentMonthFinancials.netProfit >= 0 ? 'var(--brand-gold-light)' : '#fb7185' }}>
                {formatINR(currentMonthFinancials.netProfit)}
              </span>
            </div>

            <div
              className="fin-ribbon-action"
              onClick={() => onNavigate?.('financial-reports')}
              title="View full Financial Reports & Insights"
            >
              <span>Financial Reports</span>
              <ArrowRight size={13} />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Two-Column Dashboard Grid */}
      <div className="dashboard-columns-grid">
        {/* Left Column: Upcoming Events & Enquiry Pipeline */}
        <div className="dashboard-col">
          {/* Upcoming Events Timeline List */}
          <div className="card event-deck-card">
            <div className="event-deck-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarCheck2 size={17} style={{ color: '#34d399' }} />
                <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                  Upcoming Events ({upcomingEvents.length})
                </strong>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onNavigate?.('bookings')}
                style={{ fontSize: '12px', gap: '4px' }}
              >
                <span>View All Bookings</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="event-cards-list">
                {upcomingEvents.slice(0, 5).map((b) => {
                  const balance = Number(b.balanceAmount) || 0;
                  const d = new Date((b.eventDate || '') + 'T00:00:00');
                  const monthName = d.toLocaleString('en-US', { month: 'short' });
                  const dayNum = d.getDate();
                  const isToday = b.eventDate === todayStr;

                  return (
                    <div
                      key={b.id}
                      className="event-timeline-item"
                      onClick={() => setDetailDrawerBooking(b)}
                      title="Click to view reservation details"
                    >
                      <div className="event-item-left">
                        <div className="event-date-chip">
                          <span className="event-date-chip-month">{monthName}</span>
                          <span className="event-date-chip-day">{dayNum || '—'}</span>
                        </div>
                        <div className="event-info-block">
                          <div className="event-client-line">
                            <span>{b.customerName}</span>
                            {isToday && (
                              <span className="badge badge-gold" style={{ fontSize: '10px', padding: '1px 5px' }}>
                                Today
                              </span>
                            )}
                          </div>
                          <div className="event-details-line">
                            <span style={{ color: 'var(--brand-gold-light)', fontWeight: 600 }}>
                              {b.occasion || 'Banquet Event'}
                            </span>
                            <span>•</span>
                            <span>{getShortSlot(b.timeSlot)}</span>
                            {b.estimatedGuests && (
                              <>
                                <span>•</span>
                                <span>{b.estimatedGuests} Guests</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="event-item-right">
                        <span className={`badge ${
                          (b.bookingStatus || '').toLowerCase() === 'confirmed'
                            ? 'badge-confirmed'
                            : 'badge-pending'
                        }`}>
                          {b.bookingStatus || 'Confirmed'}
                        </span>
                        {balance > 0 ? (
                          <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                            Due: {formatINR(balance)}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>
                            Paid
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Calendar}
                title="No Upcoming Events Scheduled"
                description="Confirmed reservations will appear here when events are scheduled."
                actionText="Create New Booking"
                onAction={() => setIsBookingModalOpen(true)}
              />
            )}
          </div>

          {/* Enquiry Pipeline Stages Strip */}
          <div className="pipeline-stage-card">
            <div className="pipeline-stage-header">
              <span className="pipeline-stage-title">
                <MessageSquare size={14} style={{ color: '#60a5fa' }} />
                <span>Customer Inquiry Pipeline</span>
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onNavigate?.('enquiries')}
                style={{ fontSize: '12px' }}
              >
                <span>View Inquiries</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="pipeline-stages-row">
              <div
                className="pipeline-stage-box"
                onClick={() => onNavigate?.('enquiries')}
                title="View New Inquiries"
              >
                <span className="pipeline-stage-count" style={{ color: '#60a5fa' }}>{newEnquiries.length}</span>
                <span className="pipeline-stage-name">New</span>
              </div>

              <div
                className="pipeline-stage-box"
                onClick={() => onNavigate?.('enquiries')}
                title="View Contacted Inquiries"
              >
                <span className="pipeline-stage-count" style={{ color: '#fb923c' }}>{contactedEnquiries.length}</span>
                <span className="pipeline-stage-name">Contacted</span>
              </div>

              <div
                className="pipeline-stage-box"
                onClick={() => onNavigate?.('enquiries')}
                title="View Quoted Inquiries"
              >
                <span className="pipeline-stage-count" style={{ color: '#fbbf24' }}>{quotedEnquiries.length}</span>
                <span className="pipeline-stage-name">Quoted</span>
              </div>

              <div
                className="pipeline-stage-box"
                onClick={() => onNavigate?.('enquiries')}
                title="View Converted Inquiries"
              >
                <span className="pipeline-stage-count" style={{ color: '#34d399' }}>{convertedEnquiries.length}</span>
                <span className="pipeline-stage-name">Converted</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Booking Pipeline, Receivables Alert, Venue Facilities */}
        <div className="dashboard-col">
          {/* Booking Pipeline Stage Strip */}
          <div className="pipeline-stage-card">
            <div className="pipeline-stage-header">
              <span className="pipeline-stage-title">
                <Building size={14} style={{ color: 'var(--brand-gold)' }} />
                <span>Booking Status Pipeline</span>
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onNavigate?.('bookings')}
                style={{ fontSize: '12px' }}
              >
                <span>View Bookings</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="pipeline-stages-row">
              <div
                className="pipeline-stage-box"
                onClick={() => onNavigate?.('bookings')}
                title="View Confirmed Bookings"
              >
                <span className="pipeline-stage-count" style={{ color: '#34d399' }}>{bookingStats.confirmed}</span>
                <span className="pipeline-stage-name">Confirmed</span>
              </div>

              <div
                className="pipeline-stage-box"
                onClick={() => onNavigate?.('bookings')}
                title="View Tentative Bookings"
              >
                <span className="pipeline-stage-count" style={{ color: '#fbbf24' }}>{bookingStats.tentative}</span>
                <span className="pipeline-stage-name">Tentative</span>
              </div>

              <div
                className="pipeline-stage-box"
                onClick={() => onNavigate?.('bookings')}
                title="View Completed Bookings"
              >
                <span className="pipeline-stage-count" style={{ color: '#60a5fa' }}>{bookingStats.completed}</span>
                <span className="pipeline-stage-name">Completed</span>
              </div>

              <div
                className="pipeline-stage-box"
                onClick={() => onNavigate?.('bookings')}
                title="View Cancelled Bookings"
              >
                <span className="pipeline-stage-count" style={{ color: '#f87171' }}>{bookingStats.cancelled}</span>
                <span className="pipeline-stage-name">Cancelled</span>
              </div>
            </div>
          </div>

          {/* Compact Receivables Summary Card */}
          <div className="receivables-deck-card">
            <div className="rec-deck-left">
              <div className="rec-deck-icon-box">
                <Clock size={20} />
              </div>
              <div className="rec-deck-texts">
                <span className="rec-deck-title">Outstanding Receivables</span>
                <span className="rec-deck-amount">{formatINR(currentMonthFinancials.totalOutstanding)}</span>
                <span className="rec-deck-sub">{currentMonthFinancials.dueBookingsCount} active reservations with balance due</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onNavigate?.('receivables')}
              style={{ padding: '5px 12px', fontSize: '11.5px', gap: '4px' }}
            >
              <span>View Receivables</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {/* Venue Specification Reference Card */}
          <div className="card venue-spec-card">
            <div className="card-header">
              <div className="card-title">
                <Building size={16} className="section-title-icon text-gold" />
                <span>VLNS Gardens Facilities</span>
              </div>
              <span className="badge badge-gold" style={{ fontSize: '10px', padding: '1px 6px' }}>Venue Overview</span>
            </div>

            <div className="venue-spec-grid">
              <div className="venue-spec-item">
                <div className="venue-spec-icon-box">
                  <Building size={15} />
                </div>
                <div className="venue-spec-content">
                  <div className="spec-label">Main Convention Hall</div>
                  <div className="spec-val">1,500+ Guest Capacity (Central AC)</div>
                </div>
              </div>

              <div className="venue-spec-item">
                <div className="venue-spec-icon-box">
                  <Utensils size={15} />
                </div>
                <div className="venue-spec-content">
                  <div className="spec-label">Grand Dining Hall</div>
                  <div className="spec-val">600+ Seated Dining Space</div>
                </div>
              </div>

              <div className="venue-spec-item">
                <div className="venue-spec-icon-box">
                  <Users size={15} />
                </div>
                <div className="venue-spec-content">
                  <div className="spec-label">Open-Air Party Lawn</div>
                  <div className="spec-val">2,000+ Reception & Stage Area</div>
                </div>
              </div>

              <div className="venue-spec-item">
                <div className="venue-spec-icon-box">
                  <Car size={15} />
                </div>
                <div className="venue-spec-content">
                  <div className="spec-label">Dedicated Parking</div>
                  <div className="spec-val">250+ Cars with Valet Support</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Booking Modal */}
      {isBookingModalOpen && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          onSave={handleSaveBooking}
        />
      )}

      {/* Add Enquiry Modal */}
      {isEnquiryModalOpen && (
        <EnquiryModal
          isOpen={isEnquiryModalOpen}
          onClose={() => setIsEnquiryModalOpen(false)}
          onSave={handleSaveEnquiry}
        />
      )}

      {/* Record Expense Modal */}
      {isExpenseModalOpen && (
        <ExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          onSave={handleSaveExpense}
        />
      )}

      {/* Record Income Modal */}
      {isIncomeModalOpen && (
        <IncomeModal
          isOpen={isIncomeModalOpen}
          onClose={() => setIsIncomeModalOpen(false)}
          onSave={handleSaveIncome}
        />
      )}

      {/* Booking Detail Drawer */}
      {detailDrawerBooking && (
        <BookingDetailDrawer
          booking={detailDrawerBooking}
          onClose={() => setDetailDrawerBooking(null)}
          onCollectPayment={async (paymentData) => {
            const res = await createPayment(paymentData);
            showSuccess(`Payment of ${formatINR(paymentData.amount)} recorded.`);
            return res;
          }}
          showSuccess={showSuccess}
          showError={showError}
        />
      )}
    </div>
  );
}
