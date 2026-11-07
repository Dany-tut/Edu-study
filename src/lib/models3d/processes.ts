// ─────────────────────────────────────────────────────────────────────────────
// Процессы в клетке — модели со стадиями (плёнка + кнопки стадий).
//
//   protein       синтез белка: транскрипция → выход иРНК → трансляция → полисома
//   plasmolysis   растительная клетка: тургор → начальный плазмолиз → плазмолиз
//                 → деплазмолиз
//   phagocytosis  животная клетка: контакт → впячивание → пузырёк → слияние
//                 с лизосомой → переваривание
//
// ТЕКСТЫ — ТОЛЬКО ИЗ БАЗЫ ChemBio_KB (правило П0/П0.1 ХимБио): у каждой модели
// поле `sources` с файлом и страницей. Формулировки пересказаны, не выдуманы;
// новую стадию без страницы учебника не добавлять.
//
// Механика как у митоза (stages.ts): каждая часть знает свои положения на
// стадиях, прогресс 0…1 плавно ведёт сцену между ними. Здесь вместо ключевых
// кадров на часть — функции от «локального» времени стадии: процессам нужна
// постепенность внутри стадии (иРНК растёт по нуклеотиду, вода выходит
// струйкой), а не только переход между кадрами.
// ─────────────────────────────────────────────────────────────────────────────
import type * as THREE from 'three'
import type { ModelSpec, ModelPartSpec, ThreeNS } from './spec'

type V3 = [number, number, number]
const clamp = (x: number) => Math.max(0, Math.min(1, x))
const smooth = (t: number) => { const c = clamp(t); return c * c * (3 - 2 * c) }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Доля внутри перехода между стадиями a и b при n стадиях: 0 до a, 1 после b. */
function span(p: number, n: number, a: number, b: number) {
  return smooth((p * (n - 1) - a) / (b - a))
}

function std(T: ThreeNS, color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new T.MeshStandardMaterial({ color, roughness: 0.5, ...extra })
}

function setOpacity(obj: THREE.Object3D, o: number) {
  obj.visible = o > 0.02
  obj.traverse(c => {
    const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
    if (m && 'opacity' in m) {
      if (!m.transparent) { m.transparent = true; m.needsUpdate = true }
      m.userData.anim = true
      m.opacity = o * ((m.userData.base as number | undefined) ?? 1)
    }
  })
}

/** Срез по плоскости z = 0: остаётся задняя половина, внутренность видна. */
function cut(T: ThreeNS, m: THREE.Material) {
  m.clippingPlanes = [new T.Plane(new T.Vector3(0, 0, -1), 0)]
  return m
}

const KB_9 = 'textbooks/txt/Биология. Введение в общую биологию. 9 класс. Рабочая тетрадь к учебнику Каменского А.А. и др. - Пасечник В.В., Швецов Г.Г..txt'

// ═════════════════════════════════════════════════════════════════════════════
// Синтез белка
// ═════════════════════════════════════════════════════════════════════════════

export function proteinSynthesisSpec(): ModelSpec {
  const N = 5 // стадий
  const BASES = 18 // пар оснований в показанном участке ДНК
  const STEP = 0.32
  const x0 = -((BASES - 1) * STEP) / 2
  const CODONS = 6
  const NUC: V3 = [-2.6, 0, 0] // центр ядра
  const nucR = 2.2
  const refs = {
    strandTop: [] as THREE.Object3D[], strandBot: [] as THREE.Object3D[], rungs: [] as THREE.Object3D[],
    rna: [] as THREE.Object3D[], rnaGroup: null as THREE.Object3D | null,
    pol: null as THREE.Object3D | null, ribo: null as THREE.Object3D | null, ribo2: null as THREE.Object3D | null,
    trna: null as THREE.Object3D | null, protein: [] as THREE.Object3D[], nucleus: null as THREE.Object3D | null,
  }
  // Где ДНК расплетена во время транскрипции: окно вокруг полимеразы.
  const bubble = (x: number, polX: number, open: number) => open * Math.exp(-(((x - polX) / 1.1) ** 2))

  const nucleus: ModelPartSpec = {
    id: 'nucleus', name: 'Ядро', color: '#8D7BE0', shell: true, anchor: [NUC[0] - 1.2, 1.7, 0.6],
    info: 'ДНК находится в ядре, а сам синтез белка идёт в цитоплазме на рибосомах. Поэтому информация из ядра в цитоплазму уходит в виде иРНК.',
    build: (T) => {
      const m = new T.Mesh(new T.SphereGeometry(nucR, 40, 28), std(T, '#8D7BE0', { transparent: true, opacity: 0.16, side: T.DoubleSide, roughness: 0.3 }))
      m.position.set(...NUC)
      refs.nucleus = m
      return m
    },
  }

  const dna: ModelPartSpec = {
    id: 'dna', name: 'ДНК (участок гена)', color: '#7F9BE0', anchor: [NUC[0], 0.55, 0.3],
    info: 'Участок ДНК «разматывается», деспирализуется, и на одной из его цепей по принципу комплементарности собирается иРНК. После этого участок снова закрывается.',
    build: (T) => {
      const g = new T.Group()
      g.position.set(...NUC)
      const geo = new T.CylinderGeometry(0.07, 0.07, STEP * 1.02, 8)
      const top = std(T, '#9FB4EC'), bot = std(T, '#7F9BE0'), rung = std(T, '#C9C3EE')
      for (let i = 0; i < BASES; i++) {
        const x = x0 + i * STEP
        for (const [arr, mat, y] of [[refs.strandTop, top, 0.32], [refs.strandBot, bot, -0.32]] as const) {
          const m = new T.Mesh(geo, mat)
          m.rotation.z = Math.PI / 2
          m.position.set(x, y, 0)
          arr.push(m); g.add(m)
        }
        const r = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.64, 6), rung)
        r.position.set(x, 0, 0)
        refs.rungs.push(r); g.add(r)
      }
      return g
    },
  }

  const polymerase: ModelPartSpec = {
    id: 'pol', name: 'РНК-полимераза', color: '#5FC3B8', anchor: [0, 0.75, 0.3],
    info: 'Фермент, который движется по ДНК и собирает иРНК: против гуанина ДНК встаёт цитозин РНК, против аденина — урацил, против тимина — аденин, против цитозина — гуанин.',
    build: (T) => {
      const m = new T.Mesh(new T.SphereGeometry(0.42, 28, 20), std(T, '#5FC3B8', { transparent: true, opacity: 0.85 }))
      m.scale.set(1.2, 1, 1)
      refs.pol = m
      return m
    },
  }

  const mrna: ModelPartSpec = {
    id: 'mrna', name: 'иРНК', color: '#F09A5B', anchor: [0, -0.9, 0.3],
    info: 'Копия гена, в которой тимин заменён на урацил. У эукариот иРНК в ядре связывается со специальными белками и переносится через ядерную оболочку в цитоплазму.',
    build: (T) => {
      const g = new T.Group()
      const geo = new T.SphereGeometry(0.11, 12, 10)
      const mats = ['#F09A5B', '#E2857A', '#F2C864', '#D98A7A'].map(c => std(T, c))
      for (let i = 0; i < BASES; i++) {
        const m = new T.Mesh(geo, mats[i % 4])
        m.position.set(x0 + i * STEP, 0, 0)
        refs.rna.push(m); g.add(m)
      }
      refs.rnaGroup = g
      return g
    },
  }

  const ribosome: ModelPartSpec = {
    id: 'ribo', name: 'Рибосома', color: '#9A9AB8', anchor: [0, 0.8, 0.3],
    liveAnchor: () => { const r = refs.ribo; return r ? [r.position.x, r.position.y - 0.85, 0.4] : [0, 0, 0] },
    info: 'Нанизывается на тот конец иРНК, с которого начинается синтез, и движется по ней «скачками» — по триплету. Когда на рибосоме оказывается стоп-триплет, синтез заканчивается.',
    build: (T) => {
      const make = () => {
        const r = new T.Group()
        const big = new T.Mesh(new T.SphereGeometry(0.5, 24, 18), std(T, '#9A9AB8'))
        big.scale.set(1.15, 0.8, 0.9); big.position.y = 0.42
        const small = new T.Mesh(new T.SphereGeometry(0.4, 24, 18), std(T, '#B8B8CC'))
        small.scale.set(1.1, 0.55, 0.85); small.position.y = -0.3
        r.add(big, small)
        return r
      }
      const g = new T.Group()
      refs.ribo = make(); refs.ribo2 = make()
      g.add(refs.ribo, refs.ribo2)
      return g
    },
  }

  const trna: ModelPartSpec = {
    id: 'trna', name: 'тРНК с аминокислотой', color: '#6EC26E', anchor: [0, 1.8, 0.3],
    info: 'Подносит аминокислоту к рибосоме. Свой триплет на «верхушке», антикодон, тРНК сверяет с триплетом иРНК: если они комплементарны, аминокислота присоединяется к белковой цепочке.',
    build: (T) => {
      const g = new T.Group()
      const mat = std(T, '#6EC26E')
      const stem = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.7, 8), mat)
      const bar = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.5, 8), mat)
      bar.rotation.z = Math.PI / 2; bar.position.y = -0.35
      const aa = new T.Mesh(new T.SphereGeometry(0.14, 14, 10), std(T, '#E2574C'))
      aa.position.y = 0.42
      g.add(stem, bar, aa)
      refs.trna = g
      return g
    },
  }

  const protein: ModelPartSpec = {
    id: 'protein', name: 'Белок', color: '#E2574C', anchor: [0, 2.2, 0.3],
    liveAnchor: () => { const vis = refs.protein.filter(m => m.visible); const m = vis[0] ?? refs.protein[0]; return m ? [m.position.x + 0.5, m.position.y + 0.35, 0.3] : [0, 0, 0] },
    info: 'Аминокислоты соединяются пептидной связью в цепочку — по одной на каждый триплет иРНК. Все рибосомы, синтезирующие один и тот же белок на одной иРНК, называются полисомой.',
    build: (T) => {
      const g = new T.Group()
      const geo = new T.SphereGeometry(0.15, 14, 10)
      const mats = ['#E2574C', '#D9524A', '#F09A5B'].map(c => std(T, c))
      for (let i = 0; i < CODONS; i++) {
        const m = new T.Mesh(geo, mats[i % 3])
        refs.protein.push(m); g.add(m)
      }
      return g
    },
  }

  // Где лежит иРНК после выхода из ядра (цитоплазма справа).
  const CYTO: V3 = [3.6, -0.4, 0]
  const stages = [
    { name: 'Ген в ДНК', info: 'Носитель генетической информации — ДНК в ядре. Сам синтез белка идёт в цитоплазме, на рибосомах.' },
    { name: 'Транскрипция', info: 'Участок ДНК деспирализуется, и на одной цепи по принципу комплементарности собирается иРНК. Информация гена «переписывается» в последовательность нуклеотидов иРНК.' },
    { name: 'иРНК в цитоплазме', info: 'У эукариот иРНК связывается в ядре со специальными белками и переносится через ядерную оболочку в цитоплазму.' },
    { name: 'Трансляция', info: 'Рибосома нанизывается на начало иРНК и движется по ней по триплету. тРНК, чей антикодон комплементарен триплету, оставляет аминокислоту, и та присоединяется к цепочке пептидной связью.' },
    { name: 'Полисома', info: 'На ту же иРНК следом нанизываются вторая, третья рибосомы — полисома. Когда рибосома доходит до стоп-триплета, синтез белка заканчивается.' },
  ]

  return {
    id: 'process-protein', title: 'Синтез белка',
    subtitle: 'Транскрипция в ядре и трансляция на рибосоме. Проиграйте плёнку или нажмите на стадию.',
    radius: 4.6, canExplode: false, view: 'front',
    // Ядро слева (−4.8…−0.4), цитоплазма с рибосомой и белком справа (до ~7).
    frame: { center: [1.5, 0.4, 0], radius: 6.4 },
    sources: [`${KB_9}#стр.89`, `${KB_9}#стр.90`, `${KB_9}#стр.91`, `${KB_9}#стр.92`, `${KB_9}#стр.93`],
    parts: [nucleus, dna, polymerase, mrna, ribosome, trna, protein],
    timeline: {
      stages, duration: 22,
      update: (p) => {
        const tx = span(p, N, 0.15, 1)       // транскрипция
        const out = span(p, N, 1.1, 2)       // выход иРНК
        const tl = span(p, N, 2.1, 3)        // трансляция
        const poly = span(p, N, 3.1, 4)      // полисома
        // Полимераза едет вдоль гена, за ней закрывается пузырь.
        const polX = lerp(x0 - 0.4, x0 + (BASES - 1) * STEP + 0.4, tx)
        const open = tx > 0 && tx < 1 ? 1 : 0
        refs.strandTop.forEach((m, i) => { const x = x0 + i * STEP; m.position.y = 0.32 + bubble(x, polX, open) * 0.55 })
        refs.strandBot.forEach((m, i) => { const x = x0 + i * STEP; m.position.y = -0.32 - bubble(x, polX, open) * 0.25 })
        refs.rungs.forEach((m, i) => { const x = x0 + i * STEP; const b = bubble(x, polX, open); m.visible = b < 0.4 })
        if (refs.pol) {
          refs.pol.position.set(NUC[0] + polX, 0, 0)
          setOpacity(refs.pol, tx > 0 && tx < 1 ? 1 : tx >= 1 ? Math.max(0, 1 - out * 3) : 0)
        }
        // иРНК: нуклеотиды появляются за полимеразой, потом группа уходит в цитоплазму.
        refs.rna.forEach((m, i) => {
          const x = x0 + i * STEP
          const made = x <= polX - 0.2 || tx >= 1
          m.visible = made
        })
        if (refs.rnaGroup) {
          const start: V3 = [NUC[0], -0.95, 0]
          refs.rnaGroup.position.set(lerp(start[0], CYTO[0], out), lerp(start[1], CYTO[1], out), 0)
        }
        // Трансляция: рибосома по триплетам, белок растёт, тРНК подлетает на каждый шаг.
        const codonX = (k: number) => CYTO[0] + x0 + (k * 3 + 1) * STEP
        const steps = tl * CODONS
        const k = Math.min(CODONS - 1, Math.floor(steps))
        const frac = steps - Math.floor(steps)
        const riboX = lerp(codonX(0), codonX(CODONS - 1), clamp(tl))
        if (refs.ribo) {
          refs.ribo.position.set(riboX, CYTO[1] + 0.05, 0)
          setOpacity(refs.ribo, Math.min(1, span(p, N, 2, 2.4)))
        }
        if (refs.ribo2) {
          refs.ribo2.position.set(lerp(codonX(0) - 0.9, codonX(1), poly), CYTO[1] + 0.05, 0)
          setOpacity(refs.ribo2, poly)
        }
        if (refs.trna) {
          const active = tl > 0 && tl < 1
          refs.trna.position.set(riboX, CYTO[1] + 0.95 + (1 - smooth(frac * 2)) * 1.2, 0.35)
          setOpacity(refs.trna, active ? 1 - smooth((frac - 0.6) * 3) : 0)
        }
        const made = tl >= 1 ? CODONS : (tl > 0 ? k : 0)
        refs.protein.forEach((m, i) => {
          m.visible = i < made
          // Цепочка тянется от рибосомы вверх; на полисоме сворачивается в клубок.
          const chainX = riboX - 0.05 - (made - 1 - i) * 0.05
          const chainY = CYTO[1] + 1.05 + (made - 1 - i) * 0.28
          const a = i * 1.7
          const fold: V3 = [codonX(CODONS - 1) + 0.9 + Math.cos(a) * 0.28, CYTO[1] + 1.5 + Math.sin(a) * 0.28, Math.sin(a * 0.7) * 0.28]
          m.position.set(lerp(chainX, fold[0], poly), lerp(chainY, fold[1], poly), lerp(0, fold[2], poly))
        })
      },
    },
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Плазмолиз
// ═════════════════════════════════════════════════════════════════════════════

export function plasmolysisSpec(): ModelSpec {
  const N = 4
  const W = 3.0, H = 2.2, D = 2.0 // полуразмеры стенки
  const refs = { proto: null as THREE.Object3D | null, vac: null as THREE.Object3D | null, water: [] as THREE.Object3D[] }
  const rnd = (() => { let s = 11; return () => { s = (s * 16807) % 2147483647; return s / 2147483647 } })()
  const drops = Array.from({ length: 26 }, () => {
    const a = rnd() * Math.PI * 2, b = (rnd() - 0.5) * 1.2
    const dir: V3 = [Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)]
    return { dir, phase: rnd() }
  })

  const wall: ModelPartSpec = {
    id: 'wall', name: 'Клеточная стенка', color: '#A9CB74', shell: true, anchor: [-W * 0.7, H * 0.85, D * 0.6],
    info: 'Прочная стенка держит форму клетки. При плазмолизе она остаётся на месте, а протопласт отходит от неё; при набухании протопласт давит на стенку и растягивает её.',
    build: (T) => {
      const m = new T.Mesh(new T.SphereGeometry(1, 40, 28), std(T, '#A9CB74', { transparent: true, opacity: 0.3, side: T.DoubleSide, roughness: 0.7 }))
      m.scale.set(W, H, D)
      return m
    },
  }

  const protoplast: ModelPartSpec = {
    id: 'proto', name: 'Протопласт', color: '#8FA8E6', anchor: [W * 0.5, H * 0.6, D * 0.5],
    info: 'Живое содержимое клетки, окружённое клеточной стенкой: цитоплазма под плазмалеммой с ядром и пластидами. При плазмолизе он спадается и следует за сокращающейся вакуолью.',
    build: (T) => {
      const g = new T.Group()
      const mem = std(T, '#8FA8E6', { transparent: true, opacity: 0.32, roughness: 0.25 })
      mem.userData.base = 0.32
      const shell = new T.Mesh(new T.SphereGeometry(1, 40, 28), mem)
      shell.scale.set(W * 0.96, H * 0.94, D * 0.94)
      g.add(shell)
      const nuc = new T.Mesh(new T.SphereGeometry(0.42, 24, 18), std(T, '#7F6EDB'))
      nuc.position.set(-W * 0.62, H * 0.35, 0.3)
      g.add(nuc)
      const chl = std(T, '#5FBF6A')
      ;[[W * 0.7, -H * 0.4, 0.5], [-W * 0.5, -H * 0.55, -0.4], [W * 0.2, H * 0.62, -0.6], [-W * 0.15, -H * 0.7, 0.8], [W * 0.75, H * 0.3, -0.5]].forEach(p => {
        const c = new T.Mesh(new T.SphereGeometry(1, 20, 14), chl)
        c.scale.set(0.38, 0.2, 0.24); c.position.set(p[0], p[1], p[2])
        g.add(c)
      })
      refs.proto = g
      return g
    },
  }

  const vacuole: ModelPartSpec = {
    id: 'vac', name: 'Вакуоль с клеточным соком', color: '#8CC9F0', anchor: [0.4, 0.9, 0.9],
    info: 'Водный режим клетки зависит от двух мембран: плазмалеммы снаружи цитоплазмы и тонопласта вокруг вакуоли. В гипертоническом растворе вода уходит сначала из цитоплазмы, затем из вакуоли через тонопласт.',
    build: (T) => {
      const mat = std(T, '#8CC9F0', { transparent: true, opacity: 0.5, roughness: 0.2 })
      mat.userData.base = 0.5
      const m = new T.Mesh(new T.SphereGeometry(1, 36, 26), mat)
      m.scale.set(W * 0.72, H * 0.66, D * 0.66)
      m.position.set(0.3, -0.05, 0)
      refs.vac = m
      return m
    },
  }

  const water: ModelPartSpec = {
    id: 'water', name: 'Вода (осмос)', color: '#4E8FE0', anchor: [W * 1.05, 0, 0], hideLabel: false,
    info: 'Вода идёт через мембраны за счёт осмоса — туда, где водный потенциал ниже. В гипертоническом растворе она покидает клетку, в чистой воде поступает обратно.',
    build: (T) => {
      const g = new T.Group()
      const geo = new T.SphereGeometry(0.07, 10, 8)
      const mat = std(T, '#4E8FE0', { emissive: '#1B4C9A', emissiveIntensity: 0.4 })
      drops.forEach(() => { const m = new T.Mesh(geo, mat); refs.water.push(m); g.add(m) })
      return g
    },
  }

  const stages = [
    { name: 'Тургор', info: 'В изотоническом растворе изменений нет: протопласт прижат к стенке, клетка упругая.' },
    { name: 'Начальный плазмолиз', info: 'В гипертоническом растворе вода выходит из клетки за счёт осмоса. Протопласт ещё прилегает к стенке, но уже перестал давить на неё: клетка теряет тургор и становится вялой.' },
    { name: 'Плазмолиз', info: 'Вода продолжает уходить, пока водные потенциалы клетки и раствора не сравняются. Протопласт спадается, отходит от стенки и следует за сокращающейся вакуолью.' },
    { name: 'Деплазмолиз', info: 'Плазмолиз обычно обратим. В чистой воде вода поступает в клетку за счёт осмоса, протопласт растёт, снова давит на стенку и растягивает её.' },
  ]

  return {
    id: 'process-plasmolysis', title: 'Плазмолиз растительной клетки',
    subtitle: 'Клетка в гипертоническом растворе и обратно в воде. Синие точки — вода.',
    radius: 3.4, canExplode: false, view: 'front',
    sources: ['textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.102'],
    parts: [wall, protoplast, vacuole, water],
    timeline: {
      stages, duration: 16,
      update: (p, _objects) => {
        void _objects
        const x = clamp(p) * (N - 1)
        // Размер протопласта: 1 → 0.97 (начальный) → 0.62 (плазмолиз) → 1 (деплазмолиз).
        const protoS = x <= 1 ? lerp(1, 0.97, smooth(x)) : x <= 2 ? lerp(0.97, 0.62, smooth(x - 1)) : lerp(0.62, 1, smooth(x - 2))
        const vacS = x <= 1 ? lerp(1, 0.75, smooth(x)) : x <= 2 ? lerp(0.75, 0.42, smooth(x - 1)) : lerp(0.42, 1, smooth(x - 2))
        refs.proto?.scale.setScalar(protoS)
        refs.vac?.scale.set(W * 0.72 * vacS, H * 0.66 * vacS, D * 0.66 * vacS)
        // Вода: наружу на стадиях 0→2, внутрь на 2→3. Каждая капля бежит своим кругом.
        const outward = x > 0.05 && x < 2
        const inward = x > 2.05
        const flow = (outward || inward) ? 1 : 0
        refs.water.forEach((m, i) => {
          const d = drops[i]
          const t = (d.phase + p * 9) % 1
          const r = inward ? lerp(W * 1.35, W * 0.4 * protoS, t) : lerp(W * 0.4 * protoS, W * 1.35, t)
          m.position.set(d.dir[0] * r, d.dir[1] * r * (H / W), d.dir[2] * r * (D / W))
          m.visible = flow > 0
        })
      },
    },
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Фагоцитоз
// ═════════════════════════════════════════════════════════════════════════════

export function phagocytosisSpec(): ModelSpec {
  const N = 5
  const R = 2.6
  const refs = {
    particle: null as THREE.Object3D | null, cup: null as THREE.Object3D | null, vesicle: null as THREE.Object3D | null,
    vesMat: null as THREE.MeshStandardMaterial | null, lyso: null as THREE.Object3D | null, mono: [] as THREE.Object3D[],
  }
  const OUT: V3 = [R + 0.75, 0.6, 0]
  const SURF: V3 = [R - 0.05, 0.55, 0]
  const IN: V3 = [0.8, 0.2, 0.2]

  const membrane: ModelPartSpec = {
    id: 'membrane', name: 'Клеточная мембрана', color: '#8FA8E6', shell: true, anchor: [-R * 0.5, R * 0.75, R * 0.4],
    info: 'Крупные частицы через каналы мембраны не проходят. В месте, где частица касается наружной мембраны, образуется впячивание, и частица попадает внутрь, окружённая мембраной.',
    build: (T) => new T.Mesh(new T.SphereGeometry(R, 48, 32), std(T, '#8FA8E6', { transparent: true, opacity: 0.18, side: T.DoubleSide, roughness: 0.25 })),
  }

  const nucleus: ModelPartSpec = {
    id: 'nucleus', name: 'Ядро', color: '#7F6EDB', anchor: [-1.0, 0.4, 0.8],
    info: 'Ядро координирует жизнедеятельность клетки.',
    build: (T) => { const m = new T.Mesh(new T.SphereGeometry(0.85, 32, 24), std(T, '#7F6EDB', { transparent: true, opacity: 0.6 })); m.position.set(-1.0, -0.3, -0.2); return m },
  }

  const particle: ModelPartSpec = {
    id: 'particle', name: 'Частица (бактерия)', color: '#6EC26E', anchor: [0, 0.4, 0],
    info: 'Пищевая частица или чужеродная бактерия. Так питаются простейшие; у многоклеточных так работают некоторые лейкоциты — фагоциты.',
    build: (T) => {
      const m = new T.Mesh(new T.CapsuleGeometry(0.22, 0.45, 8, 16), std(T, '#6EC26E'))
      m.rotation.z = Math.PI / 2.6
      refs.particle = m
      return m
    },
  }

  const vesicle: ModelPartSpec = {
    id: 'vesicle', name: 'Фагоцитарный пузырёк', color: '#B4ABEF', anchor: [0, 0.65, 0],
    info: 'Впячивание мембраны смыкается вокруг частицы — получается пузырёк. Внутрь него проникают пищеварительные ферменты, и возникает пищеварительная вакуоль.',
    build: (T) => {
      const g = new T.Group()
      const mat = std(T, '#B4ABEF', { transparent: true, opacity: 0.45, side: T.DoubleSide, roughness: 0.3 })
      mat.userData.base = 0.45
      refs.vesMat = mat
      // Чаша впячивания: полусфера, раскрытая наружу.
      const cup = new T.Mesh(new T.SphereGeometry(0.55, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.62), mat)
      cup.rotation.z = Math.PI / 2
      refs.cup = cup
      const ves = new T.Mesh(new T.SphereGeometry(0.55, 32, 24), mat)
      refs.vesicle = ves
      g.add(cup, ves)
      return g
    },
  }

  const lysosome: ModelPartSpec = {
    id: 'lyso', name: 'Лизосома', color: '#D872B8', anchor: [-0.6, -1.4, 0.4],
    info: 'Пузырёк с пищеварительными ферментами. Пищеварительная вакуоль сливается с лизосомой, и ферменты переваривают пищу.',
    build: (T) => {
      const m = new T.Mesh(new T.SphereGeometry(0.36, 24, 18), std(T, '#D872B8'))
      refs.lyso = m
      return m
    },
  }

  const monomers: ModelPartSpec = {
    id: 'mono', name: 'Продукты переваривания', color: '#F2C864', anchor: [0.2, -0.6, 0.6],
    info: 'Простые сахара, аминокислоты и другие мономеры проходят в цитоплазму и становятся питательными веществами для клетки.',
    build: (T) => {
      const g = new T.Group()
      const geo = new T.SphereGeometry(0.07, 10, 8)
      const mat = std(T, '#F2C864')
      for (let i = 0; i < 18; i++) { const m = new T.Mesh(geo, mat); refs.mono.push(m); g.add(m) }
      return g
    },
  }

  const stages = [
    { name: 'Контакт', info: 'Крупная частица не проходит через каналы мембраны. Она касается наружной мембраны клетки.' },
    { name: 'Впячивание', info: 'В месте контакта мембрана образует впячивание и обхватывает частицу.' },
    { name: 'Пузырёк', info: 'Частица оказывается внутри клетки, окружённая мембраной, — образуется пузырёк.' },
    { name: 'Слияние с лизосомой', info: 'Пузырёк сливается с лизосомой: внутрь проникают пищеварительные ферменты, возникает пищеварительная вакуоль.' },
    { name: 'Переваривание', info: 'Ферменты переваривают пищу. Мономеры — сахара, аминокислоты — выходят в цитоплазму и питают клетку.' },
  ]

  const LYSO0: V3 = [-1.2, -1.6, 0.6]
  return {
    id: 'process-phagocytosis', title: 'Фагоцитоз',
    subtitle: 'Как клетка захватывает и переваривает частицу. Проиграйте плёнку или нажмите на стадию.',
    radius: 3.6, canExplode: false, view: 'front',
    // Вся клетка плюс частица снаружи справа.
    frame: { center: [0.4, 0.1, 0], radius: 3.7 },
    sources: [`${KB_9}#стр.59`, `${KB_9}#стр.60`, 'textbooks/txt/1_Kempbell_Biologia_1_tom.txt#стр.156', 'textbooks/txt/1_Kempbell_Biologia_1_tom.txt#стр.157'],
    parts: [membrane, nucleus, particle, vesicle, lysosome, monomers],
    timeline: {
      stages, duration: 18,
      update: (p) => {
        const touch = span(p, N, 0, 1)
        const wrap = span(p, N, 1, 2)
        const fuse = span(p, N, 2.1, 3)
        const dig = span(p, N, 3.1, 4)
        // Частица: снаружи → к мембране → внутрь клетки.
        const ppos: V3 = wrap <= 0
          ? [lerp(OUT[0] + 0.6, SURF[0] + 0.45, touch), lerp(OUT[1], SURF[1], touch), 0]
          : [lerp(SURF[0] + 0.45, IN[0], wrap), lerp(SURF[1], IN[1], wrap), lerp(0, IN[2], wrap)]
        refs.particle?.position.set(...ppos)
        refs.particle?.scale.setScalar(1 - dig * 0.95)
        if (refs.particle) refs.particle.visible = dig < 0.98
        // Чаша впячивания растёт на контакте и исчезает, когда пузырёк замкнулся.
        if (refs.cup) {
          refs.cup.position.set(...ppos)
          const deep = touch * (1 - smooth(wrap * 2))
          refs.cup.scale.set(1, 0.4 + deep * 0.6, 1)
          refs.cup.visible = touch > 0.05 && wrap < 0.5
        }
        if (refs.vesicle) {
          refs.vesicle.position.set(...ppos)
          refs.vesicle.visible = wrap >= 0.5
          refs.vesicle.scale.setScalar(1 - dig * 0.3)
        }
        // Слияние: лизосома подходит, пузырёк розовеет.
        if (refs.lyso) {
          refs.lyso.position.set(lerp(LYSO0[0], ppos[0], fuse), lerp(LYSO0[1], ppos[1], fuse), lerp(LYSO0[2], ppos[2], fuse))
          refs.lyso.visible = fuse < 0.98
          refs.lyso.scale.setScalar(1 - fuse * 0.5)
        }
        refs.vesMat?.color.set(fuse > 0.6 ? '#D892C8' : '#B4ABEF')
        // Мономеры расходятся по цитоплазме.
        refs.mono.forEach((m, i) => {
          const a = i * 2.4, b = (i % 5 - 2) * 0.35
          const r = 0.2 + dig * 1.6
          m.position.set(IN[0] + Math.cos(a) * r, IN[1] + Math.sin(b) * r * 0.7, IN[2] + Math.sin(a) * r)
          m.visible = dig > 0.05
        })
      },
    },
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Глаз: путь света и аккомодация
// ═════════════════════════════════════════════════════════════════════════════
//
// Срез глаза сбоку, свет идёт справа налево. Далёкий предмет — лучи
// параллельны и сходятся на сетчатке при плоском хрусталике. Предмет
// приближается — лучи расходятся, фокус уходит за сетчатку, на ней пятно.
// Ресничная мышца сокращается, связка провисает, хрусталик становится
// выпуклее — фокус возвращается на сетчатку. Изображение перевёрнуто.

export function eyeAccommodationSpec(): ModelSpec {
  const N = 4
  const R = 2.4                // радиус глазного яблока
  const LENS_X = 1.15          // хрусталик за зрачком
  const RETINA_X = -R + 0.08
  const RAYS = [-0.55, -0.28, 0, 0.28, 0.55]
  const refs = {
    lens: null as THREE.Object3D | null, ring: null as THREE.Object3D | null,
    ligaments: [] as THREE.Mesh[], ligMat: null as THREE.MeshStandardMaterial | null,
    object: null as THREE.Object3D | null, rays: [] as THREE.Line[], spot: null as THREE.Object3D | null,
    image: null as THREE.Object3D | null,
  }

  const sclera: ModelPartSpec = {
    id: 'sclera', name: 'Склера', color: '#E9E6EE', shell: true, anchor: [-0.6, R * 0.95, 0.3],
    info: 'Плотная белая оболочка: защищает глаз и держит его форму. Спереди переходит в прозрачную роговицу.',
    build: (T) => new T.Mesh(new T.SphereGeometry(R, 48, 32), cut(T, std(T, '#ECEAF0', { transparent: true, opacity: 0.35, side: T.DoubleSide, roughness: 0.3 }))),
  }
  const cornea: ModelPartSpec = {
    id: 'cornea', name: 'Роговица', color: '#9FD3F0', anchor: [R + 0.25, 0.9, 0.3],
    info: 'Главная светопреломляющая структура глаза. Её кривизна постоянна, поэтому преломление здесь зависит только от угла, под которым падает свет.',
    build: (T) => {
      const m = new T.Mesh(new T.SphereGeometry(1.25, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.36), cut(T, std(T, '#9FD3F0', { transparent: true, opacity: 0.55, side: T.DoubleSide, roughness: 0.15 })))
      m.rotation.z = -Math.PI / 2
      m.position.x = R - 0.95
      return m
    },
  }
  const lens: ModelPartSpec = {
    id: 'lens', name: 'Хрусталик', color: '#F2DFA0', anchor: [LENS_X, 1.0, 0.3],
    liveAnchor: () => [LENS_X, 1.0, 0.3],
    info: 'Упругая двояковыпуклая линза: тонкая наводка на фокус за счёт изменения кривизны. Чем выпуклее хрусталик, тем сильнее он преломляет свет.',
    build: (T) => {
      const m = new T.Mesh(new T.SphereGeometry(1, 36, 24), std(T, '#F2DFA0', { transparent: true, opacity: 0.8, roughness: 0.2 }))
      m.userData.base = 0.8
      m.position.x = LENS_X
      refs.lens = m
      return m
    },
  }
  const ciliary: ModelPartSpec = {
    id: 'ciliary', name: 'Ресничная мышца и связка', color: '#D98A7A', anchor: [LENS_X, 1.75, 0.3],
    info: 'Кольцо мышцы вокруг хрусталика держит его на связке. Мышца сокращена — связка не натянута, хрусталик выпуклее, преломление сильнее (предмет близко). Мышца расслаблена — связка натянута, хрусталик уплощён (предмет далеко).',
    build: (T) => {
      const g = new T.Group()
      const ring = new T.Mesh(new T.TorusGeometry(1, 0.13, 12, 48), cut(T, std(T, '#D98A7A', { side: T.DoubleSide })))
      ring.rotation.y = Math.PI / 2
      ring.position.x = LENS_X
      refs.ring = ring
      g.add(ring)
      const ligMat = std(T, '#E8B4A8')
      refs.ligMat = ligMat
      for (let i = 0; i < 10; i++) {
        const m = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 1, 6), ligMat)
        m.userData.angle = (i / 10) * Math.PI * 2
        refs.ligaments.push(m); g.add(m)
      }
      return g
    },
  }
  const retina: ModelPartSpec = {
    id: 'retina', name: 'Сетчатка', color: '#E59A6B', anchor: [-R + 0.2, -1.6, 0.4],
    info: 'Внутренний слой с фоторецепторами — палочками и колбочками. Изображение на сетчатке по законам оптики перевёрнутое, но мозг (зрительная кора) позволяет воспринимать его «как надо».',
    build: (T) => {
      const m = new T.Mesh(new T.SphereGeometry(R * 0.97, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.5), cut(T, std(T, '#E59A6B', { side: T.DoubleSide, roughness: 0.6 })))
      m.rotation.z = Math.PI / 2
      return m
    },
  }
  const light: ModelPartSpec = {
    id: 'light', name: 'Лучи света', color: '#F7E27A', anchor: [R + 2.2, 0.75, 0],
    liveAnchor: () => { const o = refs.object; return o ? [o.position.x - 0.6, 0.75, 0] : [R + 2, 0.75, 0] },
    info: 'Лучи от далёких предметов (дальше 6 м) идут в глаз почти параллельно, от близких — расходящимся пучком. Для близких предметов преломление должно быть сильнее.',
    build: (T) => {
      const g = new T.Group()
      const mat = new T.LineBasicMaterial({ color: '#F7E27A', transparent: true, opacity: 0.95 })
      for (let i = 0; i < RAYS.length; i++) {
        const geo = new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(new Float32Array(4 * 3), 3))
        const line = new T.Line(geo, mat)
        refs.rays.push(line); g.add(line)
      }
      // Предмет — стрелка вверх.
      const obj = new T.Group()
      const sm = std(T, '#6EC26E')
      const stem = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.9, 8), sm); stem.position.y = 0.45
      const tip = new T.Mesh(new T.ConeGeometry(0.16, 0.3, 14), sm); tip.position.y = 1.0
      obj.add(stem, tip)
      refs.object = obj; g.add(obj)
      // Размытое пятно на сетчатке и чёткое перевёрнутое изображение.
      const spot = new T.Mesh(new T.CircleGeometry(1, 32), new T.MeshBasicMaterial({ color: '#F7E27A', transparent: true, opacity: 0.35, side: T.DoubleSide }))
      spot.rotation.y = Math.PI / 2
      refs.spot = spot; g.add(spot)
      const img = new T.Group()
      const im = std(T, '#6EC26E')
      const s2 = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.36, 6), im); s2.position.y = -0.18
      const t2 = new T.Mesh(new T.ConeGeometry(0.07, 0.12, 10), im); t2.position.y = -0.4; t2.rotation.z = Math.PI
      img.add(s2, t2)
      img.position.set(RETINA_X + 0.02, 0, 0)
      refs.image = img; g.add(img)
      return g
    },
  }

  const stages = [
    { name: 'Далёкий предмет', info: 'Лучи от далёкого предмета идут почти параллельно. Ресничная мышца расслаблена, связка натянута, хрусталик уплощён — фокус на сетчатке.' },
    { name: 'Предмет близко', info: 'От близкого предмета лучи расходятся. При уплощённом хрусталике их не хватает преломить: фокус уходит за сетчатку, на ней размытое пятно.' },
    { name: 'Аккомодация', info: 'Ресничная мышца сокращается, связка перестаёт тянуть, и упругий хрусталик становится выпуклее. Преломление усиливается, фокус возвращается на сетчатку.' },
    { name: 'Изображение', info: 'Изображение на сетчатке перевёрнутое и обратное. Зрительная кора обрабатывает его так, что мы видим мир «как надо».' },
  ]

  return {
    id: 'process-eye', title: 'Глаз: путь света и аккомодация',
    subtitle: 'Срез глаза сбоку, свет идёт справа налево. Проиграйте плёнку или нажмите на стадию.',
    radius: 4, canExplode: false, view: 'front',
    frame: { center: [2.4, 0.3, 0], radius: 5.2 },
    sources: [
      'textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.322',
      'textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.323',
      'textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.324',
      'textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.325',
    ],
    parts: [sclera, cornea, lens, ciliary, retina, light],
    timeline: {
      stages, duration: 16,
      update: (p) => {
        const near = span(p, N, 0, 1)        // предмет подходит
        const acc = span(p, N, 1, 2)         // аккомодация
        const img = span(p, N, 2, 3)         // перевёрнутое изображение
        // Хрусталик: уплощён → выпуклый.
        refs.lens?.scale.set(lerp(0.3, 0.52, acc), lerp(0.85, 0.74, acc), lerp(0.85, 0.74, acc))
        // Ресничное тело приближается к хрусталику при сокращении.
        const ringR = lerp(1.45, 1.18, acc)
        refs.ring?.scale.setScalar(ringR)
        const lensR = lerp(0.85, 0.74, acc)
        refs.ligaments.forEach(m => {
          const a = m.userData.angle as number
          const r0 = lensR, r1 = ringR - 0.1
          const mid = (r0 + r1) / 2
          m.position.set(LENS_X, Math.cos(a) * mid, Math.sin(a) * mid)
          m.scale.y = Math.max(0.05, r1 - r0)
          m.rotation.set(a, 0, 0)
        })
        // Натянутая связка — светлая и ровная; провисшая — темнее.
        refs.ligMat?.color.set(acc > 0.5 ? '#B98A80' : '#E8B4A8')
        // Предмет и лучи.
        const objX = lerp(R + 9, R + 2.6, near)
        refs.object?.position.set(objX, -0.05, 0)
        // Где сходятся лучи: на сетчатке, если хрусталик справляется.
        const focusX = RETINA_X - 1.3 * near * (1 - acc)
        const imgH = lerp(0.12, 0.42, near) // высота изображения кончика
        refs.rays.forEach((line, i) => {
          const yc = RAYS[i]
          const start: V3 = [objX, lerp(yc + 0.9, 0.95, near), 0]
          const corneaPt: V3 = [R + 0.15, yc * 1.25, 0]
          const lensPt: V3 = [LENS_X, yc, 0]
          const focus: V3 = [focusX, -imgH, 0]
          // Обрезаем на сетчатке: дальше свет не идёт.
          const t = (RETINA_X - lensPt[0]) / (focus[0] - lensPt[0])
          const end: V3 = [RETINA_X, lerp(lensPt[1], focus[1], t), 0]
          const a = (line.geometry.getAttribute('position') as THREE.BufferAttribute)
          ;[start, corneaPt, lensPt, end].forEach((pt, k) => a.setXYZ(k, pt[0], pt[1], pt[2]))
          a.needsUpdate = true
        })
        // Размер пятна = разброс лучей на сетчатке.
        const spread = Math.abs(((RETINA_X - LENS_X) / (focusX - LENS_X) - 1) * RAYS[RAYS.length - 1])
        if (refs.spot) {
          refs.spot.position.set(RETINA_X + 0.03, -imgH * Math.min(1, (RETINA_X - LENS_X) / (focusX - LENS_X)), 0)
          refs.spot.scale.setScalar(Math.max(0.06, spread))
          refs.spot.visible = spread > 0.08
        }
        if (refs.image) {
          refs.image.position.set(RETINA_X + 0.04, 0, 0)
          refs.image.scale.setScalar(lerp(0.4, 1, near))
          setOpacity(refs.image, img)
        }
      },
    },
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Удвоение ДНК (редупликация)
// ═════════════════════════════════════════════════════════════════════════════

export function dnaReplicationSpec(): ModelSpec {
  const N = 4
  const BASES = 14, STEP = 0.42
  const x0 = -((BASES - 1) * STEP) / 2
  const SEP = 1.35 // насколько расходятся дочерние молекулы
  const seq = 'ATGCGTACGATCGTAG'
  const pairColor = (i: number) => ('GC'.includes(seq[i % seq.length]) ? ['#F2C864', '#D9A93F'] : ['#E2857A', '#C86A5F'])
  const refs = {
    oldTop: [] as THREE.Object3D[], oldBot: [] as THREE.Object3D[],
    halfTop: [] as THREE.Object3D[], halfBot: [] as THREE.Object3D[],
    newTop: [] as THREE.Object3D[], newBot: [] as THREE.Object3D[],
    newHalfTop: [] as THREE.Object3D[], newHalfBot: [] as THREE.Object3D[],
    enzyme: null as THREE.Object3D | null,
  }

  const strand = (T: ThreeNS, color: string, arr: THREE.Object3D[]) => {
    const g = new T.Group()
    const geo = new T.CylinderGeometry(0.08, 0.08, STEP * 1.02, 10)
    const mat = std(T, color, { transparent: true })
    for (let i = 0; i < BASES; i++) {
      const m = new T.Mesh(geo, mat)
      m.rotation.z = Math.PI / 2
      arr.push(m); g.add(m)
    }
    return g
  }
  const halves = (T: ThreeNS, arr: THREE.Object3D[], which: 0 | 1, transparent = false) => {
    const g = new T.Group()
    const geo = new T.CylinderGeometry(0.06, 0.06, 0.33, 8)
    for (let i = 0; i < BASES; i++) {
      const m = new T.Mesh(geo, std(T, pairColor(i)[which], { transparent }))
      arr.push(m); g.add(m)
    }
    return g
  }

  const oldStrands: ModelPartSpec = {
    id: 'old', name: '«Материнские» нити', color: '#7F9BE0', anchor: [x0, 0.6, 0.3],
    liveAnchor: () => { const m = refs.oldTop[0]; return m ? [m.position.x - 0.2, m.position.y + 0.35, 0.3] : [0, 0, 0] },
    info: 'Две нити исходной двойной спирали. При удвоении они расходятся, и каждая становится шаблоном для новой нити.',
    build: (T) => {
      const g = new T.Group()
      g.add(strand(T, '#7F9BE0', refs.oldTop), strand(T, '#7F9BE0', refs.oldBot), halves(T, refs.halfTop, 0), halves(T, refs.halfBot, 1))
      return g
    },
  }
  const enzyme: ModelPartSpec = {
    id: 'enzyme', name: 'Фермент', color: '#5FC3B8', anchor: [0, 0.8, 0.3],
    liveAnchor: () => { const e = refs.enzyme; return e ? [e.position.x, e.position.y + 0.7, 0.3] : [0, 0, 0] },
    info: 'Специальный фермент разрывает водородные связи между комплементарными основаниями: аденином и тимином, гуанином и цитозином. В удвоении участвует много ферментов, энергию даёт АТФ.',
    build: (T) => {
      const m = new T.Mesh(new T.SphereGeometry(0.42, 28, 20), std(T, '#5FC3B8', { transparent: true, opacity: 0.85 }))
      m.userData.base = 0.85
      refs.enzyme = m
      return m
    },
  }
  const newStrands: ModelPartSpec = {
    id: 'new', name: 'Новые нити', color: '#F09A5B', anchor: [x0, -0.6, 0.3],
    liveAnchor: () => { const vis = refs.newTop.filter(m => m.visible); const m = vis[vis.length - 1]; return m ? [m.position.x + 0.3, m.position.y - 0.3, 0.3] : [100, 100, 0] },
    info: 'К каждому нуклеотиду разошедшихся нитей подстраиваются комплементарные нуклеотиды и соединяются в новую нить — копию разошедшейся.',
    build: (T) => {
      const g = new T.Group()
      g.add(strand(T, '#F09A5B', refs.newTop), strand(T, '#F09A5B', refs.newBot), halves(T, refs.newHalfTop, 1, true), halves(T, refs.newHalfBot, 0, true))
      return g
    },
  }

  const stages = [
    { name: '«Материнская» ДНК', info: 'Двойная спираль: основания двух нитей соединены водородными связями по принципу комплементарности — аденин с тимином, гуанин с цитозином.' },
    { name: 'Разрыв связей', info: 'Фермент разрывает водородные связи между основаниями, и нити двойной спирали расходятся.' },
    { name: 'Синтез новых нитей', info: 'К каждому нуклеотиду обеих нитей последовательно подстраиваются комплементарные нуклеотиды и соединяются в новые нити.' },
    { name: 'Две «дочерние» ДНК', info: 'Получаются две одинаковые двойные спирали. В каждой — одна нить «материнской» молекулы и одна новая.' },
  ]

  const yTop = (s: number) => SEP * s
  return {
    id: 'process-replication', title: 'Удвоение ДНК',
    subtitle: 'Редупликация: синие нити — «материнские», оранжевые — новые. Проиграйте плёнку или нажмите на стадию.',
    radius: 3.4, canExplode: false, view: 'front',
    frame: { center: [0, 0, 0], radius: 3.6 },
    sources: [`${KB_9}#стр.96`, `${KB_9}#стр.97`],
    parts: [oldStrands, enzyme, newStrands],
    timeline: {
      stages, duration: 16,
      update: (p) => {
        const open = span(p, N, 0.1, 1)     // вилка идёт слева направо
        const build = span(p, N, 1.05, 2)   // новые нити дорастают за вилкой
        const apart = span(p, N, 2.05, 3)   // дочерние молекулы расходятся
        // Вилка уходит за край с запасом: иначе крайняя пара остаётся недоразведённой.
        const forkX = lerp(x0 - 0.6, x0 + (BASES - 1) * STEP + 1.4, open)
        const buildX = lerp(x0 - 0.6, x0 + (BASES - 1) * STEP + 1.4, build)
        for (let i = 0; i < BASES; i++) {
          const x = x0 + i * STEP
          const s = smooth((forkX - x) / 0.9) // насколько расошлось основание i
          const n = smooth((buildX - x) / 0.6) // насколько достроено
          const yt = yTop(s) + apart * 0.5, yb = -yTop(s) - apart * 0.5
          refs.oldTop[i].position.set(x, yt + 0.35, 0)
          refs.oldBot[i].position.set(x, yb - 0.35, 0)
          // Половинки пары: пока связаны — смыкаются в центре.
          refs.halfTop[i].position.set(x, yt + 0.35 - 0.17 - (1 - s) * 0, 0)
          refs.halfBot[i].position.set(x, yb - 0.35 + 0.17, 0)
          // Новые нити: под старой верхней и над старой нижней.
          refs.newTop[i].position.set(x, yt - 0.35, 0)
          refs.newBot[i].position.set(x, yb + 0.35, 0)
          refs.newHalfTop[i].position.set(x, yt - 0.35 + 0.17, 0)
          refs.newHalfBot[i].position.set(x, yb + 0.35 - 0.17, 0)
          const vis = n > 0.02 && s > 0.6
          for (const arr of [refs.newTop, refs.newBot, refs.newHalfTop, refs.newHalfBot]) {
            arr[i].visible = vis
            arr[i].scale.setScalar(vis ? lerp(0.4, 1, n) : 1)
          }
        }
        if (refs.enzyme) {
          refs.enzyme.position.set(forkX, 0, 0)
          setOpacity(refs.enzyme, open > 0.01 && open < 0.9 ? 1 : 0)
        }
      },
    },
  }
}
