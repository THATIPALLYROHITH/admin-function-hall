import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Calendar,
  Users,
  FileText,
  Sparkles,
  Check,
  AlertCircle,
  IndianRupee,
  Link2,
  Clock
} from 'lucide-react';
import '../Enquiries/EnquiryModal.css';
import './BookingModal.css';

const OCCASIONS = [
  'Wedding Ceremony',
  'Reception',
  'Engagement (Ring Ceremony)',
  'Birthday Celebration',
  'Sangeet / Mehendi',
  'Corporate Meeting & Dinner',
  'Anniversary Party',
  'Naming Ceremony / Cradle',
  'Other Social Gathering'
];

const TIME_SLOTS = [
  'Full Day (07:00 AM – 11:00 PM)',
  'Morning Slot (07:00 AM – 02:00 PM)',
  'Evening Slot (04:00 PM – 11:00 PM)'
];

const BOOKING_STATUSES = ['Tentative', 'Confirmed', 'Completed', 'Cancelled'];

// Format number as Indian Rupee for the balance preview
function formatINRPreview(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
}

export default function BookingModal({ isOpen, onClose, onSave, existingBooking = null }) {
  const isEditMode = Boolean(existingBooking);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [occasion, setOccasion] = useState(OCCASIONS[0]);
  const [eventDate, setEventDate] = useState('');
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [totalAmount, setTotalAmount] = useState('');
  const [totalPaid, setTotalPaid] = useState('0');
  const [bookingStatus, setBookingStatus] = useState('Confirmed');
  const [estimatedGuests, setEstimatedGuests] = useState('');
  const [notes, setNotes] = useState('');
  const [enquiryId, setEnquiryId] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState('Cash');

  // Derived balance preview
  const balancePreview = Math.max(0, (Number(totalAmount) || 0) - (Number(totalPaid) || 0));

  // Populate form when editing or reset on open
  useEffect(() => {
    if (!isOpen) return;

    if (isEditMode && existingBooking) {
      setCustomerName(existingBooking.customerName || '');
      setPhoneNumber(existingBooking.phoneNumber || '');
      setOccasion(existingBooking.occasion || OCCASIONS[0]);
      setEventDate(existingBooking.eventDate || '');
      setTimeSlot(existingBooking.timeSlot || TIME_SLOTS[0]);
      setTotalAmount(String(existingBooking.totalAmount ?? ''));
      setTotalPaid(String(existingBooking.totalPaid ?? '0'));
      setBookingStatus(existingBooking.bookingStatus || 'Confirmed');
      setEstimatedGuests(existingBooking.estimatedGuests ? String(existingBooking.estimatedGuests) : '');
      setNotes(existingBooking.notes || '');
      setEnquiryId(existingBooking.enquiryId || '');
    } else {
      setCustomerName('');
      setPhoneNumber('');
      setOccasion(OCCASIONS[0]);
      setEventDate('');
      setTimeSlot(TIME_SLOTS[0]);
      setTotalAmount('');
      setTotalPaid('0');
      setBookingStatus('Confirmed');
      setEstimatedGuests('');
      setNotes('');
      setEnquiryId('');
    }
    setFormError('');
    setIsSaving(false);
    setAdvancePaymentMethod('Cash');
  }, [isOpen, isEditMode, existingBooking]);

  // ESC key to close
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

    // --- Validation ---
    if (!customerName.trim()) {
      setFormError('Customer name is required.');
      return;
    }
    if (!phoneNumber.trim()) {
      setFormError('Phone number is required.');
      return;
    }
    if (!occasion) {
      setFormError('Please select an occasion type.');
      return;
    }
    if (!eventDate) {
      setFormError('Please select the event date.');
      return;
    }
    if (!timeSlot) {
      setFormError('Please select a time slot.');
      return;
    }

    const parsedTotal = Number(totalAmount);
    const parsedPaid = Number(totalPaid);

    if (isNaN(parsedTotal) || parsedTotal < 0) {
      setFormError('Total amount must be a valid non-negative number.');
      return;
    }
    if (isNaN(parsedPaid) || parsedPaid < 0) {
      setFormError('Advance paid must be a valid non-negative number.');
      return;
    }
    if (parsedPaid > parsedTotal) {
      setFormError('Advance paid cannot exceed the total amount.');
      return;
    }

    // Build the payload — let bookingsService derive balanceAmount and paymentStatus
    const bookingData = {
      customerName: customerName.trim(),
      phoneNumber: phoneNumber.trim(),
      occasion,
      eventDate,
      timeSlot,
      totalAmount: parsedTotal,
      totalPaid: parsedPaid,
      bookingStatus,
      estimatedGuests: estimatedGuests ? Number(estimatedGuests) : null,
      notes: notes.trim(),
      enquiryId: enquiryId.trim() || null,
      // Advance payment method — used by BookingsContext to record the advance
      // as an actual payment document. Ignored on Edit (Edit doesn't touch totalPaid).
      advancePaymentMethod,
    };

    try {
      setIsSaving(true);
      await onSave(bookingData);
      onClose();
    } catch (err) {
      setFormError(err.message || 'Failed to save booking. Please try again.');
      setIsSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isEditMode ? 'Edit Booking' : 'Create Reservation'}
    >
      <div
        className="modal-content booking-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-info">
            <div className="modal-badge">
              <Sparkles size={13} />
              <span>{isEditMode ? 'Edit Booking Record' : 'New Reservation'}</span>
            </div>
            <h2 className="modal-title">
              {isEditMode ? 'Edit Booking Details' : 'Create Reservation'}
            </h2>
            <p className="modal-subtitle">
              {isEditMode
                ? `Editing booking for ${existingBooking?.customerName || 'customer'}`
                : 'Register a new hall reservation for VLNS Gardens.'}
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
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

          {/* === SECTION: Customer Details === */}
          <div className="booking-modal-section-label">Customer Details</div>
          <div className="modal-form-grid">
            {/* Customer Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="bm-customer-name">
                Customer Name <span className="text-required">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><User size={16} /></span>
                <input
                  id="bm-customer-name"
                  type="text"
                  placeholder="e.g. Ramesh Reddy"
                  value={customerName}
                  onChange={(e) => { setCustomerName(e.target.value); setFormError(''); }}
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div className="form-group">
              <label className="form-label" htmlFor="bm-phone">
                Phone Number <span className="text-required">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><Phone size={16} /></span>
                <input
                  id="bm-phone"
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={phoneNumber}
                  onChange={(e) => { setPhoneNumber(e.target.value); setFormError(''); }}
                  required
                />
              </div>
            </div>
          </div>

          {/* === SECTION: Event Details === */}
          <div className="booking-modal-section-label" style={{ marginTop: '4px' }}>Event Details</div>
          <div className="modal-form-grid">
            {/* Occasion */}
            <div className="form-group">
              <label className="form-label" htmlFor="bm-occasion">
                Occasion / Event Type <span className="text-required">*</span>
              </label>
              <select
                id="bm-occasion"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
              >
                {OCCASIONS.map((occ) => (
                  <option key={occ} value={occ}>{occ}</option>
                ))}
              </select>
            </div>

            {/* Booking Status */}
            <div className="form-group">
              <label className="form-label" htmlFor="bm-status">
                Booking Status <span className="text-required">*</span>
              </label>
              <select
                id="bm-status"
                value={bookingStatus}
                onChange={(e) => setBookingStatus(e.target.value)}
              >
                {BOOKING_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Event Date */}
            <div className="form-group">
              <label className="form-label" htmlFor="bm-event-date">
                Event Date <span className="text-required">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><Calendar size={16} /></span>
                <input
                  id="bm-event-date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => { setEventDate(e.target.value); setFormError(''); }}
                  required
                />
              </div>
            </div>

            {/* Time Slot */}
            <div className="form-group">
              <label className="form-label" htmlFor="bm-timeslot">
                Time Slot <span className="text-required">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><Clock size={16} /></span>
                <select
                  id="bm-timeslot"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Estimated Guests */}
            <div className="form-group">
              <label className="form-label" htmlFor="bm-guests">
                Estimated Guests
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><Users size={16} /></span>
                <input
                  id="bm-guests"
                  type="number"
                  min="1"
                  max="5000"
                  placeholder="e.g. 800"
                  value={estimatedGuests}
                  onChange={(e) => setEstimatedGuests(e.target.value)}
                />
              </div>
            </div>

            {/* Linked Enquiry ID */}
            <div className="form-group">
              <label className="form-label" htmlFor="bm-enquiry-id">
                Linked Enquiry ID
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><Link2 size={16} /></span>
                <input
                  id="bm-enquiry-id"
                  type="text"
                  placeholder="e.g. Firestore Doc ID"
                  value={enquiryId}
                  onChange={(e) => setEnquiryId(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* === SECTION: Financials === */}
          <div className="booking-modal-section-label" style={{ marginTop: '4px' }}>Financial Details</div>
          <div className="modal-form-grid">
            {/* Total Amount */}
            <div className="form-group">
              <label className="form-label" htmlFor="bm-total-amount">
                Total Contract Amount (₹)
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><IndianRupee size={16} /></span>
                <input
                  id="bm-total-amount"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="e.g. 150000"
                  value={totalAmount}
                  onChange={(e) => { setTotalAmount(e.target.value); setFormError(''); }}
                />
              </div>
            </div>

            {/* Advance Paid */}
            <div className="form-group">
              <label className="form-label" htmlFor="bm-advance-paid">
                Advance Already Paid (₹)
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left"><IndianRupee size={16} /></span>
                <input
                  id="bm-advance-paid"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="e.g. 50000"
                  value={totalPaid}
                  onChange={(e) => { setTotalPaid(e.target.value); setFormError(''); }}
                />
              </div>
            </div>

            {/* Advance Payment Method — only shown in Create mode when advance > 0 */}
            {!isEditMode && Number(totalPaid) > 0 && (
              <div className="form-group">
                <label className="form-label" htmlFor="bm-advance-method">
                  Advance Payment Method
                </label>
                <select
                  id="bm-advance-method"
                  value={advancePaymentMethod}
                  onChange={(e) => setAdvancePaymentMethod(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
                <span style={{ fontSize: '11px', color: 'var(--text-disabled)', marginTop: '3px', display: 'block' }}>
                  This advance will be recorded as a payment in the payment history.
                </span>
              </div>
            )}
          </div>

          {/* Balance Preview */}
          {(Number(totalAmount) > 0) && (
            <div className="booking-balance-preview animate-fade-in">
              <div>
                <div className="balance-preview-label">Outstanding Balance (auto-calculated)</div>
              </div>
              <div className="balance-preview-value">
                {formatINRPreview(balancePreview)} due
              </div>
            </div>
          )}

          {/* === Notes === */}
          <div className="form-group" style={{ marginTop: '4px' }}>
            <label className="form-label" htmlFor="bm-notes">
              Special Notes / Requirements
            </label>
            <div className="input-with-icon" style={{ alignItems: 'flex-start' }}>
              <span className="input-icon-left" style={{ top: '12px' }}><FileText size={16} /></span>
              <textarea
                id="bm-notes"
                rows={3}
                placeholder="e.g. Requires AC hall and outdoor buffet lawn. Parking instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ paddingLeft: '40px', paddingTop: '12px', width: '100%', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Footer Actions */}
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
                  <span>{isEditMode ? 'Save Changes' : 'Create Reservation'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
