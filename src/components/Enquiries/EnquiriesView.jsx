import React, { useState } from 'react';
import { 
  MessageSquareText, 
  Search, 
  Plus, 
  Download, 
  Trash2,
  Calendar,
  Phone,
  User,
  Users,
  Sparkles,
  CheckCircle2,
  Clock,
  Eye,
  FileText
} from 'lucide-react';
import { useEnquiries } from '../../context/EnquiriesContext';
import EnquiryModal from './EnquiryModal';
import EmptyState from '../Common/EmptyState';
import './Views.css';
export default function EnquiriesView() {
  const { enquiries, addEnquiry, deleteEnquiry, updateEnquiryStatus, isLoading, error } = useEnquiries();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [errorToast, setErrorToast] = useState('');
  const [selectedNoteEnquiry, setSelectedNoteEnquiry] = useState(null);

  const handleSaveEnquiry = async (enquiryData) => {
    try {
      const created = await addEnquiry(enquiryData);
      setSuccessToast(`Enquiry #${created.id} for "${created.customerName}" successfully saved to Firestore.`);
      setTimeout(() => {
        setSuccessToast('');
      }, 4500);
    } catch (err) {
      setErrorToast(err.message || 'Failed to save enquiry to Firestore.');
      setTimeout(() => {
        setErrorToast('');
      }, 5000);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateEnquiryStatus(id, newStatus);
      setSuccessToast(`Enquiry #${id} status updated to "${newStatus}".`);
      setTimeout(() => {
        setSuccessToast('');
      }, 3500);
    } catch (err) {
      setErrorToast(err.message || 'Failed to update enquiry status.');
      setTimeout(() => {
        setErrorToast('');
      }, 5000);
    }
  };

  // Filter calculations
  const filteredEnquiries = enquiries.filter((item) => {
    const matchesFilter = 
      activeFilter === 'all' 
        ? true 
        : (item.status || '').toLowerCase() === activeFilter.toLowerCase();

    if (!matchesFilter) return false;

    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    return (
      (item.customerName || '').toLowerCase().includes(q) ||
      (item.phoneNumber || '').toLowerCase().includes(q) ||
      (item.occasion || '').toLowerCase().includes(q) ||
      (item.id || '').toLowerCase().includes(q)
    );
  });

  const countNew = enquiries.filter((e) => (e.status || '').toLowerCase() === 'new').length;
  const countContacted = enquiries.filter((e) => (e.status || '').toLowerCase() === 'contacted').length;
  const countQuoted = enquiries.filter((e) => (e.status || '').toLowerCase() === 'quoted').length;
  const countConverted = enquiries.filter((e) => (e.status || '').toLowerCase() === 'converted').length;
  const countCancelled = enquiries.filter((e) => (e.status || '').toLowerCase() === 'cancelled').length;

  const handleExportCSV = () => {
    if (enquiries.length === 0) return;
    const headers = ['ID,Customer Name,Phone Number,Occasion,Target Date,Time Slot,Estimated Guests,Status,Created Date,Notes'];
    const rows = enquiries.map((e) => 
      `"${e.id}","${e.customerName}","${e.phoneNumber}","${e.occasion}","${e.targetDate}","${e.timeSlot}","${e.estimatedGuests || ''}","${e.status}","${new Date(e.createdAt).toLocaleDateString()}","${(e.notes || '').replace(/"/g, '""')}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VLNS_Gardens_Enquiries_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="view-container animate-fade-in">
      {/* Toast Notification */}
      {successToast && (
        <div className="enquiry-toast animate-fade-in">
          <CheckCircle2 size={18} className="toast-icon" />
          <span>{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="enquiry-toast enquiry-toast-error animate-fade-in">
          <span className="toast-icon" style={{ color: '#fb7185' }}>⚠</span>
          <span>{errorToast}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="view-header-bar">
        <div className="view-header-title-group">
          <h2 className="view-heading">Customer Inquiries</h2>
          <p className="view-subheading">
            Manage inquiries submitted via the customer booking portal, phone calls, and walk-ins.
          </p>
        </div>

        <div className="view-header-actions">
          <button 
            type="button" 
            className="btn btn-secondary btn-sm" 
            onClick={handleExportCSV}
            disabled={enquiries.length === 0}
            title={enquiries.length === 0 ? 'No enquiries to export' : 'Export enquiries to CSV'}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          
          {/* Manual Entry Button */}
          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            onClick={() => setIsModalOpen(true)}
            id="manual-entry-btn"
          >
            <Plus size={16} />
            <span>Manual Entry</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="card view-filter-card">
        <div className="filter-controls-row">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by customer name, phone, event, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-tabs">
            {[
              { id: 'all', label: `All Inquiries (${enquiries.length})` },
              { id: 'new', label: `New (${countNew})`, variant: 'badge-new' },
              { id: 'contacted', label: `Contacted (${countContacted})` },
              { id: 'quoted', label: `Quoted (${countQuoted})` },
              { id: 'converted', label: `Converted (${countConverted})` },
              { id: 'cancelled', label: `Cancelled (${countCancelled})` }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`filter-tab-btn ${activeFilter === tab.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inquiries Table or Empty State */}
      <div className="card view-table-card">
        {filteredEnquiries.length > 0 ? (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Enquiry ID & Date</th>
                  <th>Client Details</th>
                  <th>Occasion / Event</th>
                  <th>Target Date & Slot</th>
                  <th>Est. Guests</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnquiries.map((enq) => (
                  <tr key={enq.id} className="animate-fade-in">
                    <td>
                      <div className="table-id-cell">
                        <span className="enquiry-id-tag">{enq.id}</span>
                        <span className="enquiry-date-sub">
                          {new Date(enq.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="table-client-cell">
                        <div className="client-name">{enq.customerName}</div>
                        <div className="client-phone">
                          <Phone size={12} />
                          <span>{enq.phoneNumber}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="table-occasion-cell">
                        <span className="occasion-title">{enq.occasion}</span>
                        {enq.notes && (
                          <button
                            type="button"
                            className="notes-preview-btn"
                            onClick={() => setSelectedNoteEnquiry(enq)}
                            title="View customer notes"
                          >
                            <FileText size={12} />
                            <span>Notes</span>
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="table-target-date-cell">
                        <div className="target-date-val">
                          <Calendar size={13} />
                          <span>
                            {new Date(enq.targetDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="target-slot-sub">{enq.timeSlot}</div>
                      </div>
                    </td>
                    <td>
                      <div className="table-guests-cell">
                        {enq.estimatedGuests ? (
                          <span className="guest-badge">
                            <Users size={12} />
                            {enq.estimatedGuests}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="status-select-wrapper">
                        <select
                          className={`status-select-badge status-select-${(enq.status || 'new').toLowerCase()}`}
                          value={enq.status || 'New'}
                          onChange={(e) => handleStatusChange(enq.id, e.target.value)}
                          title="Click to update enquiry status"
                          aria-label={`Status for enquiry ${enq.id}`}
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Quoted">Quoted</option>
                          <option value="Converted">Converted</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </td>
                    <td>
                      <div className="table-row-actions">
                        <button
                          type="button"
                          className="table-action-icon-btn delete-btn"
                          onClick={() => deleteEnquiry(enq.id)}
                          title="Delete Enquiry"
                          aria-label={`Delete enquiry ${enq.id}`}
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
        ) : (
          <EmptyState
            icon={MessageSquareText}
            title={
              searchQuery || activeFilter !== 'all' 
                ? "No matching enquiries found" 
                : "No Inquiries Recorded Yet"
            }
            description={
              searchQuery || activeFilter !== 'all'
                ? "Try adjusting your search query or filter selection."
                : "Inquiries submitted by customers or manually added using the 'Manual Entry' button will appear here with complete contact details and event preferences."
            }
            actionText="Record First Enquiry"
            onAction={() => setIsModalOpen(true)}
            tag={searchQuery ? 'Search Filter Active' : 'Phase 1: Manual Entry Ready'}
          />
        )}
      </div>

      {/* Manual Entry Modal */}
      <EnquiryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEnquiry}
      />

      {/* Notes Inspection Modal */}
      {selectedNoteEnquiry && (
        <div className="modal-overlay animate-fade-in" onClick={() => setSelectedNoteEnquiry(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-info">
                <span className="badge badge-gold">{selectedNoteEnquiry.id}</span>
                <h3 className="modal-title" style={{ marginTop: '6px' }}>Enquiry Notes</h3>
                <p className="modal-subtitle">Customer: {selectedNoteEnquiry.customerName}</p>
              </div>
            </div>
            <div className="notes-modal-body">
              <p className="notes-text-display">{selectedNoteEnquiry.notes}</p>
            </div>
            <div className="modal-actions-footer">
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedNoteEnquiry(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
