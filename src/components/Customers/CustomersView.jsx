import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Download,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  Eye,
  IndianRupee,
  UserCheck,
  Tag
} from 'lucide-react';
import { useBookings } from '../../context/BookingsContext';
import { useEnquiries } from '../../context/EnquiriesContext';
import CustomerDetailModal from './CustomerDetailModal';
import EmptyState from '../Common/EmptyState';
import './Views.css';

function formatINR(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function normalizePhone(phone = '') {
  return phone.replace(/\D/g, '');
}

export default function CustomersView() {
  const { bookings, isLoading: isLoadingBookings } = useBookings();
  const { enquiries } = useEnquiries();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Aggregate unique customers from live bookings and enquiries
  const customers = useMemo(() => {
    const customerMap = new Map();

    // 1. Process Bookings
    bookings.forEach((b) => {
      const rawPhone = b.phoneNumber?.trim() || '';
      const normPhone = normalizePhone(rawPhone);
      const name = b.customerName?.trim() || 'Unknown Client';

      // Key is normalized phone if valid digits exist, else clean name
      const key = normPhone.length >= 7 ? normPhone : name.toLowerCase();

      if (!customerMap.has(key)) {
        const idSuffix = normPhone.length >= 4 ? normPhone.slice(-6) : Math.abs(key.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)).toString().slice(0, 6);
        customerMap.set(key, {
          id: `CUST-${idSuffix}`,
          name,
          phoneNumber: rawPhone,
          email: '',
          bookings: [],
          enquiries: [],
          totalSpent: 0,
          totalPaid: 0,
          lastEventDate: '',
          occasions: new Set()
        });
      }

      const client = customerMap.get(key);
      client.bookings.push(b);
      client.totalSpent += Number(b.totalAmount) || 0;
      client.totalPaid += Number(b.totalPaid) || 0;

      if (b.occasion) client.occasions.add(b.occasion);
      if (b.eventDate && (!client.lastEventDate || b.eventDate > client.lastEventDate)) {
        client.lastEventDate = b.eventDate;
      }
    });

    // 2. Cross-reference Enquiries for additional email/contact enrichment
    enquiries.forEach((enq) => {
      const rawPhone = enq.phoneNumber?.trim() || '';
      const normPhone = normalizePhone(rawPhone);
      const name = enq.customerName?.trim() || '';
      const key = normPhone.length >= 7 ? normPhone : name.toLowerCase();

      if (customerMap.has(key)) {
        const client = customerMap.get(key);
        if (enq.email && !client.email) {
          client.email = enq.email.trim();
        }
        client.enquiries.push(enq);
      }
    });

    // Finalize array with derived metrics
    return Array.from(customerMap.values()).map((client) => ({
      ...client,
      totalBookings: client.bookings.length,
      occasionsList: Array.from(client.occasions),
      clientType: client.bookings.length > 1 ? 'Repeat Host' : 'Event Host'
    })).sort((a, b) => {
      // Sort by lastEventDate descending, then totalBookings descending
      if (a.lastEventDate && b.lastEventDate) {
        return b.lastEventDate.localeCompare(a.lastEventDate);
      }
      return b.totalBookings - a.totalBookings;
    });
  }, [bookings, enquiries]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter((c) => {
      return (
        c.id.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.phoneNumber.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.occasionsList.some(occ => occ.toLowerCase().includes(q))
      );
    });
  }, [customers, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = customers.length;
    const repeatCount = customers.filter(c => c.totalBookings > 1).length;
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    return { total, repeatCount, totalRevenue };
  }, [customers]);

  // Export CSV
  const handleExportCSV = () => {
    if (customers.length === 0) return;

    const headers = [
      'Customer ID',
      'Customer Name',
      'Phone Number',
      'Email Address',
      'Client Type',
      'Total Bookings',
      'Total Contracted (INR)',
      'Total Paid (INR)',
      'Last Event Date',
      'Occasions'
    ];

    const rows = filteredCustomers.map((c) => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phoneNumber}"`,
      `"${c.email}"`,
      c.clientType,
      c.totalBookings,
      c.totalSpent,
      c.totalPaid,
      c.lastEventDate || '',
      `"${c.occasionsList.join(', ')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `VLNS_Customers_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="view-container animate-fade-in">
      {/* Header Bar */}
      <div className="view-header-bar">
        <div className="view-header-title-group">
          <h2 className="view-heading">Customer Directory</h2>
          <p className="view-subheading">
            Organized contact directory of event hosts, wedding planners, and corporate clients.
          </p>
        </div>

        <div className="view-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleExportCSV}
            disabled={customers.length === 0}
          >
            <Download size={15} />
            <span>Export Contacts ({customers.length})</span>
          </button>
        </div>
      </div>

      {/* Filter and Metric Summary Card */}
      <div className="card view-filter-card">
        <div className="filter-controls-row">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search customers by name, phone number, occasion, or client ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-badge-summary" style={{ display: 'flex', gap: '8px' }}>
            <span className="badge badge-gold">
              Total Clients: {metrics.total}
            </span>
            {metrics.repeatCount > 0 && (
              <span className="badge badge-confirmed">
                Repeat Hosts: {metrics.repeatCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Customers Table Card */}
      <div className="card view-table-card">
        {filteredCustomers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={searchQuery ? 'No Matching Customers' : 'Customer Directory is Empty'}
            description={
              searchQuery
                ? 'No client profile matches your search query. Try clearing the filter.'
                : 'Customer profiles are automatically organized in real-time as reservations and bookings are recorded.'
            }
            tag={searchQuery ? 'Search Filter' : 'Client Ledger'}
          />
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client ID</th>
                  <th>Full Name</th>
                  <th>Phone Number</th>
                  <th>Email Address</th>
                  <th>Total Bookings</th>
                  <th>Last Event Date</th>
                  <th>Total Value</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="animate-fade-in">
                    {/* Client ID & Type */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--brand-gold-light)', fontSize: '12px' }}>
                          {customer.id}
                        </span>
                        <span className={`badge ${customer.totalBookings > 1 ? 'badge-gold' : 'badge-new'}`} style={{ fontSize: '10px', padding: '1px 6px', width: 'fit-content' }}>
                          {customer.clientType}
                        </span>
                      </div>
                    </td>

                    {/* Full Name & Occasions */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '13.5px' }}>
                          {customer.name}
                        </strong>
                        {customer.occasionsList.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {customer.occasionsList.slice(0, 2).map((occ) => (
                              <span key={occ} style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                • {occ}
                              </span>
                            ))}
                            {customer.occasionsList.length > 2 && (
                              <span style={{ fontSize: '10px', color: 'var(--text-disabled)' }}>
                                +{customer.occasionsList.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Phone Number */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                        <span>{customer.phoneNumber || '—'}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {customer.email ? (
                          <>
                            <Mail size={12} style={{ color: 'var(--text-muted)' }} />
                            <span>{customer.email}</span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-disabled)' }}>—</span>
                        )}
                      </div>
                    </td>

                    {/* Total Bookings */}
                    <td>
                      <span className="badge badge-confirmed" style={{ fontSize: '12px', fontWeight: 700 }}>
                        {customer.totalBookings} event{customer.totalBookings === 1 ? '' : 's'}
                      </span>
                    </td>

                    {/* Last Event Date */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                        <span>{formatDate(customer.lastEventDate)}</span>
                      </div>
                    </td>

                    {/* Total Value */}
                    <td>
                      <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: '13px' }}>
                        {formatINR(customer.totalSpent)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <button
                        type="button"
                        className="table-action-icon-btn edit-btn"
                        onClick={() => setSelectedCustomer(customer)}
                        title="View client profile & bookings"
                        aria-label={`View profile for ${customer.name}`}
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Profile & History Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          isOpen={Boolean(selectedCustomer)}
          onClose={() => setSelectedCustomer(null)}
          customer={selectedCustomer}
        />
      )}
    </div>
  );
}
