export function daysInMonth(year, month /* 0-11 */) {
  return new Date(year, month + 1, 0).getDate();
}

function normalizeMonth(year, month) {
  const y = year + Math.floor(month / 12);
  const m = ((month % 12) + 12) % 12;
  return { y, m };
}

/** Builds a real Date for `day` in (anchorMonth + monthsToAdd), clamping day
 *  to the actual last day of that month. */
function addMonthsClamped(year, month, day, monthsToAdd) {
  const { y, m } = normalizeMonth(year, month + monthsToAdd);
  const clamped = Math.min(day, daysInMonth(y, m));
  return new Date(y, m, clamped);
}

/**
 * Maps day-of-month inputs (statement/due/payment) onto real calendar dates.
 * Rule: any day-of-month strictly less than statementDay is assumed to fall
 * in the month AFTER the statement (matches the spec's worked example:
 * statement 17, due 6 -> next month, payment 11 -> next month).
 * anchorYear/anchorMonth (0-11) is the reference "statement month".
 */
export function normalizeCycleDates({ statementDay, dueDay, paymentDay, anchorYear, anchorMonth }) {
  const statementDate = addMonthsClamped(anchorYear, anchorMonth, statementDay, 0);
  const nextStatementDate = addMonthsClamped(anchorYear, anchorMonth, statementDay, 1);
  const dueOffset = dueDay < statementDay ? 1 : 0;
  const paymentOffset = paymentDay < statementDay ? 1 : 0;
  const dueDate = addMonthsClamped(anchorYear, anchorMonth, dueDay, dueOffset);
  const paymentDate = addMonthsClamped(anchorYear, anchorMonth, paymentDay, paymentOffset);
  return { statementDate, dueDate, paymentDate, nextStatementDate };
}

export function daysBetween(a, b) {
  const MS = 86400000;
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / MS);
}

export function formatDateMY(date) {
  return date.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function currentPeriod() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}
