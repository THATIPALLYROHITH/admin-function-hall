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
  Clock,
  Building,
  Tag
} from 'lucide-react';
import './EnquiryModal.css';

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

const MANUAL_ENTRY_STATUSES = ['Contacted', 'Quoted'];

export default function EnquiryModal({ isOpen, onClose, onSave }) {
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [occasion, setOccasion] = useState(OCCASIONS[0]);
  const [targetDate, setTargetDate] = useState('');
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [status, setStatus] = useState(MANUAL_ENTRY_STATUSES[0]);
  const [estimatedGuests, setEstimatedGuests] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Reset form whenever modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCustomerName('');
      setPhoneNumber('');
      setOccasion(OCCASIONS[0]);
      setTargetDate('');
      setTimeSlot(TIME_SLOTS[0]);
      setStatus(MANUAL_ENTRY_STATUSES[0]);
      setEstimatedGuests('');
      setNotes('');
      setFormError('');
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!customerName.trim()) {
      setFormError('Please enter the customer name.');
      return;
    }

    if (!phoneNumber.trim()) {
      setFormError('Please enter a contact phone number.');
      return;
    }

    if (!targetDate) {
      setFormError('Please select the target date for the event.');
      return;
    }

    if (!status) {
      setFormError('Please select an initial enquiry status.');
      return;
    }

    onSave({
      customerName,
      phoneNumber,
      occasion,
      targetDate,
      timeSlot,
      status,
      estimatedGuests,
      notes
    });

    onClose();
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content enquiry-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-info">
            <div className="modal-badge">
              <Sparkles size={13} />
              <span>Owner Admin Entry</span>
            </div>
            <h2 className="modal-title">Record Manual Enquiry</h2>
            <p className="modal-subtitle">
              Add walk-in, telephonic, or direct customer enquiries to the VLNS Gardens queue.
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

        {/* Error Alert */}
        {formError && (
          <div className="modal-error-banner animate-fade-in">
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-form-grid">
            {/* Customer Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="customer-name">
                Customer Name <span className="text-required">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left">
                  <User size={17} />
                </span>
                <input
                  id="customer-name"
                  type="text"
                  placeholder="e.g. Ramesh Reddy"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (formError) setFormError('');
                  }}
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="form-group">
              <label className="form-label" htmlFor="phone-number">
                Phone Number <span className="text-required">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left">
                  <Phone size={17} />
                </span>
                <input
                  id="phone-number"
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (formError) setFormError('');
                  }}
                  required
                />
              </div>
            </div>

            {/* Occasion / Event */}
            <div className="form-group">
              <label className="form-label" htmlFor="occasion-select">
                Occasion / Event Type <span className="text-required">*</span>
              </label>
              <select
                id="occasion-select"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
              >
                {OCCASIONS.map((occ) => (
                  <option key={occ} value={occ}>
                    {occ}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Date */}
            <div className="form-group">
              <label className="form-label" htmlFor="target-date">
                Target Date <span className="text-required">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left">
                  <Calendar size={17} />
                </span>
                <input
                  id="target-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => {
                    setTargetDate(e.target.value);
                    if (formError) setFormError('');
                  }}
                  required
                />
              </div>
            </div>

            {/* Time Slot */}
            <div className="form-group">
              <label className="form-label" htmlFor="time-slot-select">
                Preferred Timing Slot
              </label>
              <select
                id="time-slot-select"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            {/* Initial Status (Contacted / Quoted only) */}
            <div className="form-group">
              <label className="form-label" htmlFor="status-select">
                Initial Status <span className="text-required">*</span>
              </label>
              <select
                id="status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
              >
                {MANUAL_ENTRY_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Estimated Guests */}
            <div className="form-group">
              <label className="form-label" htmlFor="estimated-guests">
                Estimated Guests
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left">
                  <Users size={17} />
                </span>
                <input
                  id="estimated-guests"
                  type="number"
                  min="1"
                  max="5000"
                  placeholder="e.g. 800"
                  value={estimatedGuests}
                  onChange={(e) => setEstimatedGuests(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="form-group" style={{ marginTop: '4px' }}>
            <label className="form-label" htmlFor="enquiry-notes">
              Special Notes / Requirements
            </label>
            <textarea
              id="enquiry-notes"
              rows={3}
              placeholder="e.g. Requires AC convention hall and outdoor buffet lawn. Vegetarian catering inquiry..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Modal Actions */}
          <div className="modal-actions-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              <Check size={16} />
              <span>Save Enquiry</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
