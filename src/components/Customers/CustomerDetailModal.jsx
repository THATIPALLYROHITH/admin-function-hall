import React, { useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  IndianRupee,
  Clock,
  CheckCircle2,
  Sparkles,
  Tag,
  Receipt
} from 'lucide-react';
import '../Enquiries/EnquiryModal.css';

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
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CustomerDetailModal({ isOpen, onClose, customer }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !customer) return null;

  return (
    <div
      className="modal-overlay animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Customer Profile"
    >
      <div
        className="modal-content"
        style={{ maxWidth: '640px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-info">
            <div className="modal-badge">
              <Sparkles size={12} />
              <span>{customer.clientType || 'Event Host'}</span>
            </div>
            <h2 className="modal-title">{customer.name}</h2>
            <p className="modal-subtitle">
              Client ID: {customer.id} · {customer.totalBookings} reservation{customer.totalBookings === 1 ? '' : 's'} on record
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

        {/* Contact & KPI Summary Card */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '20px',
          padding: '16px',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Phone Number</div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={13} style={{ color: 'var(--text-muted)' }} />
              <span>{customer.phoneNumber || '—'}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Email Address</div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={13} style={{ color: 'var(--text-muted)' }} />
              <span>{customer.email || '—'}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Contracted</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brand-gold-light)', fontFamily: 'var(--font-mono)' }}>
              {formatINR(customer.totalSpent)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Paid</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
              {formatINR(customer.totalPaid)}
            </div>
          </div>
        </div>

        {/* Booking History Section */}
        <div style={{ marginBottom: '14px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '10px' }}>
            Reservation History ({customer.bookings.length})
          </h4>

          {customer.bookings.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-disabled)', fontSize: '12.5px' }}>
              No bookings on record.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
              {customer.bookings.map((b) => (
                <div
                  key={b.id}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                      {b.occasion || 'Event'}
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} />
                      {formatDate(b.eventDate)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {b.timeSlot || 'Full Day'}
                    </span>
                    {b.estimatedGuests && (
                      <span>{b.estimatedGuests} guests</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}>
                      #{b.id.slice(0, 8).toUpperCase()}
                    </span>
                    <div style={{ display: 'flex', gap: '12px', fontFamily: 'var(--font-mono)' }}>
                      <span>Contract: <strong>{formatINR(b.totalAmount)}</strong></span>
                      <span style={{ color: Number(b.balanceAmount) > 0 ? '#fbbf24' : '#34d399' }}>
                        Due: {formatINR(b.balanceAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-actions-footer">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
