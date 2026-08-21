import React, { useState, useEffect } from 'react';
import {
  X,
  IndianRupee,
  Calendar,
  CreditCard,
  FileText,
  Check,
  AlertCircle,
  Tag,
  User,
  Hash,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { NON_BOOKING_INCOME_CATEGORIES } from '../../services/accountsReportsService';
import '../Enquiries/EnquiryModal.css';

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Other'];

export default function IncomeModal({ isOpen, onClose, onSave }) {
  const [category, setCategory] = useState(NON_BOOKING_INCOME_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [customerName, setCustomerName] = useState('');
  const [transactionReference, setTransactionReference] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setCategory(NON_BOOKING_INCOME_CATEGORIES[0]);
    setAmount('');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('Bank Transfer');
    setCustomerName('');
    setTransactionReference('');
    setDescription('');
    setNotes('');
    setFormError('');
    setIsSaving(false);
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Income amount must be a valid number greater than zero.');
      return;
    }
    if (!category) {
      setFormError('Please select an income category.');
      return;
    }
    if (!paymentDate) {
      setFormError('Please select the receipt date.');
      return;
    }
    if (!paymentMethod) {
      setFormError('Please select a payment method.');
      return;
    }

    const incomePayload = {
      bookingId: null, // Non-booking income
      category,
      amount: parsedAmount,
      paymentDate,
      paymentMethod,
      customerName: customerName.trim() || 'Vendor / Commission Payer',
      transactionReference: transactionReference.trim(),
      description: description.trim(),
      notes: notes.trim(),
    };

    try {
      setIsSaving(true);
      await onSave(incomePayload);
      onClose();
    } catch (err) {
      setFormError(err.message || 'Failed to record income receipt. Please try again.');
      setIsSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add Non-Booking Income"
    >
      <div
        className="modal-content"
        style={{ maxWidth: '620px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-info">
            <div className="modal-badge" style={{ color: '#34d399', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.25)' }}>
              <ArrowUpRight size={12} />
              <span>Revenue Receipt</span>
            </div>
            <h2 className="modal-title">Record Non-Booking Income</h2>
            <p className="modal-subtitle">
              Record venue vendor commissions, catering cuts, or miscellaneous business earnings.
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

        {/* Error Banner */}
        {formError && (
          <div className="modal-error-banner animate-fade-in">
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-form-grid">
            {/* Income Category (No Hall Booking allowed) */}
            <div className="form-group">
              <label className="form-label" htmlFor="inc-category">
                Income Category <span className="text-required">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><Tag size={15} /></span>
                <select
                  id="inc-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                >
                  {NON_BOOKING_INCOME_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amount */}
            <div className="form-group">
              <label className="form-label" htmlFor="inc-amount">
                Amount (₹) <span className="text-required">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><IndianRupee size={15} /></span>
                <input
                  id="inc-amount"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 20000"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setFormError(''); }}
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Income Date */}
            <div className="form-group">
              <label className="form-label" htmlFor="inc-date">
                Receipt Date <span className="text-required">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><Calendar size={15} /></span>
                <input
                  id="inc-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => { setPaymentDate(e.target.value); setFormError(''); }}
                  required
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="form-group">
              <label className="form-label" htmlFor="inc-method">
                Payment Method <span className="text-required">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><CreditCard size={15} /></span>
                <select
                  id="inc-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payer / Source / Vendor */}
            <div className="form-group">
              <label className="form-label" htmlFor="inc-payer">
                Payer / Vendor Name
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><User size={15} /></span>
                <input
                  id="inc-payer"
                  type="text"
                  placeholder="e.g. Royal Decors / Sangeetha Caterers"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
            </div>

            {/* Reference / Receipt # */}
            <div className="form-group">
              <label className="form-label" htmlFor="inc-ref">
                Reference / UTR #
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><Hash size={15} /></span>
                <input
                  id="inc-ref"
                  type="text"
                  placeholder="e.g. UTR / IMPS / Cash Memo #"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="inc-desc">
              Description
            </label>
            <div className="input-with-icon">
              <span className="input-icon-left"><FileText size={15} /></span>
              <input
                id="inc-desc"
                type="text"
                placeholder="e.g. 20% Mandap setup commission on Aug 22 wedding"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="inc-notes">
              Additional Notes
            </label>
            <textarea
              id="inc-notes"
              rows={2}
              placeholder="e.g. Received via NEFT from primary decorator partner."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          {/* Actions */}
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
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>Record Income</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
