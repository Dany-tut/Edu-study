// Общее поведение макетов: иконки Loop, тема, вариант, вид, фейды прокрутки,
// тумблеры, сегменты, листы и тосты. Состояние читается из адреса:
//   ?v=a|b  &t=light|dark  &view=mock|spec  — удобно для скриншотов и ссылок.
(function () {
  const qs = new URLSearchParams(location.search);
  const html = document.documentElement;
  const body = document.body;

  // ── Иконки ──
  function paintIcons(root) {
    root.querySelectorAll('i[data-i]').forEach((el) => {
      const svg = (window.LOOP || {})[el.dataset.i];
      const span = document.createElement('span');
      span.className = 'li' + (el.dataset.s ? ' s' + el.dataset.s : '') + (el.className ? ' ' + el.className : '');
      span.setAttribute('aria-hidden', 'true');
      span.innerHTML = svg || '';
      if (!svg) console.warn('Нет Loop-иконки', el.dataset.i);
      el.replaceWith(span);
    });
  }
  paintIcons(document);
  window.paintIcons = paintIcons;

  // ── Переключатели документа ──
  const state = {
    v: ['a', 'b', 'c'].includes(qs.get('v')) ? qs.get('v') : (document.querySelector('[data-doc="v:c"]') ? 'c' : 'a'),
    t: qs.get('t') === 'dark' ? 'dark' : (qs.get('t') === 'light' ? 'light' : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')),
    view: qs.get('view') === 'spec' ? 'spec' : 'mock',
  };
  function apply() {
    body.dataset.variant = state.v;
    body.dataset.view = state.view;
    html.dataset.theme = state.t;
    document.querySelectorAll('[data-doc]').forEach((b) => {
      const [k, val] = b.dataset.doc.split(':');
      b.setAttribute('aria-pressed', String(state[k] === val));
    });
    const u = new URL(location.href);
    u.searchParams.set('v', state.v); u.searchParams.set('t', state.t); u.searchParams.set('view', state.view);
    history.replaceState(null, '', u);
    requestAnimationFrame(updateAllFades);
    setTimeout(updateAllFades, 60);
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-doc]');
    if (!b) return;
    const [k, val] = b.dataset.doc.split(':');
    state[k] = val; apply();
  });

  // ── Фейды у каждой области прокрутки (SCROLL-01) ──
  const FADE = 28;
  function fade(el) {
    if (el.classList.contains('hscroll')) {
      const max = el.scrollWidth - el.clientWidth;
      el.style.setProperty('--fl', (max > 1 && el.scrollLeft > 1 ? FADE : 0) + 'px');
      el.style.setProperty('--fr', (max > 1 && el.scrollLeft < max - 1 ? FADE : 0) + 'px');
    } else {
      const max = el.scrollHeight - el.clientHeight;
      el.style.setProperty('--ft', (max > 1 && el.scrollTop > 1 ? FADE : 0) + 'px');
      el.style.setProperty('--fb', (max > 1 && el.scrollTop < max - 1 ? (el.dataset.fb || (el.parentElement.querySelector(':scope > .dock, :scope > .sticky-foot') ? 104 : FADE)) : 0) + 'px');
    }
  }
  function updateAllFades() { document.querySelectorAll('.scroll, .tg-feed, .hscroll, .fscroll, .dgrid-wrap').forEach(fade); }
  window.updateAllFades = updateAllFades;
  document.addEventListener('scroll', (e) => { const el = e.target; if (el.matches && el.matches('.scroll, .tg-feed, .hscroll, .fscroll, .dgrid-wrap')) fade(el); }, true);
  addEventListener('resize', updateAllFades);
  // Чат Telegram открывается на последнем сообщении, как в самом приложении.
  document.querySelectorAll('.tg-feed[data-bottom]').forEach((f) => { f.scrollTop = f.scrollHeight; });

  // ── Тумблеры и галочки ──
  document.addEventListener('click', (e) => {
    const t = e.target.closest('.tgl, .cbx[role="checkbox"], [data-check]');
    if (!t) return;
    const target = t.hasAttribute('data-check') ? t.querySelector('.cbx') : t;
    if (!target) return;
    const on = target.getAttribute('aria-checked') !== 'true';
    target.setAttribute('aria-checked', String(on));
    t.dispatchEvent(new CustomEvent('mock:toggle', { bubbles: true, detail: { on } }));
  });

  // ── Сегменты внутри макета: data-seg на контейнере, data-pane="id" у кнопок ──
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-seg] > button');
    if (!b) return;
    const group = b.parentElement;
    group.querySelectorAll(':scope > button').forEach((x) => {
      x.setAttribute('aria-pressed', String(x === b));
      if (x.dataset.pane) { const p = document.getElementById(x.dataset.pane); if (p) p.hidden = x !== b; }
    });
    group.dispatchEvent(new CustomEvent('mock:seg', { bubbles: true, detail: { value: b.dataset.value || b.textContent.trim() } }));
    setTimeout(updateAllFades, 30);
  });

  // ── Листы ──
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]');
    if (o) { const s = document.getElementById(o.dataset.open); if (s) { s.classList.add('open'); setTimeout(updateAllFades, 30); } return; }
    const c = e.target.closest('[data-close]');
    if (c) { c.closest('.sheet-wrap').classList.remove('open'); return; }
    if (e.target.classList && e.target.classList.contains('sheet-wrap')) e.target.classList.remove('open');
  });

  // ── Тост с «Отменить» ──
  window.mockToast = function (scope, text, onUndo) {
    let t = scope.querySelector(':scope > .toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; scope.appendChild(t); }
    t.innerHTML = '<span></span><button type="button">Отменить</button>';
    t.firstChild.textContent = text;
    t.lastChild.onclick = () => { t.classList.remove('show'); onUndo && onUndo(); };
    t.lastChild.hidden = !onUndo;
    t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 3200);
  };

  // ── Действия страниц: data-act="имя" → window.ACTS[имя](кнопка, событие) ──
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !window.ACTS || !window.ACTS[b.dataset.act]) return;
    window.ACTS[b.dataset.act](b, e);
    setTimeout(updateAllFades, 30);
  });


  // ── Рабочий стол: библиотека виджетов, добавить/убрать, режим правки ──
  function libSync(desk) {
    desk.querySelectorAll('[data-add-widget]').forEach((b) => {
      const w = desk.querySelector('#' + b.dataset.addWidget);
      const on = w && !w.hidden;
      b.classList.toggle('on-desk', !!on);
      b.querySelector('span:not(.li)').textContent = on ? 'На столе' : 'Добавить';
    });
  }
  document.querySelectorAll('.desk').forEach(libSync);
  document.addEventListener('click', (e) => {
    const lib = e.target.closest('[data-lib]');
    if (lib) { const d = lib.closest('.desk'); d.querySelector('.lib').classList.toggle('open'); libSync(d); return; }
    const add = e.target.closest('[data-add-widget]');
    if (add) {
      const d = add.closest('.desk'); const w = d.querySelector('#' + add.dataset.addWidget); if (!w) return;
      const was = !w.hidden; w.hidden = was; libSync(d);
      if (!was) { w.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); window.mockToast(d, 'Виджет добавлен на стол', () => { w.hidden = true; libSync(d); }); }
      setTimeout(updateAllFades, 30); return;
    }
    const rm = e.target.closest('.w .rm');
    if (rm) { const w = rm.closest('.w'); const d = w.closest('.desk'); w.hidden = true; libSync(d); window.mockToast(d, 'Виджет убран', () => { w.hidden = false; libSync(d); }); return; }
    const ed = e.target.closest('[data-edit-desk]');
    if (ed) { const d = ed.closest('.desk'); const on = d.classList.toggle('editing'); ed.querySelector('span:not(.li)').textContent = on ? 'Готово' : 'Настроить'; }
  });

  apply();
  if (document.fonts) document.fonts.ready.then(updateAllFades);
})();
