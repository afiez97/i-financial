import { login, redirectIfAuthenticated } from './auth.js';
import { ApiError } from './api.js';
import './key-lock.js';

const REMEMBER_KEY = 'afiezfinancial:rememberedEmail';
const TYPE_TARGET = 10;
const CTA_LABELS = { idle: 'Log Masuk', error: 'Cuba Lagi', unlocking: 'Membuka kunci…', success: 'Masuk ke Papan Pemuka' };
const STATUS_LABELS = { error: 'Ditolak', unlocking: 'Plug berpusing', success: 'Shackle terbebas' };

redirectIfAuthenticated();

const shell = document.getElementById('lock-shell');
const stage = document.querySelector('key-lock-stage');
const form = document.getElementById('login-form');
const emailInput = document.getElementById('kl-email');
const passInput = document.getElementById('kl-pass');
const rememberInput = document.getElementById('kl-remember');
const submitBtn = document.getElementById('login-btn');
const resetBtn = document.getElementById('reset-btn');
const labelToggleBtn = document.getElementById('label-toggle-btn');
const phaseTag = document.getElementById('phase-tag');
const messageBox = document.getElementById('auth-error');
const emailError = document.getElementById('email-error');
const passwordError = document.getElementById('password-error');
const meterFill = document.getElementById('meter-fill');
const meterLabel = document.getElementById('meter-label');
const layoutButtons = document.querySelectorAll('[data-layout-btn]');

let phase = 'idle';
let submitting = false;
let labelsOn = true;
let unlockTimer = null;

const remembered = localStorage.getItem(REMEMBER_KEY);
if (remembered) emailInput.value = remembered;

function setLayout(layout) {
  shell.dataset.layout = layout;
  layoutButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.layoutBtn === layout));
}

function refreshTag() {
  const idleLabel = passInput.value.length > 0 ? 'Kunci masuk keyway' : 'Kunci belum masuk';
  phaseTag.textContent = phase === 'idle' ? idleLabel : STATUS_LABELS[phase];
}

function updateCta() {
  submitBtn.textContent = submitting ? 'Menyemak…' : CTA_LABELS[phase];
  submitBtn.disabled = submitting || phase === 'unlocking' || phase === 'success';
}

function setPhase(next) {
  phase = next;
  shell.dataset.phase = phase;
  refreshTag();
  updateCta();
}

function setMessage(text) {
  if (text) {
    messageBox.textContent = text;
    messageBox.hidden = false;
  } else {
    messageBox.hidden = true;
    messageBox.textContent = '';
  }
}

function clearFieldErrors() {
  emailError.textContent = '';
  passwordError.textContent = '';
}

function updateMeter() {
  const len = passInput.value.length;
  const pct = Math.min(1, len / TYPE_TARGET);
  meterFill.style.width = `${Math.round(pct * 100)}%`;
  meterLabel.textContent = `${len} aksara ditaip`;
  stage?.setTyping?.(pct);
  refreshTag();
}

setLayout('split');
setPhase('idle');
updateMeter();

layoutButtons.forEach((btn) => {
  btn.addEventListener('click', () => setLayout(btn.dataset.layoutBtn));
});

labelToggleBtn.addEventListener('click', () => {
  labelsOn = !labelsOn;
  shell.dataset.labels = labelsOn ? 'on' : 'off';
  labelToggleBtn.textContent = labelsOn ? 'Sembunyi label' : 'Tunjuk label';
  stage?.setLabels?.(labelsOn);
});

emailInput.addEventListener('input', () => {
  emailError.textContent = '';
});

passInput.addEventListener('input', () => {
  passwordError.textContent = '';
  if (phase !== 'idle') {
    setMessage('');
    setPhase('idle');
    stage?.resetKey?.();
  }
  updateMeter();
});

resetBtn.addEventListener('click', () => {
  clearTimeout(unlockTimer);
  submitting = false;
  emailInput.disabled = false;
  passInput.disabled = false;
  passInput.value = '';
  clearFieldErrors();
  setMessage('');
  setPhase('idle');
  stage?.resetKey?.();
  updateMeter();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (submitting || phase === 'unlocking' || phase === 'success') return;

  clearFieldErrors();
  setMessage('');

  const email = emailInput.value.trim();
  const password = passInput.value;

  if (!email || !password) {
    setPhase('error');
    setMessage('Isi e-mel dan kata laluan dahulu.');
    stage?.signalError?.();
    return;
  }

  submitting = true;
  updateCta();
  emailInput.disabled = true;
  passInput.disabled = true;

  try {
    await login(email, password);
    if (rememberInput.checked) {
      localStorage.setItem(REMEMBER_KEY, email);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
    submitting = false;
    setPhase('unlocking');
    stage?.setTyping?.(1);
    stage?.runUnlock?.();
    unlockTimer = setTimeout(() => {
      setPhase('success');
      setMessage('Kunci sah. Shackle terbebas.');
      window.location.href = '/index.html';
    }, 2200);
  } catch (err) {
    submitting = false;
    emailInput.disabled = false;
    passInput.disabled = false;
    setPhase('error');
    stage?.signalError?.();
    if (err instanceof ApiError && err.status === 422) {
      for (const [field, messages] of Object.entries(err.errors)) {
        if (field === 'email') emailError.textContent = messages[0];
        if (field === 'password') passwordError.textContent = messages[0];
      }
    } else {
      setMessage((err instanceof ApiError ? err.message : null) || 'Log masuk gagal. Sila cuba lagi.');
    }
    updateCta();
  }
});
