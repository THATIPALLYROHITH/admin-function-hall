import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Users,
  Phone,
  IndianRupee,
  CreditCard,
  Hash,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Banknote,
  Receipt,
  Sparkles
} from 'lucide-react';
import { subscribePayments, voidPayment } from '../../services/paymentsService';
import PaymentModal from './PaymentModal';
import './PaymentPanel.css';

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function formatINR(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getMethodIcon(method) {
  switch ((method || '').toLowerCase()) {
    case 'upi':
      return <Receipt size={12} />;
    case 'bank transfer':
      return <Banknote size={12} />;
    case 'cash':
      return <IndianRupee size={12} />;
    default:
      return <CreditCard size={12} />;
  }
}

function getPaymentStatusVariant(status) {
  switch ((status || '').toLowerCase()) {
    case 'paid':
      return 'badge-confirmed';
    case 'partially paid':
      return 'badge-pending';
    default:
      return 'badge-cancelled';
  }
}

function getBookingStatusVariant(status) {
  switch ((status || '').toLowerCase()) {
    case 'confirmed':
      return 'booking-status-badge-confirmed';
    case 'tentative':
      return 'booking-status-badge-tentative';
    case 'completed':
      return 'booking-status-badge-completed';
    case 'cancelled':
      return 'booking-status-badge-cancelled';
    default:
      return 'booking-status-badge-tentative';
  }
}

/* ── Void Confirm Dialog ──────────────────────────────────────────────────── */

function VoidConfirmDialog({ payment, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  return (
    <div className="void-confirm-overlay animate-fade-in">
      <div className="confirm-dialog-box" style={{ borderColor: 'rgba(244, 63, 94, 0.4)' }}>
        <div className="confirm-dialog-icon">
          <AlertTriangle size={22} />
        </div>
        <div className="confirm-dialog-title">Void This Payment?</div>
        <div className="confirm-dialog-desc">
          You are about to void the{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {formatINR(payment?.amount)} {payment?.paymentMethod}
          </strong>{' '}
          payment. This will atomically revert the booking totals. The payment record will remain as{' '}
          <strong style={{ color: '#fb7185' }}>Voided</strong> in the history.
        </div>
        <div className="form-group" style={{ marginBottom: '18px' }}>
          <label className="form-label" htmlFor="void-reason">Void Reason (optional)</label>
          <input
            id="void-reason"
            type="text"
            placeholder="e.g. Duplicate entry, customer cancelled..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
        </div>
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onCancel}
            disabled={isVoiding}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            disabled={isVoiding}
            onClick={async () => {
              setIsVoiding(true);
              try {
                await onConfirm(reason || 'Voided by administrator');
              } catch {
                setIsVoiding(false);
              }
            }}
          >
            {isVoiding ? (
              <>
                <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }} />
                <span>Voiding...</span>
              </>
            ) : (
              <span>Yes, Void Payment</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Drawer Component ────────────────────────────────────────────────── */

export default function BookingDetailDrawer({ booking, onClose, onCollectPayment, showSuccess, showError }) {
  // booking is the live booking object from BookingsContext (updates in real-time)
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [voidingPayment, setVoidingPayment] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const balance = Number(booking?.balanceAmount) || 0;
  const hasOutstanding = balance > 0;

  // Subscribe to payments for this booking (real-time)
  useEffect(() => {
    if (!booking?.id) return;
    setPaymentsLoading(true);

    const unsubscribe = subscribePayments(
      (data) => {
        setPayments(data);
        setPaymentsLoading(false);
      },
      (err) => {
        console.error('Payment subscription error:', err);
        setPaymentsLoading(false);
      },
      booking.id
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [booking?.id]);

  // ESC to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!booking) return null;

  /* ── Handlers ──────────────────────────────────────── */

  const handleVoidConfirm = async (reason) => {
    if (!voidingPayment) return;
    try {
      await voidPayment(voidingPayment.id, reason);
      showSuccess(`Payment of ${formatINR(voidingPayment.amount)} voided successfully. Booking totals have been updated.`);
    } catch (err) {
      showError(err.message || 'Failed to void payment.');
    } finally {
      setVoidingPayment(null);
    }
  };

  const handleSavePayment = async (paymentData) => {
    await onCollectPayment(paymentData);
  };

  /* ── Render ────────────────────────────────────────── */

  const completedPayments = payments.filter((p) => p.status !== 'Voided');
  const voidedPayments = payments.filter((p) => p.status === 'Voided');

  return (
    <>
      {/* Overlay */}
      <div className="booking-drawer-overlay animate-fade-in" onClick={onClose} />

      {/* Drawer */}
      <div className="booking-drawer">

        {/* Header */}
        <div className="booking-drawer-header">
          <div className="booking-drawer-title-group">
            <div className="booking-drawer-badge">
              <Sparkles size={11} />
              <span>Booking Details</span>
            </div>
            <div className="booking-drawer-title">{booking.customerName}</div>
            <div className="booking-drawer-subtitle">
              #{booking.id.slice(0, 8).toUpperCase()} · {booking.occasion}
            </div>
          </div>
          <button
            type="button"
            className="booking-drawer-close-btn"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="booking-drawer-body">

          {/* Mini booking info grid */}
          <div className="booking-info-mini-grid">
            <div className="booking-info-mini-cell">
              <div className="booking-info-mini-label">Event Date</div>
              <div className="booking-info-mini-value" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                {formatDisplayDate(booking.eventDate)}
              </div>
            </div>
            <div className="booking-info-mini-cell">
              <div className="booking-info-mini-label">Time Slot</div>
              <div className="booking-info-mini-value" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                {booking.timeSlot?.includes('Morning') ? 'Morning'
                  : booking.timeSlot?.includes('Evening') ? 'Evening' : 'Full Day'}
              </div>
            </div>
            <div className="booking-info-mini-cell">
              <div className="booking-info-mini-label">Phone</div>
              <div className="booking-info-mini-value" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                {booking.phoneNumber}
              </div>
            </div>
            <div className="booking-info-mini-cell">
              <div className="booking-info-mini-label">Booking Status</div>
              <div style={{ marginTop: '2px' }}>
                <span className={`badge ${getBookingStatusVariant(booking.bookingStatus)}`}>
                  {booking.bookingStatus}
                </span>
              </div>
            </div>
            {booking.estimatedGuests && (
              <div className="booking-info-mini-cell">
                <div className="booking-info-mini-label">Est. Guests</div>
                <div className="booking-info-mini-value" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Users size={12} style={{ color: 'var(--text-muted)' }} />
                  {booking.estimatedGuests}
                </div>
              </div>
            )}
          </div>

          {/* ── Payment Summary ── */}
          <div className="payment-panel">
            <div className="payment-summary-card">
              <div className="payment-summary-header">
                <div className="payment-summary-title">Payment Summary</div>
                <span className={`badge ${getPaymentStatusVariant(booking.paymentStatus)}`}>
                  {booking.paymentStatus || 'Pending'}
                </span>
              </div>

              <div className="payment-summary-rows">
                <div className="payment-summary-row">
                  <span className="payment-summary-label">Total Contract Amount</span>
                  <span className="payment-summary-value">{formatINR(booking.totalAmount)}</span>
                </div>
                <div className="payment-summary-row">
                  <span className="payment-summary-label">Total Received</span>
                  <span className="payment-summary-value" style={{ color: '#34d399' }}>
                    {formatINR(booking.totalPaid)}
                  </span>
                </div>
                <div className="payment-summary-divider" />
                <div className="payment-summary-row">
                  <span className="payment-summary-label" style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Outstanding Balance
                  </span>
                  <span className={`payment-summary-value ${balance === 0 ? 'balance-paid' : 'balance-due'}`}>
                    {formatINR(balance)}
                  </span>
                </div>
              </div>

              {hasOutstanding ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm collect-payment-btn"
                  onClick={() => setIsPaymentModalOpen(true)}
                >
                  <IndianRupee size={14} />
                  <span>Collect Payment</span>
                </button>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  color: '#34d399',
                  fontSize: '13px',
                  fontWeight: 600
                }}>
                  <CheckCircle2 size={16} />
                  <span>Fully Settled — No Outstanding Balance</span>
                </div>
              )}
            </div>

            {/* ── Payment History ── */}
            <div className="payment-history-header">
              <div className="payment-history-title">Payment History</div>
              <div className="payment-history-count">
                {completedPayments.length} payment{completedPayments.length !== 1 ? 's' : ''}
                {voidedPayments.length > 0 && ` · ${voidedPayments.length} voided`}
              </div>
            </div>

            {paymentsLoading ? (
              <div className="payment-history-loading">
                <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                <span>Loading payments...</span>
              </div>
            ) : payments.length === 0 ? (
              <div className="payment-history-empty">
                <Receipt size={24} strokeWidth={1.5} />
                <div>No payments recorded yet</div>
                {hasOutstanding && (
                  <div style={{ fontSize: '11px', color: 'var(--text-disabled)' }}>
                    Use "Collect Payment" above to record the first payment
                  </div>
                )}
              </div>
            ) : (
              <div className="payment-history-list">
                {payments.map((payment) => {
                  const isVoided = payment.status === 'Voided';
                  return (
                    <div
                      key={payment.id}
                      className={`payment-record-card${isVoided ? ' voided' : ''} animate-fade-in`}
                    >
                      <div className="payment-record-left">
                        <div className={`payment-record-amount${isVoided ? ' voided-amount' : ''}`}>
                          {formatINR(payment.amount)}
                        </div>
                        <div className="payment-record-meta">
                          <span>{formatDisplayDate(payment.paymentDate)}</span>
                          <span>·</span>
                          <span className="payment-record-method-badge">
                            {getMethodIcon(payment.paymentMethod)}
                            <span>{payment.paymentMethod}</span>
                          </span>
                        </div>
                        {payment.transactionReference && (
                          <div className="payment-record-ref">
                            <Hash size={10} style={{ display: 'inline', marginRight: '3px' }} />
                            {payment.transactionReference}
                          </div>
                        )}
                        {payment.notes && (
                          <div className="payment-record-notes">{payment.notes}</div>
                        )}
                        {isVoided && payment.voidReason && (
                          <div style={{ fontSize: '11px', color: '#fb7185', marginTop: '3px' }}>
                            Void reason: {payment.voidReason}
                          </div>
                        )}
                      </div>

                      <div className="payment-record-right">
                        <span className={`payment-status-pill ${isVoided ? 'payment-status-voided' : 'payment-status-completed'}`}>
                          {payment.status}
                        </span>
                        {!isVoided && (
                          <button
                            type="button"
                            className="void-payment-btn"
                            onClick={() => setVoidingPayment(payment)}
                            title="Void this payment"
                          >
                            Void
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes (if any) */}
          {booking.notes && (
            <div style={{ marginTop: '20px' }}>
              <div className="payment-history-title" style={{ marginBottom: '8px' }}>Booking Notes</div>
              <div style={{
                fontSize: '12.5px',
                color: 'var(--text-muted)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                lineHeight: '1.55',
                whiteSpace: 'pre-wrap'
              }}>
                {booking.notes}
              </div>
            </div>
          )}
        </div>

        {/* Footer: Edit button */}
        <div className="booking-drawer-footer">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
            Close
          </button>
          {hasOutstanding && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => setIsPaymentModalOpen(true)}
            >
              <IndianRupee size={14} />
              <span>Collect Payment — {formatINR(balance)} due</span>
            </button>
          )}
        </div>
      </div>

      {/* Payment Modal (mounted at drawer level so it overlays the drawer) */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSave={handleSavePayment}
        booking={booking}
      />

      {/* Void Confirmation Dialog */}
      {voidingPayment && (
        <VoidConfirmDialog
          payment={voidingPayment}
          onConfirm={handleVoidConfirm}
          onCancel={() => setVoidingPayment(null)}
        />
      )}
    </>
  );
}
