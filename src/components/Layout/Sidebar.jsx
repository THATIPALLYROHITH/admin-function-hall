import React from 'react';
import { 
  LayoutDashboard, 
  MessageSquareText, 
  CalendarDays, 
  CalendarCheck, 
  Wallet,
  Users, 
  Settings, 
  Building2, 
  ChevronRight,
  Shield,
  X
} from 'lucide-react';
import { useEnquiries } from '../../context/EnquiriesContext';
import './Sidebar.css';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isMobileOpen, 
  setIsMobileOpen 
}) {
  const { enquiries } = useEnquiries();
  const newCount = enquiries.filter((e) => e.status.toLowerCase() === 'new').length;

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { 
      id: 'enquiries', 
      label: 'Enquiries', 
      icon: MessageSquareText, 
      badge: newCount > 0 ? `${newCount} New` : null,
      badgeVariant: 'badge-new'
    },
    { id: 'bookings', label: 'Bookings', icon: CalendarCheck, badge: null },
    { id: 'accounts', label: 'Accounts', icon: Wallet, badge: null },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays, badge: null },
    { id: 'customers', label: 'Customers', icon: Users, badge: null },
    { id: 'settings', label: 'Settings', icon: Settings, badge: null },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`admin-sidebar ${isMobileOpen ? 'sidebar-mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">
            <Building2 size={22} />
          </div>
          <div className="sidebar-brand-info">
            <span className="sidebar-brand-name">VLNS GARDENS</span>
            <span className="sidebar-brand-badge">Admin Portal</span>
          </div>
          {isMobileOpen && (
            <button 
              className="sidebar-mobile-close"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Close navigation sidebar"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <div className="sidebar-nav-container">
          <div className="sidebar-nav-label">VENUE MANAGEMENT</div>
          <nav className="sidebar-nav">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                >
                  <div className="nav-item-content">
                    <Icon size={19} className="nav-item-icon" />
                    <span className="nav-item-label">{item.label}</span>
                  </div>
                  <div className="nav-item-trailing">
                    {item.badge && (
                      <span className={`badge ${item.badgeVariant || 'badge-gold'} nav-badge`}>
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight size={15} className="nav-active-indicator" />}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* System & Owner Footer */}
        <div className="sidebar-footer">
          <div className="system-status-card">
            <div className="status-indicator-dot"></div>
            <div className="status-info">
              <span className="status-title">System Status</span>
              <span className="status-desc">Phase 1: Local Admin</span>
            </div>
          </div>
          <div className="venue-meta">
            <Shield size={13} className="venue-shield-icon" />
            <span>VLNS Convention & Lawn</span>
          </div>
        </div>
      </aside>
    </>
  );
}
