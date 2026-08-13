import { api } from '../api.js';
import { store, on, sum } from '../store.js';
import { formatRM } from '../utils/formatters.js';
import { validateForm, isRequiredString, isNonNegativeAmount } from '../utils/validators.js';
import { ASSET_CATEGORIES, assetCategoryLabel } from '../utils/constants.js';

let editingAssetId = null;

export function calculateTotalAssets(assets) {
  return sum(assets.map((a) => Number(a.current_value) || 0));
}

export function calculateNetWorth(assets, debts, cardProfile) {
  const totalAssets = calculateTotalAssets(assets);
  const cardBalance = Number(cardProfile?.balance) || 0;
  const otherDebtsTotal = sum(debts.map((d) => Number(d.balance) || 0));
  return totalAssets - (cardBalance + otherDebtsTotal);
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function renderList(root, assets) {
  const container = root.querySelector('#asset-list');
  if (assets.length === 0) {
    container.innerHTML = '<div class="data-empty">Belum ada aset direkod.</div>';
    return;
  }
  container.innerHTML = `<div class="data-list">${assets.map((a) => `
    <div class="data-row" data-id="${a.id}">
      <div class="data-main">
        <div class="data-title">${escapeHtml(a.name)}</div>
        <div class="data-meta">${assetCategoryLabel(a.category)}${a.note ? ` · ${escapeHtml(a.note)}` : ''}</div>
      </div>
      <div class="data-amount">${formatRM(a.current_value)}</div>
      <button type="button" class="btn btn-secondary btn-sm" data-action="edit-asset" data-id="${a.id}">Edit</button>
      <button type="button" class="btn btn-danger btn-sm" data-action="delete-asset" data-id="${a.id}">Padam</button>
    </div>
  `).join('')}</div>`;
}

function render(root) {
  const { assets } = store.getState();
  renderList(root, assets);
  root.querySelector('#asset-total').textContent = formatRM(calculateTotalAssets(assets));
}

function setAssetEditMode(root, editing) {
  root.querySelector('#asset-submit-btn').textContent = editing ? 'Kemaskini Aset' : 'Tambah Aset';
  root.querySelector('#asset-cancel-edit-btn').hidden = !editing;
}

function fillAssetForm(root, asset) {
  const form = root.querySelector('#asset-form');
  form.querySelector('#assetName').value = asset.name;
  form.querySelector('#assetCategory').value = asset.category;
  form.querySelector('#assetValue').value = asset.current_value;
  form.querySelector('#assetNote').value = asset.note ?? '';
}

function startEditAsset(root, id) {
  const asset = store.getState().assets.find((a) => a.id === Number(id));
  if (!asset) return;
  editingAssetId = asset.id;
  fillAssetForm(root, asset);
  setAssetEditMode(root, true);
  root.querySelector('#assetName').focus();
}

function cancelEditAsset(root) {
  editingAssetId = null;
  root.querySelector('#asset-form').reset();
  setAssetEditMode(root, false);
}

async function saveAsset(root) {
  const form = root.querySelector('#asset-form');
  const name = form.querySelector('#assetName').value.trim();
  const category = form.querySelector('#assetCategory').value;
  const currentValue = Number(form.querySelector('#assetValue').value);
  const note = form.querySelector('#assetNote').value.trim();

  const valid = validateForm(
    { assetName: name, assetValue: currentValue },
    {
      assetName: { test: () => isRequiredString(name), message: 'Sila masukkan nama aset.' },
      assetValue: { test: () => isNonNegativeAmount(currentValue), message: 'Nilai tidak boleh negatif.' },
    },
    form
  );
  if (!valid) return;

  const payload = { name, category, current_value: currentValue, note: note || null };

  const btn = form.querySelector('#asset-submit-btn');
  btn.disabled = true;
  try {
    if (editingAssetId) {
      const asset = await api.put(`/assets/${editingAssetId}`, payload);
      store.replaceAsset(asset);
      cancelEditAsset(root);
    } else {
      const asset = await api.post('/assets', payload);
      store.addAsset(asset);
      form.reset();
    }
  } catch (err) {
    window.dispatchEvent(new CustomEvent('toast', { detail: err.message || 'Gagal menyimpan aset.' }));
  } finally {
    btn.disabled = false;
  }
}

async function deleteAsset(root, id) {
  if (!confirm('Padam aset ini?')) return;
  try {
    await api.del(`/assets/${id}`);
    store.removeAsset(Number(id));
    if (editingAssetId === Number(id)) cancelEditAsset(root);
  } catch (err) {
    window.dispatchEvent(new CustomEvent('toast', { detail: err.message || 'Gagal memadam.' }));
  }
}

export function initAssets() {
  const root = document.getElementById('section-assets');

  root.querySelector('#assetCategory').innerHTML = ASSET_CATEGORIES.map((c) => `<option value="${c.value}">${c.label}</option>`).join('');

  render(root);

  root.querySelector('#asset-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveAsset(root);
  });

  root.querySelector('#asset-cancel-edit-btn').addEventListener('click', () => cancelEditAsset(root));

  root.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-action="edit-asset"]');
    if (editBtn) return startEditAsset(root, editBtn.dataset.id);
    const deleteBtn = e.target.closest('[data-action="delete-asset"]');
    if (deleteBtn) deleteAsset(root, deleteBtn.dataset.id);
  });

  on('assets:changed', () => render(root));
}
