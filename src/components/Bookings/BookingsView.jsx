import React, { useState } from 'react';
import { 
  CalendarCheck, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Building,
  Sparkles
} from 'lucide-react';
import EmptyState from '../Common/EmptyState';
import './Views.css';

export default function BookingsView() {
  const [activeStatusTab, setActiveStatusTab] = useState('all');

  return (
    <div className="view-container animate-fade-in">
      {/* Header bar */}
      <div className="view-header-bar">
        <div className="view-header-title-group">
          <h2 className="view-heading">Bookings & Reservations</h2>
          <p className="view-subheading">
            Track confirmed event reservations, pending date holds, and cancellations across Main Hall, Dining, and Lawn.
          </p>
        </div>

        <div className="view-header-actions">
          <button type="button" className="btn btn-secondary btn-sm" disabled>
            <Download size={15} />
            <span>Export Bookings</span>
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled>
            <Plus size={15} />
            <span>Create Reservation</span>
          </button>
        </div>
      </div>

      {/* Booking Filter Tabs */}
      <div className="card view-filter-card">
        <div className="filter-controls-row">
          <div className="filter-tabs">
            {[
              { id: 'all', label: 'All Bookings', count: 0 },
              { id: 'pending', label: 'Pending Holds', count: 0, variant: 'badge-pending' },
              { id: 'confirmed', label: 'Confirmed', count: 0, variant: 'badge-confirmed' },
              { id: 'cancelled', label: 'Cancelled', count: 0, variant: 'badge-cancelled' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`filter-tab-btn ${activeStatusTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveStatusTab(tab.id)}
              >
                <span>{tab.label}</span>
                <span className={`badge ${tab.variant || 'badge-gold'} btn-badge-count`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by Booking ID, customer or date..."
              disabled
            />
          </div>
        </div>
      </div>

      {/* Bookings Table Shell */}
      <div className="card view-table-card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking Ref</th>
                <th>Client / Organizer</th>
                <th>Function Type</th>
                <th>Event Date & Slot</th>
                <th>Venue Section</th>
                <th>Advance / Status</th>
                <th>Actions</th>
              </tr>
            </thead>
          </table>
        </div>

        <EmptyState
          icon={CalendarCheck}
          title="No Bookings Recorded"
          description="When hall reservations are registered, provisional holds and confirmed dates will be catalogued here with contract details, advance receipts, and slot allocation."
          tag="Phase 1: Awaiting Booking Engine & Firestore"
        />
      </div>
    </div>
  );
}
