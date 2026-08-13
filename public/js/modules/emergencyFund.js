import { api } from '../api.js';
import { store, on, getAverageMonthlyExpense } from '../store.js';
import { formatRM, round2 } from '../utils/formatters.js';
import { validateForm, isNonNegativeAmount } from '../utils/validators.js';
import { resolveColor, STATUS } from '../utils/chartTheme.js';

let ringChart = null;

export function calculateEmergencyFund({ targetMonths, currentSavings, avgMonthlyExpense }) {
  const target = targetMonths * avgMonthlyExpense;
  const progressPercent = target > 0 ? Math.min((currentSavings / target) * 100, 100) : 0;
  const runwayMonths = avgMonthlyExpense > 0 ? round2(currentSavings / avgMonthlyExpense) : null;
  return { target: round2(target), progressPercent: round2(progressPercent), runwayMonths };
}

function renderRing(canvas, progressPercent) {
  if (ringChart) ringChart.destroy();
  const clamped = Math.min(Math.max(progressPercent, 0), 100);
  const color = clamped >= 100 ? STATUS.good : resolveColor('--series-1');
  ringChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [clamped, 100 - clamped],
        backgroundColor: [color, resolveColor('--surface-sunken')],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '78%',
      rotation: -90,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    },
  });
}

function readForm(root) {
  const targetMonths = Number(root.querySelector('input[name="targetMonths"]:checked')?.value ?? 6);
  const currentSavings = Number(root.querySelector('#currentSavings').value);
  return { target_months: targetMonths, current_savings: currentSavings };
}

function render(root) {
  const { emergencyFund, cashFlowEntries } = store.getState();
  if (!emergencyFund) return;

  const avgMonthlyExpense = getAverageMonthlyExpense(cashFlowEntries);
  const targetMonths = emergencyFund.target_months;
  const currentSavings = Number(emergencyFund.current_savings);
  const result = calculateEmergencyFund({ targetMonths, currentSavings, avgMonthlyExpense });

  root.querySelector('#emergency-avg-expense').textContent = formatRM(avgMonthlyExpense);
  root.querySelector('#emergency-target').textContent = formatRM(result.target);
  root.querySelector('#emergency-runway').textContent = result.runwayMonths === null ? '—' : `${result.runwayMonths} bulan`;

  const ringCenter = root.querySelector('#emergency-ring-percent');
  ringCenter.textContent = `${Math.round(result.progressPercent)}%`;
  root.querySelector('#emergency-ring-caption').textContent =
    result.runwayMonths === null ? 'Tiada data perbelanjaan' : `${result.runwayMonths} bulan runway`;

  renderRing(root.querySelector('#emergency-ring-chart'), result.progressPercent);

  if (avgMonthlyExpense === 0) {
    root.querySelector('#emergency-no-data').hidden = false;
  } else {
    root.querySelector('#emergency-no-data').hidden = true;
  }
}

function fillForm(root, fund) {
  root.querySelector(`input[name="targetMonths"][value="${fund.target_months}"]`).checked = true;
  root.querySelector('#currentSavings').value = fund.current_savings;
}

export function initEmergencyFund() {
  const root = document.getElementById('section-emergency');
  const fund = store.getState().emergencyFund ?? { target_months: 6, current_savings: 0 };
  fillForm(root, fund);
  render(root);

  root.querySelectorAll('#emergency-form input').forEach((el) => {
    el.addEventListener('input', () => render(root));
  });

  root.querySelector('#emergency-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const values = readForm(root);
    const valid = validateForm(
      { currentSavings: values.current_savings },
      { currentSavings: { test: () => isNonNegativeAmount(values.current_savings), message: 'Tidak boleh negatif.' } },
      root
    );
    if (!valid) return;

    const btn = root.querySelector('#emergency-save-btn');
    btn.disabled = true;
    try {
      const saved = await api.put('/emergency-fund', values);
      store.setEmergencyFund(saved);
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Disimpan.' }));
    } catch (err) {
      window.dispatchEvent(new CustomEvent('toast', { detail: err.message || 'Gagal menyimpan.' }));
    } finally {
      btn.disabled = false;
    }
  });

  on('cashFlow:changed', () => render(root));
  on('emergencyFund:changed', () => render(root));
}
