import { api } from '../api.js';
import { store, on, getMonthlyTotals, sum } from '../store.js';
import { formatRM, formatPercent } from '../utils/formatters.js';
import { validateForm, isRequiredString, isNonNegativeAmount } from '../utils/validators.js';
import { DEBT_TYPES, debtTypeLabel, UOB_MIN_PAYMENT_PERCENT, UOB_MIN_PAYMENT_FLOOR, DTI_THRESHOLDS, MONTH_LABELS } from '../utils/constants.js';
import { resolveColor, STATUS } from '../utils/chartTheme.js';

let gaugeChart = null;
let editingDebtId = null;

function estimateUobMinimumPayment(cardProfile) {
  if (!cardProfile) return 0;
  const balance = Number(cardProfile.balance) || 0;
  return Math.max(balance * UOB_MIN_PAYMENT_PERCENT, UOB_MIN_PAYMENT_FLOOR);
}

export function dtiZone(value) {
  if (value < DTI_THRESHOLDS.safe) return 'good';
  if (value < DTI_THRESHOLDS.warning) return 'warning';
  return 'critical';
}

export function calculateTotalObligations(debts, cardProfile) {
  const debtsTotal = sum(debts.map((d) => Number(d.minimum_payment) || 0));
  const uobMin = estimateUobMinimumPayment(cardProfile);
  return { debtsTotal, uobMin, totalObligations: debtsTotal + uobMin };
}

export function calculateDti(debts, cardProfile, monthlyIncome) {
  const { debtsTotal, uobMin, totalObligations } = calculateTotalObligations(debts, cardProfile);
  if (!monthlyIncome || monthlyIncome <= 0) return null;
  return { value: (totalObligations / monthlyIncome) * 100, debtsTotal, uobMin, totalObligations };
}

function renderGauge(canvas, dtiValue) {
  if (gaugeChart) gaugeChart.destroy();
  const clamped = Math.min(Math.max(dtiValue ?? 0, 0), 100);
  const zone = dtiZone(clamped);

  gaugeChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      datasets: [
        {
          data: [DTI_THRESHOLDS.safe, DTI_THRESHOLDS.warning - DTI_THRESHOLDS.safe, 100 - DTI_THRESHOLDS.warning],
          backgroundColor: [STATUS.good, STATUS.warning, STATUS.critical],
          borderWidth: 0,
          circumference: 180,
          rotation: 270,
          weight: 1,
        },
        {
          data: [clamped, 100 - clamped],
          backgroundColor: [STATUS[zone], resolveColor('--surface-sunken')],
          borderWidth: 0,
          circumference: 180,
          rotation: 270,
          weight: 1.6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    },
  });
}

function renderList(root, debts) {
  const container = root.querySelector('#debt-list');
  if (debts.length === 0) {
    container.innerHTML = '<div class="data-empty">Belum ada hutang lain direkod.</div>';
    return;
  }
  container.innerHTML = `<div class="data-list">${debts.map((d) => `
    <div class="data-row" data-id="${d.id}">
      <div class="data-main">
        <div class="data-title">${escapeHtml(d.name)}</div>
        <div class="data-meta">${debtTypeLabel(d.type)} · Faedah ${formatPercent(d.interest_rate)} · Bayaran min. ${d.minimum_payment ? formatRM(d.minimum_payment) : '—'}</div>
      </div>
      <div class="data-amount">${formatRM(d.balance)}</div>
      <button type="button" class="btn btn-secondary btn-sm" data-action="edit-debt" data-id="${d.id}">Edit</button>
      <button type="button" class="btn btn-danger btn-sm" data-action="delete-debt" data-id="${d.id}">Padam</button>
    </div>
  `).join('')}</div>`;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function render(root) {
  const { debts, cardProfile, cashFlowEntries, selectedPeriod } = store.getState();
  renderList(root, debts);

  const totals = getMonthlyTotals(cashFlowEntries, selectedPeriod.month, selectedPeriod.year);
  root.querySelector('#dti-income-period').textContent = `${MONTH_LABELS[selectedPeriod.month - 1]} ${selectedPeriod.year}`;
  root.querySelector('#dti-income-used').textContent = formatRM(totals.income);

  const dti = calculateDti(debts, cardProfile, totals.income);
  const valueEl = root.querySelector('#dti-value');
  const pill = root.querySelector('#dti-status-pill');
  const noIncomeNotice = root.querySelector('#dti-no-income');

  if (dti === null) {
    valueEl.textContent = '—';
    pill.hidden = true;
    noIncomeNotice.hidden = false;
    renderGauge(root.querySelector('#dti-gauge-chart'), 0);
    return;
  }

  noIncomeNotice.hidden = true;
  valueEl.textContent = formatPercent(dti.value);
  const zone = dtiZone(dti.value);
  const zoneLabel = { good: 'Selamat', warning: 'Amaran', critical: 'Bahaya' }[zone];
  pill.hidden = false;
  pill.textContent = zoneLabel;
  pill.className = `pill pill-${zone}`;
  root.querySelector('#dti-obligations-total').textContent = formatRM(dti.totalObligations);
  root.querySelector('#dti-uob-min').textContent = formatRM(dti.uobMin);
  root.querySelector('#dti-debts-min').textContent = formatRM(dti.debtsTotal);

  renderGauge(root.querySelector('#dti-gauge-chart'), dti.value);
}

function setDebtEditMode(root, editing) {
  root.querySelector('#debt-submit-btn').textContent = editing ? 'Kemaskini Hutang' : 'Tambah Hutang';
  root.querySelector('#debt-cancel-edit-btn').hidden = !editing;
}

function fillDebtForm(root, debt) {
  const form = root.querySelector('#debt-form');
  form.querySelector('#debtName').value = debt.name;
  form.querySelector('#debtType').value = debt.type;
  form.querySelector('#debtBalance').value = debt.balance;
  form.querySelector('#debtInterestRate').value = debt.interest_rate;
  form.querySelector('#debtMinPayment').value = debt.minimum_payment ?? '';
}

function startEditDebt(root, id) {
  const debt = store.getState().debts.find((d) => d.id === Number(id));
  if (!debt) return;
  editingDebtId = debt.id;
  fillDebtForm(root, debt);
  setDebtEditMode(root, true);
  root.querySelector('#debtName').focus();
}

function cancelEditDebt(root) {
  editingDebtId = null;
  root.querySelector('#debt-form').reset();
  setDebtEditMode(root, false);
}

async function saveDebt(root) {
  const form = root.querySelector('#debt-form');
  const name = form.querySelector('#debtName').value.trim();
  const type = form.querySelector('#debtType').value;
  const balance = Number(form.querySelector('#debtBalance').value);
  const interestRate = Number(form.querySelector('#debtInterestRate').value);
  const minPaymentRaw = form.querySelector('#debtMinPayment').value;

  const valid = validateForm(
    { debtName: name, debtBalance: balance },
    {
      debtName: { test: () => isRequiredString(name), message: 'Sila masukkan nama hutang.' },
      debtBalance: { test: () => isNonNegativeAmount(balance), message: 'Baki tidak boleh negatif.' },
    },
    form
  );
  if (!valid) return;

  const payload = {
    name, type, balance, interest_rate: interestRate,
    minimum_payment: minPaymentRaw === '' ? null : Number(minPaymentRaw),
  };

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    if (editingDebtId) {
      const debt = await api.put(`/debts/${editingDebtId}`, payload);
      store.replaceDebt(debt);
      cancelEditDebt(root);
    } else {
      const debt = await api.post('/debts', payload);
      store.addDebt(debt);
      form.reset();
    }
  } catch (err) {
    window.dispatchEvent(new CustomEvent('toast', { detail: err.message || 'Gagal menyimpan hutang.' }));
  } finally {
    btn.disabled = false;
  }
}

async function deleteDebt(root, id) {
  if (!confirm('Padam hutang ini?')) return;
  try {
    await api.del(`/debts/${id}`);
    store.removeDebt(Number(id));
    if (editingDebtId === Number(id)) cancelEditDebt(root);
  } catch (err) {
    window.dispatchEvent(new CustomEvent('toast', { detail: err.message || 'Gagal memadam.' }));
  }
}

export function initDebtTracker() {
  const root = document.getElementById('section-debts');

  root.querySelector('#debtType').innerHTML = DEBT_TYPES.map((t) => `<option value="${t.value}">${t.label}</option>`).join('');

  render(root);

  root.querySelector('#debt-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveDebt(root);
  });

  root.querySelector('#debt-cancel-edit-btn').addEventListener('click', () => cancelEditDebt(root));

  root.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-action="edit-debt"]');
    if (editBtn) return startEditDebt(root, editBtn.dataset.id);
    const deleteBtn = e.target.closest('[data-action="delete-debt"]');
    if (deleteBtn) deleteDebt(root, deleteBtn.dataset.id);
  });

  on('debts:changed', () => render(root));
  on('cashFlow:changed', () => render(root));
  on('period:changed', () => render(root));
  on('cardProfile:changed', () => render(root));
}
