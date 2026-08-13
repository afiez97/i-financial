import { api } from '../api.js';
import { store, on } from '../store.js';
import { daysBetween, normalizeCycleDates, formatDateMY } from '../utils/dateUtils.js';
import { formatRM, formatRMSigned, round2 } from '../utils/formatters.js';
import { validateForm, isDayOfMonth, isNonNegativeAmount, isRequiredString } from '../utils/validators.js';
import { RATE_OPTIONS, CARD_THRESHOLDS, DEFAULT_CARD_PROFILE, findRateOption, annualPercentFor } from '../utils/constants.js';
import { resolveColor } from '../utils/chartTheme.js';

let chart = null;
let dirty = false;

function isLatePayment(dueDate, paymentDate) {
  return paymentDate.getTime() > dueDate.getTime();
}

function calculateLateFee(balance, dueDate, paymentDate) {
  return isLatePayment(dueDate, paymentDate) ? round2(balance * 0.01) : 0;
}

export function calculateDualPhaseInterest({ balance, paymentAmount, annualPercent, statementDay, dueDay, paymentDay }) {
  const dailyRate = annualPercent / 100 / 365;
  const now = new Date();
  const { statementDate, dueDate, paymentDate, nextStatementDate } = normalizeCycleDates({
    statementDay, dueDay, paymentDay, anchorYear: now.getFullYear(), anchorMonth: now.getMonth(),
  });

  const phase1Days = daysBetween(statementDate, paymentDate);
  const phase2Days = daysBetween(paymentDate, nextStatementDate);
  const remainingBalance = Math.max(balance - paymentAmount, 0);

  const phase1Interest = phase1Days * dailyRate * balance;
  const phase2Interest = phase2Days * dailyRate * remainingBalance;
  const totalInterest = round2(phase1Interest + phase2Interest);
  const lateFee = calculateLateFee(balance, dueDate, paymentDate);

  return {
    phase1Days, phase2Days, phase1Interest, phase2Interest, totalInterest,
    lateFee, totalCost: round2(totalInterest + lateFee), late: isLatePayment(dueDate, paymentDate),
    dates: { statementDate, dueDate, paymentDate, nextStatementDate },
  };
}

export function calculateScenarioA({ balance, annualPercent, statementDay }) {
  const dailyRate = annualPercent / 100 / 365;
  const now = new Date();
  const { statementDate, nextStatementDate } = normalizeCycleDates({
    statementDay, dueDay: statementDay, paymentDay: statementDay,
    anchorYear: now.getFullYear(), anchorMonth: now.getMonth(),
  });
  const cycleDays = daysBetween(statementDate, nextStatementDate);
  return { cycleDays, totalCost: round2(cycleDays * dailyRate * balance) };
}

/** Maps a snake_case card_profile record (as returned by the API) into
 *  the dual-phase interest calculators above, which expect camelCase. */
export function calculateUobCostSummary(cardProfile) {
  const annualPercent = annualPercentFor(cardProfile.interest_rate, cardProfile.rate_type);
  const balance = Number(cardProfile.balance);
  const scenarioB = calculateDualPhaseInterest({
    balance,
    paymentAmount: Number(cardProfile.payment_amount),
    annualPercent,
    statementDay: Number(cardProfile.statement_day),
    dueDay: Number(cardProfile.due_day),
    paymentDay: Number(cardProfile.payment_day),
  });
  const scenarioA = calculateScenarioA({
    balance,
    annualPercent,
    statementDay: Number(cardProfile.statement_day),
  });
  return { scenarioA, scenarioB, netSavings: round2(scenarioA.totalCost - scenarioB.totalCost) };
}

function readForm(root) {
  const cardType = root.querySelector('input[name="cardType"]:checked')?.value ?? 'classic';
  const [interestRate, rateType] = root.querySelector('#interestRate').value.split('|');
  const status = root.querySelector('input[name="cardStatus"]:checked')?.value ?? 'active';
  const terminationTargetDate = root.querySelector('#terminationTargetDate').value;
  return {
    card_type: cardType,
    balance: Number(root.querySelector('#balance').value),
    statement_day: Number(root.querySelector('#statementDay').value),
    due_day: Number(root.querySelector('#dueDay').value),
    payment_amount: Number(root.querySelector('#paymentAmount').value),
    payment_day: Number(root.querySelector('#paymentDay').value),
    interest_rate: Number(interestRate),
    rate_type: rateType,
    status,
    termination_target_date: terminationTargetDate === '' ? null : terminationTargetDate,
    termination_note: root.querySelector('#terminationNote').value.trim(),
  };
}

function fillForm(root, profile) {
  root.querySelector(`input[name="cardType"][value="${profile.card_type}"]`).checked = true;
  root.querySelector('#balance').value = profile.balance;
  root.querySelector('#statementDay').value = profile.statement_day;
  root.querySelector('#dueDay').value = profile.due_day;
  root.querySelector('#paymentAmount').value = profile.payment_amount;
  root.querySelector('#paymentDay').value = profile.payment_day;
  const select = root.querySelector('#interestRate');
  const match = findRateOption(profile.interest_rate, profile.rate_type) ?? RATE_OPTIONS[0];
  select.value = `${match.interestRate}|${match.rateType}`;

  const status = profile.status ?? 'active';
  root.querySelector(`input[name="cardStatus"][value="${status}"]`).checked = true;
  root.querySelector('#terminationTargetDate').value = profile.termination_target_date ?? '';
  root.querySelector('#terminationNote').value = profile.termination_note ?? '';
  toggleTerminationFields(root, status);
}

function toggleTerminationFields(root, status) {
  root.querySelector('#uob-termination-fields').hidden = status === 'active';
}

function validate(root, values) {
  return validateForm(values, {
    balance: { test: () => isNonNegativeAmount(values.balance), message: 'Baki tidak boleh negatif.' },
    statementDay: { test: () => isDayOfMonth(values.statement_day), message: 'Mesti antara 1 dan 31.' },
    dueDay: { test: () => isDayOfMonth(values.due_day), message: 'Mesti antara 1 dan 31.' },
    paymentAmount: { test: () => isNonNegativeAmount(values.payment_amount), message: 'Tidak boleh negatif.' },
    paymentDay: { test: () => isDayOfMonth(values.payment_day), message: 'Mesti antara 1 dan 31.' },
    terminationTargetDate: {
      test: () => values.status === 'active' || isRequiredString(values.termination_target_date ?? ''),
      message: 'Sila masukkan tarikh sasaran.',
    },
  }, root);
}

function renderTerminationStatus(root, values) {
  const pill = root.querySelector('#uob-termination-status-pill');
  const summary = root.querySelector('#uob-termination-summary');
  const checklist = root.querySelector('#uob-termination-checklist');
  const targetDate = values.termination_target_date ? new Date(`${values.termination_target_date}T00:00:00`) : null;

  if (values.status === 'planned_termination') {
    pill.textContent = 'Rancang Terminate';
    pill.className = 'pill pill-warning';
    checklist.hidden = false;
    if (targetDate) {
      const days = daysBetween(new Date(), targetDate);
      summary.textContent = days > 0
        ? `Disasarkan terminate pada ${formatDateMY(targetDate)} — ${days} hari lagi.`
        : days === 0
          ? `Disasarkan terminate hari ini (${formatDateMY(targetDate)}).`
          : `Tarikh sasaran (${formatDateMY(targetDate)}) telah lepas — kemas kini status jika sudah terminate.`;
    } else {
      summary.textContent = 'Rancang untuk terminate kad ini.';
    }
  } else if (values.status === 'terminated') {
    pill.textContent = 'Sudah Terminate';
    pill.className = 'pill pill-warning';
    checklist.hidden = true;
    summary.textContent = targetDate
      ? `Kad ditanda sudah terminate pada ${formatDateMY(targetDate)}.`
      : 'Kad ditanda sudah terminate.';
  } else {
    pill.textContent = 'Aktif';
    pill.className = 'pill pill-good';
    checklist.hidden = true;
    summary.textContent = 'Kad ini aktif seperti biasa.';
  }
}

function renderChart(canvas, scenarioA, scenarioB) {
  if (chart) chart.destroy();
  chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Senario A: Kekalkan Baki', 'Senario B: Bayar Hari Ini'],
      datasets: [{
        data: [scenarioA.totalCost, scenarioB.totalCost],
        backgroundColor: [resolveColor('--series-2'), resolveColor('--series-1')],
        borderRadius: 4,
        maxBarThickness: 64,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (v) => formatRM(v) } },
      },
    },
  });
}

function recompute(root) {
  const values = readForm(root);
  const annualPercent = values.rate_type === 'monthly' ? values.interest_rate * 12 : values.interest_rate;

  const scenarioB = calculateDualPhaseInterest({
    balance: values.balance, paymentAmount: values.payment_amount, annualPercent,
    statementDay: values.statement_day, dueDay: values.due_day, paymentDay: values.payment_day,
  });
  const scenarioA = calculateScenarioA({ balance: values.balance, annualPercent, statementDay: values.statement_day });
  const netSavings = round2(scenarioA.totalCost - scenarioB.totalCost);

  root.querySelector('#uob-phase1-days').textContent = `${scenarioB.phase1Days} hari`;
  root.querySelector('#uob-phase2-days').textContent = `${scenarioB.phase2Days} hari`;
  root.querySelector('#uob-phase1-interest').textContent = formatRM(scenarioB.phase1Interest);
  root.querySelector('#uob-phase2-interest').textContent = formatRM(scenarioB.phase2Interest);
  root.querySelector('#uob-statement-date').textContent = formatDateMY(scenarioB.dates.statementDate);
  root.querySelector('#uob-due-date').textContent = formatDateMY(scenarioB.dates.dueDate);
  root.querySelector('#uob-payment-date').textContent = formatDateMY(scenarioB.dates.paymentDate);
  root.querySelector('#uob-next-statement-date').textContent = formatDateMY(scenarioB.dates.nextStatementDate);

  root.querySelector('#uob-late-fee').textContent = formatRM(scenarioB.lateFee);
  root.querySelector('#uob-scenario-a-cost').textContent = formatRM(scenarioA.totalCost);
  root.querySelector('#uob-scenario-b-cost').textContent = formatRM(scenarioB.totalCost);

  const savingsEl = root.querySelector('#uob-net-savings');
  savingsEl.textContent = formatRMSigned(netSavings);
  savingsEl.closest('.stat-tile').classList.toggle('stat-good', netSavings >= 0);
  savingsEl.closest('.stat-tile').classList.toggle('stat-critical', netSavings < 0);

  const banner = root.querySelector('#uob-delinquent-banner');
  banner.hidden = !scenarioB.late;

  const threshold = CARD_THRESHOLDS[values.card_type];
  root.querySelector('#uob-waiver-threshold').textContent = formatRM(threshold.waiverSpend);
  root.querySelector('#uob-waiver-fee').textContent = formatRM(threshold.annualFee);
  root.querySelector('#uob-card-type-label').textContent = threshold.label;

  renderChart(root.querySelector('#uob-savings-chart'), scenarioA, scenarioB);
  toggleTerminationFields(root, values.status);
  renderTerminationStatus(root, values);

  return values;
}

function markDirty(root, isDirty) {
  dirty = isDirty;
  root.querySelector('#uob-unsaved').hidden = !isDirty;
}

export function initUobCalculator() {
  const root = document.getElementById('section-uob');
  const profile = store.getState().cardProfile ?? DEFAULT_CARD_PROFILE;

  root.querySelector('#interestRate').innerHTML = RATE_OPTIONS
    .map((o) => `<option value="${o.interestRate}|${o.rateType}">${o.label}</option>`)
    .join('');

  fillForm(root, {
    card_type: profile.card_type ?? profile.cardType,
    balance: profile.balance,
    statement_day: profile.statement_day ?? profile.statementDay,
    due_day: profile.due_day ?? profile.dueDay,
    payment_amount: profile.payment_amount ?? profile.paymentAmount,
    payment_day: profile.payment_day ?? profile.paymentDay,
    interest_rate: profile.interest_rate ?? profile.interestRate,
    rate_type: profile.rate_type ?? profile.rateType,
    status: profile.status,
    termination_target_date: profile.termination_target_date ?? profile.terminationTargetDate,
    termination_note: profile.termination_note ?? profile.terminationNote,
  });
  recompute(root);

  root.querySelectorAll('input, select, textarea').forEach((el) => {
    el.addEventListener('input', () => {
      recompute(root);
      markDirty(root, true);
    });
  });

  root.querySelector('#uob-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const values = readForm(root);
    if (!validate(root, values)) return;

    const btn = root.querySelector('#uob-save-btn');
    btn.disabled = true;
    try {
      const saved = await api.put('/card-profile', values);
      store.setCardProfile(saved);
      markDirty(root, false);
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Disimpan.' }));
    } catch (err) {
      window.dispatchEvent(new CustomEvent('toast', { detail: err.message || 'Gagal menyimpan.' }));
    } finally {
      btn.disabled = false;
    }
  });

  on('cardProfile:changed', () => {
    // Re-fired after this module's own save; nothing else currently touches cardProfile.
  });
}
