function effectiveTheme() {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function updateIcon(btn) {
  btn.textContent = effectiveTheme() === 'dark' ? '☀️' : '🌙';
}

export function initThemeToggle() {
  const btn = document.getElementById('theme-toggle-btn');
  updateIcon(btn);

  btn.addEventListener('click', () => {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateIcon(btn);
  });
}
