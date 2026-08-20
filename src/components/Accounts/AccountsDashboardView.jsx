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
  HelpCircle
} from 'lucide-react';
import { subscribePayments } from '../../services/paymentsService';
import { subscribeExpenses, EXPENSE_CATEGORIES } from '../../services/expensesService';
import { subscribeBookings } from '../../services/bookingsService';
import { calculateFinancialSummary } from '../../services/accountsReportsService';
import { useAuth } from '../../context/AuthContext';
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

export default function AccountsDashboardView() {
  const { isAuthenticated, isAuthLoading } = useAuth();
  
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [bookings, setBookings] = useState([]);
  
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [error, setError] = useState(null);

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

  const isLoading = isLoadingPayments || isLoadingExpenses || isLoadingBookings;
  const hasNoFinancialData = payments.length === 0 && expenses.length === 0 && bookings.length === 0;

  // Standard payment methods list for breakdown
  const PAYMENT_METHODS = ['UPI', 'Cash', 'Bank Transfer', 'Other'];

  return (
    <div className="accounts-dashboard animate-fade-in">
      {/* Header Banner */}
      <div className="accounts-welcome-card">
        <div className="welcome-content">
          <div className="welcome-badge">
            <Sparkles size={13} />
            <span>VLNS Gardens Accounts & Finance • Phase 2</span>
          </div>
          <h2 className="welcome-title">Financial Performance & Ledger</h2>
          <p className="welcome-desc">
            Real-time tracking of venue income, operational expenses, profit margins, and customer receivables.
          </p>
        </div>
        <div className="welcome-sync-badge">
          <div className="sync-dot"></div>
          <span>Live Firestore Sync</span>
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
                <span>Source of truth from payments</span>
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

          {/* Breakdowns Section (2 Columns) */}
          <div className="accounts-breakdowns-grid">
            {/* Income by Payment Method */}
            <div className="card breakdown-card">
              <div className="breakdown-header">
                <div className="breakdown-title-wrap">
                  <CreditCard size={19} className="breakdown-icon" />
                  <div>
                    <h3 className="breakdown-title">Income by Payment Method</h3>
                    <p className="breakdown-subtitle">Distribution of receipts across payment channels</p>
                  </div>
                </div>
                <span className="badge badge-confirmed">
                  {formatINR(summary.totalIncome)}
                </span>
              </div>

              <div className="breakdown-list">
                {PAYMENT_METHODS.map((method) => {
                  const amount = summary.paymentMethodBreakdown[method] || 0;
                  const percentage = summary.totalIncome > 0 
                    ? Math.round((amount / summary.totalIncome) * 100) 
                    : 0;

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
                          className={`progress-fill progress-method-${method.toLowerCase().replace(/\s+/g, '-')}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expenses by Category */}
            <div className="card breakdown-card">
              <div className="breakdown-header">
                <div className="breakdown-title-wrap">
                  <PieChart size={19} className="breakdown-icon" />
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
        </>
      )}
    </div>
  );
}
