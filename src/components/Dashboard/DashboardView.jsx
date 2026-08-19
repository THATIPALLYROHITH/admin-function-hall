import React, { useState } from 'react';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  CalendarCheck2, 
  Building, 
  Users, 
  Car, 
  Utensils, 
  Search, 
  Filter, 
  PlusCircle, 
  Sparkles, 
  ArrowRight,
  Info,
  Calendar,
  Layers,
  Phone
} from 'lucide-react';
import { useEnquiries } from '../../context/EnquiriesContext';
import StatCard from './StatCard';
import EmptyState from '../Common/EmptyState';
import './DashboardView.css';

export default function DashboardView({ onNavigate }) {
  const { enquiries } = useEnquiries();
  const [selectedEnquiryCategory, setSelectedEnquiryCategory] = useState('all');

  const newEnquiriesCount = enquiries.filter((e) => e.status.toLowerCase() === 'new').length;

  const filteredFeedEnquiries = enquiries.filter((item) => {
    if (selectedEnquiryCategory === 'all') return true;
    return item.occasion.toLowerCase().includes(selectedEnquiryCategory.toLowerCase());
  });

  return (
    <div className="dashboard-container animate-fade-in">
      {/* Welcome Banner */}
      <div className="dashboard-welcome-card">
        <div className="welcome-content">
          <div className="welcome-badge">
            <Sparkles size={13} />
            <span>VLNS Gardens Owner Portal • Phase 1</span>
          </div>
          <h2 className="welcome-title">Welcome back, Administrator</h2>
          <p className="welcome-desc">
            This dashboard monitors incoming customer enquiries, banquet reservations, event calendar schedules, and customer contacts.
          </p>
        </div>
        <div className="welcome-venue-tag">
          <Building size={16} />
          <span>Convention & Lawn Management</span>
        </div>
      </div>

      {/* 5 Required Core Metric Summary Cards */}
      <div className="stat-cards-grid">
        <StatCard
          title="New Enquiries"
          count={newEnquiriesCount}
          icon={MessageSquare}
          variant="new"
          badgeText="Real-time"
          subtitle="Inquiries awaiting owner response"
          onClick={() => onNavigate('enquiries')}
        />
        <StatCard
          title="Pending Bookings"
          count={0}
          icon={Clock}
          variant="pending"
          badgeText="In Review"
          subtitle="Provisional date holds & quotes"
          onClick={() => onNavigate('bookings')}
        />
        <StatCard
          title="Confirmed Bookings"
          count={0}
          icon={CheckCircle2}
          variant="confirmed"
          badgeText="Approved"
          subtitle="Advance paid & dates locked"
          onClick={() => onNavigate('bookings')}
        />
        <StatCard
          title="Cancelled Bookings"
          count={0}
          icon={XCircle}
          variant="cancelled"
          badgeText="Archived"
          subtitle="Released dates & cancellations"
          onClick={() => onNavigate('bookings')}
        />
        <StatCard
          title="Upcoming Events"
          count={0}
          icon={CalendarCheck2}
          variant="event"
          badgeText="Scheduled"
          subtitle="Functions planned for this month"
          onClick={() => onNavigate('calendar')}
        />
      </div>

      {/* Main Grid: Recent Enquiries Shell & Hall Slot Schedule */}
      <div className="dashboard-sections-grid">
        {/* Left Column: New Enquiries Placeholder Section */}
        <div className="card dashboard-main-col">
          <div className="card-header">
            <div className="card-title">
              <MessageSquare size={18} className="section-title-icon text-new" />
              <span>Recent Inquiries Feed ({filteredFeedEnquiries.length})</span>
            </div>
            <button 
              type="button" 
              className="btn btn-ghost btn-sm"
              onClick={() => onNavigate('enquiries')}
            >
              <span>Manage Inquiries</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="table-filter-bar">
            <div className="filter-pill-group">
              {['all', 'wedding', 'reception', 'engagement', 'birthday', 'corporate'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`filter-pill ${selectedEnquiryCategory === cat ? 'filter-pill-active' : ''}`}
                  onClick={() => setSelectedEnquiryCategory(cat)}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {filteredFeedEnquiries.length > 0 ? (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Enquiry ID</th>
                    <th>Customer Name</th>
                    <th>Event Type</th>
                    <th>Requested Date</th>
                    <th>Time Slot</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeedEnquiries.slice(0, 5).map((enq) => (
                    <tr key={enq.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--brand-gold-light)' }}>
                        {enq.id}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{enq.customerName}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{enq.phoneNumber}</div>
                      </td>
                      <td>{enq.occasion}</td>
                      <td>
                        {new Date(enq.targetDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td style={{ fontSize: '12px' }}>{enq.timeSlot}</td>
                      <td>
                        <span className="badge badge-new">{enq.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="No New Enquiries in Queue"
              description="When prospective clients submit enquiry forms from the customer website or through manual entry, they will appear here in real-time."
              tag="Phase 1: Real-time Queue Active"
              actionText="Add Manual Enquiry"
              onAction={() => onNavigate('enquiries')}
            />
          )}
        </div>

        {/* Right Column: Upcoming Events & Hall Capacity Cards */}
        <div className="dashboard-side-col">
          {/* Upcoming Events Section */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <CalendarCheck2 size={18} className="section-title-icon text-event" />
                <span>Upcoming Events</span>
              </div>
              <button 
                type="button" 
                className="btn btn-ghost btn-sm"
                onClick={() => onNavigate('calendar')}
              >
                <span>Calendar</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <EmptyState
              icon={Calendar}
              title="No Upcoming Events Scheduled"
              description="Confirmed hall reservations and scheduled ceremonies will appear here with timing slots and guest count estimates."
              tag="Syncs with Calendar module"
            />
          </div>

          {/* Venue Specification Reference Card */}
          <div className="card venue-spec-card">
            <div className="card-header">
              <div className="card-title">
                <Building size={18} className="section-title-icon text-gold" />
                <span>VLNS Gardens Overview</span>
              </div>
              <span className="badge badge-gold">Active Venue</span>
            </div>

            <div className="venue-spec-grid">
              <div className="venue-spec-item">
                <div className="venue-spec-icon-box">
                  <Building size={16} />
                </div>
                <div className="venue-spec-content">
                  <div className="spec-label">Main Convention Hall</div>
                  <div className="spec-val">1,500+ Guest Capacity (Central AC)</div>
                </div>
              </div>

              <div className="venue-spec-item">
                <div className="venue-spec-icon-box">
                  <Utensils size={16} />
                </div>
                <div className="venue-spec-content">
                  <div className="spec-label">Grand Dining Hall</div>
                  <div className="spec-val">600+ Seated Dining Space</div>
                </div>
              </div>

              <div className="venue-spec-item">
                <div className="venue-spec-icon-box">
                  <Users size={16} />
                </div>
                <div className="venue-spec-content">
                  <div className="spec-label">Open-Air Party Lawn</div>
                  <div className="spec-val">2,000+ Reception & Stage Area</div>
                </div>
              </div>

              <div className="venue-spec-item">
                <div className="venue-spec-icon-box">
                  <Car size={16} />
                </div>
                <div className="venue-spec-content">
                  <div className="spec-label">Dedicated Parking</div>
                  <div className="spec-val">250+ Cars with Valet Support</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
