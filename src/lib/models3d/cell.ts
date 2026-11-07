// ─────────────────────────────────────────────────────────────────────────────
// Стилизованные клетки: животная и растительная. Это не скан и не чужая
// модель — органеллы собраны из примитивов three.js, поэтому у каждой есть
// имя, цвет и своя справка, и её можно увести в сторону или показать отдельно.
// Для школьного уровня (ОГЭ/ЕГЭ) важно именно это: состав и функции, а не
// фотореализм. Пропорции условные: органеллы увеличены, чтобы их было видно.
// ─────────────────────────────────────────────────────────────────────────────
import type * as THREE from 'three'
import type { ModelSpec, ModelPartSpec, ThreeNS } from './spec'

type V3 = [number, number, number]

function std(T: ThreeNS, color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new T.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, ...extra })
}

function ellipsoid(T: ThreeNS, rx: number, ry: number, rz: number, mat: THREE.Material, at: V3 = [0, 0, 0], rot: V3 = [0, 0, 0]) {
  const m = new T.Mesh(new T.SphereGeometry(1, 40, 28), mat)
  m.scale.set(rx, ry, rz)
  m.position.set(...at)
  m.rotation.set(...rot)
  return m
}

// ── Органеллы ────────────────────────────────────────────────────────────────

function membrane(rx: number, ry: number, rz: number, plant: boolean): ModelPartSpec {
  return {
    id: 'membrane', name: 'Плазматическая мембрана', color: '#8FA8E6', shell: true,
    // У верхнего правого края силуэта: спереди подпись ложилась на органеллы.
    anchor: [rx * 0.45, ry * 0.88, rz * 0.12],
    info: plant
      ? 'Двойной слой липидов с белками под клеточной стенкой. Избирательно пропускает вещества и держит содержимое клетки.'
      : 'Двойной слой липидов с встроенными белками. Отделяет клетку от среды, избирательно пропускает вещества, принимает сигналы — через рецепторы.',
    build: (T) => ellipsoid(T, rx, ry, rz, std(T, '#8FA8E6', { transparent: true, opacity: 0.2, side: T.DoubleSide, roughness: 0.25 })),
  }
}

function nucleus(at: V3, r: number): ModelPartSpec {
  return {
    id: 'nucleus', name: 'Ядро', color: '#7F6EDB',
    // Передний левый бок ядра: сверху на нём лежит митохондрия и закрывала подпись.
    anchor: [at[0] - r * 0.55, at[1] - r * 0.2, at[2] + r * 0.75],
    info: 'Хранит ДНК — хромосомы в виде хроматина. Окружено двойной мембраной с порами. Внутри ядрышко: здесь собираются рибосомы. Ядро управляет синтезом белка через иРНК.',
    build: (T) => {
      const g = new T.Group()
      g.add(ellipsoid(T, r, r * 0.92, r, std(T, '#8D7BE0', { transparent: true, opacity: 0.55, roughness: 0.35 }), at))
      // Хроматин — несколько нитей внутри.
      const chroma = std(T, '#6A58C9')
      for (let i = 0; i < 3; i++) {
        const curve = new T.CatmullRomCurve3([0, 1, 2, 3, 4].map(k => new T.Vector3(
          at[0] + Math.sin(k * 1.7 + i) * r * 0.55, at[1] + Math.cos(k * 1.3 + i * 2) * r * 0.5, at[2] + Math.sin(k * 0.9 + i * 3) * r * 0.5,
        )))
        g.add(new T.Mesh(new T.TubeGeometry(curve, 24, r * 0.05, 6, false), chroma))
      }
      g.add(ellipsoid(T, r * 0.3, r * 0.3, r * 0.3, std(T, '#4F3FB5'), [at[0] + r * 0.2, at[1] - r * 0.1, at[2] + r * 0.15]))
      return g
    },
  }
}

function mitochondria(places: Array<{ at: V3; rot: V3 }>): ModelPartSpec {
  return {
    id: 'mito', name: 'Митохондрии', color: '#F09A5B',
    // Самая передняя митохондрия: дальние в собранной клетке закрыты органеллами.
    anchor: places.reduce((b, p) => (p.at[2] > b.at[2] ? p : b)).at,
    info: 'Энергетические станции: здесь идёт клеточное дыхание и синтезируется АТФ. Две мембраны, внутренняя образует складки — кристы. Есть собственная кольцевая ДНК.',
    build: (T) => {
      const g = new T.Group()
      const body = std(T, '#F09A5B')
      const crista = std(T, '#D8783A')
      for (const { at, rot } of places) {
        const m = new T.Group()
        m.add(new T.Mesh(new T.CapsuleGeometry(0.26, 0.62, 6, 16), body))
        for (let i = -1; i <= 1; i++) {
          const ring = new T.Mesh(new T.TorusGeometry(0.27, 0.025, 8, 36), crista)
          ring.position.y = i * 0.24
          ring.rotation.x = Math.PI / 2
          m.add(ring)
        }
        m.position.set(...at)
        m.rotation.set(...rot)
        g.add(m)
      }
      return g
    },
  }
}

function roughER(centre: V3, r: number): ModelPartSpec {
  return {
    id: 'rer', name: 'Шероховатая ЭПС', color: '#6FAEE0',
    // Левый край наружной цистерны: листы огибают ядро сзади-слева, и середина
    // дуги пряталась за хроматином ядра.
    anchor: [centre[0] + Math.sin(4.4) * r * 1.64, centre[1] - 0.15, centre[2] + Math.cos(4.4) * r * 1.64],
    info: 'Эндоплазматическая сеть, усеянная рибосомами. Здесь синтезируются белки «на экспорт» и мембранные белки, начинается их свёртывание и гликозилирование.',
    build: (T) => {
      const g = new T.Group()
      const sheet = std(T, '#6FAEE0', { side: T.DoubleSide, roughness: 0.4 })
      const dot = std(T, '#2F4F7A')
      const dotGeo = new T.SphereGeometry(0.045, 8, 6)
      // Цистерны — три вложенных изогнутых листа (открытые цилиндры без
      // крышек), огибающие ядро с одной стороны; рибосины сидят на наружной
      // поверхности каждого.
      const start = Math.PI * 0.95, arc = 1.35
      for (let i = 0; i < 3; i++) {
        const rr = r * (1.3 + i * 0.17)
        const h = 0.5 - i * 0.06
        const cyl = new T.Mesh(new T.CylinderGeometry(rr, rr, h, 48, 1, true, start + i * 0.1, arc), sheet)
        cyl.position.set(centre[0], centre[1] + (i - 1) * 0.08, centre[2])
        g.add(cyl)
        for (let k = 0; k < 10; k++) {
          // CylinderGeometry считает угол от оси +Z против часовой, если смотреть сверху.
          const a = start + i * 0.1 + (k / 9) * arc
          const d = new T.Mesh(dotGeo, dot)
          d.position.set(centre[0] + Math.sin(a) * (rr + 0.05), centre[1] + (i - 1) * 0.08 + ((k % 3) - 1) * h * 0.32, centre[2] + Math.cos(a) * (rr + 0.05))
          g.add(d)
        }
      }
      return g
    },
  }
}

function smoothER(path: V3[]): ModelPartSpec {
  return {
    id: 'ser', name: 'Гладкая ЭПС', color: '#5FC3B8',
    anchor: path[Math.floor(path.length / 2)],
    info: 'Трубочки без рибосом. Синтез липидов и стероидов, обезвреживание ядов (в клетках печени), запас ионов кальция (в мышечных клетках).',
    build: (T) => {
      const curve = new T.CatmullRomCurve3(path.map(p => new T.Vector3(...p)))
      return new T.Mesh(new T.TubeGeometry(curve, 60, 0.07, 10, false), std(T, '#5FC3B8'))
    },
  }
}

function golgi(at: V3, rotY: number): ModelPartSpec {
  return {
    id: 'golgi', name: 'Аппарат Гольджи', color: '#F2C864',
    anchor: [at[0], at[1] + 0.55, at[2]],
    info: 'Стопка плоских мембранных цистерн. Принимает белки из ЭПС, дорабатывает их, сортирует и упаковывает в пузырьки: наружу, в лизосомы или в мембрану.',
    build: (T) => {
      const g = new T.Group()
      const mat = std(T, '#F2C864')
      for (let i = 0; i < 5; i++) {
        const w = 0.95 - Math.abs(i - 2) * 0.12
        const c = ellipsoid(T, w, 0.055, 0.45, mat, [0, (i - 2) * 0.16, 0], [0, 0, (i - 2) * 0.08])
        g.add(c)
      }
      // Пузырьки, отходящие от стопки.
      const vMat = std(T, '#E6B44E')
      ;[[0.9, 0.5, 0.2], [1.05, 0.3, -0.25], [-0.95, 0.45, 0.1]].forEach(p => g.add(ellipsoid(T, 0.09, 0.09, 0.09, vMat, p as V3)))
      g.position.set(...at)
      g.rotation.y = rotY
      return g
    },
  }
}

function lysosomes(places: V3[]): ModelPartSpec {
  return {
    id: 'lyso', name: 'Лизосомы', color: '#D872B8',
    anchor: places[0],
    info: 'Пузырьки с пищеварительными ферментами. Расщепляют захваченные частицы и отработавшие органеллы — внутриклеточное пищеварение.',
    build: (T) => {
      const g = new T.Group()
      const mat = std(T, '#D872B8')
      places.forEach((p, i) => g.add(ellipsoid(T, 0.17 + i * 0.03, 0.17 + i * 0.03, 0.17 + i * 0.03, mat, p)))
      return g
    },
  }
}

function ribosomes(rx: number, ry: number, rz: number, avoid: { at: V3; r: number }[]): ModelPartSpec {
  const spots: V3[] = []
  let seed = 7
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  let guard = 0
  while (spots.length < 70 && guard++ < 2000) {
    const x = (rnd() * 2 - 1) * rx * 0.9, y = (rnd() * 2 - 1) * ry * 0.9, z = (rnd() * 2 - 1) * rz * 0.9
    if ((x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2 > 0.8) continue
    if (avoid.some(a => Math.hypot(x - a.at[0], y - a.at[1], z - a.at[2]) < a.r)) continue
    spots.push([x, y, z])
  }
  // Подпись — на настоящей рибосоме, ближайшей к правому нижнему краю
  // (раньше точка висела в пустой цитоплазме рядом с ними).
  const want: V3 = [rx * 0.55, -ry * 0.45, rz * 0.3]
  const dist = (p: V3) => Math.hypot(p[0] - want[0], p[1] - want[1], p[2] - want[2])
  const anchor = spots.reduce((b, p) => (dist(p) < dist(b) ? p : b), spots[0] ?? want)
  return {
    id: 'ribo', name: 'Рибосомы', color: '#9A9AB8',
    anchor,
    info: 'Мельчайшие немембранные органеллы из рРНК и белка. Собирают белок по иРНК. Свободные — для нужд самой клетки, на ЭПС — для секреции.',
    build: (T) => {
      const g = new T.Group()
      const geo = new T.SphereGeometry(0.05, 8, 6)
      const mat = std(T, '#9A9AB8')
      for (const p of spots) {
        const m = new T.Mesh(geo, mat)
        m.position.set(...p)
        g.add(m)
      }
      return g
    },
  }
}

function centrosome(at: V3): ModelPartSpec {
  return {
    id: 'centro', name: 'Клеточный центр', color: '#6EC26E',
    anchor: [at[0], at[1] + 0.35, at[2]],
    info: 'Две центриоли под прямым углом — цилиндры из микротрубочек. При делении организуют веретено, которое растаскивает хромосомы. У растений центриолей нет.',
    build: (T) => {
      const g = new T.Group()
      const mat = std(T, '#6EC26E')
      const a = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.42, 12), mat)
      const b = a.clone()
      b.rotation.z = Math.PI / 2
      b.position.set(0.2, -0.26, 0)
      g.add(a, b)
      g.position.set(...at)
      return g
    },
  }
}

function cellWall(rx: number, ry: number, rz: number): ModelPartSpec {
  return {
    id: 'wall', name: 'Клеточная стенка', color: '#A9CB74', shell: true,
    // У верхнего левого края — напротив подписи мембраны.
    anchor: [-rx * 0.38, ry * 0.92, rz * 0.08],
    info: 'Жёсткая оболочка из целлюлозы снаружи мембраны. Держит форму, защищает, не даёт клетке лопнуть от напора воды. Есть у растений, грибов и бактерий, нет у животных.',
    build: (T) => ellipsoid(T, rx, ry, rz, std(T, '#A9CB74', { transparent: true, opacity: 0.3, side: T.DoubleSide, roughness: 0.7 })),
  }
}

function vacuole(at: V3, rx: number, ry: number, rz: number): ModelPartSpec {
  return {
    id: 'vacuole', name: 'Центральная вакуоль', color: '#8CC9F0',
    anchor: [at[0], at[1] + ry * 0.9, at[2]],
    info: 'Большой пузырь с клеточным соком: вода, сахара, соли, пигменты. Создаёт тургор — внутреннее давление, которое держит растение упругим, запасает вещества и отходы.',
    build: (T) => ellipsoid(T, rx, ry, rz, std(T, '#8CC9F0', { transparent: true, opacity: 0.45, roughness: 0.2 }), at),
  }
}

function chloroplasts(places: Array<{ at: V3; rot: V3 }>): ModelPartSpec {
  return {
    id: 'chloro', name: 'Хлоропласты', color: '#5FBF6A',
    anchor: places[0].at,
    info: 'Пластиды с хлорофиллом. Здесь идёт фотосинтез: свет → АТФ и НАДФ·Н на мембранах тилакоидов (стопки — граны), а в строме из CO₂ собирается глюкоза. Две мембраны и своя ДНК.',
    build: (T) => {
      const g = new T.Group()
      const body = std(T, '#5FBF6A', { transparent: true, opacity: 0.8 })
      const grana = std(T, '#2E8B3E')
      for (const { at, rot } of places) {
        const c = new T.Group()
        c.add(ellipsoid(T, 0.55, 0.28, 0.34, body))
        for (let i = -1; i <= 1; i++) {
          const st = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 0.3, 14), grana)
          st.position.set(i * 0.3, 0, 0)
          c.add(st)
        }
        c.position.set(...at)
        c.rotation.set(...rot)
        g.add(c)
      }
      return g
    },
  }
}

/**
 * Разбор клетки. Органеллы, которых несколько (митохондрии, хлоропласты,
 * лизосомы, рибосомы), разлетаются каждая от центра клетки — сдвиг всей
 * группы целиком оставлял облако рибосом и хлоропласты на вакуоли. Ядро
 * уходит в сторону, шероховатая ЭПС — за ним и вверх, иначе её листы
 * так и оставались на ядре.
 */
function withExplode(p: ModelPartSpec, e: Pick<ModelPartSpec, 'explode' | 'explodeSpread'>): ModelPartSpec {
  return { ...p, ...e }
}

// ── Клетки ───────────────────────────────────────────────────────────────────

export function animalCellSpec(): ModelSpec {
  const RX = 3, RY = 2.3, RZ = 2.5
  const nuc: V3 = [-0.55, 0.1, 0]
  return {
    id: 'cell-animal',
    title: 'Животная клетка',
    subtitle: 'Эукариотическая клетка без стенки и пластид. Нажмите на органеллу или разберите клетку на части.',
    radius: 3.3,
    canExplode: true,
    parts: [
      membrane(RX, RY, RZ, false),
      withExplode(nucleus(nuc, 1.0), { explode: [-1.7, 0.4, 0.2] }),
      withExplode(roughER(nuc, 1.0), { explode: [-2.0, 2.0, -0.6] }),
      smoothER([[1.0, 1.1, -1.3], [1.6, 1.3, -0.6], [2.0, 0.9, 0.2], [1.7, 1.3, 0.9], [1.1, 1.0, 1.4]]),
      golgi([1.5, -0.1, 0.6], -0.5),
      withExplode(mitochondria([
        { at: [1.6, -1.1, -0.9], rot: [0.4, 0.3, 1.1] },
        { at: [-1.4, -1.3, 1.1], rot: [1.2, 0.2, 0.4] },
        { at: [-1.9, 1.1, -0.9], rot: [0.3, 0.8, 1.9] },
        { at: [0.6, 1.4, 1.2], rot: [1.4, 0.1, 0.9] },
      ]), { explodeSpread: 0.7 }),
      withExplode(lysosomes([[0.3, -1.4, 1.3], [-2.2, -0.2, 0.9], [2.1, 0.8, -1.2]]), { explodeSpread: 0.7 }),
      // Клеточный центр — вверх: внизу уже лизосомы и рибосомы, подписи слипались.
      withExplode(centrosome([0.5, -0.9, -0.3]), { explode: [1.0, 2.6, -1.0] }),
      withExplode(ribosomes(RX, RY, RZ, [{ at: nuc, r: 1.7 }, { at: [1.5, -0.1, 0.6], r: 1.1 }]), { explodeSpread: 0.6 }),
    ],
  }
}

export function plantCellSpec(): ModelSpec {
  const RX = 3.1, RY = 2.4, RZ = 2.5
  const nuc: V3 = [-1.7, 0.5, 0.3]
  const vac: V3 = [0.7, -0.1, 0]
  return {
    id: 'cell-plant',
    title: 'Растительная клетка',
    subtitle: 'Клеточная стенка, хлоропласты и центральная вакуоль — три отличия от животной клетки.',
    radius: 3.5,
    canExplode: true,
    parts: [
      cellWall(RX + 0.25, RY + 0.25, RZ + 0.25),
      membrane(RX, RY, RZ, true),
      withExplode(vacuole(vac, 1.55, 1.25, 1.35), { explode: [1.2, 0, 0] }),
      withExplode(nucleus(nuc, 0.75), { explode: [-2.4, 0.7, 0.4] }),
      withExplode(roughER(nuc, 0.75), { explode: [-2.6, 2.3, -0.4] }),
      golgi([-0.6, -1.5, 0.9], 0.6),
      withExplode(chloroplasts([
        { at: [1.8, 1.3, -0.8], rot: [0.3, 0.6, 0.2] },
        { at: [-0.4, 1.6, -1.2], rot: [0.1, -0.4, 0.5] },
        { at: [2.2, -1.1, 0.9], rot: [0.5, 0.9, -0.3] },
        { at: [-1.1, -1.4, -1.3], rot: [-0.3, 0.2, 0.8] },
        { at: [0.9, 1.5, 1.3], rot: [0.9, 0.1, 0.1] },
      ]), { explodeSpread: 0.8 }),
      withExplode(mitochondria([
        { at: [-2.3, -0.8, -0.6], rot: [0.4, 0.3, 1.1] },
        { at: [2.4, 0.4, 0.5], rot: [1.2, 0.2, 0.4] },
      ]), { explodeSpread: 0.7 }),
      withExplode(ribosomes(RX, RY, RZ, [{ at: nuc, r: 1.4 }, { at: vac, r: 1.75 }]), { explodeSpread: 0.6 }),
    ],
  }
}
