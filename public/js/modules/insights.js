import { getMonthlyTotals, getAverageMonthlyExpense, getDistinctPeriods } from '../store.js';
import { formatRM, formatPercent, round2 } from '../utils/formatters.js';
import { MONTH_LABELS, annualPercentFor, categoryLabel, UOB_INSIGHT_INTEREST_THRESHOLD, AVALANCHE_HIGH_RATE_THRESHOLD } from '../utils/constants.js';
import { formatDateMY } from '../utils/dateUtils.js';
import { calculateDti, dtiZone } from './debtTracker.js';
import { calculateEmergencyFund } from './emergencyFund.js';
import { calculateUobCostSummary } from './uobCalculator.js';
import { calculateAnnualFeeWaiver } from './annualFeeWaiver.js';
import { calculateBudgetProgress } from './budget.js';

const SEVERITY_WEIGHT = { critical: 0, warning: 1, good: 2 };

function dtiHealthInsight(dti) {
  if (!dti) return null;
  const zone = dtiZone(dti.value);
  if (zone === 'critical') {
    return {
      id: 'dti-health', severity: 'critical',
      message: `Nisbah DTI anda ${formatPercent(dti.value)} — melebihi paras bahaya (45%). Bayaran minimum bulan ini (${formatRM(dti.totalObligations)}) mengambil hampir separuh pendapatan. Elakkan tambah hutang atau komitmen baru sehingga nisbah ini turun.`,
    };
  }
  if (zone === 'warning') {
    return {
      id: 'dti-health', severity: 'warning',
      message: `DTI anda ${formatPercent(dti.value)}, berada dalam zon amaran (35–45%). Kurangkan baki hutang berfaedah tinggi supaya ia turun ke bawah 35%.`,
    };
  }
  return {
    id: 'dti-health', severity: 'good',
    message: `Nisbah DTI anda ${formatPercent(dti.value)} — dalam zon selamat. Teruskan disiplin bayaran ini.`,
  };
}

function noIncomeInsight(totals, period) {
  if (Number(totals.income) > 0) return null;
  return {
    id: 'no-income', severity: 'warning',
    message: `Belum ada pendapatan direkod untuk ${MONTH_LABELS[period.month - 1]} ${period.year}. Rekod gaji/pendapatan lain di Aliran Tunai supaya DTI dan Selamat Dibelanjakan dapat dikira dengan tepat.`,
  };
}

function emergencyFundInsight(entries, emergencyFund) {
  const avgMonthlyExpense = getAverageMonthlyExpense(entries);
  if (avgMonthlyExpense <= 0) return null;

  const fund = emergencyFund ?? { target_months: 6, current_savings: 0 };
  const ef = calculateEmergencyFund({
    targetMonths: fund.target_months,
    currentSavings: Number(fund.current_savings),
    avgMonthlyExpense,
  });
  const shortfall = Math.max(round2(ef.target - Number(fund.current_savings)), 0);

  if (ef.progressPercent >= 100) {
    return {
      id: 'emergency-fund', severity: 'good',
      message: `Tahniah! Tabung kecemasan anda sudah capai sasaran ${fund.target_months} bulan (${formatRM(ef.target)}). Lebihan simpanan boleh disalurkan ke matlamat lain seperti pelaburan.`,
    };
  }
  if (ef.runwayMonths !== null && ef.runwayMonths < 1) {
    return {
      id: 'emergency-fund', severity: 'critical',
      message: `Tabung kecemasan anda hanya cukup untuk ${ef.runwayMonths} bulan jika pendapatan terhenti — ini sangat rendah. Utamakan simpanan kecemasan sebelum perbelanjaan bukan penting.`,
    };
  }
  return {
    id: 'emergency-fund', severity: 'warning',
    message: `Tabung kecemasan anda ${Math.round(ef.progressPercent)}% ke arah sasaran (${ef.runwayMonths} drpd ${fund.target_months} bulan). Perlukan lagi ${formatRM(shortfall)} untuk capai sasaran.`,
  };
}

function avalancheInsight(debts, cardProfile) {
  const candidates = debts
    .filter((d) => Number(d.balance) > 0)
    .map((d) => ({ name: d.name, rate: Number(d.interest_rate), balance: Number(d.balance) }));

  if (cardProfile && cardProfile.status !== 'terminated' && Number(cardProfile.balance) > 0) {
    candidates.push({
      name: 'Kad UOB ONE',
      rate: annualPercentFor(cardProfile.interest_rate, cardProfile.rate_type),
      balance: Number(cardProfile.balance),
    });
  }

  if (candidates.length < 2) return null;
  const highest = [...candidates].sort((a, b) => b.rate - a.rate)[0];

  if (highest.rate >= AVALANCHE_HIGH_RATE_THRESHOLD) {
    return {
      id: 'avalanche', severity: 'critical',
      message: `${highest.name} ada kadar faedah sangat tinggi (${formatPercent(highest.rate)} setahun) dengan baki ${formatRM(highest.balance)}. Ini patut jadi keutamaan #1 — fokuskan sebarang bayaran lebihan ke sini dahulu (kaedah avalanche).`,
    };
  }
  return {
    id: 'avalanche', severity: 'warning',
    message: `Antara semua hutang anda, ${highest.name} ada kadar faedah tertinggi (${formatPercent(highest.rate)} setahun, baki ${formatRM(highest.balance)}). Fokuskan bayaran lebihan ke sini dahulu untuk jimat faedah jangka panjang.`,
  };
}

function uobLatePaymentInsight(cardProfile) {
  if (!cardProfile || cardProfile.status === 'terminated') return null;
  const { scenarioB } = calculateUobCostSummary(cardProfile);
  if (!scenarioB.late) return null;
  return {
    id: 'uob-late', severity: 'critical',
    message: `Tarikh bayaran kad UOB ONE anda (${formatDateMY(scenarioB.dates.paymentDate)}) adalah selepas tarikh akhir (${formatDateMY(scenarioB.dates.dueDate)}) — penalti lewat bayar 1% (${formatRM(scenarioB.lateFee)}) akan dikenakan. Ubah tarikh bayaran anda.`,
  };
}

function uobInterestCostInsight(cardProfile) {
  if (!cardProfile || cardProfile.status === 'terminated' || Number(cardProfile.balance) <= 0) return null;
  const { scenarioB, netSavings } = calculateUobCostSummary(cardProfile);

  if (scenarioB.totalCost >= UOB_INSIGHT_INTEREST_THRESHOLD) {
    return {
      id: 'uob-interest', severity: 'warning',
      message: `Faedah kad UOB ONE dianggar ${formatRM(scenarioB.totalCost)} bulan ini. Bayaran lebih awal atau lebih besar sebelum tarikh statement (${formatDateMY(scenarioB.dates.statementDate)}) boleh jimat sehingga ${formatRM(netSavings)} berbanding kekalkan baki penuh.`,
    };
  }
  return {
    id: 'uob-interest', severity: 'good',
    message: `Faedah kad UOB ONE bulan ini rendah (${formatRM(scenarioB.totalCost)}) — bayaran awal anda ${formatRM(cardProfile.payment_amount)} pada ${cardProfile.payment_day}hb menjimatkan ${formatRM(netSavings)} berbanding kekalkan baki penuh. Teruskan.`,
  };
}

function waiverInsight(entries, cardProfile) {
  if (!cardProfile || getDistinctPeriods(entries).length === 0) return null;
  const result = calculateAnnualFeeWaiver({ cardType: cardProfile.card_type, entries });

  if (!result.waived) {
    return {
      id: 'waiver', severity: 'warning',
      message: `Perbelanjaan runcit (petrol/runcit/dining/Grab) anda dianggar ${formatRM(result.projectedAnnual)} setahun — masih ${formatRM(result.shortfall)} lagi untuk capai ${formatRM(result.threshold)} & waiverkan yuran tahunan ${formatRM(result.annualFee)}.`,
    };
  }
  return {
    id: 'waiver', severity: 'good',
    message: `Perbelanjaan runcit anda dianggar ${formatRM(result.projectedAnnual)} setahun — sudah melepasi ${formatRM(result.threshold)}. Yuran tahunan ${formatRM(result.annualFee)} kad ${result.cardLabel} dijangka diwaiverkan.`,
  };
}

function budgetInsight(entries, budgets, period) {
  if (budgets.length === 0) return null;
  const worst = calculateBudgetProgress(budgets, entries, period.month, period.year)[0];
  if (!worst || worst.percent < 90) return null;

  if (worst.percent >= 100) {
    return {
      id: 'budget', severity: 'critical',
      message: `Perbelanjaan kategori ${categoryLabel(worst.category)} sudah melebihi had bulanan sebanyak ${formatRM(worst.spent - worst.limit)} (had ${formatRM(worst.limit)}).`,
    };
  }
  return {
    id: 'budget', severity: 'warning',
    message: `Perbelanjaan kategori ${categoryLabel(worst.category)} sudah ${Math.round(worst.percent)}% daripada had bulanan (${formatRM(worst.spent)} / ${formatRM(worst.limit)}).`,
  };
}

function spendingTrendInsight(entries) {
  const periods = [...getDistinctPeriods(entries)].sort((a, b) => b.year - a.year || b.month - a.month);
  let streak = 0;
  const streakMonths = [];
  for (const p of periods) {
    const t = getMonthlyTotals(entries, p.month, p.year);
    if (Number(t.income) - Number(t.expense) < 0) {
      streak += 1;
      streakMonths.push(`${MONTH_LABELS[p.month - 1]} ${p.year}`);
    } else {
      break;
    }
  }
  if (streak < 2) return null;
  return {
    id: 'spending-trend', severity: 'critical',
    message: `Perbelanjaan anda melebihi pendapatan selama ${streak} bulan berturut-turut (${streakMonths.reverse().join(' & ')}). Ini boleh menghakis simpanan atau menambah hutang jika berterusan — semak perbelanjaan tidak penting.`,
  };
}

/** Rules-based (no AI) personalised nudges — see safeToSpend.js for why the
 *  underlying math stays deterministic. */
export function generateInsights({ entries, debts, cardProfile, emergencyFund, budgets = [], period }) {
  const totals = getMonthlyTotals(entries, period.month, period.year);
  const dti = calculateDti(debts, cardProfile, totals.income);

  const insights = [
    dtiHealthInsight(dti),
    noIncomeInsight(totals, period),
    emergencyFundInsight(entries, emergencyFund),
    avalancheInsight(debts, cardProfile),
    uobLatePaymentInsight(cardProfile),
    uobInterestCostInsight(cardProfile),
    waiverInsight(entries, cardProfile),
    budgetInsight(entries, budgets, period),
    spendingTrendInsight(entries),
  ].filter(Boolean);

  return insights
    .sort((a, b) => SEVERITY_WEIGHT[a.severity] - SEVERITY_WEIGHT[b.severity])
    .slice(0, 5);
}
