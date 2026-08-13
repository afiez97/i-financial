import { api } from '../api.js';
import { store, on, getEntriesForPeriod, getDistinctPeriods, getMonthlyTotals, sum } from '../store.js';
import { formatRM } from '../utils/formatters.js';
import { validateForm, isNonNegativeAmount, isRequiredString } from '../utils/validators.js';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, categoryLabel, MONTH_LABELS } from '../utils/constants.js';
import { resolveColor, CATEGORICAL } from '../utils/chartTheme.js';
import { currentPeriod } from '../utils/dateUtils.js';

let categoryChart = null;
let comparisonChart = null;
const editingEntryId = { income: null, expense: null };

function periodOptions(entries) {
  const periods = getDistinctPeriods(entries);
  const now = currentPeriod();
  if (!periods.some((p) => p.month === now.month && p.year === now.year)) {
    periods.push(now);
  }
  return periods.sort((a, b) => a.year - b.year || a.month - b.month);
}

function periodKey(p) {
  return `${p.year}-${p.month}`;
}

function renderPeriodSelect(root) {
  const select = root.querySelector('#cashflow-period-select');
  const { cashFlowEntries, selectedPeriod } = store.getState();
  const options = periodOptions(cashFlowEntries);
  select.innerHTML = options
    .map((p) => `<option value="${periodKey(p)}">${MONTH_LABELS[p.month - 1]} ${p.year}</option>`)
    .join('');
  select.value = periodKey(selectedPeriod);
}

function renderList(container, entries, categories, emptyText) {
  if (entries.length === 0) {
    container.innerHTML = `<div class="data-empty">${emptyText}</div>`;
    return;
  }
  container.innerHTML = `<div class="data-list">${entries.map((e) => `
    <div class="data-row" data-id="${e.id}">
      <div class="data-main">
        <div class="data-title">${categoryLabel(e.category)}${e.label ? ` · ${escapeHtml(e.label)}` : ''}</div>
      </div>
      <div class="data-amount">${formatRM(e.amount)}</div>
      <button type="button" class="btn btn-secondary btn-sm" data-action="edit-entry" data-id="${e.id}">Edit</button>
      <button type="button" class="btn btn-danger btn-sm" data-action="delete-entry" data-id="${e.id}">Padam</button>
    </div>
  `).join('')}</div>`;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function renderCategoryChart(canvas, byCategory) {
  const labels = Object.keys(byCategory);
  if (categoryChart) categoryChart.destroy();
  if (labels.length === 0) return;
  categoryChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels.map(categoryLabel),
      datasets: [{
        data: labels.map((k) => byCategory[k]),
        backgroundColor: CATEGORICAL,
        borderColor: resolveColor('--surface-card'),
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: resolveColor('--text-secondary'), boxWidth: 10 } } },
    },
  });
}

function renderComparisonChart(canvas, income, expense) {
  if (comparisonChart) comparisonChart.destroy();
  comparisonChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Pendapatan', 'Perbelanjaan'],
      datasets: [{
        data: [income, expense],
        backgroundColor: [resolveColor('--series-1'), resolveColor('--series-2')],
        borderRadius: 4,
        maxBarThickness: 64,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatRM(v) } } },
    },
  });
}

function render(root) {
  const { cashFlowEntries, selectedPeriod } = store.getState();
  const period = getEntriesForPeriod(cashFlowEntries, selectedPeriod.month, selectedPeriod.year);
  const income = period.filter((e) => e.type === 'income');
  const expense = period.filter((e) => e.type === 'expense');
  const totals = getMonthlyTotals(cashFlowEntries, selectedPeriod.month, selectedPeriod.year);

  renderList(root.querySelector('#cashflow-income-list'), income, INCOME_CATEGORIES, 'Belum ada pendapatan direkod bulan ini.');
  renderList(root.querySelector('#cashflow-expense-list'), expense, EXPENSE_CATEGORIES, 'Belum ada perbelanjaan direkod bulan ini.');

  root.querySelector('#cashflow-income-total').textContent = formatRM(totals.income);
  root.querySelector('#cashflow-expense-total').textContent = formatRM(totals.expense);
  const net = totals.income - totals.expense;
  const netEl = root.querySelector('#cashflow-net-total');
  netEl.textContent = formatRM(net);
  netEl.closest('.stat-tile').classList.toggle('stat-good', net >= 0);
  netEl.closest('.stat-tile').classList.toggle('stat-critical', net < 0);

  renderCategoryChart(root.querySelector('#cashflow-category-chart'), totals.byCategory);
  renderComparisonChart(root.querySelector('#cashflow-comparison-chart'), totals.income, totals.expense);
}

function populateCategorySelect(select, categories) {
  select.innerHTML = categories.map((c) => `<option value="${c.value}">${c.label}</option>`).join('');
}

function formIdFor(type) {
  return type === 'income' ? '#cashflow-income-form' : '#cashflow-expense-form';
}

function setEntryEditMode(root, type, editing) {
  const addLabel = type === 'income' ? 'Tambah Pendapatan' : 'Tambah Perbelanjaan';
  const updateLabel = type === 'income' ? 'Kemaskini Pendapatan' : 'Kemaskini Perbelanjaan';
  root.querySelector(`#cashflow-${type}-submit-btn`).textContent = editing ? updateLabel : addLabel;
  root.querySelector(`#cashflow-${type}-cancel-btn`).hidden = !editing;
}

function fillEntryForm(root, type, entry) {
  const form = root.querySelector(formIdFor(type));
  const categorySelect = form.querySelector('[data-field="category"]');
  if (categorySelect) categorySelect.value = entry.category;
  const labelInput = form.querySelector('[data-field="label"]');
  if (labelInput) labelInput.value = entry.label ?? '';
  form.querySelector('[data-field="amount"]').value = entry.amount;
}

function startEditEntry(root, id) {
  const entry = store.getState().cashFlowEntries.find((e) => e.id === Number(id));
  if (!entry) return;
  editingEntryId[entry.type] = entry.id;
  fillEntryForm(root, entry.type, entry);
  setEntryEditMode(root, entry.type, true);
  root.querySelector(formIdFor(entry.type)).querySelector('[data-field="amount"]').focus();
}

function cancelEditEntry(root, type) {
  editingEntryId[type] = null;
  root.querySelector(formIdFor(type)).reset();
  setEntryEditMode(root, type, false);
}

async function saveEntry(root, type, formId) {
  const form = root.querySelector(formId);
  const amountInput = form.querySelector('[data-field="amount"]');
  const labelInput = form.querySelector('[data-field="label"]');
  const categorySelect = form.querySelector('[data-field="category"]');
  const { selectedPeriod } = store.getState();

  const amount = Number(amountInput.value);
  const fieldKey = amountInput.id;
  const valid = validateForm(
    { [fieldKey]: amount },
    { [fieldKey]: { test: () => isNonNegativeAmount(amount) && amount > 0, message: 'Sila masukkan jumlah yang sah.' } },
    form
  );
  if (!valid) return;

  const payload = {
    month: selectedPeriod.month,
    year: selectedPeriod.year,
    type,
    category: categorySelect ? categorySelect.value : (type === 'income' ? 'salary' : 'other_expense'),
    label: labelInput.value.trim() || null,
    amount,
  };

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    if (editingEntryId[type]) {
      const entry = await api.put(`/cash-flow-entries/${editingEntryId[type]}`, payload);
      store.replaceCashFlowEntry(entry);
      cancelEditEntry(root, type);
    } else {
      const entry = await api.post('/cash-flow-entries', payload);
      store.addCashFlowEntry(entry);
      amountInput.value = '';
      if (labelInput) labelInput.value = '';
    }
  } catch (err) {
    window.dispatchEvent(new CustomEvent('toast', { detail: err.message || 'Gagal menyimpan rekod.' }));
  } finally {
    btn.disabled = false;
  }
}

async function deleteEntry(root, id) {
  if (!confirm('Padam rekod ini?')) return;
  const entry = store.getState().cashFlowEntries.find((e) => e.id === Number(id));
  try {
    await api.del(`/cash-flow-entries/${id}`);
    store.removeCashFlowEntry(Number(id));
    if (entry && editingEntryId[entry.type] === Number(id)) cancelEditEntry(root, entry.type);
  } catch (err) {
    window.dispatchEvent(new CustomEvent('toast', { detail: err.message || 'Gagal memadam.' }));
  }
}

export function initCashFlow() {
  const root = document.getElementById('section-cashflow');

  populateCategorySelect(root.querySelector('#cashflow-income-category'), INCOME_CATEGORIES);
  populateCategorySelect(root.querySelector('#cashflow-expense-category'), EXPENSE_CATEGORIES);

  renderPeriodSelect(root);
  render(root);

  root.querySelector('#cashflow-period-select').addEventListener('change', (e) => {
    const [year, month] = e.target.value.split('-').map(Number);
    store.setSelectedPeriod(month, year);
  });

  root.querySelector('#cashflow-income-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveEntry(root, 'income', '#cashflow-income-form');
  });

  root.querySelector('#cashflow-expense-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveEntry(root, 'expense', '#cashflow-expense-form');
  });

  root.querySelector('#cashflow-income-cancel-btn').addEventListener('click', () => cancelEditEntry(root, 'income'));
  root.querySelector('#cashflow-expense-cancel-btn').addEventListener('click', () => cancelEditEntry(root, 'expense'));

  root.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-action="edit-entry"]');
    if (editBtn) return startEditEntry(root, editBtn.dataset.id);
    const deleteBtn = e.target.closest('[data-action="delete-entry"]');
    if (deleteBtn) deleteEntry(root, deleteBtn.dataset.id);
  });

  on('cashFlow:changed', () => { renderPeriodSelect(root); render(root); });
  on('period:changed', () => render(root));
}
