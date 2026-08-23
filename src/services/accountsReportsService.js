/**
 * Accounting & Financial Calculations Utility
 * Aggregates valid (non-voided) payments, expenses, and bookings into financial summaries
 */

export const INCOME_CATEGORIES = [
  'Hall Booking',
  'Decoration Commission',
  'Catering Commission',
  'Other Income'
];

export const NON_BOOKING_INCOME_CATEGORIES = [
  'Decoration Commission',
  'Catering Commission',
  'Other Income'
];

export const PAYMENT_METHODS = [
  'Cash',
  'UPI',
  'Bank Transfer',
  'Other'
];

export const FIXED_EXPENSE_CATEGORIES = [
  'Electricity',
  'Water',
  'Staff',
  'Maintenance',
  'Marketing'
];

export const VARIABLE_EXPENSE_CATEGORIES = [
  'Decoration',
  'Repairs',
  'Cleaning',
  'Supplies',
  'Other'
];

export function calculateFinancialSummary(payments = [], expenses = [], bookings = [], dateRange = null) {
  // Optional date filtering helper
  const filterByDate = (item, dateField) => {
    if (!dateRange) return true;
    const itemDate = (item[dateField] || '').slice(0, 10);
    if (dateRange.startDate && itemDate < dateRange.startDate) return false;
    if (dateRange.endDate && itemDate > dateRange.endDate) return false;
    return true;
  };

  // Filter out voided payments so they never count toward income
  const validPayments = payments.filter((p) => p.status !== 'Voided');

  const filteredPayments = validPayments.filter((p) => filterByDate(p, 'paymentDate'));
  const filteredExpenses = expenses.filter((e) => filterByDate(e, 'expenseDate'));

  // 1. Core Financial Totals for Selected Period
  const totalIncome = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = totalIncome - totalExpenses;

  // 2. Receivables from active bookings (Confirmed / Tentative)
  // CRITICAL SAFETY RULE: Outstanding Receivables comes from active booking balances
  // and must NOT disappear when filtering the income/expense period.
  const activeBookings = bookings.filter((b) =>
    b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Tentative'
  );
  const totalContractedAmount = activeBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
  const totalReceivedOnBookings = activeBookings.reduce((sum, b) => sum + (Number(b.totalPaid) || 0), 0);
  const totalOutstandingReceivables = activeBookings.reduce((sum, b) => sum + (Number(b.balanceAmount) || 0), 0);

  // 3. Income Category Breakdown (Valid payments in selected period only)
  // Backward-compatible classification: existing or new booking payments map to 'Hall Booking'
  const incomeCategoryBreakdown = filteredPayments.reduce((acc, p) => {
    const cat = p.category || (p.bookingId ? 'Hall Booking' : 'Other Income');
    acc[cat] = (acc[cat] || 0) + (Number(p.amount) || 0);
    return acc;
  }, {});

  // 4. Money Received by Payment Method Breakdown (Valid payments in selected period only)
  const paymentMethodBreakdown = filteredPayments.reduce((acc, p) => {
    const method = p.paymentMethod || 'Other';
    acc[method] = (acc[method] || 0) + (Number(p.amount) || 0);
    return acc;
  }, {});

  // 5. Expense Category Breakdown (Disbursements in selected period only)
  const expenseCategoryBreakdown = filteredExpenses.reduce((acc, e) => {
    const cat = e.category || 'Other';
    acc[cat] = (acc[cat] || 0) + (Number(e.amount) || 0);
    return acc;
  }, {});

  // 6. Monthly Trend Breakdown (YYYY-MM)
  const monthlyTrend = {};

  filteredPayments.forEach((p) => {
    const month = (p.paymentDate || '').slice(0, 7) || 'Unknown';
    if (!monthlyTrend[month]) {
      monthlyTrend[month] = { month, income: 0, expenses: 0, profit: 0 };
    }
    monthlyTrend[month].income += Number(p.amount) || 0;
  });

  filteredExpenses.forEach((e) => {
    const month = (e.expenseDate || '').slice(0, 7) || 'Unknown';
    if (!monthlyTrend[month]) {
      monthlyTrend[month] = { month, income: 0, expenses: 0, profit: 0 };
    }
    monthlyTrend[month].expenses += Number(e.amount) || 0;
  });

  Object.values(monthlyTrend).forEach((m) => {
    m.profit = m.income - m.expenses;
  });

  return {
    totalIncome,
    totalExpenses,
    netProfit,
    totalContractedAmount,
    totalReceivedOnBookings,
    totalOutstandingReceivables,
    incomeCategoryBreakdown,
    paymentMethodBreakdown,
    expenseCategoryBreakdown,
    monthlyTrend: Object.values(monthlyTrend).sort((a, b) => a.month.localeCompare(b.month)),
    validPaymentCount: filteredPayments.length,
    totalPaymentRecordsCount: payments.length,
    voidedPaymentsCount: payments.filter((p) => p.status === 'Voided').length,
    expenseCount: filteredExpenses.length,
    bookingCount: bookings.length,
    activeBookingsCount: activeBookings.length
  };
}

/**
 * Detailed Expense Analytics & Cost Structure
 */
export function calculateExpenseCostAnalytics(expenses = [], dateRange = null) {
  const filterByDate = (item, dateField) => {
    if (!dateRange) return true;
    const itemDate = (item[dateField] || '').slice(0, 10);
    if (dateRange.startDate && itemDate < dateRange.startDate) return false;
    if (dateRange.endDate && itemDate > dateRange.endDate) return false;
    return true;
  };

  const filtered = expenses.filter((e) => filterByDate(e, 'expenseDate'));
  const totalExpenses = filtered.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Category breakdown
  const categoryMap = {};
  filtered.forEach((e) => {
    const cat = e.category || 'Other';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { category: cat, amount: 0, count: 0 };
    }
    categoryMap[cat].amount += Number(e.amount) || 0;
    categoryMap[cat].count += 1;
  });

  const categoryList = Object.values(categoryMap).map((item) => ({
    ...item,
    percentage: totalExpenses > 0 ? ((item.amount / totalExpenses) * 100).toFixed(1) : '0.0'
  })).sort((a, b) => b.amount - a.amount);

  // Top 5 Payees / Vendors
  const payeeMap = {};
  filtered.forEach((e) => {
    const payeeName = (e.payee || '').trim() || 'General / Unspecified';
    if (!payeeMap[payeeName]) {
      payeeMap[payeeName] = { payee: payeeName, amount: 0, count: 0 };
    }
    payeeMap[payeeName].amount += Number(e.amount) || 0;
    payeeMap[payeeName].count += 1;
  });

  const topPayees = Object.values(payeeMap).map((item) => ({
    ...item,
    percentage: totalExpenses > 0 ? ((item.amount / totalExpenses) * 100).toFixed(1) : '0.0'
  })).sort((a, b) => b.amount - a.amount).slice(0, 5);

  // Fixed vs Variable Cost Structure
  let fixedAmount = 0;
  let fixedCount = 0;
  let variableAmount = 0;
  let variableCount = 0;

  filtered.forEach((e) => {
    const cat = e.category || 'Other';
    const amt = Number(e.amount) || 0;
    if (FIXED_EXPENSE_CATEGORIES.includes(cat)) {
      fixedAmount += amt;
      fixedCount += 1;
    } else {
      variableAmount += amt;
      variableCount += 1;
    }
  });

  // Monthly Average Run-Rate
  const monthsSet = new Set();
  filtered.forEach((e) => {
    const m = (e.expenseDate || '').slice(0, 7);
    if (m) monthsSet.add(m);
  });
  const distinctMonths = Math.max(1, monthsSet.size);
  const averageMonthlyExpense = totalExpenses / distinctMonths;

  return {
    totalExpenses,
    expenseCount: filtered.length,
    categoryList,
    topPayees,
    fixedCosts: {
      amount: fixedAmount,
      count: fixedCount,
      percentage: totalExpenses > 0 ? ((fixedAmount / totalExpenses) * 100).toFixed(1) : '0.0'
    },
    variableCosts: {
      amount: variableAmount,
      count: variableCount,
      percentage: totalExpenses > 0 ? ((variableAmount / totalExpenses) * 100).toFixed(1) : '0.0'
    },
    distinctMonthsCount: distinctMonths,
    averageMonthlyExpense
  };
}

/**
 * Builds a unified list of financial transactions from payments and expenses
 */
export function buildUnifiedTransactions(payments = [], expenses = []) {
  const list = [];

  // 1. Process payments (Income receipts)
  payments.forEach((p) => {
    const isVoided = p.status === 'Voided';
    const category = p.category || (p.bookingId ? 'Hall Booking' : 'Other Income');
    list.push({
      id: p.id,
      transactionType: 'income',
      date: p.paymentDate || (p.createdAt ? p.createdAt.slice(0, 10) : ''),
      category,
      party: p.customerName || (p.bookingId ? 'Booking Customer' : 'Direct Payer'),
      description: p.description || (p.bookingId ? `Booking #${p.bookingId.slice(0, 6).toUpperCase()} Payment` : 'Direct Income Receipt'),
      amount: Number(p.amount) || 0,
      paymentMethod: p.paymentMethod || 'Cash',
      transactionReference: p.transactionReference || '',
      status: p.status || 'Completed',
      bookingId: p.bookingId || null,
      notes: p.notes || '',
      voidReason: p.voidReason || '',
      isVoided,
      raw: p
    });
  });

  // 2. Process expenses
  expenses.forEach((e) => {
    list.push({
      id: e.id,
      transactionType: 'expense',
      date: e.expenseDate || (e.createdAt ? e.createdAt.slice(0, 10) : ''),
      category: e.category || 'Other',
      party: e.payee || 'Vendor / Payee',
      description: e.description || '',
      amount: Number(e.amount) || 0,
      paymentMethod: e.paymentMethod || 'Cash',
      transactionReference: e.transactionReference || '',
      status: 'Completed',
      bookingId: null,
      notes: e.notes || '',
      voidReason: '',
      isVoided: false,
      raw: e
    });
  });

  // Sort chronological descending by date
  return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

/**
 * Exports the filtered unified transaction ledger to a clean CSV file
 */
export function exportLedgerToCSV(transactions = []) {
  if (transactions.length === 0) return;

  const headers = [
    'Date',
    'Type',
    'Category',
    'Party / Source',
    'Description',
    'Amount',
    'Payment Method',
    'Reference',
    'Status',
    'Booking Reference',
    'Notes'
  ];

  const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const rows = transactions.map((t) => [
    escape(t.date),
    escape(t.transactionType === 'income' ? 'Income' : 'Expense'),
    escape(t.category),
    escape(t.party),
    escape(t.description),
    escape(t.amount),
    escape(t.paymentMethod),
    escape(t.transactionReference),
    escape(t.status),
    escape(t.bookingId ? `#${t.bookingId.slice(0, 8).toUpperCase()}` : ''),
    escape(t.notes)
  ].join(','));

  const csvContent = [headers.map(escape).join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const todayStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `VLNS_Transaction_Ledger_${todayStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports filtered expenses only to a clean CSV
 */
export function exportExpensesToCSV(expenses = [], dateRange = null) {
  const filterByDate = (item, dateField) => {
    if (!dateRange) return true;
    const itemDate = (item[dateField] || '').slice(0, 10);
    if (dateRange.startDate && itemDate < dateRange.startDate) return false;
    if (dateRange.endDate && itemDate > dateRange.endDate) return false;
    return true;
  };

  const filtered = expenses.filter((e) => filterByDate(e, 'expenseDate'));
  if (filtered.length === 0) return;

  const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const headers = [
    'Expense Date',
    'Category',
    'Vendor / Payee',
    'Description',
    'Amount (INR)',
    'Payment Method',
    'Reference / Bill #',
    'Notes'
  ];

  const rows = filtered.map((e) => [
    escape(e.expenseDate || ''),
    escape(e.category || 'Other'),
    escape(e.payee || ''),
    escape(e.description || ''),
    escape(Number(e.amount) || 0),
    escape(e.paymentMethod || 'Cash'),
    escape(e.transactionReference || ''),
    escape(e.notes || '')
  ].join(','));

  const csvContent = [headers.map(escape).join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const todayStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `VLNS_Expense_Report_${todayStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports Financial Summary & Performance Analytics to a clean CSV
 */
export function exportFinancialSummaryReportCSV({
  periodLabel = 'Selected Period',
  summary = {},
  incomeCategories = [],
  expenseCategories = [],
  bookingPerformance = {}
}) {
  const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const lines = [];

  lines.push([escape('VLNS GARDENS — FINANCIAL REPORT & BUSINESS INSIGHTS')]);
  lines.push([escape(`Period: ${periodLabel}`), escape(`Generated: ${new Date().toLocaleString('en-IN')}`)]);
  lines.push([]);

  // Section 1: Financial Overview
  lines.push([escape('--- FINANCIAL OVERVIEW ---')]);
  lines.push([escape('Metric'), escape('Amount (INR)')]);
  lines.push([escape('Total Income'), escape(summary.totalIncome || 0)]);
  lines.push([escape('Total Expenses'), escape(summary.totalExpenses || 0)]);
  lines.push([escape('Net Profit'), escape(summary.netProfit || 0)]);
  lines.push([escape('Outstanding Receivables'), escape(summary.totalOutstandingReceivables || 0)]);
  lines.push([]);

  // Section 2: Income by Category
  lines.push([escape('--- INCOME BY CATEGORY ---')]);
  lines.push([escape('Category'), escape('Amount (INR)'), escape('Percentage (%)'), escape('Transaction Count')]);
  incomeCategories.forEach((item) => {
    lines.push([escape(item.category), escape(item.amount), escape(`${item.percentage}%`), escape(item.count)]);
  });
  lines.push([]);

  // Section 3: Expenses by Category
  lines.push([escape('--- EXPENSES BY CATEGORY ---')]);
  lines.push([escape('Category'), escape('Amount (INR)'), escape('Percentage (%)'), escape('Record Count')]);
  expenseCategories.forEach((item) => {
    lines.push([escape(item.category), escape(item.amount), escape(`${item.percentage}%`), escape(item.count)]);
  });
  lines.push([]);

  // Section 4: Booking Performance
  lines.push([escape('--- BOOKING PERFORMANCE ---')]);
  lines.push([escape('Metric'), escape('Value')]);
  lines.push([escape('Total Bookings'), escape(bookingPerformance.totalCount || 0)]);
  lines.push([escape('Confirmed Bookings'), escape(bookingPerformance.confirmedCount || 0)]);
  lines.push([escape('Completed Bookings'), escape(bookingPerformance.completedCount || 0)]);
  lines.push([escape('Cancelled Bookings'), escape(bookingPerformance.cancelledCount || 0)]);
  lines.push([escape('Total Contracted Booking Value'), escape(bookingPerformance.totalContractedAmount || 0)]);
  lines.push([escape('Average Booking Value'), escape(bookingPerformance.averageBookingValue || 0)]);
  lines.push([escape('Amount Received Against Bookings'), escape(bookingPerformance.totalReceived || 0)]);
  lines.push([escape('Outstanding Booking Balance'), escape(bookingPerformance.totalBalanceDue || 0)]);

  const csvContent = lines.map((row) => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const todayStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `VLNS_Financial_Summary_Report_${todayStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
