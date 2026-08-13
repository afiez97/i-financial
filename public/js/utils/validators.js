export function isDayOfMonth(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 31;
}

export function isNonNegativeAmount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}

export function isRequiredString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Applies `rules` (a map of fieldName -> validator fn) against `values`,
 * writes error text into elements matching `#<field>-error`, and toggles
 * aria-invalid on `#<field>`. Returns true when every rule passes.
 */
export function validateForm(values, rules, root = document) {
  let allValid = true;
  for (const [field, { test, message }] of Object.entries(rules)) {
    const valid = test(values[field]);
    const input = root.querySelector(`#${field}`);
    const errorEl = root.querySelector(`#${field}-error`);
    if (input) input.setAttribute('aria-invalid', String(!valid));
    if (errorEl) errorEl.textContent = valid ? '' : message;
    if (!valid) allValid = false;
  }
  return allValid;
}
