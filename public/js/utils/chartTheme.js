/** Resolves a CSS custom property (e.g. "--series-1") to its current computed
 *  color, so Chart.js configs stay in sync with the light/dark theme. */
export function resolveColor(varName) {
  return getComputedStyle(document.body).getPropertyValue(varName).trim() || '#999';
}

export const CATEGORICAL = ['--series-1', '--series-2', '--series-3', '--series-4', '--series-5', '--series-6', '--series-7', '--series-8'].map(resolveColor);

export const STATUS = {
  good: resolveColor('--status-good'),
  warning: resolveColor('--status-warning'),
  serious: resolveColor('--status-serious'),
  critical: resolveColor('--status-critical'),
};

export function gridColor() {
  return resolveColor('--gridline');
}

export function mutedTextColor() {
  return resolveColor('--text-muted');
}
