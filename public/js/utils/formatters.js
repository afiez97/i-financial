export function formatRM(amount) {
  const n = Number(amount) || 0;
  return 'RM' + n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatRMSigned(amount) {
  const n = Number(amount) || 0;
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  return sign + formatRM(Math.abs(n));
}

export function formatPercent(value, decimals = 1) {
  const n = Number(value) || 0;
  return n.toFixed(decimals) + '%';
}

export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export function ordinalDay(day) {
  return `${day}hb`;
}
