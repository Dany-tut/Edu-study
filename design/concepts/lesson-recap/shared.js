/* Общая часть концепта: данные урока, блоки итогов, вид ученика, оболочка страницы.
   Варианты (variant-*.html) задают window.VARIANT = { steps:[{label, caption, desk(), phone()}], … }. */
(function () {
  const I = (n, cls = '') => `<span class="ic ${cls}">${(window.LOOP && LOOP[n]) || ''}</span>`;
  const tc = (t) => `<span class="tc" title="Открыть запись на ${t}">${I('Play', 'sm')}${t}</span>`;
  const ed = (txt, tag = 'span', cls = '') => `<${tag} class="${cls}" contenteditable="true" spellcheck="false">${txt}</${tag}>`;
  const cb = () => `<span class="cb" role="checkbox" aria-checked="true" data-cb>${I('Check')}</span>`;
  const ko = (s) => `<span class="ko">${s}</span>`;

  /* ── Урок-пример: «Корейский с нуля · Урок 5 · Который час», запись 42:10, учитель + Маша ── */
  const D = {
    course: 'Корейский с нуля', lesson: 'Урок 5 · Который час', short: 'Который час', duration: '42:10', student: 'Маша',
    summary: [
      { h: 'Часы — родными числами, минуты — китайскими', p: `Часы называем родными корейскими числами: ${ko('한 시, 두 시, 세 시')}. Минуты — китайско-корейскими: ${ko('십 분, 삼십 분')}.`, t: '04:12' },
      { h: 'Перед 시 числа укорачиваются', p: `${ko('하나, 둘, 셋, 넷')} превращаются в ${ko('한, 두, 세, 네')}. Поэтому «четыре часа» — ${ko('네 시')}, а не ${ko('넷 시')}.`, t: '11:40' },
      { h: 'Половина и время суток', p: `${ko('반')} — половина: ${ko('세 시 반')} = 3:30. До полудня — ${ko('오전')}, после — ${ko('오후')}: ${ko('오후 두 시')} = 14:00.`, t: '18:05' },
      { h: 'Как спросить время', p: `${ko('지금 몇 시예요?')} — «Который сейчас час?». Отвечаем полным временем: ${ko('지금 세 시 십 분이에요')}.`, t: '23:30' },
    ],
    questions: [
      { q: 'Как сказать «4 часа»?', a: `${ko('네 시')} (не ${ko('넷 시')} и не ${ko('사 시')})`, t: '12:48', kind: 'Выбор' },
      { q: 'Какими числами называют минуты?', a: 'Китайско-корейскими: 일, 이, 삼…', t: '07:30', kind: 'Выбор' },
      { q: `Переведите: ${ko('오후 세 시 반')}`, a: '15:30', t: '19:10', kind: 'Ответ' },
      { q: 'Как спросить «Который час?»', a: ko('지금 몇 시예요?'), t: '23:30', kind: 'Ответ' },
      { q: `Что значит ${ko('반')}?`, a: 'Половина: 세 시 반 = 3:30', t: '18:05', kind: 'Выбор' },
      { q: '1:10 по-корейски', a: ko('한 시 십 분'), t: '09:55', kind: 'Ответ' },
      { q: `Почему не ${ko('일 시')}?`, a: 'Часы считаются родными числами', t: '05:20', kind: 'Выбор' },
    ],
    cards: [
      ['시', 'час (при счёте времени)'], ['분', 'минута'], ['반', 'половина'], ['몇', 'сколько, который'],
      ['지금', 'сейчас'], ['오전', 'до полудня'], ['오후', 'после полудня'], ['몇 시예요?', 'который час?'],
    ],
    hw: {
      title: 'Который час', note: 'Только то, что прозвучало на уроке: 0:00–42:10',
      tasks: [
        { ttl: 'Напишите время словами', kind: 'Короткий ответ', chips: ['2:00', '4:30', '7:15', '11:50', '오후 3:00'] },
        { ttl: 'Выберите верную форму', kind: 'Выбор', chips: ['네 시 / 넷 시', '두 시 / 둘 시', '한 시 / 일 시'] },
        { ttl: 'Ответьте на вопрос 지금 몇 시예요? тремя способами', kind: 'Развёрнутый ответ', chips: ['с 반', 'с 오후', 'с минутами'] },
      ],
    },
    note: [
      { c: 'amber', i: 'CircleAlert', b: 'Путает 일 시 и 한 시', s: 'Три раза за урок назвала час китайским числом.', t: ['05:20', '14:02', '31:45'] },
      { c: 'blue', i: 'MessageCircleQuestion', b: 'Спросила: почему 네 시, а не 넷 시', s: 'Объяснение было коротким — стоит вернуться.', t: ['12:48'] },
      { c: 'blue', i: 'MessageCircleQuestion', b: 'Спросила, можно ли сказать 삼십 분 вместо 반', s: 'Ответ: да, оба верны.', t: ['18:40'] },
      { c: 'green', i: 'CheckCircle2', b: 'Уверенно спрашивает 몇 시예요? в диалоге', s: '', t: ['36:10'] },
      { c: 'amber', i: 'Clock', b: 'Не успели: 오전 / 오후 только упомянули', s: 'Предложение: начать с них урок 6.', t: ['40:55'] },
    ],
  };

  const KINDS = [
    { id: 'summary', icon: 'FileText', name: 'Конспект', who: 'ученик и пропустившие', count: () => `${D.summary.length} абзаца` },
    { id: 'questions', icon: 'ListChecks', name: 'Вопросы на проверку', who: 'ученик', count: () => `${D.questions.length} вопросов` },
    { id: 'cards', icon: 'GalleryVerticalEnd', name: 'Карточки с терминами', who: 'тренажёр ученика', count: () => `${D.cards.length} карточек` },
    { id: 'hw', icon: 'NotebookPen', name: 'Черновик ДЗ', who: 'после назначения', count: () => `${D.hw.tasks.length} задания` },
    { id: 'note', icon: 'Lightbulb', name: 'Заметка учителю', who: 'только вы', count: () => `${D.note.length} пунктов` },
  ];

  /* ── Блоки итогов (режим учителя: правка на месте + галочки; режим ученика: чтение) ── */
  const B = {
    summary(o = {}) {
      return D.summary.map(x => o.student
        ? `<div class="para"><div class="body"><h4>${x.h}</h4><p>${x.p}${o.tc ? ' ' + tc(x.t) : ''}</p></div></div>`
        : `<div class="para">${cb()}<div class="body">${ed(x.h, 'h4')}${ed(x.p, 'p')}<div class="meta">${tc(x.t)}</div></div></div>`).join('');
    },
    questions(o = {}) {
      const list = o.limit ? D.questions.slice(0, o.limit) : D.questions;
      return list.map((x, i) => `<div class="item">${o.student ? `<span class="pill gray">${i + 1}</span>` : cb()}<div class="body">${o.student ? `<div class="q">${x.q}</div>` : ed(x.q, 'div', 'q')}${o.student ? '' : ed(x.a, 'div', 'a')}${o.student ? '' : `<div class="meta"><span class="pill gray">${x.kind}</span>${tc(x.t)}</div>`}</div></div>`).join('');
    },
    cards(o = {}) {
      const list = o.limit ? D.cards.slice(0, o.limit) : D.cards;
      return `<div class="cards-grid">${list.map(([t, r]) => `<div class="vcard">${o.student ? '' : cb()}${o.student ? `<span class="t">${t}</span><span class="r">${r}</span>` : ed(t, 'span', 't') + ed(r, 'span', 'r')}</div>`).join('')}</div>`;
    },
    hw(o = {}) {
      return `<div style="display:grid;gap:8px">${D.hw.tasks.map((x, i) => `<div class="hw-task">${o.student ? `<span class="pill purple">${i + 1}</span>` : cb()}<div class="body">${o.student ? `<span class="ttl">${x.ttl}</span>` : ed(x.ttl, 'span', 'ttl')}<div class="chips">${x.chips.map(c => `<span class="ko" style="font-weight:500">${c}</span>`).join('')}</div>${o.student ? '' : `<div class="meta"><span class="pill gray">${x.kind}</span></div>`}</div></div>`).join('')}</div>`;
    },
    note() {
      return D.note.map(x => `<div class="note-line"><span class="dot ${x.c}">${I(x.i)}</span><div class="body">${ed(x.b, 'b')}${x.s ? ed(x.s, 'span') : ''}<div class="meta">${x.t.map(tc).join('')}</div></div></div>`).join('')
        + `<div class="privacy" style="margin-top:10px">${I('Lock')}Видите только вы. Ученику и родителям не показывается.</div>`;
    },
  };

  const secHead = (k, extra = '') => `<div class="sec-h"><span class="sec-ic">${I(k.icon)}</span><div><h3>${k.name}</h3><div class="muted small">${k.count()} · ${k.who}</div></div><span class="sp"></span>${extra}</div>`;

  /* ── Вид ученика ─────────────────────────────────────────── */
  // mode: 'a' — отдельный блок «Итоги занятия»; 'b' — конспект привязан к видео (таймкоды); 'c' — встроено в урок без отдельной рамки
  function studentDesk(mode) {
    const linked = mode === 'b';
    const recapTitle = mode === 'c' ? 'Конспект' : 'Итоги занятия';
    return `<div class="desk-body" style="padding:18px 22px;gap:18px">
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:12px">
        <div class="crumb">${D.course} · Модуль 1</div>
        <div class="ws-head"><h2>${D.lesson}</h2><span class="sp"></span><span class="pill green">${I('CheckCircle2')}Урок прошёл 4 ноября</span></div>
        <div class="tabs"><span class="on">Урок</span><span>Запись</span><span>Домашка <span class="badge">1</span></span></div>
        <div class="scroll" data-fade style="flex:1;display:grid;gap:12px;align-content:start;padding-bottom:8px">
          <div class="panel" style="padding:18px 20px">
            <div class="sec-h"><span class="sec-ic">${I('FileText')}</span><div><h3>${recapTitle}</h3><div class="muted small">${mode === 'c' ? 'Главное с урока' : 'Собрано по записи урока · проверено преподавателем'}</div></div></div>
            ${B.summary({ student: true, tc: linked })}
          </div>
          <div class="panel" style="padding:18px 20px">
            <div class="sec-h"><span class="sec-ic">${I('ListChecks')}</span><div><h3>Проверь себя</h3><div class="muted small">${D.questions.length} вопросов · 3 минуты</div></div><span class="sp"></span><button class="btn primary sm">Начать</button></div>
            ${B.questions({ student: true, limit: 3 })}
          </div>
        </div>
      </div>
      <div style="width:330px;flex:none;display:flex;flex-direction:column;gap:12px;padding-top:28px">
        <div class="panel" style="padding:12px">
          <div style="aspect-ratio:16/9;border-radius:16px;background:linear-gradient(135deg,#2B2540,#151320);display:grid;place-items:center;color:#fff;position:relative">
            <span style="width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.18);display:grid;place-items:center">${I('Play', 'mono')}</span>
            <span style="position:absolute;right:10px;bottom:8px;font-size:12px;font-weight:650">${D.duration}</span>
          </div>
          <div class="muted small" style="padding:8px 4px 0">${linked ? 'Нажмите время в конспекте — видео перемотается' : 'Запись урока и расшифровка'}</div>
        </div>
        <div class="panel" style="padding:16px 18px;display:grid;gap:10px">
          <div class="sec-h" style="margin:0"><span class="sec-ic">${I('GalleryVerticalEnd')}</span><div><h3>Карточки урока</h3><div class="muted small">${D.cards.length} слов в тренажёре</div></div></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">${D.cards.slice(0, 5).map(c => `<span class="pill gray ko" style="font-size:13px">${c[0]}</span>`).join('')}<span class="pill gray">+3</span></div>
          <button class="btn soft sm">Повторить карточки</button>
        </div>
        <div class="panel" style="padding:16px 18px;display:grid;gap:8px">
          <div class="sec-h" style="margin:0"><span class="sec-ic">${I('NotebookPen')}</span><div><h3>Домашка: ${D.hw.title}</h3><div class="muted small">До 8 ноября · ${D.hw.tasks.length} задания</div></div></div>
          <button class="btn primary sm">Открыть</button>
        </div>
      </div>
    </div>`;
  }
  function studentPhone(mode) {
    const linked = mode === 'b';
    return `<div class="scroll" data-fade style="flex:1;padding:4px 16px 110px;display:grid;gap:12px;align-content:start">
      <div style="display:flex;align-items:center;gap:10px;padding:2px 0 4px"><span class="btn ghost sm" style="width:36px;padding:0">${I('ChevronLeft')}</span><div><div class="crumb">${D.course}</div><div style="font-weight:700;font-size:17px">${D.lesson}</div></div></div>
      <div style="aspect-ratio:16/9;border-radius:20px;background:linear-gradient(135deg,#2B2540,#151320);display:grid;place-items:center;position:relative;color:#fff">
        <span style="width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.18);display:grid;place-items:center">${I('Play', 'mono')}</span>
        <span style="position:absolute;right:12px;bottom:10px;font-size:12px;font-weight:650">${D.duration}</span></div>
      <div class="panel" style="padding:16px">
        <div class="sec-h"><span class="sec-ic">${I('FileText')}</span><div><h3>${mode === 'c' ? 'Конспект' : 'Итоги занятия'}</h3><div class="muted small">${linked ? 'Время — переход к месту в записи' : 'Главное с урока'}</div></div></div>
        ${B.summary({ student: true, tc: linked })}
      </div>
      <div class="panel" style="padding:16px;display:grid;gap:10px">
        <div class="sec-h" style="margin:0"><span class="sec-ic">${I('ListChecks')}</span><div><h3>Проверь себя</h3><div class="muted small">${D.questions.length} вопросов · 3 минуты</div></div></div>
        <button class="btn primary block">Начать</button>
      </div>
      <div class="panel" style="padding:16px;display:grid;gap:10px">
        <div class="sec-h" style="margin:0"><span class="sec-ic">${I('GalleryVerticalEnd')}</span><div><h3>Карточки урока</h3><div class="muted small">${D.cards.length} слов</div></div><span class="sp"></span><button class="btn soft sm">Повторить</button></div>
      </div>
      <div class="panel" style="padding:16px;display:grid;gap:10px">
        <div class="sec-h" style="margin:0"><span class="sec-ic">${I('NotebookPen')}</span><div><h3>Домашка</h3><div class="muted small">До 8 ноября · ${D.hw.tasks.length} задания</div></div><span class="sp"></span><button class="btn primary sm">Открыть</button></div>
      </div>
    </div>${dock('student')}`;
  }

  /* ── Каркасы ─────────────────────────────────────────────── */
  const deskFrame = (inner, url = 'iskra.app/#/teacher/constructor') => `<div class="desk"><div class="desk-bar"><span></span><span></span><span></span><em>${url}</em></div>${inner}</div>`;
  const phoneFrame = (inner) => `<div class="phone"><div class="phone-screen"><div class="phone-status"><span>9:41</span><span class="island"></span><span style="display:inline-flex;gap:5px;align-items:center"><i style="width:17px;height:11px;border-radius:3px;border:1.5px solid currentColor;opacity:.9;display:inline-block;position:relative"><i style="position:absolute;inset:1.5px 4px 1.5px 1.5px;background:currentColor;border-radius:1px"></i></i></span></div>${inner}<div class="phone-home"></div></div></div>`;
  const rail = (on = 3) => `<div class="rail"><span class="logo">И</span>${['Home', 'Users', 'Inbox', 'BookOpen', 'Wallet'].map((n, i) => `<b class="${i === on ? 'on' : ''}">${I(n)}</b>`).join('')}</div>`;
  const lessonList = () => `<div class="lesson-list"><div class="course">${D.course}</div>${['Алфавит: гласные', 'Алфавит: согласные', 'Приветствия', 'Числа', 'Который час', 'В кафе'].map((t, i) => `<div class="li ${i === 4 ? 'on' : ''}"><i>${i + 1}</i>${t}${i === 4 ? `<span style="margin-left:auto" class="ic sm">${I('AudioLines', 'sm')}</span>` : ''}</div>`).join('')}</div>`;
  const dock = (who) => who === 'student'
    ? `<div class="dock glass">${[['Home', 'Главная', 1], ['BookOpen', 'Курс'], ['GalleryVerticalEnd', 'Карточки'], ['UserCircle', 'Профиль']].map(([n, l, on]) => `<b class="${on ? 'on' : ''}">${I(n)}${l}</b>`).join('')}</div>`
    : `<div class="dock glass">${[['Home', 'Сегодня'], ['Users', 'Ученики'], ['Inbox', 'Проверка'], ['BookOpen', 'Курсы', 1], ['UserCircle', 'Профиль']].map(([n, l, on]) => `<b class="${on ? 'on' : ''}">${I(n)}${l}</b>`).join('')}</div>`;

  /* Ожидание: строки прогресса с заливкой внутри строки */
  function progRows(id) {
    return `<div class="prog" data-prog="${id}">${KINDS.map((k, i) => `<div class="row" data-i="${i}"><span class="num">${i + 1}</span>${k.name}<b></b></div>`).join('')}</div>`;
  }
  function runProgress(root) {
    root.querySelectorAll('[data-prog]').forEach(box => {
      const rows = [...box.children]; let i = 0, pct = 0;
      const tick = () => {
        if (!box.isConnected) return;
        rows.forEach((r, j) => {
          r.classList.toggle('done', j < i); r.classList.toggle('active', j === i);
          r.style.setProperty('--fill', j === i ? pct + '%' : '0%');
          r.querySelector('.num').innerHTML = j < i ? I('Check') : String(j + 1);
          r.querySelector('b').textContent = j < i ? 'готово' : j === i ? pct + '%' : '';
        });
        pct += 17; if (pct > 100) { pct = 0; i = (i + 1) % (rows.length + 2); }
        setTimeout(tick, 380);
      };
      // Статичное «середина работы» на случай, если таймеры не идут (превью/скриншот)
      i = 2; pct = 46; tick();
    });
  }

  /* Фейды прокрутки */
  function fades(root) {
    root.querySelectorAll('.scroll, .hscroll').forEach(el => {
      const upd = () => {
        const v = el.classList.contains('hscroll');
        if (v) {
          const max = el.scrollWidth - el.clientWidth;
          el.style.setProperty('--fl', el.scrollLeft > 2 ? '28px' : '0px');
          el.style.setProperty('--fr', el.scrollLeft < max - 2 ? '28px' : '0px');
        } else {
          const max = el.scrollHeight - el.clientHeight;
          el.style.setProperty('--ft', el.scrollTop > 2 ? '32px' : '0px');
          el.style.setProperty('--fb', el.scrollTop < max - 2 ? '32px' : '0px');
        }
      };
      el.addEventListener('scroll', upd, { passive: true }); upd();
      new ResizeObserver(upd).observe(el);
    });
  }

  /* ── Оболочка страницы ───────────────────────────────────── */
  const ls = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  const S = {
    step: 0,
    device: ls.get('recap.device') || (innerWidth < 760 ? 'phone' : 'desk'),
    theme: ls.get('recap.theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  };
  const q = new URLSearchParams(location.search);
  if (q.get('device')) S.device = q.get('device');
  if (q.get('theme')) S.theme = q.get('theme');
  if (q.get('step')) S.step = +q.get('step') - 1;

  function mount() {
    const V = window.VARIANT;
    document.documentElement.dataset.theme = S.theme;
    document.title = V.title + ' · Итоги урока';
    document.body.innerHTML = `<div class="page">
      <div class="page-head"><div>
        <div class="eyebrow"><a href="index.html">Искра · Концепт «Итоги урока из расшифровки»</a></div>
        <h1 class="title">${V.title}</h1><p class="subtitle">${V.tagline}</p></div>
        <div class="controls">
          <div class="seg" id="dev"><button data-v="desk">${I('Monitor')}ПК</button><button data-v="phone">${I('Phone')}Телефон</button></div>
          <div class="seg" id="thm"><button data-v="light">${I('Sun')}Светлая</button><button data-v="dark">${I('Moon')}Тёмная</button></div>
        </div></div>
      <div class="steps hscroll" id="steps">${V.steps.map((s, i) => `<button data-s="${i}"><i>${i + 1}</i>${s.label}</button>`).join('')}</div>
      <div class="step-caption" id="cap"></div>
      <div class="stage" id="stage"><div class="stage-inner" id="frame"></div></div>
      <div class="notes">
        <div class="note-card"><h3>${I('Lightbulb')}Почему так</h3>${V.why.map(p => `<p>${p}</p>`).join('')}</div>
        <div class="note-card"><h3>${I('CheckCircle2')}Плюсы</h3><ul>${V.pros.map(p => `<li>${p}</li>`).join('')}</ul></div>
        <div class="note-card"><h3>${I('CircleAlert')}Минусы</h3><ul>${V.cons.map(p => `<li>${p}</li>`).join('')}</ul></div>
      </div>
      <div class="links"><a href="index.html">${I('ChevronLeft', 'sm')}Сравнение</a>${[['variant-a.html', 'A · Вкладка «Итоги»'], ['variant-b.html', 'B · Панель в монтаже'], ['variant-c.html', 'C · Черновики на местах'], ['data-and-prompt.html', 'Схема данных и промпт']].map(([h, t]) => `<a class="${location.pathname.endsWith(h) ? 'on' : ''}" href="${h}">${t}</a>`).join('')}</div>
    </div>`;
    document.getElementById('dev').onclick = e => { const b = e.target.closest('button'); if (b) { S.device = b.dataset.v; ls.set('recap.device', S.device); render(); } };
    document.getElementById('thm').onclick = e => { const b = e.target.closest('button'); if (b) { S.theme = b.dataset.v; ls.set('recap.theme', S.theme); document.documentElement.dataset.theme = S.theme; render(); } };
    document.getElementById('steps').onclick = e => { const b = e.target.closest('button'); if (b) { S.step = +b.dataset.s; render(); } };
    addEventListener('resize', fit);
    fades(document.body);
    render();
  }

  function render() {
    const V = window.VARIANT, st = V.steps[S.step];
    document.querySelectorAll('#dev button').forEach(b => b.classList.toggle('on', b.dataset.v === S.device));
    document.querySelectorAll('#thm button').forEach(b => b.classList.toggle('on', b.dataset.v === S.theme));
    document.querySelectorAll('#steps button').forEach((b, i) => b.classList.toggle('on', i === S.step));
    document.getElementById('cap').innerHTML = st.caption;
    const f = document.getElementById('frame');
    f.innerHTML = S.device === 'desk' ? deskFrame(st.desk(), st.url) : phoneFrame(st.phone());
    // Кликабельность макета
    f.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', ev => { ev.stopPropagation(); S.step = +el.dataset.go; render(); scrollTo({ top: document.getElementById('steps').offsetTop - 8, behavior: 'smooth' }); }));
    f.querySelectorAll('[data-cb]').forEach(el => el.addEventListener('click', () => { const host = el.closest('.para, .item, .vcard, .hw-task, [data-host]'); const off = host.classList.toggle('off'); el.setAttribute('aria-checked', String(!off)); if (V.onToggle) V.onToggle(f); }));
    if (V.bind) V.bind(f, S);
    runProgress(f); fades(f); fit();
  }

  function fit() {
    const stage = document.getElementById('stage'), f = document.getElementById('frame');
    if (!stage || !f.firstElementChild) return;
    const w = f.firstElementChild.offsetWidth, h = f.firstElementChild.offsetHeight;
    const s = Math.min(1, stage.clientWidth / w);
    f.style.width = w + 'px'; f.style.transform = `scale(${s})`;
    f.style.marginLeft = ((stage.clientWidth - w * s) / 2) + 'px';
    f.style.transformOrigin = 'top left';
    stage.style.height = (h * s) + 'px';
  }

  window.R = { I, tc, ed, cb, ko, D, KINDS, B, secHead, studentDesk, studentPhone, rail, lessonList, dock, progRows, mount, render, S };
  addEventListener('DOMContentLoaded', () => window.VARIANT && mount());
})();
