// ─────────────────────────────────────────────────────────────────────────────
// Молекулы, ионная решётка и ДНК — всё из формулы, без ассетов.
// Шаростержневые модели: координаты в ангстремах × 1.2, цвета CPK.
// Для школы важны форма (угловая, линейная, тетраэдр, пирамида), углы и
// полярность — это и лежит в справках.
// ─────────────────────────────────────────────────────────────────────────────
import type * as THREE from 'three'
import type { ModelSpec, ModelPartSpec, ThreeNS } from './spec'

type V3 = [number, number, number]
const CPK: Record<string, { color: string; r: number; name: string }> = {
  H: { color: '#F2F2F5', r: 0.3, name: 'Водород' }, C: { color: '#5A5A66', r: 0.48, name: 'Углерод' },
  O: { color: '#E2574C', r: 0.46, name: 'Кислород' }, N: { color: '#4E6FE0', r: 0.46, name: 'Азот' },
  Cl: { color: '#4FBF6A', r: 0.6, name: 'Хлор' }, Na: { color: '#9A6FE0', r: 0.42, name: 'Натрий' },
}

interface Molecule {
  key: string; formula: string; title: string; subtitle: string
  atoms: Array<[string, V3]>; bonds: Array<[number, number, 1 | 2 | 3]>
  info: Record<string, string>; bondsInfo: string
}

const S = 1.25
const MOLECULES: Molecule[] = [
  {
    key: 'h2o', formula: 'H₂O', title: 'Вода · H₂O', subtitle: 'Угловая молекула, угол H–O–H 104,5°. Полярная: отсюда водородные связи и все «странности» воды.',
    atoms: [['O', [0, 0, 0]], ['H', [0.76 * S, 0.59 * S, 0]], ['H', [-0.76 * S, 0.59 * S, 0]]],
    bonds: [[0, 1, 1], [0, 2, 1]],
    info: { O: 'Кислород: две неподелённые пары отталкивают связи O–H и сжимают угол до 104,5° вместо тетраэдрических 109,5°. На нём частичный отрицательный заряд.', H: 'Два атома водорода с частичным положительным зарядом — ими молекула цепляется водородными связями за соседние.' },
    bondsInfo: 'Ковалентные полярные связи O–H, длина 0,096 нм. Электронная плотность смещена к кислороду.',
  },
  {
    key: 'co2', formula: 'CO₂', title: 'Углекислый газ · CO₂', subtitle: 'Линейная молекула, угол 180°. Связи полярные, а молекула в целом нет: диполи гасят друг друга.',
    atoms: [['C', [0, 0, 0]], ['O', [1.16 * S, 0, 0]], ['O', [-1.16 * S, 0, 0]]],
    bonds: [[0, 1, 2], [0, 2, 2]],
    info: { C: 'Углерод в sp-гибридизации: две двойные связи в одну линию.', O: 'Два кислорода на одинаковом расстоянии по обе стороны — симметрия и делает молекулу неполярной.' },
    bondsInfo: 'Две двойные связи C=O, 0,116 нм. Короче и прочнее одинарной C–O.',
  },
  {
    key: 'ch4', formula: 'CH₄', title: 'Метан · CH₄', subtitle: 'Тетраэдр, все углы 109,5°. Неполярная молекула, простейший углеводород.',
    atoms: [['C', [0, 0, 0]], ['H', [0.63 * S, 0.63 * S, 0.63 * S]], ['H', [-0.63 * S, -0.63 * S, 0.63 * S]], ['H', [-0.63 * S, 0.63 * S, -0.63 * S]], ['H', [0.63 * S, -0.63 * S, -0.63 * S]]],
    bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]],
    info: { C: 'Углерод в sp³-гибридизации: четыре одинаковые связи направлены к вершинам тетраэдра.', H: 'Четыре водорода в вершинах тетраэдра. Разница электроотрицательностей C и H мала — связи почти неполярные.' },
    bondsInfo: 'Четыре одинарные связи C–H, 0,109 нм.',
  },
  {
    key: 'nh3', formula: 'NH₃', title: 'Аммиак · NH₃', subtitle: 'Тригональная пирамида, угол H–N–H 107°. Неподелённая пара азота делает молекулу полярной и основанием.',
    atoms: [['N', [0, 0.12 * S, 0]], ['H', [0.94 * S, -0.26 * S, 0]], ['H', [-0.47 * S, -0.26 * S, 0.81 * S]], ['H', [-0.47 * S, -0.26 * S, -0.81 * S]]],
    bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]],
    info: { N: 'Азот с неподелённой электронной парой на вершине пирамиды. Эту пару он отдаёт протону — так образуется ион аммония NH₄⁺.', H: 'Три водорода в основании пирамиды.' },
    bondsInfo: 'Три связи N–H, 0,101 нм, полярные.',
  },
  {
    key: 'c6h6', formula: 'C₆H₆', title: 'Бензол · C₆H₆', subtitle: 'Плоский правильный шестиугольник. Все связи C–C одинаковые: единое π-облако, а не три двойные связи.',
    atoms: [
      ...[0, 1, 2, 3, 4, 5].map(i => ['C', [Math.cos(i * Math.PI / 3) * 1.39 * S, 0, Math.sin(i * Math.PI / 3) * 1.39 * S]] as [string, V3]),
      ...[0, 1, 2, 3, 4, 5].map(i => ['H', [Math.cos(i * Math.PI / 3) * 2.47 * S, 0, Math.sin(i * Math.PI / 3) * 2.47 * S]] as [string, V3]),
    ],
    bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 1], [5, 0, 1], [0, 6, 1], [1, 7, 1], [2, 8, 1], [3, 9, 1], [4, 10, 1], [5, 11, 1]],
    info: { C: 'Шесть атомов углерода в sp²-гибридизации в одной плоскости. Шестой электрон каждого — в общем π-облаке над и под кольцом.', H: 'Шесть водородов в плоскости кольца, по одному на каждый углерод.' },
    bondsInfo: 'Связи C–C по 0,140 нм — между одинарной (0,154) и двойной (0,134). Поэтому бензол не обесцвечивает бромную воду, как алкены.',
  },
]

function sphere(T: ThreeNS, r: number, mat: THREE.Material, at: V3) {
  const m = new T.Mesh(new T.SphereGeometry(r, 28, 20), mat)
  m.position.set(...at)
  return m
}

/** Стержень между двумя точками; кратная связь — несколько параллельных. */
function bond(T: ThreeNS, a: V3, b: V3, order: number, mat: THREE.Material): THREE.Object3D {
  const g = new T.Group()
  const va = new T.Vector3(...a), vb = new T.Vector3(...b)
  const dir = vb.clone().sub(va), len = dir.length()
  const geo = new T.CylinderGeometry(0.07, 0.07, len, 10)
  const side = new T.Vector3(0, 0, 1).cross(dir.clone().normalize())
  if (side.lengthSq() < 1e-4) side.set(0, 1, 0)
  side.normalize()
  for (let k = 0; k < order; k++) {
    const m = new T.Mesh(geo, mat)
    const off = side.clone().multiplyScalar((k - (order - 1) / 2) * 0.17)
    m.position.copy(va).add(vb).multiplyScalar(0.5).add(off)
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.clone().normalize())
    g.add(m)
  }
  return g
}

export function moleculeSpec(key: string): ModelSpec | null {
  const mol = MOLECULES.find(m => m.key === key.toLowerCase())
  if (!mol) return null
  const elements = [...new Set(mol.atoms.map(a => a[0]))]
  const parts: ModelPartSpec[] = elements.map(el => {
    const cpk = CPK[el]
    const count = mol.atoms.filter(a => a[0] === el).length
    const first = mol.atoms.find(a => a[0] === el)!
    return {
      id: `el-${el}`, name: count > 1 ? `${cpk.name} ×${count}` : cpk.name, color: cpk.color,
      anchor: first[1], info: mol.info[el] ?? cpk.name,
      build: (T) => {
        const g = new T.Group()
        const mat = new T.MeshStandardMaterial({ color: cpk.color, roughness: 0.35 })
        for (const [e, at] of mol.atoms) if (e === el) g.add(sphere(T, cpk.r, mat, at))
        return g
      },
    }
  })
  const b0 = mol.bonds[0]
  const mid: V3 = [(mol.atoms[b0[0]][1][0] + mol.atoms[b0[1]][1][0]) / 2, (mol.atoms[b0[0]][1][1] + mol.atoms[b0[1]][1][1]) / 2, (mol.atoms[b0[0]][1][2] + mol.atoms[b0[1]][1][2]) / 2]
  parts.push({
    id: 'bonds', name: 'Связи', color: '#A7A7B8', anchor: mid, info: mol.bondsInfo,
    build: (T) => {
      const g = new T.Group()
      const mat = new T.MeshStandardMaterial({ color: '#B8B8C8', roughness: 0.5 })
      for (const [i, j, order] of mol.bonds) g.add(bond(T, mol.atoms[i][1], mol.atoms[j][1], order, mat))
      return g
    },
  })
  const radius = Math.max(...mol.atoms.map(a => Math.hypot(...a[1]))) + 0.9
  return { id: `molecule-${mol.key}`, title: mol.title, subtitle: mol.subtitle, radius: Math.max(radius, 2.2), parts, canExplode: true }
}

export const MOLECULE_KEYS = MOLECULES.map(m => ({ key: m.key, formula: m.formula }))

// ── Ионная решётка NaCl ──────────────────────────────────────────────────────

export function naclSpec(): ModelSpec {
  const N = 3, STEP = 1.05
  const pos = (i: number, j: number, k: number): V3 => [(i - 1) * STEP, (j - 1) * STEP, (k - 1) * STEP]
  const isNa = (i: number, j: number, k: number) => (i + j + k) % 2 === 0
  const ions = (na: boolean): ModelPartSpec => ({
    id: na ? 'na' : 'cl', name: na ? 'Ионы Na⁺' : 'Ионы Cl⁻', color: na ? CPK.Na.color : CPK.Cl.color,
    anchor: na ? pos(2, 2, 2) : pos(2, 2, 1),
    info: na
      ? 'Катион натрия: атом отдал один электрон и стал маленьким (0,10 нм). Каждый Na⁺ окружён шестью Cl⁻ — координационное число 6.'
      : 'Анион хлора: принял электрон, радиус вырос до 0,18 нм. Каждый Cl⁻ окружён шестью Na⁺. Ионов обоих знаков поровну — формула NaCl, а не молекула.',
    build: (T) => {
      const g = new T.Group()
      const mat = new T.MeshStandardMaterial({ color: na ? CPK.Na.color : CPK.Cl.color, roughness: 0.4 })
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) for (let k = 0; k < N; k++) {
        if (isNa(i, j, k) !== na) continue
        g.add(sphere(T, na ? 0.3 : 0.5, mat, pos(i, j, k)))
      }
      return g
    },
  })
  const frame: ModelPartSpec = {
    id: 'frame', name: 'Кубическая решётка', color: '#A7A7B8', anchor: pos(0, 2, 2),
    info: 'Ионы чередуются по всем трём направлениям — кубическая гранецентрированная решётка. Сильное электростатическое притяжение даёт высокую температуру плавления (801 °C), твёрдость и хрупкость: при сдвиге слоя одноимённые ионы оказываются рядом и отталкиваются.',
    build: (T) => {
      const g = new T.Group()
      const mat = new T.MeshStandardMaterial({ color: '#B8B8C8', roughness: 0.6 })
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) for (let k = 0; k < N; k++) {
        if (i < N - 1) g.add(bond(T, pos(i, j, k), pos(i + 1, j, k), 1, mat))
        if (j < N - 1) g.add(bond(T, pos(i, j, k), pos(i, j + 1, k), 1, mat))
        if (k < N - 1) g.add(bond(T, pos(i, j, k), pos(i, j, k + 1), 1, mat))
      }
      g.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) m.scale.set(0.45, 1, 0.45) })
      return g
    },
  }
  return {
    id: 'lattice-nacl', title: 'Кристалл поваренной соли · NaCl',
    subtitle: 'Фрагмент ионной решётки 3×3×3. Разберите — видно, что катионы и анионы образуют две вложенные решётки.',
    radius: 2.6, parts: [ions(true), ions(false), frame], canExplode: true,
  }
}

// ── ДНК ──────────────────────────────────────────────────────────────────────

export function dnaSpec(): ModelSpec {
  const TURNS = 2, BP = 10, RISE = 0.34, R = 1.0
  const total = TURNS * BP
  const seq = 'ATGCGTACGATCGTAGCATG'
  const pt = (i: number, strand: 0 | 1): V3 => {
    const a = (i / BP) * Math.PI * 2 + (strand ? Math.PI * 1.15 : 0) // малая и большая бороздки
    return [Math.cos(a) * R, (i - total / 2) * RISE, Math.sin(a) * R]
  }
  const backbone: ModelPartSpec = {
    id: 'backbone', name: 'Сахарофосфатный остов', color: '#8FA8E6', anchor: pt(total - 1, 0),
    info: 'Две цепи из чередующихся дезоксирибозы и фосфата, закрученные в правую спираль. Цепи антипараллельны: 5′→3′ и 3′→5′. Шаг спирали 3,4 нм, десять пар на виток.',
    build: (T) => {
      const g = new T.Group()
      for (const strand of [0, 1] as const) {
        const curve = new T.CatmullRomCurve3(Array.from({ length: total * 3 }, (_, k) => new T.Vector3(...pt(k / 3, strand))))
        g.add(new T.Mesh(new T.TubeGeometry(curve, total * 6, 0.11, 10, false), new T.MeshStandardMaterial({ color: strand ? '#7F9BE0' : '#9FB4EC', roughness: 0.45 })))
      }
      return g
    },
  }
  const pairs = (gc: boolean): ModelPartSpec => ({
    id: gc ? 'gc' : 'at', name: gc ? 'Пары Г–Ц' : 'Пары А–Т', color: gc ? '#F2C864' : '#E2857A',
    anchor: pt(seq.split('').findIndex(c => (c === 'G' || c === 'C') === gc), 0),
    info: gc
      ? 'Гуанин с цитозином держат три водородные связи. Чем больше пар Г–Ц, тем выше температура плавления ДНК.'
      : 'Аденин с тимином соединены двумя водородными связями. Правило Чаргаффа: А = Т, Г = Ц — следствие комплементарности.',
    build: (T) => {
      const g = new T.Group()
      const m1 = new T.MeshStandardMaterial({ color: gc ? '#F2C864' : '#E2857A', roughness: 0.5 })
      const m2 = new T.MeshStandardMaterial({ color: gc ? '#D9A93F' : '#C86A5F', roughness: 0.5 })
      for (let i = 0; i < total; i++) {
        const c = seq[i % seq.length]
        if ((c === 'G' || c === 'C') !== gc) continue
        const a = pt(i, 0), b = pt(i, 1)
        const mid: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
        g.add(bond(T, a, mid, 1, m1), bond(T, mid, b, 1, m2))
      }
      return g
    },
  })
  return {
    id: 'molecule-dna', title: 'ДНК · двойная спираль',
    subtitle: 'Два витка: 20 пар оснований. Остов снаружи, основания внутри, как ступени винтовой лестницы.',
    radius: total * RISE * 0.5 + 0.6, parts: [backbone, pairs(false), pairs(true)], canExplode: true,
  }
}
