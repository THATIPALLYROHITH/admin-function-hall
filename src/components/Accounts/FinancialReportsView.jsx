import React, { useState, useEffect, useMemo } from 'react';
import {
  PieChart,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Calendar,
  CreditCard,
  Building2,
  Receipt,
  Download,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Filter,
  CheckCircle2,
  Layers,
  ArrowRight,
  DollarSign,
  Activity,
  Award,
  Wallet
} from 'lucide-react';
import {
  subscribePayments,
  INCOME_CATEGORIES
} from '../../services/paymentsService';
import {
  subscribeExpenses,
  EXPENSE_CATEGORIES
} from '../../services/expensesService';
import { subscribeBookings } from '../../services/bookingsService';
import {
  calculateFinancialSummary,
  calculateExpenseCostAnalytics,
  PAYMENT_METHODS,
  exportFinancialSummaryReportCSV,
  exportExpensesToCSV
} from '../../services/accountsReportsService';
import { useAuth } from '../../context/AuthContext';
import './FinancialReportsView.css';
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

export default function FinancialReportsView({ onNavigate }) {
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
        console.error('Payments stream error in Reports:', err);
        setError('Failed to load payments stream from Firestore.');
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
        console.error('Expenses stream error in Reports:', err);
        setError('Failed to load expenses stream from Firestore.');
        setIsLoadingExpenses(false);
      }
    );

    // 3. Subscribe to Bookings (for booking analytics & receivables)
    const unsubBookings = subscribeBookings(
      (data) => {
        setBookings(data);
        setIsLoadingBookings(false);
      },
      (err) => {
        console.error('Bookings stream error in Reports:', err);
        setError('Failed to load bookings stream from Firestore.');
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

  // Income Category Breakdown & Report (Phase 3D-3)
  const incomeCategoryReportData = useMemo(() => {
    const validPayments = payments.filter((p) => {
      if (p.status === 'Voided') return false;
      const d = (p.paymentDate || '').slice(0, 10);
      if (activeDateRange.startDate && d < activeDateRange.startDate) return false;
      if (activeDateRange.endDate && d > activeDateRange.endDate) return false;
      return true;
    });

    const totalIncome = validPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const list = INCOME_CATEGORIES.map((cat) => {
      const catPayments = validPayments.filter((p) => {
        const c = p.category || (p.bookingId ? 'Hall Booking' : 'Other Income');
        return c.toLowerCase() === cat.toLowerCase();
      });
      const amount = catPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const count = catPayments.length;
      const percentage = totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0;
      return { category: cat, amount, count, percentage };
    });

    return list.sort((a, b) => b.amount - a.amount);
  }, [payments, activeDateRange]);

  // Expense Category Breakdown & Report (Phase 3D-4)
  const expenseCategoryReportData = useMemo(() => {
    const validExpenses = expenses.filter((e) => {
      const d = (e.expenseDate || '').slice(0, 10);
      if (activeDateRange.startDate && d < activeDateRange.startDate) return false;
      if (activeDateRange.endDate && d > activeDateRange.endDate) return false;
      return true;
    });

    const totalExpenses = validExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const list = EXPENSE_CATEGORIES.map((cat) => {
      const catExpenses = validExpenses.filter((e) => (e.category || '').toLowerCase() === cat.toLowerCase());
      const amount = catExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const count = catExpenses.length;
      const percentage = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
      return { category: cat, amount, count, percentage };
    });

    return list.sort((a, b) => b.amount - a.amount);
  }, [expenses, activeDateRange]);

  // Booking Performance Metrics (Phase 3D-5)
  const bookingPerformance = useMemo(() => {
    const totalCount = bookings.length;
    const confirmedList = bookings.filter((b) => (b.bookingStatus || '').toLowerCase() === 'confirmed');
    const completedList = bookings.filter((b) => (b.bookingStatus || '').toLowerCase() === 'completed');
    const cancelledList = bookings.filter((b) => (b.bookingStatus || '').toLowerCase() === 'cancelled');
    const activeList = bookings.filter((b) => {
      const s = (b.bookingStatus || '').toLowerCase();
      return s === 'confirmed' || s === 'completed' || s === 'tentative';
    });

    const totalContractedAmount = activeList.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const totalReceived = activeList.reduce((sum, b) => sum + (Number(b.totalPaid) || 0), 0);
    const totalBalanceDue = activeList.reduce((sum, b) => sum + (Number(b.balanceAmount) || 0), 0);
    const averageBookingValue = activeList.length > 0 ? Math.round(totalContractedAmount / activeList.length) : 0;

    return {
      totalCount,
      confirmedCount: confirmedList.length,
      completedCount: completedList.length,
      cancelledCount: cancelledList.length,
      activeCount: activeList.length,
      totalContractedAmount,
      totalReceived,
      totalBalanceDue,
      averageBookingValue
    };
  }, [bookings]);

  // Monthly Comparison: Current Month vs Previous Month (Phase 3D-6)
  const monthlyComparison = useMemo(() => {
    const now = new Date();
    const currKey = now.toISOString().slice(0, 7); // "YYYY-MM"
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const currMonthPayments = payments.filter((p) => p.status !== 'Voided' && (p.paymentDate || '').slice(0, 7) === currKey);
    const prevMonthPayments = payments.filter((p) => p.status !== 'Voided' && (p.paymentDate || '').slice(0, 7) === prevKey);

    const currMonthExpenses = expenses.filter((e) => (e.expenseDate || '').slice(0, 7) === currKey);
    const prevMonthExpenses = expenses.filter((e) => (e.expenseDate || '').slice(0, 7) === prevKey);

    const currIncome = currMonthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const prevIncome = prevMonthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const currExpense = currMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const prevExpense = prevMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const currProfit = currIncome - currExpense;
    const prevProfit = prevIncome - prevExpense;

    const calcGrowth = (curr, prev) => {
      if (prev === 0) return curr > 0 ? '+100%' : '0%';
      const pct = ((curr - prev) / prev) * 100;
      return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
    };

    return {
      currMonthName: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      prevMonthName: prevDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      currIncome,
      prevIncome,
      incomeGrowth: calcGrowth(currIncome, prevIncome),
      isIncomeUp: currIncome >= prevIncome,
      currExpense,
      prevExpense,
      expenseGrowth: calcGrowth(currExpense, prevExpense),
      isExpenseUp: currExpense > prevExpense,
      currProfit,
      prevProfit,
      profitGrowth: calcGrowth(currProfit, prevProfit),
      isProfitUp: currProfit >= prevProfit
    };
  }, [payments, expenses]);

  // Business Insights calculations (Phase 3D-7)
  const insights = useMemo(() => {
    const topIncome = incomeCategoryReportData.length > 0 ? incomeCategoryReportData[0] : null;
    const topExpense = expenseCategoryReportData.length > 0 ? expenseCategoryReportData[0] : null;
    const margin = summary.totalIncome > 0 ? ((summary.netProfit / summary.totalIncome) * 100).toFixed(1) : '0.0';
    const collectionEfficiency = bookingPerformance.totalContractedAmount > 0
      ? Math.round((bookingPerformance.totalReceived / bookingPerformance.totalContractedAmount) * 100)
      : 0;

    return {
      topIncomeCategory: topIncome && topIncome.amount > 0 ? topIncome : null,
      topExpenseCategory: topExpense && topExpense.amount > 0 ? topExpense : null,
      netMargin: margin,
      collectionEfficiency
    };
  }, [incomeCategoryReportData, expenseCategoryReportData, summary, bookingPerformance]);

  const isLoading = isLoadingPayments || isLoadingExpenses || isLoadingBookings;

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

  // Phase 3G Expense Cost Analytics
  const expenseAnalytics = useMemo(() => {
    return calculateExpenseCostAnalytics(expenses, activeDateRange);
  }, [expenses, activeDateRange]);

  // Export Financial Summary Handler
  const handleExportReportCSV = () => {
    exportFinancialSummaryReportCSV({
      periodLabel: activeDateRange.label,
      summary,
      incomeCategories: incomeCategoryReportData,
      expenseCategories: expenseCategoryReportData,
      bookingPerformance,
      monthlyComparison
    });
    showSuccess('Financial Summary & Insights report exported to CSV successfully.');
  };

  // Phase 3G Export Expenses CSV Handler
  const handleExportExpensesCSV = () => {
    exportExpensesToCSV(expenses, activeDateRange, activeDateRange.label);
    showSuccess('Expense disbursements report exported to CSV successfully.');
  };

  return (
    <div className="reports-view-container animate-fade-in">
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

      {/* Top Navigation & Breadcrumb */}
      <div className="reports-top-nav">
        <button
          type="button"
          className="back-to-accounts-btn"
          onClick={() => onNavigate?.('accounts')}
        >
          <ArrowLeft size={16} />
          <span>Back to Accounts & Finance</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate?.('receivables')}
            style={{ gap: '5px' }}
          >
            <Clock size={14} style={{ color: '#fbbf24' }} />
            <span>Manage Receivables</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleExportExpensesCSV}
            style={{ gap: '5px' }}
            title="Download operational expense records for this period"
          >
            <Download size={14} style={{ color: '#f87171' }} />
            <span>Export Expenses CSV</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleExportReportCSV}
            style={{ gap: '6px' }}
          >
            <Download size={14} />
            <span>Export Financial Summary CSV</span>
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="accounts-welcome-card">
        <div className="welcome-content">
          <div className="welcome-badge">
            <Sparkles size={13} />
            <span>VLNS Gardens Accounts & Finance • Reports & Insights</span>
          </div>
          <h2 className="welcome-title">Financial Reports & Business Insights</h2>
          <p className="welcome-desc">
            Strategic breakdown of revenue streams, operational expenditures, profit margins, monthly performance, and booking efficiency.
          </p>
        </div>
      </div>

      {/* Financial Period Filter Card */}
      <div className="card period-filter-card">
        <div className="period-filter-row">
          <div className="period-presets-group">
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginRight: '4px' }}>
              <Filter size={14} />
              <span>Report Period:</span>
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

        {/* Custom Range Inputs */}
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
          <span>Generating financial analytics from Firestore...</span>
        </div>
      ) : (
        <>
          {/* 1. Core Financial Summary KPI Bar */}
          <div className="accounts-kpi-grid">
            <div className="kpi-card kpi-income">
              <div className="kpi-top">
                <div className="kpi-icon-box icon-income">
                  <ArrowUpRight size={22} />
                </div>
                <span className="badge badge-confirmed">Total Income</span>
              </div>
              <div className="kpi-body">
                <div className="kpi-value">{formatINR(summary.totalIncome)}</div>
                <div className="kpi-title">Recorded Receipts</div>
                <div className="kpi-subtitle">{summary.validPaymentCount} completed receipts</div>
              </div>
              <div className="kpi-footer">
                <span>{activeDateRange.label}</span>
              </div>
            </div>

            <div className="kpi-card kpi-expense">
              <div className="kpi-top">
                <div className="kpi-icon-box icon-expense">
                  <ArrowDownRight size={22} />
                </div>
                <span className="badge badge-cancelled">Total Expenses</span>
              </div>
              <div className="kpi-body">
                <div className="kpi-value">{formatINR(summary.totalExpenses)}</div>
                <div className="kpi-title">Operational Costs</div>
                <div className="kpi-subtitle">{summary.expenseCount} recorded disbursements</div>
              </div>
              <div className="kpi-footer">
                <span>{activeDateRange.label}</span>
              </div>
            </div>

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
                <div className="kpi-title">Net Profit Margin</div>
                <div className="kpi-subtitle">
                  {summary.totalIncome > 0
                    ? `${((summary.netProfit / summary.totalIncome) * 100).toFixed(1)}% profit margin`
                    : 'Revenue minus costs'}
                </div>
              </div>
              <div className="kpi-footer">
                <span>Income minus total expenses</span>
              </div>
            </div>

            <div
              className="kpi-card kpi-receivables"
              onClick={() => onNavigate?.('receivables')}
              style={{ cursor: 'pointer' }}
              title="Click to view Receivables Management"
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
                <div className="kpi-subtitle">{summary.activeBookingsCount} active bookings with due</div>
              </div>
              <div className="kpi-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Real-time customer dues</span>
                <span style={{ color: 'var(--brand-gold-light)', fontWeight: 600, fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span>Manage</span>
                  <ArrowRight size={12} />
                </span>
              </div>
            </div>
          </div>

          {/* 2. Executive Business Insights Grid (Phase 3D-7) */}
          <div className="insights-grid">
            {/* Insight 1: Top Income Driver */}
            <div className="insight-card">
              <div className="insight-header">
                <span className="insight-title">
                  <Award size={14} style={{ color: 'var(--brand-gold)' }} />
                  <span>Primary Revenue Driver</span>
                </span>
                {insights.topIncomeCategory && (
                  <span className="badge badge-gold">{insights.topIncomeCategory.percentage}% Share</span>
                )}
              </div>
              <div className="insight-main-val">
                {insights.topIncomeCategory ? insights.topIncomeCategory.category : 'No Income Recorded'}
              </div>
              <div className="insight-desc">
                {insights.topIncomeCategory
                  ? `${insights.topIncomeCategory.category} contributed ${formatINR(insights.topIncomeCategory.amount)} across ${insights.topIncomeCategory.count} transaction(s) in ${activeDateRange.label}.`
                  : 'Record bookings or non-booking income to generate category insights.'}
              </div>
            </div>

            {/* Insight 2: Top Expense Category */}
            <div className="insight-card">
              <div className="insight-header">
                <span className="insight-title">
                  <Activity size={14} style={{ color: '#f87171' }} />
                  <span>Major Operating Cost</span>
                </span>
                {insights.topExpenseCategory && (
                  <span className="badge badge-cancelled">{insights.topExpenseCategory.percentage}% of Costs</span>
                )}
              </div>
              <div className="insight-main-val" style={{ color: '#f87171' }}>
                {insights.topExpenseCategory ? insights.topExpenseCategory.category : 'Zero Expenses'}
              </div>
              <div className="insight-desc">
                {insights.topExpenseCategory
                  ? `${insights.topExpenseCategory.category} is the largest expense channel at ${formatINR(insights.topExpenseCategory.amount)}.`
                  : 'Operational expenses recorded in the system will be analyzed here.'}
              </div>
            </div>

            {/* Insight 3: Collection Efficiency */}
            <div className="insight-card">
              <div className="insight-header">
                <span className="insight-title">
                  <CreditCard size={14} style={{ color: '#34d399' }} />
                  <span>Collection Efficiency</span>
                </span>
                <span className="badge badge-confirmed">{insights.collectionEfficiency}% Collected</span>
              </div>
              <div className="insight-main-val" style={{ color: '#34d399' }}>
                {formatINR(bookingPerformance.totalReceived)}
              </div>
              <div className="insight-desc">
                Collected against {formatINR(bookingPerformance.totalContractedAmount)} in total contracted active booking value. Pending balance: {formatINR(bookingPerformance.totalBalanceDue)}.
              </div>
            </div>
          </div>

          {/* 3. Monthly Comparison (MoM Growth) (Phase 3D-6) */}
          <div className="card comparison-card">
            <div className="breakdown-title-wrap">
              <BarChart3 size={20} className="breakdown-icon" style={{ color: 'var(--brand-gold-light)' }} />
              <div>
                <h3 className="breakdown-title">Month-over-Month Comparison</h3>
                <p className="breakdown-subtitle">
                  Comparing current month ({monthlyComparison.currMonthName}) vs previous month ({monthlyComparison.prevMonthName})
                </p>
              </div>
            </div>

            <div className="comparison-grid">
              {/* Income MoM */}
              <div className="comparison-box">
                <div className="comparison-label">Monthly Income</div>
                <div className="comparison-figures">
                  <span className="comparison-current">{formatINR(monthlyComparison.currIncome)}</span>
                  <span className={monthlyComparison.isIncomeUp ? 'comparison-growth-pos' : 'comparison-growth-neg'}>
                    {monthlyComparison.isIncomeUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    <span>{monthlyComparison.incomeGrowth}</span>
                  </span>
                </div>
                <div className="comparison-prev-sub">Previous Month: {formatINR(monthlyComparison.prevIncome)}</div>
              </div>

              {/* Expense MoM */}
              <div className="comparison-box">
                <div className="comparison-label">Monthly Expenses</div>
                <div className="comparison-figures">
                  <span className="comparison-current" style={{ color: '#f87171' }}>
                    {formatINR(monthlyComparison.currExpense)}
                  </span>
                  <span className={!monthlyComparison.isExpenseUp ? 'comparison-growth-pos' : 'comparison-growth-neg'}>
                    {monthlyComparison.isExpenseUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    <span>{monthlyComparison.expenseGrowth}</span>
                  </span>
                </div>
                <div className="comparison-prev-sub">Previous Month: {formatINR(monthlyComparison.prevExpense)}</div>
              </div>

              {/* Net Profit MoM */}
              <div className="comparison-box">
                <div className="comparison-label">Monthly Net Profit</div>
                <div className="comparison-figures">
                  <span className="comparison-current" style={{ color: monthlyComparison.currProfit >= 0 ? '#34d399' : '#fb7185' }}>
                    {formatINR(monthlyComparison.currProfit)}
                  </span>
                  <span className={monthlyComparison.isProfitUp ? 'comparison-growth-pos' : 'comparison-growth-neg'}>
                    {monthlyComparison.isProfitUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    <span>{monthlyComparison.profitGrowth}</span>
                  </span>
                </div>
                <div className="comparison-prev-sub">Previous Month: {formatINR(monthlyComparison.prevProfit)}</div>
              </div>
            </div>
          </div>

          {/* 4. Income & Expense Deep-Dive Breakdown Grid */}
          <div className="accounts-breakdowns-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            {/* Income Deep Dive */}
            <div className="card breakdown-card">
              <div className="breakdown-header">
                <div className="breakdown-title-wrap">
                  <CreditCard size={19} className="breakdown-icon" style={{ color: '#34d399' }} />
                  <div>
                    <h3 className="breakdown-title">Income Analysis</h3>
                    <p className="breakdown-subtitle">Detailed distribution across revenue streams</p>
                  </div>
                </div>
                <span className="badge badge-confirmed">{formatINR(summary.totalIncome)}</span>
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

            {/* Expense Deep Dive */}
            <div className="card breakdown-card">
              <div className="breakdown-header">
                <div className="breakdown-title-wrap">
                  <PieChart size={19} className="breakdown-icon" style={{ color: '#f87171' }} />
                  <div>
                    <h3 className="breakdown-title">Expense Analysis</h3>
                    <p className="breakdown-subtitle">Breakdown of venue operational costs</p>
                  </div>
                </div>
                <span className="badge badge-cancelled">{formatINR(summary.totalExpenses)}</span>
              </div>

              <div className="breakdown-list category-scroll-list">
                {expenseCategoryReportData.map((item) => {
                  return (
                    <div key={item.category} className="breakdown-row">
                      <div className="row-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="row-name">{item.category}</span>
                          <span className="report-count-tag">{item.count} {item.count === 1 ? 'record' : 'records'}</span>
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
          </div>

          {/* Phase 3G: Cost Structure & Vendor Spending Analytics */}
          <div className="card comparison-card animate-fade-in">
            <div className="breakdown-title-wrap">
              <Receipt size={20} className="breakdown-icon" style={{ color: '#f87171' }} />
              <div>
                <h3 className="breakdown-title">Cost Structure & Vendor Spending Analytics</h3>
                <p className="breakdown-subtitle">
                  Fixed vs variable cost distribution, average monthly expense run-rate, and top suppliers
                </p>
              </div>
            </div>

            <div className="cost-analytics-grid">
              {/* Left Column: Fixed vs Variable Cost Structure */}
              <div className="comparison-box" style={{ gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="comparison-label">Fixed vs Variable Cost Ratio</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Avg: {formatINR(expenseAnalytics.averageMonthlyExpense)} / month
                  </span>
                </div>

                <div className="cost-split-bar">
                  <div
                    className="cost-split-fixed"
                    style={{ width: `${expenseAnalytics.fixedCosts.percentage}%` }}
                    title={`Fixed Costs: ${expenseAnalytics.fixedCosts.percentage}%`}
                  />
                  <div
                    className="cost-split-variable"
                    style={{ width: `${expenseAnalytics.variableCosts.percentage}%` }}
                    title={`Variable Costs: ${expenseAnalytics.variableCosts.percentage}%`}
                  />
                </div>

                <div className="cost-split-legend">
                  <div className="cost-legend-item">
                    <div className="cost-legend-title">
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#60a5fa', display: 'inline-block' }} />
                      <span>Fixed Operations</span>
                    </div>
                    <div className="cost-legend-val">{formatINR(expenseAnalytics.fixedCosts.amount)}</div>
                    <div className="cost-legend-sub">
                      {expenseAnalytics.fixedCosts.percentage}% • {expenseAnalytics.fixedCosts.count} bills (EB, Staff, Maint.)
                    </div>
                  </div>

                  <div className="cost-legend-item">
                    <div className="cost-legend-title">
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
                      <span>Variable / Event</span>
                    </div>
                    <div className="cost-legend-val">{formatINR(expenseAnalytics.variableCosts.amount)}</div>
                    <div className="cost-legend-sub">
                      {expenseAnalytics.variableCosts.percentage}% • {expenseAnalytics.variableCosts.count} bills (Decor, Supplies)
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Top 5 Payees / Vendors by Spend */}
              <div className="comparison-box" style={{ gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="comparison-label">Top 5 Vendors & Payees by Spend</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {expenseAnalytics.topPayees.length} Payees
                  </span>
                </div>

                {expenseAnalytics.topPayees.length > 0 ? (
                  <div className="top-payees-list">
                    {expenseAnalytics.topPayees.map((p, idx) => (
                      <div key={p.payee} className="top-payee-row">
                        <div>
                          <div className="top-payee-name">
                            <span style={{ color: 'var(--text-muted)', marginRight: '6px', fontSize: '11px' }}>#{idx + 1}</span>
                            <span>{p.payee}</span>
                          </div>
                          <div className="top-payee-sub">{p.count} {p.count === 1 ? 'disbursement' : 'disbursements'}</div>
                        </div>
                        <div>
                          <div className="top-payee-amount">{formatINR(p.amount)}</div>
                          <div className="top-payee-percentage">{p.percentage}% of total</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                    No expense disbursements recorded in this period.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. Booking Performance Analytics (Phase 3D-5) */}
          <div className="card comparison-card">
            <div className="breakdown-title-wrap">
              <Building2 size={20} className="breakdown-icon" style={{ color: 'var(--brand-gold)' }} />
              <div>
                <h3 className="breakdown-title">Booking Performance & Pipeline</h3>
                <p className="breakdown-subtitle">Contracted event business, volume statistics, and average revenue metrics</p>
              </div>
            </div>

            <div className="booking-perf-grid">
              <div className="booking-perf-item">
                <span className="receivables-summary-label">Total Reservations</span>
                <span className="receivables-summary-val">{bookingPerformance.totalCount}</span>
                <span className="receivables-summary-sub">All database records</span>
              </div>

              <div className="booking-perf-item">
                <span className="receivables-summary-label">Confirmed Events</span>
                <span className="receivables-summary-val" style={{ color: 'var(--brand-gold-light)' }}>
                  {bookingPerformance.confirmedCount}
                </span>
                <span className="receivables-summary-sub">Active upcoming bookings</span>
              </div>

              <div className="booking-perf-item">
                <span className="receivables-summary-label">Completed Events</span>
                <span className="receivables-summary-val" style={{ color: '#34d399' }}>
                  {bookingPerformance.completedCount}
                </span>
                <span className="receivables-summary-sub">Fully paid & executed</span>
              </div>

              <div className="booking-perf-item">
                <span className="receivables-summary-label">Cancelled Events</span>
                <span className="receivables-summary-val" style={{ color: '#f87171' }}>
                  {bookingPerformance.cancelledCount}
                </span>
                <span className="receivables-summary-sub">Cancelled reservations</span>
              </div>

              <div className="booking-perf-item">
                <span className="receivables-summary-label">Total Contracted Value</span>
                <span className="receivables-summary-val" style={{ color: 'var(--text-primary)' }}>
                  {formatINR(bookingPerformance.totalContractedAmount)}
                </span>
                <span className="receivables-summary-sub">Across all active events</span>
              </div>

              <div className="booking-perf-item">
                <span className="receivables-summary-label">Average Booking Value</span>
                <span className="receivables-summary-val" style={{ color: 'var(--brand-gold-light)' }}>
                  {formatINR(bookingPerformance.averageBookingValue)}
                </span>
                <span className="receivables-summary-sub">Mean contract per booking</span>
              </div>

              <div className="booking-perf-item">
                <span className="receivables-summary-label">Received on Bookings</span>
                <span className="receivables-summary-val" style={{ color: '#34d399' }}>
                  {formatINR(bookingPerformance.totalReceived)}
                </span>
                <span className="receivables-summary-sub">Cash & online collections</span>
              </div>

              <div className="booking-perf-item">
                <span className="receivables-summary-label">Outstanding Balance</span>
                <span className="receivables-summary-val" style={{ color: '#fbbf24' }}>
                  {formatINR(bookingPerformance.totalBalanceDue)}
                </span>
                <span className="receivables-summary-sub">Active pending customer debt</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
