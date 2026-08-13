import { store } from './store.js';
import { initNav } from './nav.js';
import { initOverview } from './modules/overview.js';
import { initUobCalculator } from './modules/uobCalculator.js';
import { initCashFlow } from './modules/cashFlow.js';
import { initDebtTracker } from './modules/debtTracker.js';
import { initEmergencyFund } from './modules/emergencyFund.js';
import { initAnnualFeeWaiver } from './modules/annualFeeWaiver.js';
import { initFinancialGoals } from './modules/financialGoals.js';
import { initAssets } from './modules/assets.js';
import { initBudget } from './modules/budget.js';
import { initThemeToggle } from './theme.js';

window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.error?.stack || e.message)));

store.setUser({ id: 1, email: 'preview@example.test' });
store.setCardProfile({ id: 1, card_type: 'classic', balance: 5500, statement_day: 17, due_day: 6, payment_amount: 5000, payment_day: 11, interest_rate: 15, rate_type: 'annual', status: 'active', termination_target_date: null, termination_note: '' });
store.setCashFlowEntries([
  { id: 1, month: 8, year: 2026, type: 'income', category: 'salary', label: 'Gaji', amount: 5200 },
  { id: 2, month: 8, year: 2026, type: 'expense', category: 'rent', label: 'Sewa', amount: 1200 },
  { id: 3, month: 8, year: 2026, type: 'expense', category: 'dining', label: 'Dining', amount: 380 },
  { id: 4, month: 8, year: 2026, type: 'expense', category: 'petrol', label: 'Petrol', amount: 180 },
]);
store.setDebts([{ id: 1, name: 'PTPTN', type: 'ptptn', balance: 12000, interest_rate: 1, minimum_payment: 150 }]);
store.setEmergencyFund({ id: 1, target_months: 6, current_savings: 3000 });
store.setGoals([]);
store.setAssets([{ id: 1, name: 'Simpanan Maybank', category: 'savings', current_value: 8000, note: null }]);
store.setBudgets([
  { id: 1, category: 'dining', monthly_limit: 300 },
  { id: 2, category: 'petrol', monthly_limit: 250 },
  { id: 3, category: 'groceries', monthly_limit: 500 },
]);

initNav();
initThemeToggle();
initOverview();
initUobCalculator();
initCashFlow();
initDebtTracker();
initEmergencyFund();
initAnnualFeeWaiver();
initFinancialGoals();
initAssets();
initBudget();

document.getElementById('app-loading').hidden = true;
document.getElementById('app-shell').hidden = false;
window.__ready = true;
