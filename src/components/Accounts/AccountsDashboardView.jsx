import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Receipt,
  Calendar,
  CreditCard,
  Building2,
  Sparkles,
  Clock,
  PieChart,
  BarChart3,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Plus,
  Edit2,
  Trash2,
  Tag,
  Search,
  Hash,
  User,
  FileText,
  Ban,
  Filter,
  Eye,
  Phone,
  Users,
  ChevronDown,
  Download,
  ListFilter,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  subscribePayments,
  createPayment,
  voidPayment,
  INCOME_CATEGORIES
} from '../../services/paymentsService';
import {
  subscribeExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  EXPENSE_CATEGORIES
} from '../../services/expensesService';
import { subscribeBookings } from '../../services/bookingsService';
import {
  calculateFinancialSummary,
  PAYMENT_METHODS,
  buildUnifiedTransactions,
  exportLedgerToCSV,
  exportExpensesToCSV
} from '../../services/accountsReportsService';
import { useAuth } from '../../context/AuthContext';
import ExpenseModal from './ExpenseModal';
import IncomeModal from './IncomeModal';
import BookingDetailDrawer from '../Bookings/BookingDetailDrawer';
import EmptyState from '../Common/EmptyState';
import './AccountsDashboardView.css';

// Currency formatting helper for Indian Rupee format (e.g. ₹1,50,000)
export function formatINR(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Delete Expense Confirmation Dialog Component
function DeleteExpenseDialog({ expense, onConfirm, onCancel }) {
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <div className="confirm-dialog-overlay animate-fade-in">
      <div className="confirm-dialog-box" style={{ borderColor: 'rgba(244, 63, 94, 0.4)' }}>
        <div className="confirm-dialog-icon">
          <Trash2 size={22} />
        </div>
        <div className="confirm-dialog-title">Delete Expense Record?</div>
        <div className="confirm-dialog-desc">
          You are about to permanently delete the expense of{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {formatINR(expense?.amount)} ({expense?.category})
          </strong>
          {expense?.expenseDate ? ` on ${formatDateDisplay(expense.expenseDate)}` : ''}.
          This will adjust total expenses and net profit. This action cannot be undone.
        </div>
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            disabled={isDeleting}
            onClick={async () => {
              setIsDeleting(true);
              try {
                await onConfirm();
              } catch {
                setIsDeleting(false);
              }
            }}
          >
            {isDeleting ? (
              <>
                <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }} />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Yes, Delete</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Void Payment Confirmation Dialog Component
function VoidIncomeDialog({ payment, onConfirm, onCancel }) {
  const [reason, setReason] = useState('Cancelled by administrator');
  const [isVoiding, setIsVoiding] = useState(false);

  return (
    <div className="confirm-dialog-overlay animate-fade-in">
      <div className="confirm-dialog-box" style={{ borderColor: 'rgba(244, 63, 94, 0.4)' }}>
        <div className="confirm-dialog-icon" style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)', color: '#fb7185' }}>
          <Ban size={22} />
        </div>
        <div className="confirm-dialog-title">Void Income Receipt?</div>
        <div className="confirm-dialog-desc">
          You are about to void the income receipt of{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {formatINR(payment?.amount)} ({payment?.category || (payment?.bookingId ? 'Hall Booking' : 'Other Income')})
          </strong>
          . This receipt will be preserved as an immutable audit record but excluded from revenue calculations.
        </div>

        <div style={{ margin: '14px 0', textAlign: 'left' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Reason for Voiding <span style={{ color: '#fb7185' }}>*</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Duplicate entry / Cancelled vendor commission"
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '13px'
            }}
          />
        </div>

        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onCancel}
            disabled={isVoiding}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            disabled={isVoiding || !reason.trim()}
            onClick={async () => {
              setIsVoiding(true);
              try {
                await onConfirm(reason.trim());
              } catch {
                setIsVoiding(false);
              }
            }}
          >
            {isVoiding ? (
              <>
                <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }} />
                <span>Voiding...</span>
              </>
            ) : (
              <span>Yes, Void Receipt</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccountsDashboardView({ onNavigate }) {
  const { isAuthenticated, isAuthLoading } = useAuth();

  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [error, setError] = useState(null);

  // Financial Period Filter state ('this_month' | 'today' | 'last_month' | 'all_time' | 'custom')
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [appliedCustomRange, setAppliedCustomRange] = useState({ startDate: '', endDate: '' });

  // Phase 3C Unified Transaction Ledger Filter state
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('all'); // 'all' | 'income' | 'expense'
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState('all');
  const [ledgerMethodFilter, setLedgerMethodFilter] = useState('all');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Modals & Dialogs state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(null);
  const [voidingPayment, setVoidingPayment] = useState(null);
  const [detailDrawerBooking, setDetailDrawerBooking] = useState(null);

  // Toasts
  const [successToast, setSuccessToast] = useState('');
  const [errorToast, setErrorToast] = useState('');

  const showSuccess = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4500);
  };

  const showError = (msg) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(''), 5000);
  };

  // Subscribe to real-time Firestore collections
  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      setPayments([]);
      setExpenses([]);
      setBookings([]);
      setIsLoadingPayments(false);
      setIsLoadingExpenses(false);
      setIsLoadingBookings(false);
      return;
    }

    setIsLoadingPayments(true);
    setIsLoadingExpenses(true);
    setIsLoadingBookings(true);
    setError(null);

    // 1. Subscribe to Payments (Income receipts)
    const unsubPayments = subscribePayments(
      (data) => {
        setPayments(data);
        setIsLoadingPayments(false);
      },
      (err) => {
        console.error('Payments stream error:', err);
        setError((prev) => prev || 'Failed to load payments stream from Firestore.');
        setIsLoadingPayments(false);
      }
    );

    // 2. Subscribe to Expenses
    const unsubExpenses = subscribeExpenses(
      (data) => {
        setExpenses(data);
        setIsLoadingExpenses(false);
      },
      (err) => {
        console.error('Expenses stream error:', err);
        setError((prev) => prev || 'Failed to load expenses stream from Firestore.');
        setIsLoadingExpenses(false);
      }
    );

    // 3. Subscribe to Bookings (for receivables)
    const unsubBookings = subscribeBookings(
      (data) => {
        setBookings(data);
        setIsLoadingBookings(false);
      },
      (err) => {
        console.error('Bookings stream error:', err);
        setError((prev) => prev || 'Failed to load bookings stream from Firestore.');
        setIsLoadingBookings(false);
      }
    );

    return () => {
      if (typeof unsubPayments === 'function') unsubPayments();
      if (typeof unsubExpenses === 'function') unsubExpenses();
      if (typeof unsubBookings === 'function') unsubBookings();
    };
  }, [isAuthenticated, isAuthLoading]);

  // Compute active date range based on selected financial period
  const activeDateRange = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (selectedPeriod === 'today') {
      return {
        startDate: todayStr,
        endDate: todayStr,
        label: `Today (${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})`
      };
    }

    if (selectedPeriod === 'this_month') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
      return {
        startDate: `${year}-${month}-01`,
        endDate: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
        label: `This Month (${now.toLocaleString('en-US', { month: 'long', year: 'numeric' })})`
      };
    }

    if (selectedPeriod === 'last_month') {
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = prevDate.getFullYear();
      const month = String(prevDate.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(year, prevDate.getMonth() + 1, 0).getDate();
      return {
        startDate: `${year}-${month}-01`,
        endDate: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
        label: `Last Month (${prevDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })})`
      };
    }

    if (selectedPeriod === 'custom') {
      if (appliedCustomRange.startDate && appliedCustomRange.endDate) {
        return {
          startDate: appliedCustomRange.startDate,
          endDate: appliedCustomRange.endDate,
          label: `Custom (${formatDateDisplay(appliedCustomRange.startDate)} – ${formatDateDisplay(appliedCustomRange.endDate)})`
        };
      }
      return {
        startDate: appliedCustomRange.startDate || null,
        endDate: appliedCustomRange.endDate || null,
        label: 'Custom Range'
      };
    }

    // Default / All Time
    return {
      startDate: null,
      endDate: null,
      label: 'All Recorded Time'
    };
  }, [selectedPeriod, appliedCustomRange]);

  // Overall Financial Summary Calculation driven by active date range
  const summary = useMemo(() => {
    return calculateFinancialSummary(payments, expenses, bookings, activeDateRange);
  }, [payments, expenses, bookings, activeDateRange]);

  // Current Month Reference Calculations for baseline KPI cards
  const currentMonthData = useMemo(() => {
    const currentMonthKey = new Date().toISOString().slice(0, 7); // e.g. "2026-08"
    const monthPayments = payments.filter(
      (p) => p.status !== 'Voided' && (p.paymentDate || '').slice(0, 7) === currentMonthKey
    );
    const monthExpenses = expenses.filter(
      (e) => (e.expenseDate || '').slice(0, 7) === currentMonthKey
    );

    const monthIncome = monthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const monthExp = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const monthProfit = monthIncome - monthExp;

    const monthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

    return {
      monthKey: currentMonthKey,
      monthName,
      income: monthIncome,
      expenses: monthExp,
      profit: monthProfit,
      paymentCount: monthPayments.length,
      expenseCount: monthExpenses.length
    };
  }, [payments, expenses]);

  // Receivables Summary Metrics
  const receivablesMetrics = useMemo(() => {
    const activeWithDue = bookings.filter((b) => {
      const isCancelled = (b.bookingStatus || '').toLowerCase() === 'cancelled';
      const balance = Number(b.balanceAmount) || 0;
      return !isCancelled && balance > 0;
    });

    const totalOutstanding = activeWithDue.reduce((sum, b) => sum + (Number(b.balanceAmount) || 0), 0);
    const totalCount = activeWithDue.length;

    return {
      totalOutstanding,
      totalCount
    };
  }, [bookings]);

  // Phase 3C Unified Transactions Master List
  const rawUnifiedTransactions = useMemo(() => {
    return buildUnifiedTransactions(payments, expenses);
  }, [payments, expenses]);

  // Phase 3C Filtered Unified Transactions (Respects active period, type, category, method, search)
  const filteredLedgerTransactions = useMemo(() => {
    return rawUnifiedTransactions.filter((t) => {
      // 1. Filter by active financial period date range
      if (activeDateRange.startDate && (t.date || '') < activeDateRange.startDate) return false;
      if (activeDateRange.endDate && (t.date || '') > activeDateRange.endDate) return false;

      // 2. Filter by Transaction Type (All, Income, Expense)
      if (ledgerTypeFilter !== 'all' && t.transactionType !== ledgerTypeFilter) {
        return false;
      }

      // 3. Filter by Category
      if (ledgerCategoryFilter !== 'all' && (t.category || '').toLowerCase() !== ledgerCategoryFilter.toLowerCase()) {
        return false;
      }

      // 4. Filter by Payment Method
      if (ledgerMethodFilter !== 'all' && (t.paymentMethod || '').toLowerCase() !== ledgerMethodFilter.toLowerCase()) {
        return false;
      }

      // 5. Filter by Search Query
      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase();
        return (
          (t.id || '').toLowerCase().includes(q) ||
          (t.party || '').toLowerCase().includes(q) ||
          (t.category || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          (t.transactionReference || '').toLowerCase().includes(q) ||
          (t.paymentMethod || '').toLowerCase().includes(q) ||
          (t.bookingId || '').toLowerCase().includes(q) ||
          (t.date || '').includes(q) ||
          String(t.amount || '').includes(q)
        );
      }

      return true;
    });
  }, [rawUnifiedTransactions, activeDateRange, ledgerTypeFilter, ledgerCategoryFilter, ledgerMethodFilter, ledgerSearch]);

  // Phase 3C Filtered Ledger Totals (Calculated strictly on filtered transactions)
  const ledgerTotals = useMemo(() => {
    const income = filteredLedgerTransactions
      .filter((t) => t.transactionType === 'income' && !t.isVoided)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const expense = filteredLedgerTransactions
      .filter((t) => t.transactionType === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const net = income - expense;
    const count = filteredLedgerTransactions.length;

    return { income, expense, net, count };
  }, [filteredLedgerTransactions]);

  // Category counts and totals for Income Report (Phase 3D)
  const incomeCategoryReportData = useMemo(() => {
    const validPayments = payments.filter((p) => {
      if (p.status === 'Voided') return false;
      const d = (p.paymentDate || '').slice(0, 10);
      if (activeDateRange.startDate && d < activeDateRange.startDate) return false;
      if (activeDateRange.endDate && d > activeDateRange.endDate) return false;
      return true;
    });

    const totalIncome = validPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return INCOME_CATEGORIES.map((cat) => {
      const catPayments = validPayments.filter((p) => {
        const c = p.category || (p.bookingId ? 'Hall Booking' : 'Other Income');
        return c.toLowerCase() === cat.toLowerCase();
      });
      const amount = catPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const count = catPayments.length;
      const percentage = totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0;
      return { category: cat, amount, count, percentage };
    });
  }, [payments, activeDateRange]);

  // Category counts and totals for Expense Report (Phase 3E)
  const expenseCategoryReportData = useMemo(() => {
    const validExpenses = expenses.filter((e) => {
      const d = (e.expenseDate || '').slice(0, 10);
      if (activeDateRange.startDate && d < activeDateRange.startDate) return false;
      if (activeDateRange.endDate && d > activeDateRange.endDate) return false;
      return true;
    });

    const totalExpenses = validExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return EXPENSE_CATEGORIES.map((cat) => {
      const catExpenses = validExpenses.filter((e) => (e.category || '').toLowerCase() === cat.toLowerCase());
      const amount = catExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const count = catExpenses.length;
      const percentage = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
      return { category: cat, amount, count, percentage };
    });
  }, [expenses, activeDateRange]);

  const isLoading = isLoadingPayments || isLoadingExpenses || isLoadingBookings;
  const hasNoFinancialData = payments.length === 0 && expenses.length === 0 && bookings.length === 0;

  // Custom range apply handler
  const handleApplyCustomRange = (e) => {
    e.preventDefault();
    if (!customStartDate || !customEndDate) {
      showError('Please select both start and end dates for the custom range.');
      return;
    }
    if (customStartDate > customEndDate) {
      showError('Start date cannot be later than end date.');
      return;
    }
    setAppliedCustomRange({ startDate: customStartDate, endDate: customEndDate });
  };

  // Expense action handlers
  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (expense) => {
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async (expensePayload) => {
    if (editingExpense) {
      await updateExpense(editingExpense.id, expensePayload);
      showSuccess(`Expense record for "${expensePayload.category}" updated successfully.`);
    } else {
      const created = await createExpense(expensePayload);
      showSuccess(`Expense of ${formatINR(created.amount)} (${created.category}) recorded successfully.`);
    }
  };

  const handleConfirmDeleteExpense = async () => {
    if (!deletingExpense) return;
    try {
      await deleteExpense(deletingExpense.id);
      showSuccess(`Expense of ${formatINR(deletingExpense.amount)} deleted.`);
    } catch (err) {
      showError(err.message || 'Failed to delete expense.');
    } finally {
      setDeletingExpense(null);
    }
  };

  // Income action handlers
  const handleOpenAddIncome = () => {
    setIsIncomeModalOpen(true);
  };

  const handleSaveIncome = async (incomePayload) => {
    try {
      const created = await createPayment(incomePayload);
      showSuccess(`Income of ${formatINR(created.amount)} (${created.category}) recorded successfully.`);
    } catch (err) {
      showError(err.message || 'Failed to record income receipt.');
      throw err;
    }
  };

  const handleConfirmVoidIncome = async (reason) => {
    if (!voidingPayment) return;
    try {
      await voidPayment(voidingPayment.id, reason);
      showSuccess(`Payment receipt of ${formatINR(voidingPayment.amount)} voided.`);
    } catch (err) {
      showError(err.message || 'Failed to void payment.');
    } finally {
      setVoidingPayment(null);
    }
  };

  // Export CSV handler
  const handleExportCSV = () => {
    if (filteredLedgerTransactions.length === 0) {
      showError('No transactions available in current filter to export.');
      return;
    }
    exportLedgerToCSV(filteredLedgerTransactions);
    showSuccess(`Exported ${filteredLedgerTransactions.length} transactions to CSV.`);
  };

  return (
    <div className="accounts-dashboard animate-fade-in">
      {/* Toast: Success */}
      {successToast && (
        <div className="enquiry-toast animate-fade-in">
          <CheckCircle2 size={18} className="toast-icon" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Toast: Error */}
      {errorToast && (
        <div className="enquiry-toast enquiry-toast-error animate-fade-in">
          <span className="toast-icon" style={{ color: '#fb7185' }}>⚠</span>
          <span>{errorToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="accounts-welcome-card">
        <div className="welcome-content">
          <div className="welcome-badge">
            <Sparkles size={13} />
            <span>VLNS Gardens Accounts & Finance • Overview</span>
          </div>
          <h2 className="welcome-title">Financial Performance & Overview</h2>
          <p className="welcome-desc">
            Real-time tracking of venue income, vendor commissions, operational expenses, profit margins, and customer receivables.
          </p>
        </div>
        <div className="accounts-welcome-actions">
          <div className="welcome-sync-badge">
            <div className="sync-dot"></div>
            <span>Live Firestore Sync</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate?.('financial-reports')}
            style={{ gap: '5px' }}
          >
            <BarChart3 size={15} />
            <span>Reports & Insights</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleOpenAddIncome}
            style={{ borderColor: 'rgba(16, 185, 129, 0.3)', color: '#34d399' }}
          >
            <Plus size={15} />
            <span>Add Income</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleOpenAddExpense}
          >
            <Plus size={15} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Financial Period Filter Card */}
      <div className="card period-filter-card">
        <div className="period-filter-row">
          <div className="period-presets-group">
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginRight: '4px' }}>
              <Filter size={14} />
              <span>Financial Period:</span>
            </span>

            {[
              { id: 'this_month', label: 'This Month' },
              { id: 'today', label: 'Today' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'all_time', label: 'All Time' },
              { id: 'custom', label: 'Custom Range' }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                className={`period-tab-btn ${selectedPeriod === p.id ? 'active' : ''}`}
                onClick={() => setSelectedPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-gold" style={{ fontSize: '11.5px', padding: '4px 10px' }}>
              <Calendar size={12} style={{ marginRight: '4px' }} />
              {activeDateRange.label}
            </span>
          </div>
        </div>

        {/* Custom Range Inputs when 'custom' is active */}
        {selectedPeriod === 'custom' && (
          <form onSubmit={handleApplyCustomRange} className="period-custom-form animate-fade-in">
            <div className="period-date-input-wrap">
              <span>From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                required
              />
            </div>
            <div className="period-date-input-wrap">
              <span>To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{ padding: '5px 14px', fontSize: '12px' }}
            >
              Apply Range
            </button>
            {(appliedCustomRange.startDate || appliedCustomRange.endDate) && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '5px 12px', fontSize: '12px' }}
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setAppliedCustomRange({ startDate: '', endDate: '' });
                }}
              >
                Clear
              </button>
            )}
          </form>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="accounts-error-banner animate-fade-in">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Screen */}
      {isLoading ? (
        <div className="accounts-loading-box">
          <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }}></div>
          <span>Loading financial ledger from Firestore...</span>
        </div>
      ) : hasNoFinancialData ? (
        <div className="card accounts-empty-card">
          <EmptyState
            icon={Wallet}
            title="No Financial Records Yet"
            description="Income and expense activity will appear here as transactions are recorded."
            actionText="Record First Expense"
            onAction={handleOpenAddExpense}
          />
        </div>
      ) : (
        <>
          {/* 6 Core Financial KPI Cards (Driven by selected period) */}
          <div className="accounts-kpi-grid">
            {/* 1. Total Income */}
            <div className="kpi-card kpi-income">
              <div className="kpi-top">
                <div className="kpi-icon-box icon-income">
                  <ArrowUpRight size={22} />
                </div>
                <span className="badge badge-confirmed">Revenue</span>
              </div>
              <div className="kpi-body">
                <div className="kpi-value">{formatINR(summary.totalIncome)}</div>
                <div className="kpi-title">Total Income</div>
                <div className="kpi-subtitle">
                  {summary.validPaymentCount} completed {summary.validPaymentCount === 1 ? 'receipt' : 'receipts'}
                </div>
              </div>
              <div className="kpi-footer">
                <span>{activeDateRange.label}</span>
              </div>
            </div>

            {/* 2. Total Expenses */}
            <div className="kpi-card kpi-expense">
              <div className="kpi-top">
                <div className="kpi-icon-box icon-expense">
                  <ArrowDownRight size={22} />
                </div>
                <span className="badge badge-cancelled">Outgoing</span>
              </div>
              <div className="kpi-body">
                <div className="kpi-value">{formatINR(summary.totalExpenses)}</div>
                <div className="kpi-title">Total Expenses</div>
                <div className="kpi-subtitle">
                  {summary.expenseCount} recorded {summary.expenseCount === 1 ? 'disbursement' : 'disbursements'}
                </div>
              </div>
              <div className="kpi-footer">
                <span>{activeDateRange.label}</span>
              </div>
            </div>

            {/* 3. Net Profit */}
            <div
              className="kpi-card kpi-profit"
              onClick={() => onNavigate?.('financial-reports')}
              style={{ cursor: 'pointer' }}
              title="Click to view detailed Financial Reports & Business Insights"
            >
              <div className="kpi-top">
                <div className={`kpi-icon-box ${summary.netProfit >= 0 ? 'icon-profit-pos' : 'icon-profit-neg'}`}>
                  {summary.netProfit >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
                </div>
                <span className={`badge ${summary.netProfit >= 0 ? 'badge-gold' : 'badge-cancelled'}`}>
                  {summary.netProfit >= 0 ? 'Surplus' : 'Deficit'}
                </span>
              </div>
              <div className="kpi-body">
                <div className="kpi-value">{formatINR(summary.netProfit)}</div>
                <div className="kpi-title">Net Profit</div>
                <div className="kpi-subtitle">
                  {summary.totalIncome > 0
                    ? `${((summary.netProfit / summary.totalIncome) * 100).toFixed(1)}% net margin`
                    : 'Revenue minus expenses'}
                </div>
              </div>
              <div className="kpi-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Income minus total expenses</span>
                <span style={{ color: 'var(--brand-gold-light)', fontWeight: 600, fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span>View Reports</span>
                  <ArrowRight size={12} />
                </span>
              </div>
            </div>

            {/* 4. Outstanding Receivables (Clickable with direct link to dedicated Receivables page) */}
            <div
              className="kpi-card kpi-receivables"
              onClick={() => onNavigate?.('receivables')}
              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              title="Click to open dedicated Receivables Management view"
            >
              <div className="kpi-top">
                <div className="kpi-icon-box icon-receivables">
                  <Clock size={22} />
                </div>
                <span className="badge badge-pending">Due</span>
              </div>
              <div className="kpi-body">
                <div className="kpi-value">{formatINR(summary.totalOutstandingReceivables)}</div>
                <div className="kpi-title">Outstanding Receivables</div>
                <div className="kpi-subtitle">{receivablesMetrics.totalCount} active bookings with due</div>
              </div>
              <div className="kpi-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Pending balances</span>
                <span style={{ color: 'var(--brand-gold-light)', fontWeight: 600, fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span>View Receivables</span>
                  <ArrowRight size={12} />
                </span>
              </div>
            </div>

            {/* 5. Current Month Income */}
            <div className="kpi-card kpi-month-income">
              <div className="kpi-top">
                <div className="kpi-icon-box icon-month-inc">
                  <Calendar size={22} />
                </div>
                <span className="badge badge-new">{currentMonthData.monthName}</span>
              </div>
              <div className="kpi-body">
                <div className="kpi-value">{formatINR(currentMonthData.income)}</div>
                <div className="kpi-title">This Month's Income</div>
                <div className="kpi-subtitle">
                  {currentMonthData.paymentCount} {currentMonthData.paymentCount === 1 ? 'payment' : 'payments'} in {currentMonthData.monthName}
                </div>
              </div>
              <div className="kpi-footer">
                <span>Receipts collected this calendar month</span>
              </div>
            </div>

            {/* 6. Current Month Expenses */}
            <div className="kpi-card kpi-month-expense">
              <div className="kpi-top">
                <div className="kpi-icon-box icon-month-exp">
                  <Receipt size={22} />
                </div>
                <span className="badge badge-event">{currentMonthData.monthName}</span>
              </div>
              <div className="kpi-body">
                <div className="kpi-value">{formatINR(currentMonthData.expenses)}</div>
                <div className="kpi-title">This Month's Expenses</div>
                <div className="kpi-subtitle">
                  {currentMonthData.expenseCount} {currentMonthData.expenseCount === 1 ? 'expense' : 'expenses'} in {currentMonthData.monthName}
                </div>
              </div>
              <div className="kpi-footer">
                <span>Disbursements paid this calendar month</span>
              </div>
            </div>
          </div>

          {/* Breakdowns & Financial Reports Section (4 Columns: Income Report, Money Received, Expense Report, Booking Revenue Summary) */}
          <div className="accounts-breakdowns-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {/* 1. Income Report (Phase 3D) */}
            <div className="card breakdown-card">
              <div className="breakdown-header">
                <div className="breakdown-title-wrap">
                  <CreditCard size={19} className="breakdown-icon" style={{ color: '#34d399' }} />
                  <div>
                    <h3 className="breakdown-title">Income by Category</h3>
                    <p className="breakdown-subtitle">Distribution across revenue channels</p>
                  </div>
                </div>
                <span className="badge badge-confirmed">
                  {formatINR(summary.totalIncome)}
                </span>
              </div>

              <div className="breakdown-list">
                {incomeCategoryReportData.map((item) => {
                  const slug = item.category.toLowerCase().replace(/\s+/g, '-');

                  return (
                    <div key={item.category} className="breakdown-row">
                      <div className="row-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="row-name">{item.category}</span>
                          <span className="report-count-tag">{item.count} {item.count === 1 ? 'receipt' : 'receipts'}</span>
                        </div>
                        <div className="row-amount-wrap">
                          <span className="row-amount">{formatINR(item.amount)}</span>
                          <span className="row-percentage">({item.percentage}%)</span>
                        </div>
                      </div>
                      <div className="progress-track">
                        <div
                          className={`progress-fill progress-income-${slug}`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Money Received by Payment Method */}
            <div className="card breakdown-card">
              <div className="breakdown-header">
                <div className="breakdown-title-wrap">
                  <Wallet size={19} className="breakdown-icon" style={{ color: 'var(--brand-gold-light)' }} />
                  <div>
                    <h3 className="breakdown-title">Money Received</h3>
                    <p className="breakdown-subtitle">Recorded receipts by channel (not bank balance)</p>
                  </div>
                </div>
                <span className="badge badge-gold">
                  {formatINR(summary.totalIncome)}
                </span>
              </div>

              <div className="breakdown-list">
                {PAYMENT_METHODS.map((method) => {
                  const amount = summary.paymentMethodBreakdown?.[method] || 0;
                  const percentage = summary.totalIncome > 0
                    ? Math.round((amount / summary.totalIncome) * 100)
                    : 0;

                  const slug = method.toLowerCase().replace(/\s+/g, '-');

                  return (
                    <div key={method} className="breakdown-row">
                      <div className="row-info">
                        <span className="row-name">{method}</span>
                        <div className="row-amount-wrap">
                          <span className="row-amount">{formatINR(amount)}</span>
                          <span className="row-percentage">({percentage}%)</span>
                        </div>
                      </div>
                      <div className="progress-track">
                        <div
                          className={`progress-fill progress-method-${slug}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Expense Report (Phase 3E) */}
            <div className="card breakdown-card">
              <div className="breakdown-header">
                <div className="breakdown-title-wrap">
                  <PieChart size={19} className="breakdown-icon" style={{ color: '#f87171' }} />
                  <div>
                    <h3 className="breakdown-title">Expenses by Category</h3>
                    <p className="breakdown-subtitle">Breakdown of operational disbursements</p>
                  </div>
                </div>
                <span className="badge badge-cancelled">
                  {formatINR(summary.totalExpenses)}
                </span>
              </div>

              <div className="breakdown-list category-scroll-list">
                {expenseCategoryReportData.map((item) => {
                  return (
                    <div key={item.category} className="breakdown-row">
                      <div className="row-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="row-name">{item.category}</span>
                          <span className="report-count-tag">{item.count} {item.count === 1 ? 'bill' : 'bills'}</span>
                        </div>
                        <div className="row-amount-wrap">
                          <span className="row-amount">{formatINR(item.amount)}</span>
                          <span className="row-percentage">({item.percentage}%)</span>
                        </div>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill progress-fill-expense"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Booking Revenue vs Actual Cash Summary (Phase 3G & 3F) */}
            <div className="card breakdown-card">
              <div className="breakdown-header">
                <div className="breakdown-title-wrap">
                  <Building2 size={19} className="breakdown-icon" style={{ color: 'var(--brand-gold)' }} />
                  <div>
                    <h3 className="breakdown-title">Booking Revenue vs Cash</h3>
                    <p className="breakdown-subtitle">Contracted bookings vs actual cash flow</p>
                  </div>
                </div>
                <span className="badge badge-gold">
                  {summary.activeBookingsCount} Active
                </span>
              </div>

              <div className="breakdown-list" style={{ gap: '10px' }}>
                <div className="receivables-summary-item" style={{ padding: '8px 12px' }}>
                  <span className="receivables-summary-label">Total Contracted Amount</span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {formatINR(summary.totalContractedAmount)}
                  </span>
                  <span className="receivables-summary-sub">Total business booked (NOT actual revenue)</span>
                </div>

                <div className="receivables-summary-item" style={{ padding: '8px 12px' }}>
                  <span className="receivables-summary-label">Received Against Bookings</span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                    {formatINR(summary.totalReceivedOnBookings)}
                  </span>
                  <span className="receivables-summary-sub">Advances & full settlements collected</span>
                </div>

                <div
                  className="receivables-summary-item"
                  style={{ padding: '8px 12px', cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onClick={() => onNavigate?.('receivables')}
                  title="Click to view Receivables Management"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="receivables-summary-label">Outstanding Receivables</span>
                    <span style={{ color: 'var(--brand-gold-light)', fontSize: '11px', fontWeight: 600 }}>Manage →</span>
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                    {formatINR(summary.totalOutstandingReceivables)}
                  </span>
                  <span className="receivables-summary-sub">Pending customer balances due</span>
                </div>
              </div>
            </div>
          </div>

          {/* PHASE 3C — UNIFIED TRANSACTION LEDGER SECTION */}
          <div className="card unified-ledger-card">
            {/* Header */}
            <div className="ledger-header">
              <div className="breakdown-title-wrap">
                <Receipt size={20} className="breakdown-icon" style={{ color: '#34d399' }} />
                <div>
                  <h3 className="breakdown-title">Unified Transaction Ledger</h3>
                  <p className="breakdown-subtitle">
                    Complete chronological record of all income receipts, vendor commissions, and operational disbursements
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const periodExpenses = expenses.filter((e) => {
                      const d = (e.expenseDate || '').slice(0, 10);
                      if (activeDateRange.startDate && d < activeDateRange.startDate) return false;
                      if (activeDateRange.endDate && d > activeDateRange.endDate) return false;
                      return true;
                    });
                    if (periodExpenses.length === 0) {
                      showError('No expenses recorded for the selected period.');
                      return;
                    }
                    exportExpensesToCSV(periodExpenses, activeDateRange, activeDateRange.label);
                    showSuccess(`Exported ${periodExpenses.length} expense records to CSV.`);
                  }}
                  disabled={expenses.length === 0}
                  title="Export operational expense records for this period"
                  style={{ gap: '5px' }}
                >
                  <Download size={14} style={{ color: '#f87171' }} />
                  <span>Export Expenses CSV</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleExportCSV}
                  disabled={filteredLedgerTransactions.length === 0}
                  title="Export filtered transactions to CSV"
                  style={{ gap: '5px' }}
                >
                  <Download size={14} />
                  <span>Export Ledger CSV</span>
                </button>
              </div>
            </div>

            {/* Filtered Ledger Totals Banner (Phase 3C-C) */}
            <div className="ledger-totals-grid">
              <div className="ledger-totals-item">
                <span className="receivables-summary-label">Filtered Income</span>
                <span className="receivables-summary-val" style={{ color: '#34d399' }}>
                  {formatINR(ledgerTotals.income)}
                </span>
                <span className="receivables-summary-sub">Non-voided receipts in filter</span>
              </div>

              <div className="ledger-totals-item">
                <span className="receivables-summary-label">Filtered Expenses</span>
                <span className="receivables-summary-val" style={{ color: '#f87171' }}>
                  {formatINR(ledgerTotals.expense)}
                </span>
                <span className="receivables-summary-sub">Disbursements in filter</span>
              </div>

              <div className="ledger-totals-item">
                <span className="receivables-summary-label">Net Movement</span>
                <span className="receivables-summary-val" style={{ color: ledgerTotals.net >= 0 ? 'var(--brand-gold-light)' : '#fb7185' }}>
                  {formatINR(ledgerTotals.net)}
                </span>
                <span className="receivables-summary-sub">{ledgerTotals.net >= 0 ? 'Net positive movement' : 'Net deficit movement'}</span>
              </div>

              <div className="ledger-totals-item">
                <span className="receivables-summary-label">Transactions</span>
                <span className="receivables-summary-val">
                  {ledgerTotals.count} {ledgerTotals.count === 1 ? 'Record' : 'Records'}
                </span>
                <span className="receivables-summary-sub">Matching current active filters</span>
              </div>
            </div>

            {/* Filters Row (Type, Category, Payment Method, Search) */}
            <div className="receivables-controls-row">
              {/* Type Filter Tabs */}
              <div className="receivables-filter-tabs">
                {[
                  { id: 'all', label: `All Transactions (${rawUnifiedTransactions.length})` },
                  { id: 'income', label: `Income (${payments.length})` },
                  { id: 'expense', label: `Expenses (${expenses.length})` }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`receivables-tab-btn ${ledgerTypeFilter === tab.id ? 'active' : ''}`}
                    onClick={() => {
                      setLedgerTypeFilter(tab.id);
                      setLedgerCategoryFilter('all');
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Category, Method, Search Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Category Dropdown */}
                <select
                  className="expense-category-select"
                  value={ledgerCategoryFilter}
                  onChange={(e) => setLedgerCategoryFilter(e.target.value)}
                  aria-label="Filter by category"
                >
                  <option value="all">All Categories</option>
                  {ledgerTypeFilter !== 'expense' && (
                    <optgroup label="Income Categories">
                      {INCOME_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </optgroup>
                  )}
                  {ledgerTypeFilter !== 'income' && (
                    <optgroup label="Expense Categories">
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </optgroup>
                  )}
                </select>

                {/* Payment Method Dropdown */}
                <select
                  className="expense-category-select"
                  value={ledgerMethodFilter}
                  onChange={(e) => setLedgerMethodFilter(e.target.value)}
                  aria-label="Filter by payment method"
                >
                  <option value="all">All Payment Methods</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                {/* Search Input */}
                <div className="expense-search-input">
                  <Search size={14} style={{ color: 'var(--text-disabled)' }} />
                  <input
                    type="text"
                    placeholder="Search party, ref, notes..."
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    style={{ width: '180px' }}
                  />
                </div>
              </div>
            </div>

            {/* Unified Transactions Table */}
            {filteredLedgerTransactions.length === 0 ? (
              <div className="trend-empty-note" style={{ padding: '36px 20px' }}>
                {ledgerSearch || ledgerTypeFilter !== 'all' || ledgerCategoryFilter !== 'all' || ledgerMethodFilter !== 'all' ? (
                  <span>No transactions match your active filter or search query in this financial period.</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Receipt size={32} style={{ color: 'var(--text-muted)' }} />
                    <strong style={{ color: 'var(--text-primary)', fontSize: '15px' }}>
                      No Financial Records Yet
                    </strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      Income and expense activity will appear here as transactions are recorded.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="trend-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Party / Source</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Payment Method</th>
                      <th>Reference</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLedgerTransactions.map((tx) => {
                      const isIncome = tx.transactionType === 'income';
                      const isVoided = tx.isVoided;

                      return (
                        <tr
                          key={`${tx.transactionType}-${tx.id}`}
                          className={`animate-fade-in${isVoided ? ' voided-row' : ''}`}
                          style={isVoided ? { opacity: 0.6 } : {}}
                        >
                          {/* Date */}
                          <td>
                            <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
                              {formatDateDisplay(tx.date)}
                            </strong>
                          </td>

                          {/* Type */}
                          <td>
                            <span className={isIncome ? 'ledger-type-badge-income' : 'ledger-type-badge-expense'}>
                              {isIncome ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                              <span>{isIncome ? 'Income' : 'Expense'}</span>
                            </span>
                          </td>

                          {/* Category */}
                          <td>
                            <span className={`badge ${
                              tx.category === 'Hall Booking'
                                ? 'badge-gold'
                                : tx.category === 'Decoration Commission'
                                ? 'badge-pending'
                                : tx.category === 'Catering Commission'
                                ? 'badge-new'
                                : isIncome
                                ? 'badge-confirmed'
                                : 'badge-cancelled'
                            }`}>
                              {tx.category}
                            </span>
                          </td>

                          {/* Party / Source */}
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <User size={12} style={{ color: 'var(--text-muted)' }} />
                              <span>{tx.party}</span>
                            </div>
                          </td>

                          {/* Description */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '240px' }}>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {tx.description || '—'}
                              </span>
                              {tx.notes && (
                                <span style={{ fontSize: '11px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
                                  {tx.notes}
                                </span>
                              )}
                              {isVoided && tx.voidReason && (
                                <span style={{ fontSize: '11px', color: '#fb7185' }}>
                                  Void reason: {tx.voidReason}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Amount */}
                          <td>
                            <div style={{
                              color: isVoided ? 'var(--text-disabled)' : isIncome ? '#34d399' : '#f87171',
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)',
                              fontSize: '13.5px',
                              textDecoration: isVoided ? 'line-through' : 'none'
                            }}>
                              {isIncome ? `+${formatINR(tx.amount)}` : `-${formatINR(tx.amount)}`}
                            </div>
                          </td>

                          {/* Payment Method */}
                          <td>
                            <span className="expense-method-tag">
                              <CreditCard size={11} />
                              <span>{tx.paymentMethod || 'Cash'}</span>
                            </span>
                          </td>

                          {/* Reference */}
                          <td>
                            <span style={{ fontSize: '11px', color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}>
                              {tx.transactionReference ? `Ref: ${tx.transactionReference}` : tx.bookingId ? `Book #${tx.bookingId.slice(0, 6).toUpperCase()}` : '—'}
                            </span>
                          </td>

                          {/* Status */}
                          <td>
                            <span className={`badge ${isVoided ? 'badge-cancelled' : 'badge-confirmed'}`}>
                              {tx.status || 'Completed'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {/* Income void action */}
                              {isIncome && !isVoided && (
                                <button
                                  type="button"
                                  className="table-action-icon-btn delete-btn"
                                  onClick={() => setVoidingPayment(tx.raw)}
                                  title="Void income receipt"
                                  aria-label={`Void payment #${tx.id.slice(0, 8)}`}
                                >
                                  <Ban size={14} />
                                </button>
                              )}

                              {/* Expense edit & delete actions */}
                              {!isIncome && (
                                <>
                                  <button
                                    type="button"
                                    className="table-action-icon-btn edit-btn"
                                    onClick={() => handleOpenEditExpense(tx.raw)}
                                    title="Edit expense record"
                                    aria-label={`Edit expense #${tx.id.slice(0, 8)}`}
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className="table-action-icon-btn delete-btn"
                                    onClick={() => setDeletingExpense(tx.raw)}
                                    title="Delete expense record"
                                    aria-label={`Delete expense #${tx.id.slice(0, 8)}`}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}

                              {/* Booking detail drawer link if bookingId exists */}
                              {tx.bookingId && (
                                <button
                                  type="button"
                                  className="table-action-icon-btn edit-btn"
                                  onClick={() => {
                                    const b = bookings.find((item) => item.id === tx.bookingId);
                                    if (b) setDetailDrawerBooking(b);
                                  }}
                                  title="View associated booking reservation"
                                  aria-label={`View booking #${tx.bookingId.slice(0, 8)}`}
                                >
                                  <Eye size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Monthly Financial Trend Section */}
          <div className="card monthly-trend-card">
            <div className="trend-header">
              <div className="breakdown-title-wrap">
                <BarChart3 size={20} className="breakdown-icon" />
                <div>
                  <h3 className="breakdown-title">Monthly Income & Expense Trend</h3>
                  <p className="breakdown-subtitle">Chronological ledger breakdown by month</p>
                </div>
              </div>
            </div>

            {summary.monthlyTrend.length > 0 ? (
              <div className="trend-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Total Income</th>
                      <th>Total Expenses</th>
                      <th>Net Profit / Deficit</th>
                      <th>Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.monthlyTrend.map((m) => {
                      const margin = m.income > 0 ? ((m.profit / m.income) * 100).toFixed(1) : '0.0';
                      const formattedMonth = new Date(`${m.month}-01`).toLocaleString('en-US', {
                        month: 'long',
                        year: 'numeric'
                      });

                      return (
                        <tr key={m.month}>
                          <td>
                            <strong style={{ color: 'var(--text-primary)' }}>
                              {formattedMonth || m.month}
                            </strong>
                          </td>
                          <td style={{ color: '#34d399', fontWeight: 600 }}>
                            {formatINR(m.income)}
                          </td>
                          <td style={{ color: '#f87171', fontWeight: 600 }}>
                            {formatINR(m.expenses)}
                          </td>
                          <td style={{ color: m.profit >= 0 ? 'var(--brand-gold-light)' : '#fb7185', fontWeight: 700 }}>
                            {formatINR(m.profit)}
                          </td>
                          <td>
                            <span className={`badge ${m.profit >= 0 ? 'badge-gold' : 'badge-cancelled'}`}>
                              {m.profit >= 0 ? `+${margin}%` : `${margin}%`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="trend-empty-note">
                <span>No monthly transaction history recorded in the selected period.</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Expense Modal (Add / Edit) */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        existingExpense={editingExpense}
      />

      {/* Income Modal (Non-Booking Income) */}
      <IncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        onSave={handleSaveIncome}
      />

      {/* View Booking Detail Drawer for Ledger Rows */}
      {detailDrawerBooking && (
        <BookingDetailDrawer
          booking={detailDrawerBooking}
          onClose={() => setDetailDrawerBooking(null)}
          onCollectPayment={async (paymentData) => {
            const res = await createPayment(paymentData);
            showSuccess(`Payment of ${formatINR(paymentData.amount)} recorded.`);
            return res;
          }}
          showSuccess={showSuccess}
          showError={showError}
        />
      )}

      {/* Delete Expense Dialog */}
      {deletingExpense && (
        <DeleteExpenseDialog
          expense={deletingExpense}
          onConfirm={handleConfirmDeleteExpense}
          onCancel={() => setDeletingExpense(null)}
        />
      )}

      {/* Void Income Dialog */}
      {voidingPayment && (
        <VoidIncomeDialog
          payment={voidingPayment}
          onConfirm={handleConfirmVoidIncome}
          onCancel={() => setVoidingPayment(null)}
        />
      )}
    </div>
  );
}
