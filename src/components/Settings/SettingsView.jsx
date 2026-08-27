import React, { useState } from 'react';
import {
  Building,
  Clock,
  Sun,
  Moon,
  Receipt,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  getVenueSettings,
  saveVenueSettings,
  resetVenueSettings
} from '../../services/receiptSettingsService';
import BookingReceiptModal from '../Bookings/BookingReceiptModal';
import './Views.css';
import './SettingsView.css';

// Sample reservation data for the template preview modal only
const SAMPLE_PREVIEW_BOOKING = {
  id: 'sample_preview_9999',
  customerName: 'Sample Client',
  phoneNumber: '+91 98765 43210',
  occasion: 'Wedding Ceremony',
  eventDate: '2026-10-20',
  timeSlot: 'Full Day',
  estimatedGuests: 500,
  totalAmount: 150000,
  totalPaid: 150000,
  balanceAmount: 0,
  bookingStatus: 'Confirmed',
  paymentStatus: 'Paid'
};

const SAMPLE_PREVIEW_PAYMENTS = [
  {
    id: 'pay_sample_1',
    amount: 150000,
    paymentDate: '2026-10-20',
    paymentMethod: 'Bank Transfer',
    transactionReference: 'TXN-SAMPLE-9821',
    status: 'Completed'
  }
];

export default function SettingsView() {
  const [venueForm, setVenueForm] = useState(getVenueSettings);
  const [isReceiptPreviewOpen, setIsReceiptPreviewOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  const handleInputChange = (field, value) => {
    setVenueForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveVenueSettings = (e) => {
    e.preventDefault();
    try {
      const saved = saveVenueSettings(venueForm);
      setVenueForm(saved);
      setSaveSuccessMsg('Venue settings saved successfully.');
      setSaveErrorMsg('');
      setTimeout(() => setSaveSuccessMsg(''), 4500);
    } catch (err) {
      setSaveErrorMsg(err.message || 'Failed to save venue settings.');
      setTimeout(() => setSaveErrorMsg(''), 5000);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all venue profile settings to standard defaults?')) {
      const reset = resetVenueSettings();
      setVenueForm(reset);
      setSaveSuccessMsg('Venue settings reset to defaults.');
      setSaveErrorMsg('');
      setTimeout(() => setSaveSuccessMsg(''), 4500);
    }
  };

  return (
    <div className="view-container animate-fade-in">
      <div className="view-header-bar">
        <div className="view-header-title-group">
          <h2 className="view-heading">Venue & Admin Settings</h2>
          <p className="view-subheading">
            Manage your venue information, standard operating hours, and booking receipt details.
          </p>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="settings-toast toast-success animate-fade-in" style={{ marginBottom: '16px' }}>
          <CheckCircle2 size={15} />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {saveErrorMsg && (
        <div className="settings-toast toast-error animate-fade-in" style={{ marginBottom: '16px' }}>
          <AlertCircle size={15} />
          <span>{saveErrorMsg}</span>
        </div>
      )}

      <div className="settings-grid">
        {/* Section 1: Venue Profile */}
        <div className="card settings-card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Building size={17} className="section-title-icon text-gold" />
                <span>Venue Profile</span>
              </div>
              <p className="settings-card-subtitle">
                Basic information about VLNS Gardens.
              </p>
            </div>
            <span className="badge badge-gold">Active Profile</span>
          </div>

          <form className="settings-form-content" onSubmit={handleSaveVenueSettings}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Venue / Hall Name</label>
                <input
                  type="text"
                  value={venueForm.venueName}
                  onChange={(e) => handleInputChange('venueName', e.target.value)}
                  placeholder="e.g. VLNS Gardens"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Venue Category</label>
                <input
                  type="text"
                  value={venueForm.venueCategory}
                  onChange={(e) => handleInputChange('venueCategory', e.target.value)}
                  placeholder="e.g. Convention Hall & Open Lawn"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Maximum Guest Capacity</label>
                <input
                  type="text"
                  value={venueForm.maximumGuestCapacity}
                  onChange={(e) => handleInputChange('maximumGuestCapacity', e.target.value)}
                  placeholder="e.g. 2,000+ Guests"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Dining Capacity</label>
                <input
                  type="text"
                  value={venueForm.diningCapacity}
                  onChange={(e) => handleInputChange('diningCapacity', e.target.value)}
                  placeholder="e.g. 600+ Seated"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Dedicated Parking</label>
                <input
                  type="text"
                  value={venueForm.dedicatedParking}
                  onChange={(e) => handleInputChange('dedicatedParking', e.target.value)}
                  placeholder="e.g. 250+ Vehicles"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input
                  type="text"
                  value={venueForm.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="e.g. +91 91000 05724"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Address / Location</label>
                <input
                  type="text"
                  value={venueForm.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="e.g. H.No: 7-155, Zaffargadh Road, Warangal, Telangana"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email / Gmail</label>
                <input
                  type="email"
                  value={venueForm.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="e.g. vlnsgardens@gmail.com"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Terms & Conditions</label>
              <textarea
                rows={4}
                value={venueForm.termsAndConditions}
                onChange={(e) => handleInputChange('termsAndConditions', e.target.value)}
                className="settings-textarea"
                placeholder="Enter venue guidelines and booking terms (one per line)..."
                required
              />
            </div>

            <div className="settings-actions-row">
              <button type="submit" className="btn btn-primary btn-sm" style={{ gap: '6px' }}>
                <Save size={14} />
                <span>Save Venue Settings</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleResetDefaults}
                style={{ gap: '6px' }}
              >
                <RotateCcw size={14} />
                <span>Reset to Defaults</span>
              </button>
            </div>
          </form>
        </div>

        {/* Section 2: Operating Hours */}
        <div className="card settings-card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Clock size={17} className="section-title-icon text-event" />
                <span>Operating Hours</span>
              </div>
              <p className="settings-card-subtitle">
                Standard function timings used for venue availability and reservations.
              </p>
            </div>
            <span className="badge badge-event">2 Standard Slots</span>
          </div>

          <div className="settings-form-content">
            <div className="slot-timing-item">
              <div className="slot-timing-header">
                <div className="slot-timing-title-wrap">
                  <Sun size={15} style={{ color: '#fbbf24' }} />
                  <strong>Morning Function</strong>
                </div>
                <span className="badge badge-pending">Slot A</span>
              </div>
              <div className="slot-timing-hours-row">
                <span className="slot-timing-hours">07:00 AM — 02:00 PM</span>
                <span className="slot-timing-duration">7 hours</span>
              </div>
              <p className="slot-timing-desc">
                Typically used for Muhurtham, Poojas, and Morning Receptions.
              </p>
            </div>

            <div className="slot-timing-item">
              <div className="slot-timing-header">
                <div className="slot-timing-title-wrap">
                  <Moon size={15} style={{ color: '#60a5fa' }} />
                  <strong>Evening Function</strong>
                </div>
                <span className="badge badge-confirmed">Slot B</span>
              </div>
              <div className="slot-timing-hours-row">
                <span className="slot-timing-hours">04:00 PM — 11:00 PM</span>
                <span className="slot-timing-duration">7 hours</span>
              </div>
              <p className="slot-timing-desc">
                Typically used for Grand Receptions, Sangeet, and Dinners.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar with Receipt Preview Button */}
      <div className="settings-bottom-bar" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setIsReceiptPreviewOpen(true)}
          style={{ gap: '6px' }}
        >
          <Receipt size={15} style={{ color: 'var(--brand-gold)' }} />
          <span>Receipt Preview</span>
        </button>
      </div>

      {/* Printable Receipt Preview Modal */}
      <BookingReceiptModal
        isOpen={isReceiptPreviewOpen}
        onClose={() => setIsReceiptPreviewOpen(false)}
        booking={SAMPLE_PREVIEW_BOOKING}
        payments={SAMPLE_PREVIEW_PAYMENTS}
        isPreview={true}
      />
    </div>
  );
}
