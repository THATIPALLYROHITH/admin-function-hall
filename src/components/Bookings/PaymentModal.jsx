import React, { useState, useEffect } from 'react';
import {
  X,
  IndianRupee,
  Calendar,
  CreditCard,
  FileText,
  Check,
  AlertCircle,
  Hash
} from 'lucide-react';
import '../Enquiries/EnquiryModal.css';
import './BookingModal.css';

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Other'];
const ONLINE_METHODS = ['UPI', 'Bank Transfer'];

function formatINR(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
}

export default function PaymentModal({ isOpen, onClose, onSave, booking }) {
  // booking = { id, customerName, totalAmount, totalPaid, balanceAmount, paymentStatus, ... }

  const balance = Number(booking?.balanceAmount) || 0;
  const totalAmount = Number(booking?.totalAmount) || 0;
  const totalPaid = Number(booking?.totalPaid) || 0;

  // Form state
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState('');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Derived: what will remaining balance be after this payment?
  const parsedAmount = Number(amount) || 0;
  const remainingAfter = Math.max(0, balance - parsedAmount);
  const willFullySettle = parsedAmount >= balance && balance > 0;

  // Reset form when opened
  useEffect(() => {
    if (!isOpen) return;
    // Default amount = full outstanding balance
    setAmount(balance > 0 ? String(balance) : '');
    setPaymentMethod('Cash');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setTransactionReference('');
    setNotes('');
    setFormError('');
    setIsSaving(false);
  }, [isOpen, balance]);

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isOnlinePayment = ONLINE_METHODS.includes(paymentMethod);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!parsedAmount || parsedAmount <= 0) {
      setFormError('Payment amount must be greater than zero.');
      return;
    }
    if (parsedAmount > balance) {
      setFormError(`Amount cannot exceed the outstanding balance of ${formatINR(balance)}.`);
      return;
    }
    if (!paymentDate) {
      setFormError('Payment date is required.');
      return;
    }
    if (!paymentMethod) {
      setFormError('Payment method is required.');
      return;
    }
    if (isOnlinePayment && !transactionReference.trim()) {
      setFormError(`Transaction / reference number is required for ${paymentMethod} payments.`);
      return;
    }

    const paymentData = {
      bookingId: booking.id,
      customerName: booking.customerName || '',
      amount: parsedAmount,
      paymentDate,
      paymentMethod,
      transactionReference: transactionReference.trim(),
      notes: notes.trim(),
    };

    try {
      setIsSaving(true);
      await onSave(paymentData);
      onClose();
    } catch (err) {
      setFormError(err.message || 'Failed to record payment. Please try again.');
      setIsSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Collect Payment"
    >
      <div
        className="modal-content"
        style={{ maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-info">
            <div className="modal-badge">
              <IndianRupee size={12} />
              <span>Collect Payment</span>
            </div>
            <h2 className="modal-title">Record Payment</h2>
            <p className="modal-subtitle">
              {booking?.customerName} · {formatINR(totalAmount)} total contract
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Balance Summary Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '10px',
          marginBottom: '18px',
          padding: '14px',
          background: 'var(--bg-surface-elevated)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Total Contract</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{formatINR(totalAmount)}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Already Paid</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#34d399', fontFamily: 'var(--font-mono)' }}>{formatINR(totalPaid)}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Outstanding</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>{formatINR(balance)}</div>
          </div>
        </div>

        {/* Error Banner */}
        {formError && (
          <div className="modal-error-banner animate-fade-in">
            <AlertCircle size={15} />
            <span>{formError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-form">

          {/* Amount + Method */}
          <div className="modal-form-grid">
            {/* Amount */}
            <div className="form-group">
              <label className="form-label" htmlFor="pm-amount">
                Payment Amount (₹) <span className="text-required">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><IndianRupee size={15} /></span>
                <input
                  id="pm-amount"
                  type="number"
                  min="1"
                  max={balance}
                  step="1"
                  placeholder={String(balance)}
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setFormError(''); }}
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="form-group">
              <label className="form-label" htmlFor="pm-method">
                Payment Method <span className="text-required">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><CreditCard size={15} /></span>
                <select
                  id="pm-method"
                  value={paymentMethod}
                  onChange={(e) => { setPaymentMethod(e.target.value); setFormError(''); }}
                  style={{ paddingLeft: '40px' }}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payment Date */}
            <div className="form-group">
              <label className="form-label" htmlFor="pm-date">
                Payment Date <span className="text-required">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><Calendar size={15} /></span>
                <input
                  id="pm-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => { setPaymentDate(e.target.value); setFormError(''); }}
                  required
                />
              </div>
            </div>

            {/* Transaction Reference */}
            <div className="form-group">
              <label className="form-label" htmlFor="pm-ref">
                Transaction Reference{isOnlinePayment && <span className="text-required"> *</span>}
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><Hash size={15} /></span>
                <input
                  id="pm-ref"
                  type="text"
                  placeholder={isOnlinePayment ? 'Required — e.g. UTR / Ref no.' : 'Optional'}
                  value={transactionReference}
                  onChange={(e) => { setTransactionReference(e.target.value); setFormError(''); }}
                />
              </div>
              {isOnlinePayment && (
                <span style={{ fontSize: '11px', color: 'var(--text-disabled)', marginTop: '3px' }}>
                  Required for {paymentMethod} — enter the UTR / transaction ID
                </span>
              )}
            </div>
          </div>

          {/* Remaining Balance Preview */}
          {parsedAmount > 0 && parsedAmount <= balance && (
            <div
              className="booking-balance-preview animate-fade-in"
              style={willFullySettle ? {
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderColor: 'rgba(16, 185, 129, 0.25)'
              } : {}}
            >
              <div>
                <div className="balance-preview-label">
                  {willFullySettle ? '🎉 Booking will be Fully Settled' : 'Remaining Balance After Payment'}
                </div>
              </div>
              <div className="balance-preview-value" style={willFullySettle ? { color: '#34d399' } : {}}>
                {willFullySettle ? '₹0 — Fully Paid' : `${formatINR(remainingAfter)} remaining`}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="pm-notes">Notes</label>
            <div className="input-with-icon" style={{ alignItems: 'flex-start' }}>
              <span className="input-icon-left" style={{ top: '12px' }}><FileText size={15} /></span>
              <textarea
                id="pm-notes"
                rows={2}
                placeholder="e.g. Advance payment at event booking, or Receipt #..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ paddingLeft: '40px', paddingTop: '10px', width: '100%', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="modal-actions-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving || parsedAmount <= 0 || parsedAmount > balance}
            >
              {isSaving ? (
                <>
                  <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>Record Payment of {parsedAmount > 0 ? formatINR(parsedAmount) : '…'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
