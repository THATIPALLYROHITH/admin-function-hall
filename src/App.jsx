import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EnquiriesProvider } from './context/EnquiriesContext';
import LoginPage from './components/Login/LoginPage';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import DashboardView from './components/Dashboard/DashboardView';
import EnquiriesView from './components/Enquiries/EnquiriesView';
import BookingsView from './components/Bookings/BookingsView';
import AccountsDashboardView from './components/Accounts/AccountsDashboardView';
import CalendarView from './components/Calendar/CalendarView';
import CustomersView from './components/Customers/CustomersView';
import SettingsView from './components/Settings/SettingsView';
import './App.css';

function AdminAppContent() {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Show clean loader while Firebase Auth resolves active session
  if (isAuthLoading) {
    return (
      <div className="login-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }}></div>
          <span style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>Verifying Firebase Session...</span>
        </div>
      </div>
    );
  }

  // If user is not authenticated, strictly show login page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Render the selected view
  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={setActiveTab} />;
      case 'enquiries':
        return <EnquiriesView />;
      case 'bookings':
        return <BookingsView />;
      case 'accounts':
        return <AccountsDashboardView />;
      case 'calendar':
        return <CalendarView />;
      case 'customers':
        return <CustomersView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="admin-app-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <div className="admin-main-wrapper">
        <Header
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
        />

        <main className="admin-main-content">
          <div className="admin-content-container">
            {renderActiveView()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <EnquiriesProvider>
        <AdminAppContent />
      </EnquiriesProvider>
    </AuthProvider>
  );
}
