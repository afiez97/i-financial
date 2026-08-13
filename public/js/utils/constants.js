export const RATE_OPTIONS = [
  { interestRate: 15, rateType: 'annual', label: '15% setahun', annualPercent: 15 },
  { interestRate: 18, rateType: 'annual', label: '18% setahun', annualPercent: 18 },
  { interestRate: 2, rateType: 'monthly', label: '2.0% sebulan (~24% setahun)', annualPercent: 24 },
];

export function findRateOption(interestRate, rateType) {
  return RATE_OPTIONS.find(
    (o) => Number(o.interestRate) === Number(interestRate) && o.rateType === rateType
  );
}

export function annualPercentFor(interestRate, rateType) {
  return rateType === 'monthly' ? Number(interestRate) * 12 : Number(interestRate);
}

export const CARD_THRESHOLDS = {
  classic: { label: 'Classic', waiverSpend: 15000, annualFee: 120 },
  platinum: { label: 'Platinum', waiverSpend: 20000, annualFee: 195 },
};

export const DEFAULT_CARD_PROFILE = {
  cardType: 'classic',
  balance: 5500,
  statementDay: 17,
  dueDay: 6,
  paymentAmount: 5000,
  paymentDay: 11,
  interestRate: 15,
  rateType: 'annual',
  status: 'active',
  terminationTargetDate: null,
  terminationNote: '',
};

export const CARD_STATUSES = [
  { value: 'active', label: 'Aktif' },
  { value: 'planned_termination', label: 'Rancang Terminate' },
  { value: 'terminated', label: 'Sudah Terminate' },
];

export function cardStatusLabel(value) {
  return CARD_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export const INCOME_CATEGORIES = [
  { value: 'salary', label: 'Gaji' },
  { value: 'side_hustle', label: 'Side-hustle' },
  { value: 'other_income', label: 'Pendapatan Lain' },
];

export const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Sewa' },
  { value: 'bills', label: 'Bil' },
  { value: 'groceries', label: 'Makanan/Runcit' },
  { value: 'petrol', label: 'Petrol' },
  { value: 'insurance', label: 'Insurans' },
  { value: 'dining', label: 'Dining' },
  { value: 'grab', label: 'Grab' },
  { value: 'other_expense', label: 'Lain-lain' },
];

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

export function categoryLabel(value) {
  return ALL_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

/** The 4 categories used by the annual fee waiver projection (Module E). */
export const RETAIL_CATEGORIES = ['petrol', 'groceries', 'dining', 'grab'];

export const DEBT_TYPES = [
  { value: 'ptptn', label: 'PTPTN' },
  { value: 'car_loan', label: 'Pinjaman Kereta' },
  { value: 'credit_card', label: 'Kad Kredit Lain' },
  { value: 'other', label: 'Lain-lain' },
];

export function debtTypeLabel(value) {
  return DEBT_TYPES.find((d) => d.value === value)?.label ?? value;
}

export const ASSET_CATEGORIES = [
  { value: 'savings', label: 'Simpanan' },
  { value: 'asb', label: 'ASB/ASNB' },
  { value: 'stocks', label: 'Saham/Unit Amanah' },
  { value: 'property', label: 'Hartanah' },
  { value: 'other', label: 'Lain-lain' },
];

export function assetCategoryLabel(value) {
  return ASSET_CATEGORIES.find((a) => a.value === value)?.label ?? value;
}

export const MONTH_LABELS = [
  'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
  'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember',
];

/** UOB card estimated minimum payment — not specified in the spec; a
 *  documented assumption used only by Module C's DTI calculation. */
export const UOB_MIN_PAYMENT_PERCENT = 0.05;
export const UOB_MIN_PAYMENT_FLOOR = 50;

export const DTI_THRESHOLDS = { safe: 35, warning: 45 };

/** Safe-to-Spend & Insights policy assumptions — not specified in the spec,
 *  documented assumptions used only by those two features. */
export const EF_RESERVE_PERCENT_OF_SURPLUS = 0.20;
export const UOB_INSIGHT_INTEREST_THRESHOLD = 30;
export const AVALANCHE_HIGH_RATE_THRESHOLD = 24;
