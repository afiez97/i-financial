const SECTIONS = ['overview', 'cashflow', 'debts', 'assets', 'emergency', 'goals', 'uob', 'waiver'];
const OVERFLOW_SECTIONS = ['emergency', 'goals', 'uob', 'waiver'];

export function initNav() {
  const moreBtn = document.getElementById('bottom-nav-more-btn');
  const sheet = document.getElementById('bottom-nav-sheet');

  function closeSheet() {
    sheet.hidden = true;
    moreBtn.setAttribute('aria-expanded', 'false');
  }

  function activate(id) {
    const target = SECTIONS.includes(id) ? id : 'overview';
    for (const s of SECTIONS) {
      const section = document.getElementById(`section-${s}`);
      if (section) section.hidden = s !== target;
      document.querySelectorAll(`a[href="#${s}"]`).forEach((link) => {
        link.classList.toggle('active', s === target);
      });
    }
    moreBtn.classList.toggle('active', OVERFLOW_SECTIONS.includes(target));
    closeSheet();
  }

  moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = sheet.hidden;
    sheet.hidden = !willOpen;
    moreBtn.setAttribute('aria-expanded', String(willOpen));
  });

  document.addEventListener('click', (e) => {
    if (!sheet.hidden && !sheet.contains(e.target) && e.target !== moreBtn) closeSheet();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet.hidden) closeSheet();
  });

  window.addEventListener('hashchange', () => activate(location.hash.slice(1)));
  activate(location.hash.slice(1) || 'overview');
}
