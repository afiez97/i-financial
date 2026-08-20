import { currentPeriod } from './utils/dateUtils.js';

const bus = new EventTarget();

export function emit(name, detail) {
  bus.dispatchEvent(new CustomEvent(name, { detail }));
}

export function on(name, cb) {
  bus.addEventListener(name, (e) => cb(e.detail));
}

const state = {
  user: null,
  cardProfile: null,
  cashFlowEntries: [],
  selectedPeriod: currentPeriod(),
  debts: [],
  emergencyFund: null,
  financialGoals: [],
  assets: [],
  budgets: [],
  recurringTransactions: [],
  cardStatements: [],
};

export const store = {
  getState() {
    return state;
  },
  setUser(user) {
    state.user = user;
    emit('user:changed', user);
  },
  setCardProfile(profile) {
    state.cardProfile = profile;
    emit('cardProfile:changed', profile);
  },
  setCashFlowEntries(list) {
    state.cashFlowEntries = list;
    emit('cashFlow:changed', state.cashFlowEntries);
  },
  addCashFlowEntry(entry) {
    state.cashFlowEntries = [...state.cashFlowEntries, entry];
    emit('cashFlow:changed', state.cashFlowEntries);
  },
  replaceCashFlowEntry(entry) {
    state.cashFlowEntries = state.cashFlowEntries.map((e) => (e.id === entry.id ? entry : e));
    emit('cashFlow:changed', state.cashFlowEntries);
  },
  removeCashFlowEntry(id) {
    state.cashFlowEntries = state.cashFlowEntries.filter((e) => e.id !== id);
    emit('cashFlow:changed', state.cashFlowEntries);
  },
  setSelectedPeriod(month, year) {
    state.selectedPeriod = { month, year };
    emit('period:changed', state.selectedPeriod);
  },
  setDebts(list) {
    state.debts = list;
    emit('debts:changed', state.debts);
  },
  addDebt(debt) {
    state.debts = [...state.debts, debt];
    emit('debts:changed', state.debts);
  },
  replaceDebt(debt) {
    state.debts = state.debts.map((d) => (d.id === debt.id ? debt : d));
    emit('debts:changed', state.debts);
  },
  removeDebt(id) {
    state.debts = state.debts.filter((d) => d.id !== id);
    emit('debts:changed', state.debts);
  },
  setEmergencyFund(fund) {
    state.emergencyFund = fund;
    emit('emergencyFund:changed', fund);
  },
  setGoals(list) {
    state.financialGoals = list;
    emit('financialGoals:changed', state.financialGoals);
  },
  addGoal(goal) {
    state.financialGoals = [...state.financialGoals, goal];
    emit('financialGoals:changed', state.financialGoals);
  },
  replaceGoal(goal) {
    state.financialGoals = state.financialGoals.map((g) => (g.id === goal.id ? goal : g));
    emit('financialGoals:changed', state.financialGoals);
  },
  removeGoal(id) {
    state.financialGoals = state.financialGoals.filter((g) => g.id !== id);
    emit('financialGoals:changed', state.financialGoals);
  },
  setAssets(list) {
    state.assets = list;
    emit('assets:changed', state.assets);
  },
  addAsset(asset) {
    state.assets = [...state.assets, asset];
    emit('assets:changed', state.assets);
  },
  replaceAsset(asset) {
    state.assets = state.assets.map((a) => (a.id === asset.id ? asset : a));
    emit('assets:changed', state.assets);
  },
  removeAsset(id) {
    state.assets = state.assets.filter((a) => a.id !== id);
    emit('assets:changed', state.assets);
  },
  setBudgets(list) {
    state.budgets = list;
    emit('budgets:changed', state.budgets);
  },
  addBudget(budget) {
    state.budgets = [...state.budgets, budget];
    emit('budgets:changed', state.budgets);
  },
  replaceBudget(budget) {
    state.budgets = state.budgets.map((b) => (b.id === budget.id ? budget : b));
    emit('budgets:changed', state.budgets);
  },
  removeBudget(id) {
    state.budgets = state.budgets.filter((b) => b.id !== id);
    emit('budgets:changed', state.budgets);
  },
  setRecurringTransactions(list) {
    state.recurringTransactions = list;
    emit('recurringTransactions:changed', state.recurringTransactions);
  },
  addRecurringTransaction(recurring) {
    state.recurringTransactions = [...state.recurringTransactions, recurring];
    emit('recurringTransactions:changed', state.recurringTransactions);
  },
  replaceRecurringTransaction(recurring) {
    state.recurringTransactions = state.recurringTransactions.map((r) => (r.id === recurring.id ? recurring : r));
    emit('recurringTransactions:changed', state.recurringTransactions);
  },
  removeRecurringTransaction(id) {
    state.recurringTransactions = state.recurringTransactions.filter((r) => r.id !== id);
    emit('recurringTransactions:changed', state.recurringTransactions);
  },
  setCardStatements(list) {
    state.cardStatements = list;
    emit('cardStatements:changed', state.cardStatements);
  },
  addCardStatement(statement) {
    state.cardStatements = [...state.cardStatements, statement];
    emit('cardStatements:changed', state.cardStatements);
  },
  replaceCardStatement(statement) {
    state.cardStatements = state.cardStatements.map((s) => (s.id === statement.id ? statement : s));
    emit('cardStatements:changed', state.cardStatements);
  },
  removeCardStatement(id) {
    state.cardStatements = state.cardStatements.filter((s) => s.id !== id);
    emit('cardStatements:changed', state.cardStatements);
  },
};

// ---- Selectors: derived data shared across modules ----

export function getEntriesForPeriod(entries, month, year) {
  return entries.filter((e) => e.month === month && e.year === year);
}

export function getDistinctPeriods(entries) {
  const seen = new Map();
  for (const e of entries) {
    const key = `${e.year}-${e.month}`;
    if (!seen.has(key)) seen.set(key, { month: e.month, year: e.year });
  }
  return [...seen.values()].sort((a, b) => a.year - b.year || a.month - b.month);
}

export function getMonthlyTotals(entries, month, year) {
  const period = getEntriesForPeriod(entries, month, year);
  const income = sum(period.filter((e) => e.type === 'income').map((e) => Number(e.amount)));
  const expense = sum(period.filter((e) => e.type === 'expense').map((e) => Number(e.amount)));
  const byCategory = {};
  for (const e of period.filter((x) => x.type === 'expense')) {
    byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
  }
  return { income, expense, byCategory };
}

export function getAverageMonthlyExpense(entries) {
  const periods = getDistinctPeriods(entries);
  if (periods.length === 0) return 0;
  const totals = periods.map((p) => getMonthlyTotals(entries, p.month, p.year).expense);
  return sum(totals) / totals.length;
}

export function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

/** Most recent card statement by (year, month) — used as the live input for
 *  the UOB calculator's dual-phase simulation, since payment amount/date now
 *  live only in per-month records rather than as a static card_profile field. */
export function getLatestCardStatement(cardStatements) {
  if (cardStatements.length === 0) return null;
  return [...cardStatements].sort((a, b) => b.year - a.year || b.month - a.month)[0];
}
