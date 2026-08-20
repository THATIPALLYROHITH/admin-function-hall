/**
 * Accounting & Financial Calculations Utility
 * Aggregates valid (non-voided) payments, expenses, and bookings into financial summaries
 */

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
  const filteredBookings = bookings.filter((b) => filterByDate(b, 'eventDate'));

  // 1. Core Financial Totals
  const totalIncome = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = totalIncome - totalExpenses;

  // 2. Receivables from active bookings (Confirmed / Tentative)
  const activeBookings = filteredBookings.filter((b) => 
    b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Tentative'
  );
  const totalContractedAmount = activeBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
  const totalReceivedOnBookings = activeBookings.reduce((sum, b) => sum + (Number(b.totalPaid) || 0), 0);
  const totalOutstandingReceivables = activeBookings.reduce((sum, b) => sum + (Number(b.balanceAmount) || 0), 0);

  // 3. Payment Method Breakdown (Valid payments only)
  const paymentMethodBreakdown = filteredPayments.reduce((acc, p) => {
    const method = p.paymentMethod || 'Other';
    acc[method] = (acc[method] || 0) + (Number(p.amount) || 0);
    return acc;
  }, {});

  // 4. Expense Category Breakdown
  const expenseCategoryBreakdown = filteredExpenses.reduce((acc, e) => {
    const cat = e.category || 'Other';
    acc[cat] = (acc[cat] || 0) + (Number(e.amount) || 0);
    return acc;
  }, {});

  // 5. Monthly Trend Breakdown (YYYY-MM)
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
    paymentMethodBreakdown,
    expenseCategoryBreakdown,
    monthlyTrend: Object.values(monthlyTrend).sort((a, b) => a.month.localeCompare(b.month)),
    validPaymentCount: filteredPayments.length,
    totalPaymentRecordsCount: payments.length,
    voidedPaymentsCount: payments.filter((p) => p.status === 'Voided').length,
    expenseCount: filteredExpenses.length,
    bookingCount: filteredBookings.length
  };
}
