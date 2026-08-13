import { getMonthlyTotals, getAverageMonthlyExpense } from '../store.js';
import { round2 } from '../utils/formatters.js';
import { EF_RESERVE_PERCENT_OF_SURPLUS } from '../utils/constants.js';
import { calculateTotalObligations, calculateDti, dtiZone } from './debtTracker.js';
import { calculateEmergencyFund } from './emergencyFund.js';

/**
 * "How much can I freely spend this month without hurting my debt
 * obligations or emergency-fund goal." Deterministic — no AI involved,
 * since this figure is the app's "protect your money" guarantee.
 */
export function calculateSafeToSpend({ entries, debts, cardProfile, emergencyFund, period }) {
  const totals = getMonthlyTotals(entries, period.month, period.year);
  const netCashFlow = round2(Number(totals.income) - Number(totals.expense));

  const { totalObligations: debtReserve } = calculateTotalObligations(debts, cardProfile);
  const leftoverAfterDebt = round2(netCashFlow - debtReserve);

  const dti = calculateDti(debts, cardProfile, totals.income);
  const zone = dti ? dtiZone(dti.value) : null;

  const fund = emergencyFund ?? { target_months: 6, current_savings: 0 };
  const avgMonthlyExpense = getAverageMonthlyExpense(entries);
  const ef = calculateEmergencyFund({
    targetMonths: fund.target_months,
    currentSavings: Number(fund.current_savings),
    avgMonthlyExpense,
  });
  const shortfall = Math.max(round2(ef.target - Number(fund.current_savings)), 0);
  const efTargetMet = avgMonthlyExpense > 0 && shortfall === 0;

  let efReserve = 0;
  if (leftoverAfterDebt > 0 && zone !== 'critical' && shortfall > 0) {
    efReserve = Math.min(shortfall, round2(EF_RESERVE_PERCENT_OF_SURPLUS * leftoverAfterDebt));
  }

  const safeToSpend = round2(leftoverAfterDebt - efReserve);

  return {
    netCashFlow,
    debtReserve,
    efReserve,
    safeToSpend,
    noIncome: Number(totals.income) === 0,
    dtiZoneCritical: zone === 'critical',
    efTargetMet,
  };
}
