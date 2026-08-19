import React from 'react';
import { 
  Settings, 
  Building, 
  Clock, 
  ShieldCheck, 
  Key, 
  Database, 
  Smartphone, 
  Save,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Cloud,
  Check
} from 'lucide-react';
import { isFirebaseConfigured, firebaseConfig } from '../../firebase/config';
import './Views.css';
import './SettingsView.css';

export default function SettingsView() {
  return (
    <div className="view-container animate-fade-in">
      <div className="view-header-bar">
        <div className="view-header-title-group">
          <h2 className="view-heading">Settings & Configuration</h2>
          <p className="view-subheading">
            Manage venue specifications, booking slot timings, and Firebase database integration parameters.
          </p>
        </div>

        <div className="view-header-actions">
          <button type="button" className="btn btn-primary btn-sm" disabled>
            <Save size={15} />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      <div className="settings-grid">
        {/* Venue Information Section */}
        <div className="card settings-card">
          <div className="card-header">
            <div className="card-title">
              <Building size={18} className="section-title-icon text-gold" />
              <span>Venue Profile</span>
            </div>
            <span className="badge badge-gold">Active Profile</span>
          </div>

          <div className="settings-form-content">
            <div className="form-group">
              <label className="form-label">Venue / Hall Name</label>
              <input type="text" defaultValue="VLNS Gardens" readOnly />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Venue Category</label>
                <input type="text" defaultValue="Convention Hall & Open Lawn" readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Maximum Guest Capacity</label>
                <input type="text" defaultValue="2,000+ Guests" readOnly />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Dining Capacity</label>
                <input type="text" defaultValue="600+ Seated" readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Dedicated Parking</label>
                <input type="text" defaultValue="250+ Vehicles" readOnly />
              </div>
            </div>
          </div>
        </div>

        {/* Firebase Cloud Firestore Database Status */}
        <div className="card settings-card">
          <div className="card-header">
            <div className="card-title">
              <Cloud size={18} className="section-title-icon text-new" />
              <span>Firebase Cloud Firestore</span>
            </div>
            <span className={`badge ${isFirebaseConfigured ? 'badge-confirmed' : 'badge-gold'}`}>
              {isFirebaseConfigured ? 'Connected to Cloud Firestore' : 'Firestore Adapter Ready'}
            </span>
          </div>

          <div className="settings-form-content">
            <div className="form-group">
              <label className="form-label">Target Firestore Collection</label>
              <input type="text" value="enquiries" readOnly style={{ fontFamily: 'var(--font-mono)' }} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Project ID</label>
                <input 
                  type="text" 
                  value={firebaseConfig.projectId || 'vlns-gardens (via .env)'} 
                  readOnly 
                  style={{ fontFamily: 'var(--font-mono)' }} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Real-time Listener</label>
                <input 
                  type="text" 
                  value="Active (onSnapshot)" 
                  readOnly 
                />
              </div>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: '4px' }}>
              💡 Configuration is managed securely via <code style={{ color: 'var(--brand-gold-light)' }}>.env</code>. Manual entries and future customer website submissions sync through this Firestore service layer.
            </div>
          </div>
        </div>

        {/* Slot Timings & Operations */}
        <div className="card settings-card">
          <div className="card-header">
            <div className="card-title">
              <Clock size={18} className="section-title-icon text-event" />
              <span>Operating Slot Timings</span>
            </div>
            <span className="badge badge-event">2 Standard Slots</span>
          </div>

          <div className="settings-form-content">
            <div className="slot-timing-item">
              <div className="slot-timing-header">
                <strong>Morning Function Slot</strong>
                <span className="badge badge-pending">Slot A</span>
              </div>
              <div className="slot-timing-hours">07:00 AM – 02:00 PM (7 Hours)</div>
              <p className="slot-timing-desc">Typically used for Muhurtham, Poojas, and Morning Receptions.</p>
            </div>

            <div className="slot-timing-item">
              <div className="slot-timing-header">
                <strong>Evening Function Slot</strong>
                <span className="badge badge-confirmed">Slot B</span>
              </div>
              <div className="slot-timing-hours">04:00 PM – 11:00 PM (7 Hours)</div>
              <p className="slot-timing-desc">Typically used for Grand Receptions, Sangeet, and Dinners.</p>
            </div>
          </div>
        </div>

        {/* Integration Roadmap Status */}
        <div className="card settings-card">
          <div className="card-header">
            <div className="card-title">
              <Database size={18} className="section-title-icon text-new" />
              <span>Backend & Integration Roadmap</span>
            </div>
            <span className="badge badge-new">Phase 2 Enabled</span>
          </div>

          <div className="roadmap-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="roadmap-item completed">
              <div className="roadmap-icon">
                <CheckCircle2 size={18} />
              </div>
              <div className="roadmap-content">
                <div className="roadmap-title">Phase 1 & 2: Cloud Firestore Database & Enquiries Pipeline</div>
                <div className="roadmap-desc">
                  Firestore collection <code style={{ color: 'var(--brand-gold-light)' }}>"enquiries"</code> integrated with real-time subscription, CRUD operations, and persistent session recovery.
                </div>
              </div>
            </div>

            <div className="roadmap-item pending">
              <div className="roadmap-icon">
                <Smartphone size={18} />
              </div>
              <div className="roadmap-content">
                <div className="roadmap-title">Phase 3: Customer Website Background Ingestion & WhatsApp Webhook</div>
                <div className="roadmap-desc">
                  Enable customer website form to dispatch background Firestore write alongside the existing WhatsApp redirect.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
