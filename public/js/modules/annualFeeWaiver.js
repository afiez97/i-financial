import { store, on, getDistinctPeriods, getEntriesForPeriod, sum } from '../store.js';
import { formatRM, round2 } from '../utils/formatters.js';
import { CARD_THRESHOLDS, RETAIL_CATEGORIES } from '../utils/constants.js';
import { resolveColor, STATUS } from '../utils/chartTheme.js';

let waiverChart = null;

function getAverageMonthlyRetailSpend(entries) {
  const periods = getDistinctPeriods(entries);
  if (periods.length === 0) return 0;
  const monthlySums = periods.map((p) => {
    const periodEntries = getEntriesForPeriod(entries, p.month, p.year)
      .filter((e) => e.type === 'expense' && RETAIL_CATEGORIES.includes(e.category));
    return sum(periodEntries.map((e) => Number(e.amount)));
  });
  return sum(monthlySums) / monthlySums.length;
}

export function calculateAnnualFeeWaiver({ cardType, entries }) {
  const avgMonthlyRetail = getAverageMonthlyRetailSpend(entries);
  const projectedAnnual = round2(avgMonthlyRetail * 12);
  const { waiverSpend, annualFee, label } = CARD_THRESHOLDS[cardType];
  const waived = projectedAnnual >= waiverSpend;
  return {
    avgMonthlyRetail, projectedAnnual, threshold: waiverSpend, annualFee, waived, cardLabel: label,
    shortfall: waived ? 0 : round2(waiverSpend - projectedAnnual),
  };
}

function renderChart(canvas, projected, threshold, waived) {
  if (waiverChart) waiverChart.destroy();
  waiverChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Perbelanjaan Diunjur', 'Sasaran Waiver'],
      datasets: [{
        data: [projected, threshold],
        backgroundColor: [waived ? STATUS.good : STATUS.critical, resolveColor('--text-muted')],
        borderRadius: 4,
        maxBarThickness: 64,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { callback: (v) => formatRM(v) } } },
    },
  });
}

function render(root) {
  const { cardProfile, cashFlowEntries } = store.getState();
  const cardType = cardProfile?.card_type ?? 'classic';
  const result = calculateAnnualFeeWaiver({ cardType, entries: cashFlowEntries });

  root.querySelector('#waiver-card-type-label').textContent = result.cardLabel;
  root.querySelector('#waiver-avg-monthly-retail').textContent = formatRM(result.avgMonthlyRetail);
  root.querySelector('#waiver-projected-annual').textContent = formatRM(result.projectedAnnual);
  root.querySelector('#waiver-threshold').textContent = formatRM(result.threshold);
  root.querySelector('#waiver-fee-amount').textContent = formatRM(result.annualFee);

  const pill = root.querySelector('#waiver-status-pill');
  const shortfallEl = root.querySelector('#waiver-shortfall-row');
  if (result.waived) {
    pill.textContent = 'Yuran Tahunan Diwaiverkan';
    pill.className = 'pill pill-good';
    shortfallEl.hidden = true;
  } else {
    pill.textContent = 'Sasaran Belum Dicapai';
    pill.className = 'pill pill-critical';
    shortfallEl.hidden = false;
    root.querySelector('#waiver-shortfall').textContent = formatRM(result.shortfall);
  }

  renderChart(root.querySelector('#waiver-chart'), result.projectedAnnual, result.threshold, result.waived);

  root.querySelector('#waiver-no-data').hidden = result.avgMonthlyRetail > 0;
}

export function initAnnualFeeWaiver() {
  const root = document.getElementById('section-waiver');
  render(root);

  on('cashFlow:changed', () => render(root));
  on('cardProfile:changed', () => render(root));
}
