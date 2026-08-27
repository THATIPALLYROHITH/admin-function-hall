import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Search,
  Plus,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  Calendar,
  Users,
  Edit2,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Ban,
  ChevronDown,
  Sparkles,
  IndianRupee,
  CreditCard,
  Printer
} from 'lucide-react';
import { useBookings } from '../../context/BookingsContext';
import { createPayment, getPaymentsByBookingId } from '../../services/paymentsService';
import BookingModal from './BookingModal';
import BookingDetailDrawer from './BookingDetailDrawer';
import BookingReceiptModal from './BookingReceiptModal';
import EmptyState from '../Common/EmptyState';
import './Views.css';
import './BookingModal.css';
import './PaymentPanel.css';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatINR(val) {
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

const formatSlot = getShortSlot;

function getBookingStatusVariant(status) {
  switch ((status || '').toLowerCase()) {
    case 'confirmed':  return 'booking-status-badge-confirmed';
    case 'tentative':  return 'booking-status-badge-tentative';
    case 'completed':  return 'booking-status-badge-completed';
    case 'cancelled':  return 'booking-status-badge-cancelled';
    default:           return 'booking-status-badge-tentative';
  }
}

function getPaymentStatusVariant(status) {
  switch ((status || '').toLowerCase()) {
    case 'paid':            return 'badge-confirmed';
    case 'partially paid':  return 'badge-pending';
    default:                return 'badge-cancelled';
  }
}

// ── Status filter tabs definition ─────────────────────────────────────────────

const STATUS_TABS = [
  { id: 'all',       label: 'All Bookings',   variant: 'badge-gold' },
  { id: 'tentative', label: 'Pending Holds',  variant: 'badge-pending' },
  { id: 'confirmed', label: 'Confirmed',       variant: 'badge-confirmed' },
  { id: 'completed', label: 'Completed',       variant: 'badge-gold' },
  { id: 'cancelled', label: 'Cancelled',       variant: 'badge-cancelled' },
];

// ── CSV Export ────────────────────────────────────────────────────────────────

function exportBookingsCSV(bookingsList) {
  if (!bookingsList || bookingsList.length === 0) return;

  const headers = [
    'Booking ID',
    'Customer Name',
    'Phone Number',
    'Occasion',
    'Event Date',
    'Time Slot',
    'Booking Status',
    'Total Amount (INR)',
    'Total Paid (INR)',
    'Balance (INR)',
    'Payment Status',
    'Estimated Guests',
    'Linked Enquiry ID',
    'Notes',
    'Created Date'
  ];

  const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const rows = bookingsList.map((b) => [
    escape(b.id),
    escape(b.customerName),
    escape(b.phoneNumber),
    escape(b.occasion),
    escape(b.eventDate),
    escape(b.timeSlot),
    escape(b.bookingStatus),
    escape(b.totalAmount ?? 0),
    escape(b.totalPaid ?? 0),
    escape(b.balanceAmount ?? 0),
    escape(b.paymentStatus),
    escape(b.estimatedGuests ?? ''),
    escape(b.enquiryId ?? ''),
    escape(b.notes ?? ''),
    escape(b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN') : '')
  ].join(','));

  const csvContent = [headers.map(escape).join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `VLNS_Gardens_Bookings_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Delete Confirm Dialog ─────────────────────────────────────────────────────

function DeleteConfirmDialog({ booking, onConfirm, onCancel }) {
  return (
    <div className="confirm-dialog-overlay animate-fade-in">
      <div className="confirm-dialog-box">
        <div className="confirm-dialog-icon">
          <Trash2 size={22} />
        </div>
        <div className="confirm-dialog-title">Delete Booking?</div>
        <div className="confirm-dialog-desc">
          You are about to permanently delete the booking for{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {booking?.customerName}
          </strong>
          {booking?.eventDate ? ` (${formatEventDate(booking.eventDate)})` : ''}.
          This action cannot be undone.
        </div>
        <div className="confirm-dialog-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={onConfirm}>
            <Trash2 size={14} />
            <span>Yes, Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cancel Paid Booking Confirmation Dialog ───────────────────────────────────

function CancelPaidBookingConfirmDialog({ booking, onConfirmCancellation, onCancel }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirmClick = async () => {
    setIsProcessing(true);
    try {
      await onConfirmCancellation(booking);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="confirm-dialog-overlay animate-fade-in">
      <div className="confirm-dialog-box" style={{ borderColor: 'rgba(245, 158, 11, 0.4)' }}>
        <div className="confirm-dialog-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
          <AlertTriangle size={22} />
        </div>
        <div className="confirm-dialog-title">Cancel this booking?</div>
        <div className="confirm-dialog-desc">
          <p style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            This booking has recorded payments. Cancelling it will void the associated payment receipts so they are no longer counted as realized income. The payment records will remain in the financial audit trail.
          </p>
          <div style={{
            fontSize: '12px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '10px 12px',
            textAlign: 'left',
            color: 'var(--text-muted)'
          }}>
            <div><strong>Customer:</strong> {booking?.customerName}</div>
            <div><strong>Date:</strong> {formatEventDate(booking?.eventDate)} ({formatSlot(booking?.timeSlot)})</div>
            {Number(booking?.totalPaid) > 0 ? (
              <div><strong>Total Paid (to be voided):</strong> {formatINR(booking?.totalPaid)}</div>
            ) : (
              <div><strong>Payment History:</strong> {formatINR(booking?.totalPaid)} (Audit receipts on file)</div>
            )}
          </div>
        </div>
        <div className="confirm-dialog-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ background: '#d97706', borderColor: '#b45309' }}
            onClick={handleConfirmClick}
            disabled={isProcessing}
          >
            <Ban size={14} />
            <span>{isProcessing ? 'Cancelling & Voiding...' : 'Confirm Cancellation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BookingsView() {
  const { bookings, isLoading, error, createBooking, updateBooking, updateBookingStatus, deleteBooking, cancelBooking } = useBookings();

  const [activeStatusTab, setActiveStatusTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);

  // Delete confirm state
  const [deletingBooking, setDeletingBooking] = useState(null);
  const [blockedPaidBooking, setBlockedPaidBooking] = useState(null);

  // Drawer state (booking detail + payment history panel)
  const [drawerBookingId, setDrawerBookingId] = useState(null);
  const [receiptModalBooking, setReceiptModalBooking] = useState(null);

  // Toast state
  const [successToast, setSuccessToast] = useState('');
  const [errorToast, setErrorToast] = useState('');

  // ── Toast helpers ────────────────────────────────────────────────────────────

  const showSuccess = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4500);
  };

  const showError = (msg) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(''), 5000);
  };

  // ── Payment collection ───────────────────────────────────────────────────────

  const handleCollectPayment = async (paymentData) => {
    try {
      const result = await createPayment(paymentData);
      showSuccess(
        `Payment of ₹${Number(paymentData.amount).toLocaleString('en-IN')} via ${paymentData.paymentMethod} recorded successfully.`
      );
      return result;
    } catch (err) {
      showError(err.message || 'Failed to record payment.');
      throw err; // Re-throw so PaymentModal shows the error
    }
  };

  // ── Filtering ────────────────────────────────────────────────────────────────

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Status tab filter
      if (activeStatusTab !== 'all') {
        if ((b.bookingStatus || '').toLowerCase() !== activeStatusTab) return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (b.id || '').toLowerCase().includes(q) ||
          (b.customerName || '').toLowerCase().includes(q) ||
          (b.phoneNumber || '').toLowerCase().includes(q) ||
          (b.occasion || '').toLowerCase().includes(q) ||
          (b.eventDate || '').includes(q)
        );
      }
      return true;
    });
  }, [bookings, activeStatusTab, searchQuery]);

  // ── Tab counts ──────────────────────────────────────────────────────────────

  const countByStatus = useMemo(() => {
    const counts = { all: bookings.length, tentative: 0, confirmed: 0, completed: 0, cancelled: 0 };
    bookings.forEach((b) => {
      const s = (b.bookingStatus || '').toLowerCase();
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [bookings]);

  // ── Action handlers ──────────────────────────────────────────────────────────

  const handleOpenCreate = () => {
    setEditingBooking(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (booking) => {
    setEditingBooking(booking);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingBooking(null);
  };

  const handleSaveBooking = async (formData) => {
    if (editingBooking) {
      await updateBooking(editingBooking.id, formData);
      showSuccess(`Booking for "${formData.customerName}" updated successfully.`);
    } else {
      const created = await createBooking(formData);
      showSuccess(`Booking #${created.id.slice(0, 8)}… for "${created.customerName}" created successfully.`);
    }
  };

  const handleDeleteClick = async (booking) => {
    if (!booking) return;

    // 1. Fast check: if in-memory totalPaid > 0, payments definitely exist
    if (Number(booking.totalPaid) > 0) {
      setBlockedPaidBooking(booking);
      return;
    }

    // 2. Query check: check if any payment documents (Completed or Voided) exist in Firestore
    try {
      const existingPayments = await getPaymentsByBookingId(booking.id);
      if (existingPayments && existingPayments.length > 0) {
        setBlockedPaidBooking(booking);
        return;
      }
    } catch (err) {
      console.error('Could not verify payment documents before deletion:', err);
      showError('Unable to verify payment history. Please try again.');
      return;
    }

    // 3. Unpaid booking with zero payment records: open standard Delete confirmation dialog
    setDeletingBooking(booking);
  };

  const handleConfirmCancellation = async (booking) => {
    if (!booking) return;
    try {
      await cancelBooking(booking.id, 'Booking cancelled by management');
      showSuccess(`Booking for "${booking.customerName}" cancelled and associated payment receipts voided.`);
    } catch (err) {
      showError(err.message || 'Failed to cancel booking and void payment receipts.');
    } finally {
      setBlockedPaidBooking(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingBooking) return;
    try {
      await deleteBooking(deletingBooking.id);
      showSuccess(`Booking for "${deletingBooking.customerName}" deleted.`);
    } catch (err) {
      showError(err.message || 'Failed to delete booking.');
    } finally {
      setDeletingBooking(null);
    }
  };

  const handleExport = () => {
    exportBookingsCSV(filteredBookings);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="view-container animate-fade-in">

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

      {/* Header bar */}
      <div className="view-header-bar">
        <div className="view-header-title-group">
          <h2 className="view-heading">Bookings & Reservations</h2>
          <p className="view-subheading">
            Track confirmed event reservations, pending date holds, and cancellations across Main Hall, Dining, and Lawn.
          </p>
        </div>

        <div className="view-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleExport}
            disabled={filteredBookings.length === 0}
            title={filteredBookings.length === 0 ? 'No bookings to export' : 'Export filtered bookings to CSV'}
          >
            <Download size={15} />
            <span>Export Bookings</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleOpenCreate}
          >
            <Plus size={15} />
            <span>Create Reservation</span>
          </button>
        </div>
      </div>

      {/* Firestore error banner */}
      {error && (
        <div className="bookings-error-banner animate-fade-in">
          <AlertCircle size={17} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter / Search bar */}
      <div className="card view-filter-card">
        <div className="filter-controls-row">
          <div className="filter-tabs">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`filter-tab-btn ${activeStatusTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveStatusTab(tab.id)}
              >
                <span>{tab.label}</span>
                <span className={`badge ${tab.variant} btn-badge-count`}>
                  {countByStatus[tab.id] ?? 0}
                </span>
              </button>
            ))}
          </div>

          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by Booking ID, customer, occasion or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Bookings Table / States */}
      <div className="card view-table-card">
        {isLoading ? (
          <div className="bookings-loading-box">
            <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
            <span>Loading bookings from Firestore...</span>
          </div>
        ) : filteredBookings.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title={
              searchQuery || activeStatusTab !== 'all'
                ? 'No bookings match your filter'
                : 'No Bookings Yet'
            }
            description={
              searchQuery || activeStatusTab !== 'all'
                ? 'Try adjusting your search query or status filter.'
                : 'Create a reservation to start managing your venue schedule, contract amounts, payments, and event dates.'
            }
            tag={searchQuery ? 'Search Filter Active' : undefined}
            actionText={activeStatusTab === 'all' && !searchQuery ? 'Create First Reservation' : undefined}
            onAction={activeStatusTab === 'all' && !searchQuery ? handleOpenCreate : undefined}
          />
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking Ref</th>
                  <th>Client / Organizer</th>
                  <th>Occasion</th>
                  <th>Event Date & Slot</th>
                  <th>Booking Status</th>
                  <th>Financials</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="animate-fade-in">
                    {/* Booking Ref */}
                    <td>
                      <div className="table-id-cell">
                        <span className="enquiry-id-tag" title={booking.id}>
                          #{booking.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className="enquiry-date-sub">
                          {booking.createdAt
                            ? new Date(booking.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </span>
                      </div>
                    </td>

                    {/* Client */}
                    <td>
                      <div className="table-client-cell">
                        <div className="client-name">{booking.customerName}</div>
                        <div className="client-phone">
                          <Phone size={11} />
                          <span>{booking.phoneNumber}</span>
                        </div>
                        {booking.estimatedGuests && (
                          <div className="client-phone" style={{ marginTop: '2px' }}>
                            <Users size={11} />
                            <span>{booking.estimatedGuests} guests</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Occasion */}
                    <td>
                      <div className="table-occasion-cell">
                        <span className="occasion-title">{booking.occasion}</span>
                        {booking.enquiryId && (
                          <span
                            className="notes-preview-btn"
                            title={`Linked enquiry: ${booking.enquiryId}`}
                          >
                            Linked Enquiry
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Event Date & Slot */}
                    <td>
                      <div className="table-target-date-cell">
                        <div className="target-date-val">
                          <Calendar size={12} />
                          <span>{formatEventDate(booking.eventDate)}</span>
                        </div>
                        <div className="target-slot-sub">{getShortSlot(booking.timeSlot)}</div>
                      </div>
                    </td>

                    {/* Booking Status */}
                    <td>
                      <span className={`badge ${getBookingStatusVariant(booking.bookingStatus)}`}>
                        {booking.bookingStatus || '—'}
                      </span>
                    </td>

                    {/* Financials */}
                    <td>
                      <div className="payment-status-cell">
                        <span className="payment-amount-main">{formatINR(booking.totalAmount)}</span>
                        <span className="payment-balance-sub">
                          Paid: {formatINR(booking.totalPaid)} · Due: {formatINR(booking.balanceAmount)}
                        </span>
                        <span className={`badge ${getPaymentStatusVariant(booking.paymentStatus)}`} style={{ marginTop: '4px' }}>
                          {booking.paymentStatus || 'Pending'}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="table-row-actions">
                        <button
                          type="button"
                          className="table-action-icon-btn status-btn"
                          onClick={() => setReceiptModalBooking(booking)}
                          title="Print official booking confirmation & receipt"
                          aria-label={`Print confirmation for ${booking.customerName}`}
                        >
                          <Printer size={15} style={{ color: 'var(--brand-gold)' }} />
                        </button>
                        <button
                          type="button"
                          className="table-action-icon-btn status-btn"
                          onClick={() => setDrawerBookingId(booking.id)}
                          title="View payments & collect payment"
                          aria-label={`Payments for ${booking.customerName}`}
                        >
                          <CreditCard size={15} />
                        </button>
                        <button
                          type="button"
                          className="table-action-icon-btn edit-btn"
                          onClick={() => handleOpenEdit(booking)}
                          title="Edit booking"
                          aria-label={`Edit booking for ${booking.customerName}`}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="table-action-icon-btn delete-btn"
                          onClick={() => handleDeleteClick(booking)}
                          title="Delete booking"
                          aria-label={`Delete booking for ${booking.customerName}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <BookingModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSaveBooking}
        existingBooking={editingBooking}
      />

      {/* Booking Confirmation / Receipt Modal */}
      {receiptModalBooking && (
        <BookingReceiptModal
          isOpen={Boolean(receiptModalBooking)}
          onClose={() => setReceiptModalBooking(null)}
          booking={receiptModalBooking}
        />
      )}

      {/* Delete Confirm Dialog */}
      {deletingBooking && (
        <DeleteConfirmDialog
          booking={deletingBooking}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingBooking(null)}
        />
      )}

      {/* Cancel Paid Booking Confirm Dialog */}
      {blockedPaidBooking && (
        <CancelPaidBookingConfirmDialog
          booking={blockedPaidBooking}
          onConfirmCancellation={handleConfirmCancellation}
          onCancel={() => setBlockedPaidBooking(null)}
        />
      )}

      {/* Booking Detail Drawer (payment summary + history + collect payment) */}
      {drawerBookingId && (() => {
        // Look up live booking from context so financial totals stay real-time
        const drawerBooking = bookings.find((b) => b.id === drawerBookingId) || null;
        if (!drawerBooking) return null;
        return (
          <BookingDetailDrawer
            booking={drawerBooking}
            onClose={() => setDrawerBookingId(null)}
            onCollectPayment={handleCollectPayment}
            showSuccess={showSuccess}
            showError={showError}
          />
        );
      })()}
    </div>
  );
}
