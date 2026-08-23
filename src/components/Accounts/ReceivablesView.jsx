import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Search,
  ArrowLeft,
  Calendar,
  Phone,
  CreditCard,
  Eye,
  CheckCircle2,
  AlertCircle,
  Building2,
  Sparkles,
  TrendingDown,
  FileText,
  Copy,
  MessageSquare,
  Send
} from 'lucide-react';
import { subscribeBookings } from '../../services/bookingsService';
import { createPayment } from '../../services/paymentsService';
import { useAuth } from '../../context/AuthContext';
import PaymentModal from '../Bookings/PaymentModal';
import BookingDetailDrawer from '../Bookings/BookingDetailDrawer';
import EmptyState from '../Common/EmptyState';
import './ReceivablesView.css';
import './AccountsDashboardView.css';

// Currency formatting helper for Indian Rupee format (e.g. ₹1,50,000)
export function formatINR(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
}

function formatEventDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function getShortSlot(timeSlot) {
  if (!timeSlot) return '—';
  if (timeSlot.toLowerCase().includes('morning')) return 'Morning';
  if (timeSlot.toLowerCase().includes('evening')) return 'Evening';
  if (timeSlot.toLowerCase().includes('full')) return 'Full Day';
  return timeSlot;
}

// Generate friendly balance due reminder message for WhatsApp & clipboard
function generateReminderMessage(b) {
  const customerName = (b.customerName || 'Customer').trim();
  const occasion = (b.occasion || 'Event').trim();
  const eventDate = formatEventDate(b.eventDate);
  const timeSlot = getShortSlot(b.timeSlot);
  const balance = formatINR(b.balanceAmount);

  return `Dear ${customerName}, this is a gentle reminder regarding your upcoming ${occasion} at VLNS Gardens on ${eventDate} (${timeSlot}). The pending balance is ${balance}. Please contact VLNS Gardens if you need any assistance. Thank you.`;
}

export default function ReceivablesView({ onNavigate }) {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search states
  const [receivableFilter, setReceivableFilter] = useState('all'); // 'all' | 'partially_paid' | 'unpaid'
  const [receivableSearch, setReceivableSearch] = useState('');
  const [receivableSort, setReceivableSort] = useState('nearest_date'); // 'nearest_date' | 'latest_date' | 'highest_balance' | 'lowest_balance'

  // Modal / Drawer states
  const [paymentTargetBooking, setPaymentTargetBooking] = useState(null);
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

  // Subscribe to real-time Firestore bookings collection
  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      setBookings([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubBookings = subscribeBookings(
      (data) => {
        setBookings(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('Bookings stream error in ReceivablesView:', err);
        setError('Failed to load active bookings from Firestore.');
        setIsLoading(false);
      }
    );

    return () => {
      if (typeof unsubBookings === 'function') unsubBookings();
    };
  }, [isAuthenticated, isAuthLoading]);

  // Receivables Summary Metrics
  const metrics = useMemo(() => {
    const activeWithDue = bookings.filter((b) => {
      const isCancelled = (b.bookingStatus || '').toLowerCase() === 'cancelled';
      const balance = Number(b.balanceAmount) || 0;
      return !isCancelled && balance > 0;
    });

    const totalOutstanding = activeWithDue.reduce((sum, b) => sum + (Number(b.balanceAmount) || 0), 0);
    const totalCount = activeWithDue.length;

    const partiallyPaid = activeWithDue.filter((b) => {
      const paid = Number(b.totalPaid) || 0;
      const status = (b.paymentStatus || '').toLowerCase();
      return paid > 0 || status === 'partially paid';
    });
    const totalPartiallyPaidAmount = partiallyPaid.reduce((sum, b) => sum + (Number(b.balanceAmount) || 0), 0);

    const unpaid = activeWithDue.filter((b) => {
      const paid = Number(b.totalPaid) || 0;
      const status = (b.paymentStatus || '').toLowerCase();
      return paid === 0 || status === 'unpaid';
    });
    const totalUnpaidAmount = unpaid.reduce((sum, b) => sum + (Number(b.balanceAmount) || 0), 0);

    return {
      totalOutstanding,
      totalCount,
      partiallyPaidCount: partiallyPaid.length,
      partiallyPaidAmount: totalPartiallyPaidAmount,
      unpaidCount: unpaid.length,
      unpaidAmount: totalUnpaidAmount
    };
  }, [bookings]);

  // Receivables List (Filtered, Searched, Sorted)
  const sortedAndFilteredReceivables = useMemo(() => {
    let list = bookings.filter((b) => {
      const isCancelled = (b.bookingStatus || '').toLowerCase() === 'cancelled';
      const balance = Number(b.balanceAmount) || 0;
      return !isCancelled && balance > 0;
    });

    // Filter by payment status
    if (receivableFilter === 'partially_paid') {
      list = list.filter((b) => {
        const paid = Number(b.totalPaid) || 0;
        const status = (b.paymentStatus || '').toLowerCase();
        return paid > 0 || status === 'partially paid';
      });
    } else if (receivableFilter === 'unpaid') {
      list = list.filter((b) => {
        const paid = Number(b.totalPaid) || 0;
        const status = (b.paymentStatus || '').toLowerCase();
        return paid === 0 || status === 'unpaid';
      });
    }

    // Search query
    if (receivableSearch.trim()) {
      const q = receivableSearch.toLowerCase();
      list = list.filter((b) =>
        (b.id || '').toLowerCase().includes(q) ||
        (b.customerName || '').toLowerCase().includes(q) ||
        (b.phoneNumber || '').toLowerCase().includes(q) ||
        (b.occasion || '').toLowerCase().includes(q) ||
        (b.eventDate || '').includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      if (receivableSort === 'highest_balance') {
        return (Number(b.balanceAmount) || 0) - (Number(a.balanceAmount) || 0);
      }
      if (receivableSort === 'lowest_balance') {
        return (Number(a.balanceAmount) || 0) - (Number(b.balanceAmount) || 0);
      }
      if (receivableSort === 'latest_date') {
        return (b.eventDate || '').localeCompare(a.eventDate || '');
      }
      // Default: 'nearest_date'
      return (a.eventDate || '').localeCompare(b.eventDate || '');
    });

    return list;
  }, [bookings, receivableFilter, receivableSearch, receivableSort]);

  // Collect Payment for a Receivable Booking
  const handleCollectReceivablePayment = async (paymentData) => {
    try {
      const result = await createPayment(paymentData);
      showSuccess(
        `Payment of ${formatINR(paymentData.amount)} via ${paymentData.paymentMethod} recorded successfully.`
      );
      setPaymentTargetBooking(null);
      return result;
    } catch (err) {
      showError(err.message || 'Failed to record payment.');
      throw err;
    }
  };

  // Copy balance reminder message to clipboard
  const handleCopyReminder = async (b) => {
    const msg = generateReminderMessage(b);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(msg);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = msg;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      showSuccess(`Copied balance reminder for ${b.customerName} to clipboard.`);
    } catch (err) {
      showError('Failed to copy reminder text to clipboard.');
    }
  };

  // Trigger WhatsApp with pre-filled message
  const handleWhatsAppReminder = (b) => {
    const msg = generateReminderMessage(b);
    const rawPhone = (b.phoneNumber || '').replace(/\D/g, '');

    if (!rawPhone || rawPhone.length < 10) {
      // Fallback: Copy to clipboard and alert user
      handleCopyReminder(b);
      showError(`Phone number missing or invalid for ${b.customerName}. Reminder text was copied to clipboard instead.`);
      return;
    }

    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    showSuccess(`Opening WhatsApp chat for ${b.customerName}...`);
  };

  return (
    <div className="receivables-view-container animate-fade-in">
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

      {/* Top Navigation & Breadcrumb */}
      <div className="receivables-top-nav">
        <button
          type="button"
          className="back-to-accounts-btn"
          onClick={() => onNavigate?.('accounts')}
        >
          <ArrowLeft size={16} />
          <span>Back to Accounts & Finance</span>
        </button>

        <div className="welcome-sync-badge">
          <div className="sync-dot"></div>
          <span>Live Booking Stream</span>
        </div>
      </div>

      {/* Header Banner */}
      <div className="accounts-welcome-card">
        <div className="welcome-content">
          <div className="welcome-badge">
            <Sparkles size={13} />
            <span>VLNS Gardens Accounts & Finance • Receivables Management</span>
          </div>
          <h2 className="welcome-title">Outstanding Customer Receivables</h2>
          <p className="welcome-desc">
            Track and settle pending customer balances across confirmed and tentative event bookings.
          </p>
        </div>
      </div>

      {/* 4-Metric KPI Bar */}
      <div className="receivables-kpi-bar">
        <div className="receivables-kpi-box receivables-kpi-box-gold">
          <span className="receivables-kpi-title">
            <Clock size={14} style={{ color: '#fbbf24' }} />
            <span>Total Outstanding</span>
          </span>
          <span className="receivables-kpi-amount" style={{ color: '#fbbf24' }}>
            {formatINR(metrics.totalOutstanding)}
          </span>
          <span className="receivables-kpi-footer">Across all active venue reservations</span>
        </div>

        <div className="receivables-kpi-box">
          <span className="receivables-kpi-title">
            <Building2 size={14} style={{ color: 'var(--brand-gold)' }} />
            <span>Bookings With Due</span>
          </span>
          <span className="receivables-kpi-amount">
            {metrics.totalCount} {metrics.totalCount === 1 ? 'Reservation' : 'Reservations'}
          </span>
          <span className="receivables-kpi-footer">Awaiting balance settlement</span>
        </div>

        <div className="receivables-kpi-box">
          <span className="receivables-kpi-title">
            <CreditCard size={14} style={{ color: '#34d399' }} />
            <span>Partially Paid</span>
          </span>
          <span className="receivables-kpi-amount" style={{ color: '#34d399' }}>
            {metrics.partiallyPaidCount} {metrics.partiallyPaidCount === 1 ? 'Booking' : 'Bookings'}
          </span>
          <span className="receivables-kpi-footer">{formatINR(metrics.partiallyPaidAmount)} balance remaining</span>
        </div>

        <div className="receivables-kpi-box">
          <span className="receivables-kpi-title">
            <TrendingDown size={14} style={{ color: '#f87171' }} />
            <span>Total Unpaid</span>
          </span>
          <span className="receivables-kpi-amount" style={{ color: '#f87171' }}>
            {metrics.unpaidCount} {metrics.unpaidCount === 1 ? 'Booking' : 'Bookings'}
          </span>
          <span className="receivables-kpi-footer">{formatINR(metrics.unpaidAmount)} zero advance paid</span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="accounts-error-banner animate-fade-in">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table Card */}
      <div className="card receivables-main-card">
        {/* Search, Filter & Sort Controls */}
        <div className="receivables-filter-bar">
          {/* Status Tabs */}
          <div className="receivables-tabs-group">
            {[
              { id: 'all', label: `All Outstanding (${metrics.totalCount})` },
              { id: 'partially_paid', label: `Partially Paid (${metrics.partiallyPaidCount})` },
              { id: 'unpaid', label: `Unpaid (${metrics.unpaidCount})` }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`receivables-tab-button ${receivableFilter === tab.id ? 'active' : ''}`}
                onClick={() => setReceivableFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Sort */}
          <div className="receivables-actions-wrap">
            <div className="expense-search-input">
              <Search size={14} style={{ color: 'var(--text-disabled)' }} />
              <input
                type="text"
                placeholder="Search client, phone, ref, occasion..."
                value={receivableSearch}
                onChange={(e) => setReceivableSearch(e.target.value)}
                style={{ width: '240px' }}
              />
            </div>

            <select
              className="expense-category-select"
              value={receivableSort}
              onChange={(e) => setReceivableSort(e.target.value)}
              aria-label="Sort receivables"
            >
              <option value="nearest_date">Sort: Nearest Event Date</option>
              <option value="latest_date">Sort: Latest Event Date</option>
              <option value="highest_balance">Sort: Highest Balance Due</option>
              <option value="lowest_balance">Sort: Lowest Balance Due</option>
            </select>
          </div>
        </div>

        {/* Loading / Empty State / Data Table */}
        {isLoading ? (
          <div className="accounts-loading-box">
            <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }}></div>
            <span>Loading receivables from Firestore...</span>
          </div>
        ) : sortedAndFilteredReceivables.length === 0 ? (
          <div className="trend-empty-note" style={{ padding: '48px 20px' }}>
            {receivableSearch || receivableFilter !== 'all' ? (
              <span>No outstanding receivables match your active filter or search query.</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={36} style={{ color: '#34d399' }} />
                <strong style={{ color: 'var(--text-primary)', fontSize: '16px' }}>
                  No Outstanding Receivables
                </strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  All active venue bookings are fully settled with zero pending balance.
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="trend-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Booking Ref</th>
                  <th>Event Date & Slot</th>
                  <th>Occasion</th>
                  <th>Contract Amount</th>
                  <th>Paid</th>
                  <th>Balance Due</th>
                  <th>Payment Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedAndFilteredReceivables.map((b) => {
                  const totalAmount = Number(b.totalAmount) || 0;
                  const totalPaid = Number(b.totalPaid) || 0;
                  const balance = Number(b.balanceAmount) || 0;
                  const isPartiallyPaid = totalPaid > 0;

                  return (
                    <tr key={b.id} className="animate-fade-in">
                      {/* Customer */}
                      <td>
                        <div className="table-client-cell">
                          <div className="client-name">{b.customerName}</div>
                          <div className="client-phone">
                            <Phone size={12} />
                            <span>{b.phoneNumber || '—'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Booking Ref */}
                      <td>
                        <span className="enquiry-id-tag" style={{ fontFamily: 'var(--font-mono)' }}>
                          #{b.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>

                      {/* Event Date & Slot */}
                      <td>
                        <div className="table-target-date-cell">
                          <div className="target-date-val">
                            <Calendar size={13} />
                            <span>{formatEventDate(b.eventDate)}</span>
                          </div>
                          <div className="target-slot-sub">{getShortSlot(b.timeSlot)}</div>
                        </div>
                      </td>

                      {/* Occasion */}
                      <td>
                        <span className="occasion-title">{b.occasion || 'General Event'}</span>
                      </td>

                      {/* Contract Amount */}
                      <td>
                        <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {formatINR(totalAmount)}
                        </strong>
                      </td>

                      {/* Paid */}
                      <td>
                        <span style={{ color: '#34d399', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                          {formatINR(totalPaid)}
                        </span>
                      </td>

                      {/* Balance Due */}
                      <td>
                        <span className="receivable-balance-due">
                          {formatINR(balance)}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td>
                        <span className={`badge ${isPartiallyPaid ? 'badge-pending' : 'badge-cancelled'}`}>
                          {isPartiallyPaid ? 'Partially Paid' : 'Unpaid'}
                        </span>
                      </td>

                      {/* Action */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setPaymentTargetBooking(b)}
                            title="Collect payment from customer"
                            style={{ padding: '4px 10px', fontSize: '11.5px', gap: '4px' }}
                          >
                            <CreditCard size={13} />
                            <span>Collect Payment</span>
                          </button>
                          <button
                            type="button"
                            className="table-action-icon-btn status-btn"
                            onClick={() => handleWhatsAppReminder(b)}
                            title={`Send WhatsApp balance reminder to ${b.customerName}`}
                            aria-label={`WhatsApp reminder for ${b.customerName}`}
                            style={{ color: '#25D366' }}
                          >
                            <MessageSquare size={14} />
                          </button>
                          <button
                            type="button"
                            className="table-action-icon-btn edit-btn"
                            onClick={() => handleCopyReminder(b)}
                            title={`Copy balance reminder text for ${b.customerName}`}
                            aria-label={`Copy reminder for ${b.customerName}`}
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            className="table-action-icon-btn edit-btn"
                            onClick={() => setDetailDrawerBooking(b)}
                            title="View booking details"
                            aria-label={`View booking #${b.id.slice(0, 8)}`}
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Collect Payment Modal */}
      {paymentTargetBooking && (
        <PaymentModal
          isOpen={Boolean(paymentTargetBooking)}
          onClose={() => setPaymentTargetBooking(null)}
          booking={paymentTargetBooking}
          onSave={handleCollectReceivablePayment}
        />
      )}

      {/* View Booking Detail Drawer */}
      {detailDrawerBooking && (
        <BookingDetailDrawer
          booking={detailDrawerBooking}
          onClose={() => setDetailDrawerBooking(null)}
          onCollectPayment={handleCollectReceivablePayment}
          showSuccess={showSuccess}
          showError={showError}
        />
      )}
    </div>
  );
}
