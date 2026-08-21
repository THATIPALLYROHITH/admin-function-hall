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
  Ban
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
import { calculateFinancialSummary } from '../../services/accountsReportsService';
import { useAuth } from '../../context/AuthContext';
import ExpenseModal from './ExpenseModal';
import IncomeModal from './IncomeModal';
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

export default function AccountsDashboardView() {
  const { isAuthenticated, isAuthLoading } = useAuth();
  
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [bookings, setBookings] = useState([]);
  
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [error, setError] = useState(null);

  // Active Ledger Tab ('expenses' | 'income')
  const [activeLedgerTab, setActiveLedgerTab] = useState('expenses');

  // Modals & Dialogs state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(null);
  const [voidingPayment, setVoidingPayment] = useState(null);

  // Filters & Search
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');
  const [incomeCategoryFilter, setIncomeCategoryFilter] = useState('all');
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');
  const [incomeSearchQuery, setIncomeSearchQuery] = useState('');

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

  // Overall Financial Summary Calculation using accountsReportsService
  const summary = useMemo(() => {
    return calculateFinancialSummary(payments, expenses, bookings);
  }, [payments, expenses, bookings]);

  // Current Month Calculations
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

  // Filtered expenses list for ledger table
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (expenseCategoryFilter !== 'all' && (e.category || '').toLowerCase() !== expenseCategoryFilter.toLowerCase()) {
        return false;
      }
      if (expenseSearchQuery.trim()) {
        const q = expenseSearchQuery.toLowerCase();
        return (
          (e.id || '').toLowerCase().includes(q) ||
          (e.category || '').toLowerCase().includes(q) ||
          (e.payee || '').toLowerCase().includes(q) ||
          (e.description || '').toLowerCase().includes(q) ||
          (e.paymentMethod || '').toLowerCase().includes(q) ||
          (e.transactionReference || '').toLowerCase().includes(q) ||
          (e.notes || '').toLowerCase().includes(q) ||
          (e.expenseDate || '').includes(q) ||
          String(e.amount || '').includes(q)
        );
      }
      return true;
    });
  }, [expenses, expenseCategoryFilter, expenseSearchQuery]);

  // Filtered income payments list for ledger table
  const filteredIncomePayments = useMemo(() => {
    return payments.filter((p) => {
      const category = p.category || (p.bookingId ? 'Hall Booking' : 'Other Income');

      if (incomeCategoryFilter !== 'all' && category.toLowerCase() !== incomeCategoryFilter.toLowerCase()) {
        return false;
      }
      if (incomeSearchQuery.trim()) {
        const q = incomeSearchQuery.toLowerCase();
        return (
          (p.id || '').toLowerCase().includes(q) ||
          category.toLowerCase().includes(q) ||
          (p.customerName || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q) ||
          (p.paymentMethod || '').toLowerCase().includes(q) ||
          (p.transactionReference || '').toLowerCase().includes(q) ||
          (p.notes || '').toLowerCase().includes(q) ||
          (p.paymentDate || '').includes(q) ||
          String(p.amount || '').includes(q)
        );
      }
      return true;
    });
  }, [payments, incomeCategoryFilter, incomeSearchQuery]);

  const isLoading = isLoadingPayments || isLoadingExpenses || isLoadingBookings;
  const hasNoFinancialData = payments.length === 0 && expenses.length === 0 && bookings.length === 0;

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
            <span>VLNS Gardens Accounts & Finance • Phase 2</span>
          </div>
          <h2 className="welcome-title">Financial Performance & Ledger</h2>
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
            title="No Financial Records Found"
            message="No payments, bookings, or operational expenses have been recorded in the database yet. When bookings and receipts are added, financial summaries will automatically populate here."
            actionText="Record First Expense"
            onAction={handleOpenAddExpense}
          />
        </div>
      ) : (
        <>
          {/* 6 Core Financial KPI Cards */}
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
                <span>Bookings & vendor commissions</span>
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
                <span>Operating & maintenance bills</span>
              </div>
            </div>

            {/* 3. Net Profit */}
            <div className="kpi-card kpi-profit">
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
              <div className="kpi-footer">
                <span>Income minus total expenses</span>
              </div>
            </div>

            {/* 4. Outstanding Receivables */}
            <div className="kpi-card kpi-receivables">
              <div className="kpi-top">
                <div className="kpi-icon-box icon-receivables">
                  <Clock size={22} />
                </div>
                <span className="badge badge-pending">Due</span>
              </div>
              <div className="kpi-body">
                <div className="kpi-value">{formatINR(summary.totalOutstandingReceivables)}</div>
                <div className="kpi-title">Outstanding Receivables</div>
                <div className="kpi-subtitle">Pending customer balances</div>
              </div>
              <div className="kpi-footer">
                <span>From confirmed / tentative bookings</span>
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
                <span>Receipts collected this month</span>
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
                <span>Disbursements paid this month</span>
              </div>
            </div>
          </div>

          {/* Breakdowns Section (2 Columns: Income by Category & Expenses by Category) */}
          <div className="accounts-breakdowns-grid">
            {/* 1. Income by Category */}
            <div className="card breakdown-card">
              <div className="breakdown-header">
                <div className="breakdown-title-wrap">
                  <CreditCard size={19} className="breakdown-icon" style={{ color: '#34d399' }} />
                  <div>
                    <h3 className="breakdown-title">Income by Category</h3>
                    <p className="breakdown-subtitle">Distribution of venue revenues across sources</p>
                  </div>
                </div>
                <span className="badge badge-confirmed">
                  {formatINR(summary.totalIncome)}
                </span>
              </div>

              <div className="breakdown-list">
                {INCOME_CATEGORIES.map((cat) => {
                  const amount = summary.incomeCategoryBreakdown?.[cat] || 0;
                  const percentage = summary.totalIncome > 0 
                    ? Math.round((amount / summary.totalIncome) * 100) 
                    : 0;

                  const slug = cat.toLowerCase().replace(/\s+/g, '-');

                  return (
                    <div key={cat} className="breakdown-row">
                      <div className="row-info">
                        <span className="row-name">{cat}</span>
                        <div className="row-amount-wrap">
                          <span className="row-amount">{formatINR(amount)}</span>
                          <span className="row-percentage">({percentage}%)</span>
                        </div>
                      </div>
                      <div className="progress-track">
                        <div 
                          className={`progress-fill progress-income-${slug}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Expenses by Category */}
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
                {EXPENSE_CATEGORIES.map((category) => {
                  const amount = summary.expenseCategoryBreakdown[category] || 0;
                  const percentage = summary.totalExpenses > 0 
                    ? Math.round((amount / summary.totalExpenses) * 100) 
                    : 0;

                  return (
                    <div key={category} className="breakdown-row">
                      <div className="row-info">
                        <span className="row-name">{category}</span>
                        <div className="row-amount-wrap">
                          <span className="row-amount">{formatINR(amount)}</span>
                          <span className="row-percentage">({percentage}%)</span>
                        </div>
                      </div>
                      <div className="progress-track">
                        <div 
                          className="progress-fill progress-fill-expense"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
                <span>No monthly transaction history recorded yet.</span>
              </div>
            )}
          </div>

          {/* Ledger Section with Tabs (Expenses vs Income Receipts) */}
          <div className="card expense-ledger-card">
            <div className="expense-ledger-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-surface-elevated)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => setActiveLedgerTab('expenses')}
                    style={{
                      padding: '6px 14px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      background: activeLedgerTab === 'expenses' ? 'var(--brand-gold)' : 'transparent',
                      color: activeLedgerTab === 'expenses' ? '#fff' : 'var(--text-secondary)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Operational Expenses ({expenses.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLedgerTab('income')}
                    style={{
                      padding: '6px 14px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      background: activeLedgerTab === 'income' ? 'var(--brand-gold)' : 'transparent',
                      color: activeLedgerTab === 'income' ? '#fff' : 'var(--text-secondary)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Income Receipts & Commissions ({payments.length})
                  </button>
                </div>
              </div>

              {/* Tab 1: Expense Controls */}
              {activeLedgerTab === 'expenses' && (
                <div className="expense-filter-controls">
                  <select
                    className="expense-category-select"
                    value={expenseCategoryFilter}
                    onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                  >
                    <option value="all">All Categories ({expenses.length})</option>
                    {EXPENSE_CATEGORIES.map((cat) => {
                      const count = expenses.filter((e) => (e.category || '').toLowerCase() === cat.toLowerCase()).length;
                      return (
                        <option key={cat} value={cat}>
                          {cat} ({count})
                        </option>
                      );
                    })}
                  </select>

                  <div className="expense-search-input">
                    <Search size={14} style={{ color: 'var(--text-disabled)' }} />
                    <input
                      type="text"
                      placeholder="Search payee, notes..."
                      value={expenseSearchQuery}
                      onChange={(e) => setExpenseSearchQuery(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleOpenAddExpense}
                  >
                    <Plus size={14} />
                    <span>Add Expense</span>
                  </button>
                </div>
              )}

              {/* Tab 2: Income Controls */}
              {activeLedgerTab === 'income' && (
                <div className="expense-filter-controls">
                  <select
                    className="expense-category-select"
                    value={incomeCategoryFilter}
                    onChange={(e) => setIncomeCategoryFilter(e.target.value)}
                  >
                    <option value="all">All Income Categories ({payments.length})</option>
                    {INCOME_CATEGORIES.map((cat) => {
                      const count = payments.filter((p) => {
                        const c = p.category || (p.bookingId ? 'Hall Booking' : 'Other Income');
                        return c.toLowerCase() === cat.toLowerCase();
                      }).length;
                      return (
                        <option key={cat} value={cat}>
                          {cat} ({count})
                        </option>
                      );
                    })}
                  </select>

                  <div className="expense-search-input">
                    <Search size={14} style={{ color: 'var(--text-disabled)' }} />
                    <input
                      type="text"
                      placeholder="Search payer, ref, notes..."
                      value={incomeSearchQuery}
                      onChange={(e) => setIncomeSearchQuery(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleOpenAddIncome}
                  >
                    <Plus size={14} />
                    <span>Add Income</span>
                  </button>
                </div>
              )}
            </div>

            {/* TAB CONTENT 1: EXPENSES TABLE */}
            {activeLedgerTab === 'expenses' && (
              <>
                {filteredExpenses.length === 0 ? (
                  <div className="trend-empty-note">
                    {expenseSearchQuery || expenseCategoryFilter !== 'all' ? (
                      <span>No expense records match your current filter.</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '16px 0' }}>
                        <span>No operational expense records found in Firestore.</span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={handleOpenAddExpense}
                        >
                          <Plus size={14} />
                          <span>Record First Expense</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="trend-table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date & Ref</th>
                          <th>Category</th>
                          <th>Payee & Description</th>
                          <th>Payment Method</th>
                          <th>Amount</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExpenses.map((exp) => (
                          <tr key={exp.id} className="animate-fade-in">
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
                                  {formatDateDisplay(exp.expenseDate)}
                                </strong>
                                <span style={{ fontSize: '10.5px', color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}>
                                  #{exp.id.slice(0, 8).toUpperCase()}
                                </span>
                              </div>
                            </td>

                            <td>
                              <span className="expense-category-badge">
                                <Tag size={10} />
                                <span>{exp.category || 'Other'}</span>
                              </span>
                            </td>

                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '280px' }}>
                                {exp.payee && (
                                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <User size={12} style={{ color: 'var(--text-muted)' }} />
                                    <span>{exp.payee}</span>
                                  </div>
                                )}
                                {exp.description && (
                                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    {exp.description}
                                  </div>
                                )}
                                {exp.notes && (
                                  <div style={{ fontSize: '11px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
                                    {exp.notes}
                                  </div>
                                )}
                                {!exp.payee && !exp.description && !exp.notes && (
                                  <span style={{ color: 'var(--text-disabled)' }}>—</span>
                                )}
                              </div>
                            </td>

                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span className="expense-method-tag">
                                  <CreditCard size={11} />
                                  <span>{exp.paymentMethod || 'Cash'}</span>
                                </span>
                                {exp.transactionReference && (
                                  <span style={{ fontSize: '10.5px', color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}>
                                    Ref: {exp.transactionReference}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td>
                              <div className="expense-amount-cell">
                                {formatINR(exp.amount)}
                              </div>
                            </td>

                            <td>
                              <div className="expense-table-actions">
                                <button
                                  type="button"
                                  className="table-action-icon-btn edit-btn"
                                  onClick={() => handleOpenEditExpense(exp)}
                                  title="Edit expense"
                                  aria-label={`Edit expense #${exp.id.slice(0, 8)}`}
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  type="button"
                                  className="table-action-icon-btn delete-btn"
                                  onClick={() => setDeletingExpense(exp)}
                                  title="Delete expense"
                                  aria-label={`Delete expense #${exp.id.slice(0, 8)}`}
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
                )}
              </>
            )}

            {/* TAB CONTENT 2: INCOME RECEIPTS TABLE */}
            {activeLedgerTab === 'income' && (
              <>
                {filteredIncomePayments.length === 0 ? (
                  <div className="trend-empty-note">
                    {incomeSearchQuery || incomeCategoryFilter !== 'all' ? (
                      <span>No income receipts match your current filter.</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '16px 0' }}>
                        <span>No income receipts recorded yet.</span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={handleOpenAddIncome}
                        >
                          <Plus size={14} />
                          <span>Record First Income</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="trend-table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date & Ref</th>
                          <th>Income Category</th>
                          <th>Payer / Source</th>
                          <th>Payment Method</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredIncomePayments.map((payment) => {
                          const isVoided = payment.status === 'Voided';
                          const cat = payment.category || (payment.bookingId ? 'Hall Booking' : 'Other Income');

                          return (
                            <tr key={payment.id} className={`animate-fade-in${isVoided ? ' voided-row' : ''}`} style={isVoided ? { opacity: 0.6 } : {}}>
                              {/* Date & Ref */}
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
                                    {formatDateDisplay(payment.paymentDate)}
                                  </strong>
                                  <span style={{ fontSize: '10.5px', color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}>
                                    #{payment.id.slice(0, 8).toUpperCase()}
                                    {payment.bookingId && ` · Book #${payment.bookingId.slice(0, 6)}`}
                                  </span>
                                </div>
                              </td>

                              {/* Category */}
                              <td>
                                <span className={`badge ${
                                  cat === 'Hall Booking'
                                    ? 'badge-gold'
                                    : cat === 'Decoration Commission'
                                    ? 'badge-pending'
                                    : cat === 'Catering Commission'
                                    ? 'badge-new'
                                    : 'badge-confirmed'
                                }`}>
                                  {cat}
                                </span>
                              </td>

                              {/* Payer / Description */}
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '280px' }}>
                                  {payment.customerName && (
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <User size={12} style={{ color: 'var(--text-muted)' }} />
                                      <span>{payment.customerName}</span>
                                    </div>
                                  )}
                                  {payment.description && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                      {payment.description}
                                    </div>
                                  )}
                                  {payment.notes && (
                                    <div style={{ fontSize: '11px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
                                      {payment.notes}
                                    </div>
                                  )}
                                  {isVoided && payment.voidReason && (
                                    <div style={{ fontSize: '11px', color: '#fb7185', marginTop: '2px' }}>
                                      Void reason: {payment.voidReason}
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Payment Method */}
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span className="expense-method-tag">
                                    <CreditCard size={11} />
                                    <span>{payment.paymentMethod || 'Cash'}</span>
                                  </span>
                                  {payment.transactionReference && (
                                    <span style={{ fontSize: '10.5px', color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}>
                                      Ref: {payment.transactionReference}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Amount */}
                              <td>
                                <div style={{
                                  color: isVoided ? 'var(--text-disabled)' : '#34d399',
                                  fontWeight: 700,
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '13.5px',
                                  textDecoration: isVoided ? 'line-through' : 'none'
                                }}>
                                  {formatINR(payment.amount)}
                                </div>
                              </td>

                              {/* Status */}
                              <td>
                                <span className={`badge ${isVoided ? 'badge-cancelled' : 'badge-confirmed'}`}>
                                  {payment.status || 'Completed'}
                                </span>
                              </td>

                              {/* Actions */}
                              <td>
                                {!isVoided && (
                                  <button
                                    type="button"
                                    className="table-action-icon-btn delete-btn"
                                    onClick={() => setVoidingPayment(payment)}
                                    title="Void income receipt"
                                    aria-label={`Void payment #${payment.id.slice(0, 8)}`}
                                  >
                                    <Ban size={15} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
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
