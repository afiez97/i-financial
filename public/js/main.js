import { requireAuth, logout } from './auth.js';
import { api } from './api.js';
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

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2500);
}

async function bootstrap() {
  const user = await requireAuth();
  if (!user) return;
  store.setUser(user);
  document.getElementById('app-user-email').textContent = user.email;

  const [cardProfile, cashFlowEntries, debts, emergencyFund, financialGoals, assets, budgets] = await Promise.all([
    api.get('/card-profile').catch(() => null),
    api.get('/cash-flow-entries').catch(() => []),
    api.get('/debts').catch(() => []),
    api.get('/emergency-fund').catch(() => null),
    api.get('/financial-goals').catch(() => []),
    api.get('/assets').catch(() => []),
    api.get('/budgets').catch(() => []),
  ]);

  store.setCardProfile(cardProfile);
  store.setCashFlowEntries(cashFlowEntries ?? []);
  store.setDebts(debts ?? []);
  store.setEmergencyFund(emergencyFund);
  store.setGoals(financialGoals ?? []);
  store.setAssets(assets ?? []);
  store.setBudgets(budgets ?? []);

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

  document.getElementById('logout-btn').addEventListener('click', logout);
  window.addEventListener('toast', (e) => showToast(e.detail));

  document.getElementById('app-loading').hidden = true;
  document.getElementById('app-shell').hidden = false;
}

bootstrap();
