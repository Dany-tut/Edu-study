// Библиотека виджетов для макетов стола: существующие (из registry.tsx) и новые из концептов «Связь».
// В .lib-list рисуются карточки; «Добавить» работает для виджетов, которые есть на этом столе (id = w-<type>).
(function () {
  const CAT = [
    { group: 'Новые · связь с учениками и родителями' },
    { type: 'comms-today', label: 'Связь с учениками', desc: 'Что уйдёт сегодня, что не дошло, кто подключил Telegram', icon: 'Send', tone: 'blue', isNew: true },
    { type: 'parent-reports', label: 'Отчёты родителям', desc: 'По пятницам: сколько готово, какие требуют решения', icon: 'ScrollText', tone: 'green', isNew: true },
    { type: 'payments-inbox', label: 'Оплаты: ждут вас', desc: '«Я оплатила» на подтверждение и закрытие месяца', icon: 'Wallet', tone: 'amber', isNew: true },
    { group: 'Сегодня' },
    { type: 'today-schedule', label: 'Расписание', desc: 'Расписание уроков на сегодня · теперь со строками напоминаний', icon: 'CalendarDays', tone: '' },
    { type: 'today-reminders', label: 'Напоминания', desc: 'Задачи, требующие внимания сегодня', icon: 'Bell', tone: '' },
    { type: 'today-tasks', label: 'Мои задачи', desc: 'Личный список задач учителя', icon: 'ListChecks', tone: '' },
    { group: 'Ученики и финансы' },
    { type: 'attention-students', label: 'Требуют внимания', desc: 'Ученики с долгом или просрочкой оплаты', icon: 'CircleAlert', tone: 'red' },
    { type: 'groups-list', label: 'Список групп', desc: 'Все группы с количеством учеников', icon: 'Users', tone: '' },
    { type: 'finance-overdue', label: 'Должники', desc: 'Список учеников с задолженностью · теперь со статусом напоминаний', icon: 'Wallet', tone: 'red' },
    { type: 'finance-activity', label: 'История платежей', desc: 'Последние поступления от учеников', icon: 'Banknote', tone: 'green' },
  ];
  document.querySelectorAll('.lib-list').forEach((list) => {
    const desk = list.closest('.desk');
    list.innerHTML = CAT.map((c) => c.group
      ? `<div class="sec-label" style="margin:12px 6px 4px">${c.group}</div>`
      : `<div class="lib-card"><span class="ico-tile ${c.tone}"><i data-i="${c.icon}"></i></span><div class="txt"><span class="title" style="font-size:14px">${c.label}${c.isNew ? ' <span class="chip purple" style="height:20px;font-size:11px">новый</span>' : ''}</span><span class="sub">${c.desc}</span></div>`
        + `<button class="btn s lib-add" ${desk.querySelector('#w-' + c.type) ? `data-add-widget="w-${c.type}"` : 'data-act="libOther"'}><i data-i="Plus" data-s="14"></i><span>Добавить</span></button></div>`).join('');
    window.paintIcons(list);
  });
  window.ACTS = Object.assign(window.ACTS || {}, { libOther: (b) => window.mockToast(b.closest('.desk'), 'В макете этот виджет не нарисован') });
})();
