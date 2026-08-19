import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  Building2,
  Sparkles
} from 'lucide-react';
import './LoginPage.css';

export default function LoginPage() {
  const { login, authError, setAuthError, isAuthenticating } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setAuthError('Please enter both administrator email and password.');
      return;
    }
    await login(email, password);
  };

  return (
    <div className="login-wrapper">
      <div className="login-background-overlay"></div>
      
      <div className="login-card animate-fade-in">
        {/* Brand Header */}
        <div className="login-header">
          <div className="login-logo-container">
            <Building2 className="login-logo-icon" size={28} />
          </div>
          <div className="login-brand-title">
            <span className="login-title-highlight">VLNS</span> GARDENS
          </div>
          <p className="login-subtitle">Owner & Venue Management Portal</p>
          <div className="login-badge">
            <ShieldCheck size={13} />
            <span>Firebase Secure Auth</span>
          </div>
        </div>

        {/* Error Notification */}
        {authError && (
          <div className="login-error-banner animate-fade-in">
            <AlertCircle size={18} className="login-error-icon" />
            <span>{authError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="admin-email">
              Administrator Email
            </label>
            <div className="input-with-icon">
              <span className="input-icon-left">
                <Mail size={18} />
              </span>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (authError) setAuthError('');
                }}
                placeholder="admin@vlnsgardens.com"
                autoComplete="email"
                required
                disabled={isAuthenticating}
              />
            </div>
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label className="form-label" htmlFor="admin-password">
                Password
              </label>
            </div>
            <div className="input-with-icon">
              <span className="input-icon-left">
                <Lock size={18} />
              </span>
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (authError) setAuthError('');
                }}
                placeholder="Enter admin password"
                autoComplete="current-password"
                required
                disabled={isAuthenticating}
              />
              <button
                type="button"
                className="input-action-right"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary login-submit-btn"
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <span className="login-loading-text">
                <span className="spinner"></span> Authenticating with Firebase...
              </span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Security Footer Notice */}
        <div className="login-footer">
          <p className="login-security-notice">
            Authorized administrative personnel only. Authenticated with Firebase Cloud Identity & Access Management.
          </p>
          <div className="login-version-info">
            <span>VLNS Gardens Management</span>
            <span className="version-pill">Firebase Auth v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
