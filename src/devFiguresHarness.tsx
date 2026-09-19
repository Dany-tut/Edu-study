// Стенд схем конспекта (dev-figures.html).
//
// ЗАЧЕМ. Схема — это код, который рисует картинку, и увидеть результат иначе
// можно только открыв урок у записанного на курс ученика. Пока схем было
// полсотни на языковые курсы, с этим мирились; для предметных курсов их сотни,
// и каждая правка генератора задевает все разом. Здесь они выкладываются
// галереей: видно и вёрстку, и вес каждой строки data-URI.
//
// ?bio / ?lang — какой набор образцов показывать (по умолчанию оба).
// ?real — вместо образцов все схемы, реально стоящие в конспектах курсов: их
// семь десятков, и отсматривать их надо подряд, а не по одной в уроке.
// ?real=<подстрока> — только те, чей урок или подпись её содержат
// (?real=bioprep-ru-26, ?real=graphFigure). Нужно ещё и потому, что длинную
// страницу превью перестаёт дорисовывать после прокрутки.
import { createRoot } from 'react-dom/client'
import { flowFigure, cycleFigure, graphFigure, punnettFigure, pyramidFigure } from './data/bioFigures'
import { formTable, contrastPair, ladderFigure } from './data/lessonFigures'
import { BIO_PREU_LESSON_CONTENT } from './data/bioPreULessons'
import { BIO_CELL_LESSON_CONTENT } from './data/bioCellLessons'
import './index.css'

const kb = (s: string) => `${Math.round((s.length / 1024) * 10) / 10} КБ`

const bio: Array<[string, string]> = [
  ['flowFigure — 4 шага', flowFigure('Этапы клеточного дыхания', [
    { label: 'Гликолиз', sub: 'цитоплазма, 2 АТФ' },
    { label: 'Окисление пирувата', sub: 'матрикс' },
    { label: 'Цикл Кребса', sub: 'матрикс, НАД·Н' },
    { label: 'Дыхательная цепь', sub: '≈26 АТФ', key: true },
  ], { note: 'Кислород нужен только на последнем этапе — как приёмник электронов.' })],
  ['flowFigure — перенос на второй ряд', flowFigure('Путь от гена к белку', [
    { label: 'ДНК' }, { label: 'Транскрипция' }, { label: 'пре-иРНК' },
    { label: 'Сплайсинг' }, { label: 'иРНК' }, { label: 'Трансляция' }, { label: 'Белок', key: true },
  ], { perRow: 4 })],
  ['cycleFigure — 4 узла с центром', cycleFigure('Клеточный цикл', [
    { label: 'G1', sub: 'рост' }, { label: 'S', sub: 'удвоение ДНК', key: true },
    { label: 'G2', sub: 'подготовка' }, { label: 'Митоз', sub: 'деление' },
  ], { centre: 'Интерфаза\n≈90 % цикла', note: 'Удвоение ДНК идёт до митоза, а не во время него.' })],
  ['cycleFigure — 6 узлов', cycleFigure('Круговорот углерода', [
    { label: 'CO₂ атмосферы' }, { label: 'Фотосинтез', key: true }, { label: 'Органика растений' },
    { label: 'Питание животных' }, { label: 'Дыхание' }, { label: 'Разложение' },
  ])],
  ['graphFigure — пик', graphFigure('Активность фермента и температура', {
    x: 'Температура, °C', y: 'Скорость реакции',
    xTicks: ['0', '20', '40', '60', '80'],
    curves: [{ points: [[0, 0.04], [0.2, 0.2], [0.4, 0.55], [0.5, 0.95], [0.55, 1], [0.62, 0.7], [0.72, 0.22], [0.85, 0.03], [1, 0]], key: true }],
    marks: [{ at: [0.55, 1], label: 'оптимум' }],
    note: 'До оптимума работает кинетика столкновений, после — денатурация. Отсюда пик, а не плато.',
  })],
  ['graphFigure — насыщение и отметка', graphFigure('Насыщение фермента субстратом', {
    x: 'Концентрация субстрата [S]', y: 'Скорость v',
    curves: [
      { points: [[0, 0], [0.1, 0.33], [0.2, 0.5], [0.35, 0.67], [0.55, 0.8], [0.75, 0.87], [1, 0.92]], key: true },
      { points: [[0, 0.95], [1, 0.95]], dashed: true, label: 'Vmax' },
    ],
    marks: [{ at: [0.2, 0.5], label: 'Km' }],
    note: 'Km — концентрация субстрата, при которой скорость равна половине Vmax.',
  })],
  ['punnettFigure 2×2', punnettFigure('Скрещивание Aa × Aa', {
    top: ['A', 'a'], left: ['A', 'a'], highlight: ['1,1'],
    topLabel: 'гаметы отца', leftLabel: 'гаметы матери',
    note: 'AA и Aa выглядят одинаково — вот где фенотип и расходится с генотипом.',
  })],
  ['punnettFigure 4×4', punnettFigure('Дигибридное скрещивание AaBb × AaBb', {
    top: ['AB', 'Ab', 'aB', 'ab'], left: ['AB', 'Ab', 'aB', 'ab'], highlight: ['3,3'],
    note: 'Шестнадцать сочетаний дают расщепление 9 : 3 : 3 : 1 по фенотипу.',
  })],
  ['pyramidFigure', pyramidFigure('Пирамида энергии', [
    { label: 'Хищные птицы', sub: '10 кДж', share: 0.14 },
    { label: 'Ужи', sub: '100 кДж', share: 0.26 },
    { label: 'Лягушки', sub: '1 000 кДж', share: 0.44 },
    { label: 'Кузнечики', sub: '10 000 кДж', share: 0.68 },
    { label: 'Трава', sub: '100 000 кДж', share: 1 },
  ], { note: 'На каждый уровень переходит около 10 % энергии — отсюда и длина цепи.' })],
]

// Три генератора языкового набора переиспользуются биологией как есть:
// сравнение двух понятий, таблица и шкала уровней.
const shared: Array<[string, string]> = [
  ['contrastPair (из lessonFigures)', contrastPair('Митоз и мейоз',
    { head: 'Митоз', sub: 'одно деление', items: ['2 клетки', 'набор сохраняется', 'копии исходной'] },
    { head: 'Мейоз', sub: 'два деления', items: ['4 клетки', 'набор уменьшается вдвое', 'все клетки разные'] },
    { note: 'Удвоение ДНК в обоих случаях одно — различие в числе делений после него.' })],
  ['formTable (из lessonFigures)', formTable('Сосуды', ['', 'Артерии', 'Вены', 'Капилляры'], [
    ['Давление', 'высокое', 'низкое', 'низкое'],
    ['Стенка', 'толстая', 'тонкая', 'один слой клеток'],
    ['Клапаны', 'нет', 'есть', 'нет'],
    ['Скорость', 'высокая', 'средняя', 'минимальная'],
  ], { highlight: [3] })],
  ['ladderFigure (из lessonFigures)', ladderFigure('Уровни организации живого', [
    { label: 'Биосфера' }, { label: 'Экосистема' }, { label: 'Популяция' },
    { label: 'Организм', key: true }, { label: 'Орган' }, { label: 'Ткань' }, { label: 'Клетка' },
  ], { note: 'У каждого уровня есть свойства, которых нет у предыдущего.' })],
]

/** Схемы, реально стоящие в конспектах: подпись под картинкой — это text абзаца. */
function realFigures(lessons: Record<string, { paragraphs: Array<{ id: string; text: string; image?: string }> }>): Array<[string, string]> {
  return Object.entries(lessons).flatMap(([id, l]) =>
    l.paragraphs.filter(par => par.image).map(par => [`${id} · ${par.text}`, par.image!] as [string, string]))
}

const show = new URLSearchParams(location.search)
const only = (show.get('real') ?? '').trim().toLowerCase()
const pick = (items: Array<[string, string]>) =>
  (only ? items.filter(([name]) => name.toLowerCase().includes(only)) : items)

const sets: Array<[string, Array<[string, string]>]> = show.has('real')
  ? [
    ['Биология: подготовка к университету', pick(realFigures(BIO_PREU_LESSON_CONTENT))],
    ['Биология клетки', pick(realFigures(BIO_CELL_LESSON_CONTENT))],
  ].filter(([, items]) => (items as Array<[string, string]>).length > 0) as Array<[string, Array<[string, string]>]>
  : [
    ...(show.has('lang') ? [] : [['Биология', bio] as [string, Array<[string, string]>]]),
    ...(show.has('bio') ? [] : [['Общие генераторы', shared] as [string, Array<[string, string]>]]),
  ]

const total = sets.flatMap(([, items]) => items).reduce((a, [, s]) => a + s.length, 0)

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 24, maxWidth: 760, margin: '0 auto' }}>
    <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
      Схем: {sets.flatMap(([, i]) => i).length} · суммарно {Math.round(total / 1024)} КБ
    </div>
    {sets.map(([group, items]) => (
      <section key={group}>
        <h2 style={{ color: 'var(--text)', fontSize: 15, margin: '28px 0 12px' }}>{group}</h2>
        {items.map(([name, src]) => (
          <figure key={name} style={{ margin: '0 0 26px' }}>
            <figcaption style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace', marginBottom: 6 }}>
              {name} — {kb(src)}
            </figcaption>
            <img src={src} alt={name} style={{ maxWidth: '100%', display: 'block', borderRadius: 10 }} />
          </figure>
        ))}
      </section>
    ))}
  </div>,
)
