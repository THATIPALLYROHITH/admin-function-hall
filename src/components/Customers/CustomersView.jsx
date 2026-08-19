import React from 'react';
import { Users, Search, Plus, Download, Sparkles, UserCheck } from 'lucide-react';
import EmptyState from '../Common/EmptyState';
import './Views.css';

export default function CustomersView() {
  return (
    <div className="view-container animate-fade-in">
      <div className="view-header-bar">
        <div className="view-header-title-group">
          <h2 className="view-heading">Customer Directory</h2>
          <p className="view-subheading">
            Organized contact directory of event hosts, wedding planners, and corporate clients.
          </p>
        </div>

        <div className="view-header-actions">
          <button type="button" className="btn btn-secondary btn-sm" disabled>
            <Download size={15} />
            <span>Export Contacts</span>
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled>
            <Plus size={15} />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      <div className="card view-filter-card">
        <div className="filter-controls-row">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search customers by name, phone number, or past event..."
              disabled
            />
          </div>
          <div className="filter-badge-summary">
            <span className="badge badge-gold">Total Registered Clients: 0</span>
          </div>
        </div>
      </div>

      <div className="card view-table-card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Full Name</th>
                <th>Phone Number</th>
                <th>Email Address</th>
                <th>Total Bookings</th>
                <th>Last Event Date</th>
                <th>Actions</th>
              </tr>
            </thead>
          </table>
        </div>

        <EmptyState
          icon={Users}
          title="Customer Directory is Empty"
          description="Customer profiles will be automatically created whenever a new booking or inquiry is confirmed."
          tag="Phase 1: No Customer Records Yet"
        />
      </div>
    </div>
  );
}
