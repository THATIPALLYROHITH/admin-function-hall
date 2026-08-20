import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Menu, 
  LogOut, 
  UserCircle, 
  Bell, 
  RefreshCw,
  Calendar,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import './Header.css';

const TAB_TITLES = {
  dashboard: { title: 'Owner Dashboard', subtitle: 'Overview of enquiries, hall reservations, and venue status' },
  enquiries: { title: 'Enquiries Manager', subtitle: 'Customer enquiries submitted for weddings, receptions & events' },
  bookings: { title: 'Bookings & Reservations', subtitle: 'Track pending, confirmed, and cancelled event slots' },
  accounts: { title: 'Accounts & Finance', subtitle: 'Live revenue, operational expenses, net profit, and receivables' },
  calendar: { title: 'Hall Availability Calendar', subtitle: 'Interactive view of booked dates, slots and maintenance schedules' },
  customers: { title: 'Customer Directory', subtitle: 'Customer contact records, event history, and organizers' },
  settings: { title: 'Venue & Admin Settings', subtitle: 'Hall slot pricing, venue timing, and system configuration' },
};

export default function Header({ activeTab, onOpenMobileMenu }) {
  const { currentUser, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeMeta = TAB_TITLES[activeTab] || TAB_TITLES.dashboard;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  };

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="admin-header">
      <div className="header-left">
        <button
          type="button"
          className="header-mobile-toggle"
          onClick={onOpenMobileMenu}
          aria-label="Open mobile menu"
        >
          <Menu size={22} />
        </button>

        <div className="header-title-wrapper">
          <div className="header-breadcrumbs">
            <span className="breadcrumb-root">VLNS Gardens</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">{activeMeta.title}</span>
          </div>
          <h1 className="header-title">{activeMeta.title}</h1>
        </div>
      </div>

      <div className="header-right">
        {/* Date Display */}
        <div className="header-date-badge">
          <Calendar size={14} className="header-date-icon" />
          <span>{currentDateFormatted}</span>
        </div>

        {/* Refresh Action */}
        <button 
          type="button" 
          className={`btn-ghost header-action-btn ${isRefreshing ? 'is-spinning' : ''}`}
          onClick={handleRefresh}
          title="Refresh Dashboard"
          aria-label="Refresh Dashboard Data"
        >
          <RefreshCw size={17} />
        </button>

        {/* Notifications Trigger */}
        <div className="header-notif-wrapper">
          <button 
            type="button" 
            className="btn-ghost header-action-btn"
            title="System Notifications"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="notif-dot"></span>
          </button>
        </div>

        {/* User / Owner Profile Menu */}
        <div className="header-user-wrapper">
          <div 
            className="header-user-badge"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          >
            <div className="user-avatar">
              <UserCircle size={28} className="user-avatar-icon" />
            </div>
            <div className="user-details">
              <span className="user-name">Owner / Admin</span>
              <span className="user-role">VLNS Gardens</span>
            </div>
          </div>

          {/* User Dropdown / Logout Button */}
          {isUserMenuOpen && (
            <>
              <div 
                className="user-dropdown-backdrop" 
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div className="user-dropdown animate-fade-in">
                <div className="user-dropdown-header">
                  <div className="dropdown-user-name">Logged in as Administrator</div>
                  <div className="dropdown-user-meta">VLNS Gardens Owner Portal</div>
                </div>
                
                <div className="user-dropdown-divider"></div>

                <div className="dropdown-session-info">
                  <div className="session-item">
                    <span>Account:</span>
                    <strong>{currentUser?.email || 'Administrator'}</strong>
                  </div>
                  <div className="session-item">
                    <span>Role:</span>
                    <span>{currentUser?.role || 'Administrator / Owner'}</span>
                  </div>
                </div>

                <div className="user-dropdown-divider"></div>

                <button
                  type="button"
                  className="dropdown-logout-btn"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                >
                  <LogOut size={16} />
                  <span>Logout from Session</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Direct quick Logout button on desktop for fastest access */}
        <button
          type="button"
          className="btn btn-outline btn-sm header-quick-logout"
          onClick={logout}
          title="Sign out of the admin panel"
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
