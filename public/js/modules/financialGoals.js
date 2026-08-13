import { api } from '../api.js';
import { store, on, sum } from '../store.js';
import { formatRM, round2 } from '../utils/formatters.js';
import { formatDateMY, daysBetween } from '../utils/dateUtils.js';
import { validateForm, isRequiredString, isNonNegativeAmount } from '../utils/validators.js';

let editingGoalId = null;

export function calculateGoalProgress({ targetAmount, currentAmount, targetDate }) {
  const progressPercent = targetAmount > 0 ? Math.min(round2((currentAmount / targetAmount) * 100), 100) : 0;
  const remaining = Math.max(round2(targetAmount - currentAmount), 0);
  const daysRemaining = targetDate ? daysBetween(new Date(), new Date(`${targetDate}T00:00:00`)) : null;
  return { progressPercent, remaining, daysRemaining };
}

export function calculateGoalsSummary(goals) {
  const totalTarget = sum(goals.map((g) => Number(g.target_amount)));
  const totalCurrent = sum(goals.map((g) => Number(g.current_amount)));
  const overallPercent = totalTarget > 0 ? Math.min(round2((totalCurrent / totalTarget) * 100), 100) : 0;
  const achievedCount = goals.filter((g) => Number(g.current_amount) >= Number(g.target_amount)).length;
  return { totalTarget, totalCurrent, overallPercent, achievedCount };
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function renderList(root, goals) {
  const container = root.querySelector('#goal-list');
  if (goals.length === 0) {
    container.innerHTML = '<div class="data-empty">Belum ada matlamat kewangan direkod.</div>';
    return;
  }
  container.innerHTML = goals.map((g) => {
    const progress = calculateGoalProgress({
      targetAmount: Number(g.target_amount), currentAmount: Number(g.current_amount), targetDate: g.target_date,
    });
    const dateNote = g.target_date
      ? `${formatDateMY(new Date(`${g.target_date}T00:00:00`))} · ${progress.daysRemaining >= 0 ? `${progress.daysRemaining} hari lagi` : 'tarikh sudah lepas'}`
      : 'Tiada tarikh sasaran';
    const fillColor = progress.progressPercent >= 100 ? 'var(--status-good)' : 'var(--series-1)';

    return `
      <div class="card" data-id="${g.id}">
        <div class="row-between">
          <div class="data-title">${escapeHtml(g.name)}</div>
          <span class="text-muted" style="font-size:12px;">${dateNote}</span>
        </div>
        <div class="goal-progress-track">
          <div class="goal-progress-fill" style="width:${progress.progressPercent}%;background:${fillColor};"></div>
        </div>
        <div class="row-between" style="font-size:13px;margin-top:6px;">
          <span class="text-secondary">${formatRM(g.current_amount)} / ${formatRM(g.target_amount)}</span>
          <strong>${progress.progressPercent}%</strong>
        </div>
        <div class="row" style="margin-top:10px;">
          <button type="button" class="btn btn-secondary btn-sm" data-action="edit-goal" data-id="${g.id}">Edit</button>
          <button type="button" class="btn btn-danger btn-sm" data-action="delete-goal" data-id="${g.id}">Padam</button>
        </div>
      </div>
    `;
  }).join('');
}

function render(root) {
  renderList(root, store.getState().financialGoals);
}

function setGoalEditMode(root, editing) {
  root.querySelector('#goal-form-title').textContent = editing ? 'Kemaskini Matlamat' : 'Tambah Matlamat';
  root.querySelector('#goal-submit-btn').textContent = editing ? 'Kemaskini Matlamat' : 'Tambah Matlamat';
  root.querySelector('#goal-cancel-edit-btn').hidden = !editing;
}

function fillGoalForm(root, goal) {
  const form = root.querySelector('#goal-form');
  form.querySelector('#goalName').value = goal.name;
  form.querySelector('#goalTargetAmount').value = goal.target_amount;
  form.querySelector('#goalCurrentAmount').value = goal.current_amount;
  form.querySelector('#goalTargetDate').value = goal.target_date ?? '';
}

function startEditGoal(root, id) {
  const goal = store.getState().financialGoals.find((g) => g.id === Number(id));
  if (!goal) return;
  editingGoalId = goal.id;
  fillGoalForm(root, goal);
  setGoalEditMode(root, true);
  root.querySelector('#goalName').focus();
}

function cancelEditGoal(root) {
  editingGoalId = null;
  root.querySelector('#goal-form').reset();
  root.querySelector('#goalCurrentAmount').value = 0;
  setGoalEditMode(root, false);
}

async function saveGoal(root) {
  const form = root.querySelector('#goal-form');
  const name = form.querySelector('#goalName').value.trim();
  const targetAmount = Number(form.querySelector('#goalTargetAmount').value);
  const currentAmount = Number(form.querySelector('#goalCurrentAmount').value);
  const targetDateRaw = form.querySelector('#goalTargetDate').value;

  const valid = validateForm(
    { goalName: name, goalTargetAmount: targetAmount, goalCurrentAmount: currentAmount },
    {
      goalName: { test: () => isRequiredString(name), message: 'Sila masukkan nama matlamat.' },
      goalTargetAmount: { test: () => targetAmount > 0, message: 'Sasaran mesti lebih daripada RM0.' },
      goalCurrentAmount: { test: () => isNonNegativeAmount(currentAmount), message: 'Tidak boleh negatif.' },
    },
    form
  );
  if (!valid) return;

  const payload = {
    name,
    target_amount: targetAmount,
    current_amount: currentAmount,
    target_date: targetDateRaw === '' ? null : targetDateRaw,
  };

  const btn = form.querySelector('#goal-submit-btn');
  btn.disabled = true;
  try {
    if (editingGoalId) {
      const goal = await api.put(`/financial-goals/${editingGoalId}`, payload);
      store.replaceGoal(goal);
      cancelEditGoal(root);
    } else {
      const goal = await api.post('/financial-goals', payload);
      store.addGoal(goal);
      form.reset();
      form.querySelector('#goalCurrentAmount').value = 0;
    }
  } catch (err) {
    window.dispatchEvent(new CustomEvent('toast', { detail: err.message || 'Gagal menyimpan matlamat.' }));
  } finally {
    btn.disabled = false;
  }
}

async function deleteGoal(root, id) {
  if (!confirm('Padam matlamat ini?')) return;
  try {
    await api.del(`/financial-goals/${id}`);
    store.removeGoal(Number(id));
    if (editingGoalId === Number(id)) cancelEditGoal(root);
  } catch (err) {
    window.dispatchEvent(new CustomEvent('toast', { detail: err.message || 'Gagal memadam.' }));
  }
}

export function initFinancialGoals() {
  const root = document.getElementById('section-goals');
  render(root);

  root.querySelector('#goal-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveGoal(root);
  });

  root.querySelector('#goal-cancel-edit-btn').addEventListener('click', () => cancelEditGoal(root));

  root.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-action="edit-goal"]');
    if (editBtn) return startEditGoal(root, editBtn.dataset.id);
    const deleteBtn = e.target.closest('[data-action="delete-goal"]');
    if (deleteBtn) deleteGoal(root, deleteBtn.dataset.id);
  });

  on('financialGoals:changed', () => render(root));
}
