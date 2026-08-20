// <key-lock-stage> — 2D neon padlock diagram. Reacts to typing; glows red on a wrong
// password, green on a correct one. Same API as the 3D version it replaces.
(function () {
  if (window.customElements && customElements.get('key-lock-stage')) return;
  const NS = 'http://www.w3.org/2000/svg';
  const COL = { idle: '#38bdf8', error: '#ec3013', success: '#34d399' };

  // parts geometry
  const PC = { x: 280, y: 262, r: 66 };          // plug centre
  const BODY = { x: 150, y: 150, w: 260, h: 280 };
  const LEG_L = 200, LEG_R = 360;
  const KEY_HOME = 0, KEY_IN = -186;             // key travel along x

  const el = (n, a, p) => {
    const e = document.createElementNS(NS, n);
    for (const k in a) e.setAttribute(k, a[k]);
    if (p) p.appendChild(e);
    return e;
  };

  const teeth = [9, 4, 12, 6, 10];
  function bladePath() {
    let d = 'M606,276 L476,276 L464,262 L476,248';
    teeth.forEach((dep, i) => {
      const x = 494 + i * 24;
      d += ` L${x - 9},248 L${x - 5},${248 + dep} L${x + 5},${248 + dep} L${x + 9},248`;
    });
    return d + ' L606,248 Z';
  }
  function keywayPath() {
    // warded slot: horizontal channel with two ward steps
    return 'M336,250 L300,250 L300,244 L286,244 L286,250 L262,250 L262,242 L250,242 L250,250 '
      + 'L226,250 L226,274 L250,274 L250,282 L262,282 L262,274 L286,274 L286,280 L300,280 L300,274 L336,274 Z';
  }

  class KeyLockStage extends HTMLElement {
    connectedCallback() {
      if (this._built) return;
      this._built = true;
      this.style.cssText = 'display:block;position:relative;width:100%;height:100%;overflow:hidden';
      this._showLabels = this.getAttribute('labels') !== 'off';
      this._type = 0; this._typeS = 0;
      this._t = 0; this._dir = 0; this._pulse = 0; this._shake = 0;
      this._phase = 'idle';
      this._build();
      this._raf = requestAnimationFrame(this._frame.bind(this));
    }
    disconnectedCallback() { cancelAnimationFrame(this._raf); }

    /* ---------- public API ---------- */
    setLabels(on) { this._showLabels = !!on; if (this.labels) this.labels.style.display = on ? '' : 'none'; }
    setTyping(f) { this._type = Math.max(0, Math.min(1, f)); }
    signalError() { this._phase = 'error'; this._dir = -1; this._pulse = 1; this._shake = 1; }
    runUnlock() { this._phase = 'success'; this._dir = 1; this._pulse = 1; }
    resetKey() { this._phase = 'idle'; this._dir = -1; this._pulse = 0; }

    _build() {
      const svg = el('svg', {
        viewBox: '0 -50 900 610', preserveAspectRatio: 'xMidYMid meet',
        style: 'position:absolute;inset:0;width:100%;height:100%;color:' + COL.idle
      }, this);
      this.svg = svg;

      const defs = el('defs', {}, svg);
      const glow = el('filter', { id: 'kl-glow', x: '-40%', y: '-40%', width: '180%', height: '180%' }, defs);
      el('feGaussianBlur', { stdDeviation: '5', result: 'b' }, glow);
      const m = el('feMerge', {}, glow);
      el('feMergeNode', { in: 'b' }, m); el('feMergeNode', { in: 'SourceGraphic' }, m);
      // the inserted stretch of blade is only drawn where the keyway is
      const clip = el('clipPath', { id: 'kl-keyway' }, defs);
      el('path', { d: keywayPath() }, clip);

      const shake = el('g', {}, svg); this.shakeG = shake;

      /* ---------- shackle ---------- */
      const sh = el('g', { filter: 'url(#kl-glow)' }, shake); this.shackleG = sh;
      const shackle = 'M' + LEG_L + ',250 L' + LEG_L + ',110 A80,80 0 0 1 ' + LEG_R + ',110 L' + LEG_R + ',196';
      el('path', { d: shackle, fill: 'none', stroke: 'rgba(233,236,238,0.5)', 'stroke-width': '26', 'stroke-linecap': 'butt' }, sh);
      el('path', { d: shackle, fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, sh);
      el('path', { d: 'M' + (LEG_L - 13) + ',238 L' + (LEG_L + 13) + ',238', stroke: 'currentColor', 'stroke-width': '2' }, sh);

      /* ---------- body ---------- */
      el('rect', { x: BODY.x, y: BODY.y, width: BODY.w, height: BODY.h, fill: 'rgba(120,140,150,0.10)' }, shake);
      el('rect', {
        x: BODY.x, y: BODY.y, width: BODY.w, height: BODY.h, fill: 'none',
        stroke: 'currentColor', 'stroke-width': '2', filter: 'url(#kl-glow)'
      }, shake);
      el('line', { x1: BODY.x, y1: BODY.y + 26, x2: BODY.x + BODY.w, y2: BODY.y + 26, stroke: 'currentColor', 'stroke-width': '1', opacity: '0.3' }, shake);
      el('line', { x1: BODY.x, y1: BODY.y + BODY.h - 26, x2: BODY.x + BODY.w, y2: BODY.y + BODY.h - 26, stroke: 'currentColor', 'stroke-width': '1', opacity: '0.3' }, shake);

      /* ---------- internals (ghosted through the translucent body) ---------- */
      const inner = el('g', { opacity: '0.55' }, shake);
      // latch hook: bevelled nose catching the notch in the long shackle leg
      const hook = el('g', {}, inner); this.hookG = hook;
      el('path', {
        d: 'M214,204 L250,204 L250,236 L214,236 L196,220 Z',
        fill: 'rgba(233,236,238,0.12)', stroke: 'currentColor', 'stroke-width': '2'
      }, hook);
      el('path', { d: 'M214,204 L214,236', stroke: 'currentColor', 'stroke-width': '1', opacity: '0.5' }, hook);
      // spring behind the hook
      el('path', { d: 'M252,220 l10,-8 l0,16 l10,-16 l0,16 l10,-16 l0,16 l8,-8', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', opacity: '0.5' }, inner);

      /* ---------- plug (rotates with the key) ---------- */
      const rot = el('g', {}, shake); this.rotG = rot;
      // cam arm on the back of the plug — swings round and drives the hook
      el('path', {
        d: 'M' + PC.x + ',' + PC.y + ' L' + (PC.x - 16) + ',' + (PC.y + 96) + ' L' + (PC.x + 16) + ',' + (PC.y + 96) + ' Z',
        fill: 'rgba(233,236,238,0.14)', stroke: 'currentColor', 'stroke-width': '2', opacity: '0.75'
      }, rot);
      el('circle', { cx: PC.x, cy: PC.y, r: PC.r, fill: 'rgba(20,26,30,0.55)', stroke: 'currentColor', 'stroke-width': '2' }, rot);
      // blade seen inside the keyway
      const inBlade = el('g', { 'clip-path': 'url(#kl-keyway)', opacity: '0.9' }, rot);
      this.bladeIn = el('path', { d: bladePath(), fill: 'rgba(233,236,238,0.35)', stroke: 'currentColor', 'stroke-width': '2' }, inBlade);
      el('path', { d: keywayPath(), fill: 'none', stroke: 'currentColor', 'stroke-width': '2', filter: 'url(#kl-glow)' }, rot);
      el('rect', { x: PC.x - 3, y: PC.y - PC.r - 14, width: 6, height: 12, fill: 'currentColor' }, rot);

      // escutcheon ring stays put on the body face
      el('circle', { cx: PC.x, cy: PC.y, r: PC.r + 14, fill: 'none', stroke: 'rgba(233,236,238,0.35)', 'stroke-width': '6' }, shake);
      el('circle', { cx: PC.x, cy: PC.y, r: PC.r + 17, fill: 'none', stroke: 'currentColor', 'stroke-width': '2', filter: 'url(#kl-glow)' }, shake);

      /* ---------- key ---------- */
      const key = el('g', { filter: 'url(#kl-glow)' }, shake); this.keyG = key;
      el('path', { d: bladePath(), fill: 'rgba(233,236,238,0.5)', stroke: 'currentColor', 'stroke-width': '2' }, key);
      el('rect', { x: 600, y: 238, width: 14, height: 48, fill: 'rgba(233,236,238,0.5)', stroke: 'currentColor', 'stroke-width': '2' }, key);
      el('circle', { cx: 652, cy: 262, r: 40, fill: 'rgba(233,236,238,0.5)', stroke: 'currentColor', 'stroke-width': '2' }, key);
      el('circle', { cx: 652, cy: 262, r: 15, fill: '#0b0c0d', stroke: 'currentColor', 'stroke-width': '2' }, key);

      /* ---------- callouts ---------- */
      this._buildLabels(shake);
      if (!this._showLabels) this.labels.style.display = 'none';
    }

    _buildLabels(parent) {
      const g = el('g', { 'font-size': '13', 'letter-spacing': '1.6', 'font-family': 'var(--font-body, sans-serif)' }, parent);
      this.labels = g;
      const defs = [
        ['Kunci', 700, 120, 652, 224, 'start'],
        ['Gigi', 700, 166, 542, 250, 'start'],
        ['Keyway', 700, 372, 330, 286, 'start'],
        ['Plug', 700, 418, 300, 320, 'start'],
        ['Shackle', 196, 96, 262, 118, 'end'],
        ['Badan', 130, 176, 152, 176, 'end'],
        ['Latch hook', 130, 222, 196, 220, 'end'],
        ['Escutcheon', 130, 300, 218, 290, 'end'],
        ['Cam', 130, 402, 268, 372, 'end']
      ];
      this.follow = [];
      defs.forEach(([t, tx, ty, px, py, anchor], i) => {
        const n = String(i + 1).padStart(2, '0');
        const lx = anchor === 'end' ? tx + 12 : tx - 12;
        const ex = anchor === 'end' ? lx + 20 : lx - 20;
        const leader = el('path', {
          d: 'M' + lx + ',' + (ty - 4) + ' L' + ex + ',' + (ty - 4) + ' L' + px + ',' + py,
          fill: 'none', stroke: 'currentColor', 'stroke-width': '1', opacity: '0.45'
        }, g);
        const dot = el('circle', { cx: px, cy: py, r: 3, fill: 'currentColor', opacity: '0.8' }, g);
        // the key's own callouts track it as it slides in and turns
        if (t === 'Kunci' || t === 'Gigi') this.follow.push({ leader, dot, px, py, lx, ly: ty - 4, ex });
        const num = el('text', { x: tx, y: ty - 16, 'text-anchor': anchor, fill: 'currentColor', opacity: '0.7', 'font-size': '11' }, g);
        num.textContent = n;
        const lab = el('text', { x: tx, y: ty, 'text-anchor': anchor, fill: '#e9ecee', 'font-size': '14' }, g);
        lab.textContent = t.toUpperCase();
      });
    }

    _frame() {
      this._raf = requestAnimationFrame(this._frame.bind(this));
      const now = performance.now() / 1000;
      const dt = Math.min(0.05, this._last ? now - this._last : 0.016);
      this._last = now;
      const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

      this._t = Math.max(0, Math.min(1, this._t + this._dir * dt * 0.55));
      const seg = (a, b) => Math.max(0, Math.min(1, (this._t - a) / (b - a)));
      const turn = ease(seg(0.3, 0.72));
      const hookP = ease(seg(0.6, 0.84));
      const pop = ease(seg(0.74, 1));

      this._typeS += (this._type - this._typeS) * Math.min(1, dt * 7);
      const insert = Math.max(this._typeS * 0.86, this._phase === 'success' ? ease(seg(0, 0.3)) : 0, turn);

      const kx = KEY_HOME + (KEY_IN - KEY_HOME) * insert;
      const spin = 'rotate(' + (-90 * turn) + ' ' + PC.x + ' ' + PC.y + ')';
      this.keyG.setAttribute('transform', spin + ' translate(' + kx + ',0)');
      this.bladeIn.setAttribute('transform', 'translate(' + kx + ',0)');
      this.rotG.setAttribute('transform', spin);
      this.hookG.setAttribute('transform', 'translate(' + (hookP * 44) + ',0)');
      this.shackleG.setAttribute('transform',
        'translate(0,' + (-34 * pop) + ') rotate(' + (26 * pop) + ' ' + LEG_R + ' 196)');

      const ang = -90 * turn * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang);
      this.follow.forEach(f => {
        const x0 = f.px + kx - PC.x, y0 = f.py - PC.y;
        const x = PC.x + x0 * ca - y0 * sa, y = PC.y + x0 * sa + y0 * ca;
        f.dot.setAttribute('cx', x); f.dot.setAttribute('cy', y);
        f.leader.setAttribute('d', 'M' + f.lx + ',' + f.ly + ' L' + f.ex + ',' + f.ly + ' L' + x + ',' + y);
      });

      if (this._shake > 0) {
        this._shake = Math.max(0, this._shake - dt * 3.4);
        const a = this._shake * this._shake * 9;
        this.shakeG.setAttribute('transform', 'translate(' + Math.sin(now * 46) * a + ',0)');
      } else if (this.shakeG.hasAttribute('transform')) {
        this.shakeG.removeAttribute('transform');
      }

      const base = COL[this._phase] || COL.idle;
      this._pulse = Math.max(0, this._pulse - dt * 0.7);
      const breathe = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(now * 1.9)) + this._pulse * 0.5;
      this.svg.style.color = base;
      this.svg.style.opacity = String(Math.min(1, 0.72 + breathe * 0.3));
    }
  }
  customElements.define('key-lock-stage', KeyLockStage);
})();
