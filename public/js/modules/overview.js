import { api } from '../api.js';
import { store, on, getMonthlyTotals, getAverageMonthlyExpense, getDistinctPeriods, sum } from '../store.js';
import { formatRM, formatRMSigned, formatPercent, round2 } from '../utils/formatters.js';
import { MONTH_LABELS, categoryLabel } from '../utils/constants.js';
import { currentPeriod } from '../utils/dateUtils.js';
import { STATUS } from '../utils/chartTheme.js';
import { calculateDti, dtiZone } from './debtTracker.js';
import { calculateEmergencyFund } from './emergencyFund.js';
import { calculateSafeToSpend } from './safeToSpend.js';
import { generateInsights } from './insights.js';
import { calculateGoalsSummary } from './financialGoals.js';
import { calculateNetWorth } from './assets.js';
import { calculateBudgetProgress } from './budget.js';

const DTI_ZONE_LABELS = { good: 'Selamat', warning: 'Amaran', critical: 'Bahaya' };
let trendChart = null;

function renderTrendChart(canvas, entries) {
  const periods = getDistinctPeriods(entries).slice(-6);
  const emptyEl = document.getElementById('overview-trend-empty');

  if (trendChart) trendChart.destroy();
  if (periods.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  const nets = periods.map((p) => {
    const totals = getMonthlyTotals(entries, p.month, p.year);
    return round2(totals.income - totals.expense);
  });
  const labels = periods.map((p) => `${MONTH_LABELS[p.month - 1]} ${p.year}`);

  trendChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: nets,
        backgroundColor: nets.map((n) => (n >= 0 ? STATUS.good : STATUS.critical)),
        borderRadius: 4,
        maxBarThickness: 48,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { ticks: { callback: (v) => formatRM(v) } },
      },
    },
  });
}

function renderSafeToSpend(root, { cashFlowEntries, selectedPeriod, debts, cardProfile, emergencyFund }) {
  const result = calculateSafeToSpend({
    entries: cashFlowEntries, debts, cardProfile, emergencyFund, period: selectedPeriod,
  });

  const valueEl = root.querySelector('#overview-safe-to-spend');
  valueEl.textContent = formatRMSigned(result.safeToSpend);
  valueEl.closest('.stat-tile').classList.toggle('stat-good', result.safeToSpend >= 0);
  valueEl.closest('.stat-tile').classList.toggle('stat-critical', result.safeToSpend < 0);

  root.querySelector('#overview-sts-net').textContent = formatRMSigned(result.netCashFlow);
  root.querySelector('#overview-sts-debt').textContent = formatRM(result.debtReserve);
  const efRow = root.querySelector('#overview-sts-ef-row');
  efRow.hidden = result.efReserve <= 0;
  if (result.efReserve > 0) root.querySelector('#overview-sts-ef').textContent = formatRM(result.efReserve);

  const now = currentPeriod();
  const periodNote = root.querySelector('#overview-sts-period-note');
  const isCurrentMonth = selectedPeriod.month === now.month && selectedPeriod.year === now.year;
  periodNote.hidden = isCurrentMonth;
  if (!isCurrentMonth) {
    periodNote.textContent = `Menunjukkan anggaran untuk ${MONTH_LABELS[selectedPeriod.month - 1]} ${selectedPeriod.year} — bukan bulan semasa.`;
  }

  const notice = root.querySelector('#overview-sts-notice');
  const noticeIcon = root.querySelector('#overview-sts-notice-icon');
  const noticeText = root.querySelector('#overview-sts-notice-text');
  if (result.safeToSpend < 0) {
    notice.hidden = false;
    notice.className = 'banner banner-critical';
    noticeIcon.textContent = '⚠️';
    noticeText.textContent = `Perbelanjaan sudah melebihi baki selamat sebanyak ${formatRM(Math.abs(result.safeToSpend))} bulan ini.`;
  } else if (result.noIncome) {
    notice.hidden = false;
    notice.className = 'banner banner-warning';
    noticeIcon.textContent = '⏳';
    noticeText.textContent = 'Tiada pendapatan direkod bulan ini — anggaran ini berdasarkan perbelanjaan sahaja.';
  } else if (result.dtiZoneCritical) {
    notice.hidden = false;
    notice.className = 'banner banner-critical';
    noticeIcon.textContent = '⚠️';
    noticeText.textContent = 'Simpanan tabung kecemasan digantung sementara kerana DTI kritikal — utamakan bayaran hutang dahulu.';
  } else if (result.efTargetMet) {
    notice.hidden = false;
    notice.className = 'banner banner-good';
    noticeIcon.textContent = '✅';
    noticeText.textContent = 'Tabung kecemasan sudah mencapai sasaran — tiada simpanan tambahan diperlukan.';
  } else {
    notice.hidden = true;
  }
}

function renderGoalsSummary(root, goals) {
  const empty = root.querySelector('#overview-goals-empty');
  const summary = root.querySelector('#overview-goals-summary');
  if (goals.length === 0) {
    empty.hidden = false;
    summary.hidden = true;
    return;
  }
  empty.hidden = true;
  summary.hidden = false;
  const result = calculateGoalsSummary(goals);
  root.querySelector('#overview-goals-percent').textContent = `${Math.round(result.overallPercent)}%`;
  root.querySelector('#overview-goals-sub').textContent =
    `${result.achievedCount} drpd ${goals.length} matlamat tercapai — ${formatRM(result.totalCurrent)} / ${formatRM(result.totalTarget)}`;
}

function renderBudgetSummary(root, budgets, entries, period) {
  const empty = root.querySelector('#overview-budget-empty');
  const summary = root.querySelector('#overview-budget-summary');
  if (budgets.length === 0) {
    empty.hidden = false;
    summary.hidden = true;
    return;
  }
  empty.hidden = true;
  summary.hidden = false;
  const progress = calculateBudgetProgress(budgets, entries, period.month, period.year);
  const overCount = progress.filter((p) => p.status === 'critical').length;
  const worst = progress[0];
  root.querySelector('#overview-budget-status').textContent =
    overCount > 0 ? `${overCount} kategori melebihi had` : 'Semua kategori dalam had';
  root.querySelector('#overview-budget-sub').textContent =
    `Terburuk: ${categoryLabel(worst.category)} — ${formatRM(worst.spent)} / ${formatRM(worst.limit)}`;
}

function renderInsights(root, { cashFlowEntries, selectedPeriod, debts, cardProfile, emergencyFund, budgets }) {
  const insights = generateInsights({
    entries: cashFlowEntries, debts, cardProfile, emergencyFund, budgets, period: selectedPeriod,
  });

  const list = root.querySelector('#overview-insights-list');
  const empty = root.querySelector('#overview-insights-empty');
  if (insights.length === 0) {
    list.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  list.innerHTML = insights.map((i) => `
    <div class="banner banner-${i.severity}">
      <span class="banner-icon">${i.severity === 'critical' ? '⚠️' : i.severity === 'warning' ? '⏳' : '✅'}</span>
      <div>${i.message}</div>
    </div>
  `).join('');
}

function render(root) {
  const { cashFlowEntries, selectedPeriod, debts, cardProfile, emergencyFund, assets, budgets } = store.getState();

  root.querySelector('#overview-period-label').textContent = `${MONTH_LABELS[selectedPeriod.month - 1]} ${selectedPeriod.year}`;

  const totals = getMonthlyTotals(cashFlowEntries, selectedPeriod.month, selectedPeriod.year);
  const net = totals.income - totals.expense;
  const netEl = root.querySelector('#overview-net-total');
  netEl.textContent = formatRMSigned(net);
  netEl.closest('.stat-tile').classList.toggle('stat-good', net >= 0);
  netEl.closest('.stat-tile').classList.toggle('stat-critical', net < 0);

  const cardBalance = Number(cardProfile?.balance) || 0;
  const otherDebtsTotal = sum(debts.map((d) => Number(d.balance) || 0));
  root.querySelector('#overview-total-debt').textContent = formatRM(cardBalance + otherDebtsTotal);

  const netWorth = calculateNetWorth(assets, debts, cardProfile);
  const netWorthEl = root.querySelector('#overview-net-worth');
  netWorthEl.textContent = formatRMSigned(netWorth);
  netWorthEl.closest('.stat-tile').classList.toggle('stat-good', netWorth >= 0);
  netWorthEl.closest('.stat-tile').classList.toggle('stat-critical', netWorth < 0);

  const dtiValueEl = root.querySelector('#overview-dti-value');
  const dtiPill = root.querySelector('#overview-dti-pill');
  const dti = calculateDti(debts, cardProfile, totals.income);
  if (dti === null) {
    dtiValueEl.textContent = '—';
    dtiPill.hidden = true;
  } else {
    dtiValueEl.textContent = formatPercent(dti.value);
    const zone = dtiZone(dti.value);
    dtiPill.hidden = false;
    dtiPill.textContent = DTI_ZONE_LABELS[zone];
    dtiPill.className = `pill pill-${zone}`;
  }

  const fund = emergencyFund ?? { target_months: 6, current_savings: 0 };
  const avgMonthlyExpense = getAverageMonthlyExpense(cashFlowEntries);
  const efResult = calculateEmergencyFund({
    targetMonths: fund.target_months,
    currentSavings: Number(fund.current_savings),
    avgMonthlyExpense,
  });
  root.querySelector('#overview-emergency-percent').textContent = `${Math.round(efResult.progressPercent)}%`;
  root.querySelector('#overview-emergency-runway').textContent =
    efResult.runwayMonths === null ? 'Belum ada data perbelanjaan' : `${efResult.runwayMonths} bulan runway`;

  const statusBanner = root.querySelector('#overview-card-status-banner');
  const status = cardProfile?.status ?? 'active';
  if (status === 'planned_termination') {
    statusBanner.hidden = false;
    root.querySelector('#overview-card-status-text').textContent =
      'Anda merancang untuk terminate Kad UOB ONE — lihat tab Kad UOB ONE untuk senarai semak.';
  } else if (status === 'terminated') {
    statusBanner.hidden = false;
    root.querySelector('#overview-card-status-text').textContent = 'Kad UOB ONE ditanda sudah terminate.';
  } else {
    statusBanner.hidden = true;
  }

  const state = { cashFlowEntries, selectedPeriod, debts, cardProfile, emergencyFund, budgets };
  renderSafeToSpend(root, state);
  renderInsights(root, state);
  renderGoalsSummary(root, store.getState().financialGoals);
  renderBudgetSummary(root, budgets, cashFlowEntries, selectedPeriod);
  renderTrendChart(root.querySelector('#overview-trend-chart'), cashFlowEntries);
}

async function requestAiAdvice(root) {
  const btn = root.querySelector('#ai-advice-btn');
  const resultEl = root.querySelector('#ai-advice-result');
  btn.disabled = true;
  btn.textContent = 'Menjana...';
  try {
    const result = await api.post('/financial-advice');
    resultEl.textContent = result.advice;
    resultEl.hidden = false;
  } catch (err) {
    window.dispatchEvent(new CustomEvent('toast', { detail: err.message || 'Gagal mendapatkan nasihat AI.' }));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Dapatkan Nasihat AI';
  }
}

export function initOverview() {
  const root = document.getElementById('section-overview');
  render(root);

  root.querySelector('#ai-advice-btn').addEventListener('click', () => requestAiAdvice(root));

  on('cashFlow:changed', () => render(root));
  on('period:changed', () => render(root));
  on('debts:changed', () => render(root));
  on('emergencyFund:changed', () => render(root));
  on('cardProfile:changed', () => render(root));
  on('financialGoals:changed', () => render(root));
  on('assets:changed', () => render(root));
  on('budgets:changed', () => render(root));
}
