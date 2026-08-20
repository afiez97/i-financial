import { api } from '../api.js';
import { store, on } from '../store.js';
import { formatRM } from '../utils/formatters.js';
import { formatDateMY } from '../utils/dateUtils.js';
import { validateForm, isNonNegativeAmount } from '../utils/validators.js';
import { MONTH_LABELS } from '../utils/constants.js';

let editingCardStatementId = null;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function populateMonthSelect(root) {
  root.querySelector('#csMonth').innerHTML = MONTH_LABELS
    .map((label, i) => `<option value="${i + 1}">${label}</option>`)
    .join('');
}

function renderList(root, statements) {
  const empty = root.querySelector('#card-statement-empty');
  const container = root.querySelector('#card-statement-list');
  if (statements.length === 0) {
    empty.hidden = false;
    container.innerHTML = '';
    return;
  }
  empty.hidden = true;
  container.innerHTML = statements.map((s) => {
    const late = Number(s.estimated_late_payment_interest) > 0;
    const estimatedTotal = Number(s.estimated_retail_interest) + Number(s.estimated_late_payment_interest);
    const hasActual = s.actual_retail_interest != null || s.actual_late_payment_interest != null;
    const actualTotal = hasActual ? Number(s.actual_retail_interest ?? 0) + Number(s.actual_late_payment_interest ?? 0) : null;
    const paidMeta = s.payment_date ? ` (${formatDateMY(new Date(s.payment_date))})` : '';
    const payerMeta = s.payer_name ? ` · ${escapeHtml(s.payer_name)}` : '';

    return `
      <div class="data-row" data-id="${s.id}">
        <div class="data-main">
          <div class="data-title">${MONTH_LABELS[s.month - 1]} ${s.year} ${late ? '<span class="pill pill-critical">Lewat</span>' : ''}</div>
          <div class="data-meta">Baki ${formatRM(s.balance)} · Bayar ${formatRM(s.payment_amount)}${paidMeta}${payerMeta}</div>
          <div class="data-meta">Anggaran faedah: ${formatRM(estimatedTotal)}${actualTotal !== null ? ` · Sebenar: ${formatRM(actualTotal)}` : ''}</div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" data-action="edit-card-statement" data-id="${s.id}">Edit</button>
        <button type="button" class="btn btn-danger btn-sm" data-action="delete-card-statement" data-id="${s.id}">Padam</button>
      </div>
    `;
  }).join('');
}

function render(root) {
  renderList(root, store.getState().cardStatements);
}

function setCardStatementEditMode(root, editing) {
  root.querySelector('#card-statement-submit-btn').textContent = editing ? 'Kemaskini Rekod' : 'Simpan Rekod';
  root.querySelector('#card-statement-cancel-edit-btn').hidden = !editing;
}

function fillDefaultPeriod(root) {
  const now = new Date();
  root.querySelector('#csMonth').value = String(now.getMonth() + 1);
  root.querySelector('#csYear').value = String(now.getFullYear());
}

function startEditCardStatement(root, id) {
  const statement = store.getState().cardStatements.find((s) => s.id === Number(id));
  if (!statement) return;
  editingCardStatementId = statement.id;
  root.querySelector('#csMonth').value = String(statement.month);
  root.querySelector('#csYear').value = String(statement.year);
  root.querySelector('#csBalance').value = statement.balance;
  root.querySelector('#csPaymentAmount').value = statement.payment_amount;
  root.querySelector('#csPaymentDate').value = statement.payment_date ?? '';
  root.querySelector('#csPayerName').value = statement.payer_name ?? '';
  root.querySelector('#csNote').value = statement.note ?? '';
  root.querySelector('#csActualRetailInterest').value = statement.actual_retail_interest ?? '';
  root.querySelector('#csActualLatePaymentInterest').value = statement.actual_late_payment_interest ?? '';
  setCardStatementEditMode(root, true);
  root.querySelector('#csBalance').focus();
}

function cancelEditCardStatement(root) {
  editingCardStatementId = null;
  root.querySelector('#card-statement-form').reset();
  fillDefaultPeriod(root);
  setCardStatementEditMode(root, false);
}

async function saveCardStatement(root) {
  const form = root.querySelector('#card-statement-form');
  const balance = Number(form.querySelector('#csBalance').value);
  const paymentAmount = Number(form.querySelector('#csPaymentAmount').value);

  const valid = validateForm(
    { csBalance: balance, csPaymentAmount: paymentAmount },
    {
      csBalance: { test: () => isNonNegativeAmount(balance), message: 'Baki tidak boleh negatif.' },
      csPaymentAmount: { test: () => isNonNegativeAmount(paymentAmount), message: 'Jumlah bayaran tidak boleh negatif.' },
    },
    form
  );
  if (!valid) return;

  const actualRetail = form.querySelector('#csActualRetailInterest').value;
  const actualLate = form.querySelector('#csActualLatePaymentInterest').value;

  const payload = {
    month: Number(form.querySelector('#csMonth').value),
    year: Number(form.querySelector('#csYear').value),
    balance,
    payment_amount: paymentAmount,
    payment_date: form.querySelector('#csPaymentDate').value || null,
    payer_name: form.querySelector('#csPayerName').value || null,
    note: form.querySelector('#csNote').value || null,
    actual_retail_interest: actualRetail === '' ? null : Number(actualRetail),
    actual_late_payment_interest: actualLate === '' ? null : Number(actualLate),
  };

  const btn = form.querySelector('#card-statement-submit-btn');
  btn.disabled = true;
  try {
    if (editingCardStatementId) {
      const statement = await api.put(`/card-statements/${editingCardStatementId}`, payload);
      store.replaceCardStatement(statement);
      cancelEditCardStatement(root);
    } else {
      const statement = await api.post('/card-statements', payload);
      store.addCardStatement(statement);
      form.reset();
      fillDefaultPeriod(root);
    }
  } catch (err) {
    window.dispatchEvent(new CustomEvent('toast', { detail: err.message || 'Gagal menyimpan rekod penyata.' }));
  } finally {
    btn.disabled = false;
  }
}

async function deleteCardStatement(root, id) {
  if (!confirm('Padam rekod penyata ini?')) return;
  try {
    await api.del(`/card-statements/${id}`);
    store.removeCardStatement(Number(id));
    if (editingCardStatementId === Number(id)) cancelEditCardStatement(root);
  } catch (err) {
    window.dispatchEvent(new CustomEvent('toast', { detail: err.message || 'Gagal memadam.' }));
  }
}

export function initCardStatements() {
  const root = document.getElementById('section-uob');
  populateMonthSelect(root);
  fillDefaultPeriod(root);
  render(root);

  root.querySelector('#card-statement-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveCardStatement(root);
  });
  root.querySelector('#card-statement-cancel-edit-btn').addEventListener('click', () => cancelEditCardStatement(root));

  root.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-action="edit-card-statement"]');
    if (editBtn) return startEditCardStatement(root, editBtn.dataset.id);
    const deleteBtn = e.target.closest('[data-action="delete-card-statement"]');
    if (deleteBtn) deleteCardStatement(root, deleteBtn.dataset.id);
  });

  on('cardStatements:changed', () => render(root));
}
