import { api } from '../api.js';
import { store, on, getEntriesForPeriod, sum } from '../store.js';
import { formatRM } from '../utils/formatters.js';
import { validateForm, isNonNegativeAmount } from '../utils/validators.js';
import { EXPENSE_CATEGORIES, categoryLabel } from '../utils/constants.js';

let editingBudgetId = null;

export function calculateBudgetProgress(budgets, entries, month, year) {
  const period = getEntriesForPeriod(entries, month, year).filter((e) => e.type === 'expense');
  return budgets
    .map((b) => {
      const spent = sum(period.filter((e) => e.category === b.category).map((e) => Number(e.amount)));
      const limit = Number(b.monthly_limit);
      const percent = limit > 0 ? (spent / limit) * 100 : 0;
      const status = percent >= 100 ? 'critical' : percent >= 90 ? 'warning' : 'good';
      return { id: b.id, category: b.category, limit, spent, percent, status };
    })
    .sort((a, b) => b.percent - a.percent);
}

function populateCategorySelect(root, budgets, excludeId = null) {
  const budgeted = new Set(budgets.filter((b) => b.id !== excludeId).map((b) => b.category));
  const available = EXPENSE_CATEGORIES.filter((c) => !budgeted.has(c.value));
  root.querySelector('#budgetCategory').innerHTML = available.map((c) => `<option value="${c.value}">${c.label}</option>`).join('');
}

function renderProgress(root) {
  const { budgets, cashFlowEntries, selectedPeriod } = store.getState();
  const empty = root.querySelector('#budget-progress-empty');
  const list = root.querySelector('#budget-progress-list');
  if (budgets.length === 0) {
    empty.hidden = false;
    list.innerHTML = '';
    return;
  }
  empty.hidden = true;
  const progress = calculateBudgetProgress(budgets, cashFlowEntries, selectedPeriod.month, selectedPeriod.year);
  list.innerHTML = progress.map((p) => {
    const fillColor = p.status === 'critical' ? 'var(--status-critical)' : p.status === 'warning' ? 'var(--status-warning)' : 'var(--status-good)';
    return `
      <div>
        <div class="row-between" style="font-size:13px;">
          <span class="text-secondary">${categoryLabel(p.category)}</span>
          <strong>${formatRM(p.spent)} / ${formatRM(p.limit)}</strong>
        </div>
        <div class="goal-progress-track">
          <div class="goal-progress-fill" style="width:${Math.min(p.percent, 100)}%;background:${fillColor};"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderManageList(root, budgets) {
  const container = root.querySelector('#budget-manage-list');
  if (budgets.length === 0) {
    container.innerHTML = '<div class="data-empty">Belum ada had ditetapkan.</div>';
    return;
  }
  container.innerHTML = `<div class="data-list">${budgets.map((b) => `
    <div class="data-row" data-id="${b.id}">
      <div class="data-main">
        <div class="data-title">${categoryLabel(b.category)}</div>
      </div>
      <div class="data-amount">${formatRM(b.monthly_limit)}</div>
      <button type="button" class="btn btn-secondary btn-sm" data-action="edit-budget" data-id="${b.id}">Edit</button>
      <button type="button" class="btn btn-danger btn-sm" data-action="delete-budget" data-id="${b.id}">Padam</button>
    </div>
  `).join('')}</div>`;
}

function render(root) {
  const { budgets } = store.getState();
  renderProgress(root);
  renderManageList(root, budgets);
  if (!editingBudgetId) populateCategorySelect(root, budgets);
}

function setBudgetEditMode(root, editing) {
  root.querySelector('#budget-submit-btn').textContent = editing ? 'Kemaskini Had' : 'Tetapkan Had';
  root.querySelector('#budget-cancel-edit-btn').hidden = !editing;
  root.querySelector('#budgetCategory').disabled = editing;
}

function startEditBudget(root, id) {
  const budget = store.getState().budgets.find((b) => b.id === Number(id));
  if (!budget) return;
  editingBudgetId = budget.id;
  populateCategorySelect(root, store.getState().budgets, editingBudgetId);
  root.querySelector('#budgetCategory').value = budget.category;
  root.querySelector('#budgetLimit').value = budget.monthly_limit;
  setBudgetEditMode(root, true);
  root.querySelector('#budgetLimit').focus();
}

function cancelEditBudget(root) {
  editingBudgetId = null;
  root.querySelector('#budget-form').reset();
  populateCategorySelect(root, store.getState().budgets);
  setBudgetEditMode(root, false);
}

async function saveBudget(root) {
  const form = root.querySelector('#budget-form');
  const category = form.querySelector('#budgetCategory').value;
  const monthlyLimit = Number(form.querySelector('#budgetLimit').value);

  const valid = validateForm(
    { budgetLimit: monthlyLimit },
    { budgetLimit: { test: () => isNonNegativeAmount(monthlyLimit) && monthlyLimit > 0, message: 'Had mesti lebih daripada RM0.' } },
    form
  );
  if (!valid) return;

  const payload = { category, monthly_limit: monthlyLimit };

  const btn = form.querySelector('#budget-submit-btn');
  btn.disabled = true;
  try {
    if (editingBudgetId) {
      const budget = await api.put(`/budgets/${editingBudgetId}`, payload);
      store.replaceBudget(budget);
      cancelEditBudget(root);
    } else {
      const budget = await api.post('/budgets', payload);
      store.addBudget(budget);
      form.reset();
    }
  } catch (err) {
    window.dispatchEvent(new CustomEvent('toast', { detail: err.message || 'Gagal menyimpan had perbelanjaan.' }));
  } finally {
    btn.disabled = false;
  }
}

async function deleteBudget(root, id) {
  if (!confirm('Padam had perbelanjaan ini?')) return;
  try {
    await api.del(`/budgets/${id}`);
    store.removeBudget(Number(id));
    if (editingBudgetId === Number(id)) cancelEditBudget(root);
  } catch (err) {
    window.dispatchEvent(new CustomEvent('toast', { detail: err.message || 'Gagal memadam.' }));
  }
}

export function initBudget() {
  const root = document.getElementById('section-cashflow');
  render(root);

  root.querySelector('#budget-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveBudget(root);
  });
  root.querySelector('#budget-cancel-edit-btn').addEventListener('click', () => cancelEditBudget(root));

  root.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-action="edit-budget"]');
    if (editBtn) return startEditBudget(root, editBtn.dataset.id);
    const deleteBtn = e.target.closest('[data-action="delete-budget"]');
    if (deleteBtn) deleteBudget(root, deleteBtn.dataset.id);
  });

  on('budgets:changed', () => render(root));
  on('cashFlow:changed', () => renderProgress(root));
  on('period:changed', () => renderProgress(root));
}
