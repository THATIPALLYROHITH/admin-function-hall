import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  Calendar,
  Clock,
  User,
  Phone,
  IndianRupee,
  Receipt,
  Sparkles,
  Building2,
  FileCheck2,
  Users,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { getVenueSettings } from '../../services/receiptSettingsService';
import './BookingReceiptModal.css';

function formatINR(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function formatPrintTimestamp() {
  return new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function generateWhatsAppConfirmationMessage(booking, venueSettings) {
  const customerName = (booking.customerName || 'Valued Customer').trim();
  const bookingRef = `#BOOK-${booking.id.slice(0, 8).toUpperCase()}`;
  const occasion = (booking.occasion || 'Event').trim();
  const eventDate = formatDate(booking.eventDate);
  const timeSlot = booking.timeSlot || 'Full Day';
  const guests = booking.estimatedGuests ? `${booking.estimatedGuests}` : '—';
  const totalAmount = formatINR(booking.totalAmount);
  const totalPaid = formatINR(booking.totalPaid);
  const balanceDue = formatINR(booking.balanceAmount);
  const status = booking.bookingStatus || 'Confirmed';

  const venueName = (venueSettings.venueName || 'VLNS Gardens').toUpperCase();
  const venueCategory = venueSettings.venueCategory || 'Luxury Convention Hall & Banquet Lawn';
  const address = venueSettings.address || 'Warangal, Telangana';
  const phone = venueSettings.phone || '+91 91000 05724';
  const email = venueSettings.email || 'vlnsgardens@gmail.com';

  return `*${venueName} — BOOKING CONFIRMATION & RECEIPT*

Dear ${customerName},

Thank you for choosing ${venueName} for your special occasion.

*BOOKING DETAILS*
Booking Ref: ${bookingRef}
Occasion: ${occasion}
Event Date: ${eventDate}
Time Slot: ${timeSlot}
Estimated Guests: ${guests}
Status: ${status}

*FINANCIAL SUMMARY*
Total Contracted Charges: ${totalAmount}
Amount Paid: ${totalPaid}
Outstanding Balance: ${balanceDue}

For any queries, decor planning, or venue assistance, please contact us.

*${venueName}*
${venueCategory}
${address}
Phone: ${phone}
Email: ${email}`;
}

export default function BookingReceiptModal({ isOpen, onClose, booking, payments = [], isPreview = false }) {
  const [feedbackMsg, setFeedbackMsg] = useState(null); // { type: 'success' | 'error', text: '' }

  if (!isOpen || !booking) return null;

  const venueSettings = getVenueSettings();

  const totalAmount = Number(booking.totalAmount) || 0;
  const totalPaid = Number(booking.totalPaid) || 0;
  const balanceDue = Number(booking.balanceAmount) || 0;
  const bookingRef = `#BOOK-${booking.id.slice(0, 8).toUpperCase()}`;

  const validPayments = payments.filter((p) => p.status !== 'Voided');

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const rawPhone = (booking.phoneNumber || '').replace(/\D/g, '');

    if (!rawPhone || rawPhone.length < 10) {
      setFeedbackMsg({
        type: 'error',
        text: `Cannot send via WhatsApp: Missing or invalid customer phone number for "${booking.customerName}". Please update the phone number in booking details.`
      });
      setTimeout(() => setFeedbackMsg(null), 6000);
      return;
    }

    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const msg = generateWhatsAppConfirmationMessage(booking, venueSettings);
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;

    window.open(url, '_blank', 'noopener,noreferrer');
    setFeedbackMsg({
      type: 'success',
      text: `Opening WhatsApp chat with ${booking.customerName} (+${cleanPhone})...`
    });
    setTimeout(() => setFeedbackMsg(null), 4500);
  };

  const modalJSX = (
    <div className="receipt-modal-overlay animate-fade-in" onClick={onClose}>
      <div
        className="receipt-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Screen Controls Header (hidden during print) */}
        <div className="receipt-controls-bar no-print">
          <div className="receipt-controls-title">
            <Receipt size={16} style={{ color: 'var(--brand-gold)' }} />
            <span>{isPreview ? 'Booking Receipt Template Preview' : 'Booking Confirmation & Receipt'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {!isPreview && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleSendWhatsApp}
                style={{ gap: '6px', color: '#25D366', borderColor: 'rgba(37, 211, 102, 0.35)' }}
                title={`Send booking confirmation message to ${booking.customerName} via WhatsApp`}
              >
                <MessageSquare size={15} />
                <span>Send on WhatsApp</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handlePrint}
              style={{ gap: '6px' }}
            >
              <Printer size={15} />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close Preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Feedback Alert Banner (e.g. invalid phone number notice) */}
        {feedbackMsg && (
          <div className={`receipt-feedback-banner feedback-${feedbackMsg.type} no-print animate-fade-in`}>
            {feedbackMsg.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Printable Document Paper */}
        <div className="receipt-paper" id="printable-booking-receipt">
          {/* Template Preview Disclaimer (screen only) */}
          {isPreview && (
            <div
              className="no-print"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                marginBottom: '14px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: 'var(--radius-sm)',
                color: '#fde68a',
                fontSize: '12px',
                lineHeight: 1.4
              }}
            >
              <Info size={15} style={{ flexShrink: 0, color: 'var(--brand-gold)' }} />
              <span>
                <strong>Receipt Preview:</strong> Booking and payment details are automatically populated from the selected reservation.
              </span>
            </div>
          )}

          {/* Header */}
          <div className="receipt-header">
            <div className="receipt-brand">
              <h1 className="receipt-venue-name">{(venueSettings.venueName || 'VLNS GARDENS').toUpperCase()}</h1>
              <p className="receipt-venue-sub">{venueSettings.venueCategory || 'Luxury Convention Hall & Banquet Lawn'}</p>
              <p className="receipt-venue-addr">
                {(venueSettings.address || 'Warangal, Telangana')} • Phone: {venueSettings.phone || '+91 91000 05724'} • Email: {venueSettings.email || 'vlnsgardens@gmail.com'}
              </p>
            </div>
            <div className="receipt-doc-badge">
              <span className="doc-badge-title">BOOKING CONFIRMATION</span>
              <span className="doc-badge-ref">{bookingRef}</span>
              <span className="doc-badge-date">Date: {formatPrintTimestamp()}</span>
            </div>
          </div>

          <div className="receipt-divider" />

          {/* Customer & Event Schedule 2-Column Grid */}
          <div className="receipt-section-grid">
            {/* Left Column: Customer Details */}
            <div className="receipt-box">
              <div className="receipt-box-title">Client Information</div>
              <div className="receipt-info-row">
                <span className="info-label">Customer Name:</span>
                <span className="info-val strong">{booking.customerName}</span>
              </div>
              <div className="receipt-info-row">
                <span className="info-label">Contact Phone:</span>
                <span className="info-val">{booking.phoneNumber || '—'}</span>
              </div>
              <div className="receipt-info-row">
                <span className="info-label">Booking Status:</span>
                <span className={`receipt-status-tag status-${(booking.bookingStatus || 'confirmed').toLowerCase()}`}>
                  {booking.bookingStatus || 'Confirmed'}
                </span>
              </div>
              {booking.enquiryId && (
                <div className="receipt-info-row">
                  <span className="info-label">Linked Enquiry:</span>
                  <span className="info-val">#{booking.enquiryId.slice(0, 8).toUpperCase()}</span>
                </div>
              )}
            </div>

            {/* Right Column: Event Details */}
            <div className="receipt-box">
              <div className="receipt-box-title">Event Schedule & Venue Details</div>
              <div className="receipt-info-row">
                <span className="info-label">Occasion / Function:</span>
                <span className="info-val strong">{booking.occasion || 'General Function'}</span>
              </div>
              <div className="receipt-info-row">
                <span className="info-label">Event Date:</span>
                <span className="info-val strong">{formatDate(booking.eventDate)}</span>
              </div>
              <div className="receipt-info-row">
                <span className="info-label">Time Slot:</span>
                <span className="info-val">{booking.timeSlot || 'Full Day'}</span>
              </div>
              {booking.estimatedGuests && (
                <div className="receipt-info-row">
                  <span className="info-label">Estimated Guests:</span>
                  <span className="info-val">{booking.estimatedGuests} Attendees</span>
                </div>
              )}
            </div>
          </div>

          {/* Financial Statement Breakdown */}
          <div className="receipt-box receipt-financial-box">
            <div className="receipt-box-title">Financial Summary & Payment Status</div>
            <table className="receipt-calc-table">
              <tbody>
                <tr>
                  <td>Total Contracted Booking Charges</td>
                  <td className="amount-col">{formatINR(totalAmount)}</td>
                </tr>
                <tr>
                  <td>Total Advance / Payments Received</td>
                  <td className="amount-col received-col">(-) {formatINR(totalPaid)}</td>
                </tr>
                <tr className="balance-highlight-row">
                  <td>
                    <strong>Outstanding Balance Amount Due</strong>
                    <span className="payment-status-note">
                      (Payment Status: {booking.paymentStatus || (balanceDue === 0 ? 'Paid' : 'Pending')})
                    </span>
                  </td>
                  <td className="amount-col balance-col">
                    <strong>{formatINR(balanceDue)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Receipts History Table (if payments exist) */}
          {validPayments.length > 0 && (
            <div className="receipt-box">
              <div className="receipt-box-title">Payment Transaction History</div>
              <table className="receipt-payments-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Payment Method</th>
                    <th>Reference / Bill #</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {validPayments.map((p) => (
                    <tr key={p.id}>
                      <td>{formatDate(p.paymentDate)}</td>
                      <td>{p.paymentMethod || 'Cash'}</td>
                      <td>{p.transactionReference || '—'}</td>
                      <td>
                        <span className="payment-receipt-badge">{p.status || 'Completed'}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Venue Terms & Conditions */}
          <div className="receipt-terms-box">
            <div className="receipt-box-title">Venue Terms & Booking Guidelines</div>
            <ul className="receipt-terms-list">
              {(venueSettings.termsAndConditions || venueSettings.terms || '')
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
                .map((term, idx) => (
                  <li key={idx}>{term}</li>
                ))}
            </ul>
          </div>

          {/* Signature & Seal Footer */}
          <div className="receipt-sign-footer">
            <div className="sign-block">
              <div className="sign-line" />
              <span className="sign-label">Customer Signature</span>
            </div>
            <div className="sign-block">
              <div className="sign-line" />
              <span className="sign-label">{`Authorized Signatory (${venueSettings.venueName || 'VLNS Gardens'})`}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
}
