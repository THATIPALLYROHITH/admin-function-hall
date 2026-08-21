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
  Sparkles
} from 'lucide-react';
import { EXPENSE_CATEGORIES } from '../../services/expensesService';
import '../Enquiries/EnquiryModal.css';

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Other'];

export default function ExpenseModal({ isOpen, onClose, onSave, existingExpense = null }) {
  const isEditMode = Boolean(existingExpense);

  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [payee, setPayee] = useState('');
  const [description, setDescription] = useState('');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (isEditMode && existingExpense) {
      setCategory(existingExpense.category || EXPENSE_CATEGORIES[0]);
      setAmount(String(existingExpense.amount ?? ''));
      setExpenseDate(existingExpense.expenseDate || new Date().toISOString().slice(0, 10));
      setPaymentMethod(existingExpense.paymentMethod || 'Cash');
      setPayee(existingExpense.payee || '');
      setDescription(existingExpense.description || '');
      setTransactionReference(existingExpense.transactionReference || '');
      setNotes(existingExpense.notes || '');
    } else {
      setCategory(EXPENSE_CATEGORIES[0]);
      setAmount('');
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod('Cash');
      setPayee('');
      setDescription('');
      setTransactionReference('');
      setNotes('');
    }
    setFormError('');
    setIsSaving(false);
  }, [isOpen, isEditMode, existingExpense]);

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
      setFormError('Expense amount must be a valid number greater than zero.');
      return;
    }
    if (!category) {
      setFormError('Please select an expense category.');
      return;
    }
    if (!expenseDate) {
      setFormError('Please select the expense date.');
      return;
    }
    if (!paymentMethod) {
      setFormError('Please select a payment method.');
      return;
    }

    const expensePayload = {
      category,
      amount: parsedAmount,
      expenseDate,
      paymentMethod,
      payee: payee.trim(),
      description: description.trim(),
      transactionReference: transactionReference.trim(),
      notes: notes.trim(),
    };

    try {
      setIsSaving(true);
      await onSave(expensePayload);
      onClose();
    } catch (err) {
      setFormError(err.message || 'Failed to save expense. Please try again.');
      setIsSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isEditMode ? 'Edit Expense' : 'Add Expense'}
    >
      <div
        className="modal-content"
        style={{ maxWidth: '620px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-info">
            <div className="modal-badge">
              <Sparkles size={12} />
              <span>{isEditMode ? 'Edit Expense Record' : 'Operational Disbursement'}</span>
            </div>
            <h2 className="modal-title">
              {isEditMode ? 'Edit Expense' : 'Add New Expense'}
            </h2>
            <p className="modal-subtitle">
              {isEditMode
                ? `Updating expense record #${existingExpense?.id?.slice(0, 8) || ''}`
                : 'Record venue maintenance, staff wages, utilities, or operational bills.'}
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
            {/* Category */}
            <div className="form-group">
              <label className="form-label" htmlFor="exp-category">
                Expense Category <span className="text-required">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><Tag size={15} /></span>
                <select
                  id="exp-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amount */}
            <div className="form-group">
              <label className="form-label" htmlFor="exp-amount">
                Amount (₹) <span className="text-required">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><IndianRupee size={15} /></span>
                <input
                  id="exp-amount"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setFormError(''); }}
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Expense Date */}
            <div className="form-group">
              <label className="form-label" htmlFor="exp-date">
                Expense Date <span className="text-required">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><Calendar size={15} /></span>
                <input
                  id="exp-date"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => { setExpenseDate(e.target.value); setFormError(''); }}
                  required
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="form-group">
              <label className="form-label" htmlFor="exp-method">
                Payment Method <span className="text-required">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><CreditCard size={15} /></span>
                <select
                  id="exp-method"
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

            {/* Payee / Vendor */}
            <div className="form-group">
              <label className="form-label" htmlFor="exp-payee">
                Vendor / Payee
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><User size={15} /></span>
                <input
                  id="exp-payee"
                  type="text"
                  placeholder="e.g. Sri Krishna Electricals / Staff Name"
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                />
              </div>
            </div>

            {/* Transaction Reference */}
            <div className="form-group">
              <label className="form-label" htmlFor="exp-ref">
                Reference / Bill #
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><Hash size={15} /></span>
                <input
                  id="exp-ref"
                  type="text"
                  placeholder="e.g. Invoice #1024 or UTR"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="exp-desc">
              Description
            </label>
            <div className="input-with-icon">
              <span className="input-icon-left"><FileText size={15} /></span>
              <input
                id="exp-desc"
                type="text"
                placeholder="e.g. Stage floodlight replacement & lawn generator diesel"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="exp-notes">
              Additional Notes
            </label>
            <textarea
              id="exp-notes"
              rows={2}
              placeholder="e.g. Authorized by venue manager. Receipt filed in office binder."
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
                  <span>{isEditMode ? 'Save Changes' : 'Record Expense'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
