// ─────────────────────────────────────────────────────────────────────────────
// Модель атома по Бору для любого элемента: ядро из протонов и нейтронов и
// электроны по энергетическим уровням. Собирается из номера элемента, ассетов
// нет — поэтому «атом к каждой теме» ничего не стоит. Для школы планетарная
// модель и есть то, что спрашивают (распределение по уровням, внешний уровень,
// валентность); орбитали — отдельный разговор.
// ─────────────────────────────────────────────────────────────────────────────
import type * as THREE from 'three'
import type { ModelSpec, ModelPartSpec, ThreeNS } from './spec'
import { electronShells, findElement, neutronCount, periodAndGroupNote, plural, SHELL_LETTERS, type ElementInfo } from './elements'

const NUCLEON_R = 0.22
const SHELL_R0 = 1.25
const SHELL_STEP = 0.72

/** Точки в шаре по спирали Фибоначчи — плотная «куча» нуклонов. */
function packedPoints(T: ThreeNS, n: number, radius: number): THREE.Vector3[] {
  const out: THREE.Vector3[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const r = n === 1 ? 0 : radius * Math.cbrt((i + 0.5) / n)
    const y = 1 - (2 * (i + 0.5)) / n
    const rad = Math.sqrt(Math.max(0, 1 - y * y))
    const a = golden * i
    out.push(new T.Vector3(Math.cos(a) * rad * r, y * r, Math.sin(a) * rad * r))
  }
  return out
}

function nucleus(el: ElementInfo): ModelPartSpec {
  const protons = el.z, neutrons = neutronCount(el)
  const total = protons + neutrons
  return {
    id: 'nucleus',
    name: 'Ядро',
    color: '#E2574C',
    info: `${protons} ${plural(protons, 'протон', 'протона', 'протонов')} и ${neutrons} ${plural(neutrons, 'нейтрон', 'нейтрона', 'нейтронов')}: массовое число A = ${total}. Здесь почти вся масса атома, при этом ядро в сто тысяч раз меньше самого атома — в этой модели оно сильно увеличено.`,
    build: (T) => {
      const g = new T.Group()
      const radius = total <= 1 ? 0 : NUCLEON_R * 1.15 * Math.cbrt(total)
      const geo = new T.SphereGeometry(NUCLEON_R, 20, 14)
      const pMat = new T.MeshStandardMaterial({ color: '#E2574C', roughness: 0.45 })
      const nMat = new T.MeshStandardMaterial({ color: '#7D88B5', roughness: 0.45 })
      const pts = packedPoints(T, total, radius)
      // Протоны и нейтроны вперемешку, но детерминированно и с точным счётом:
      // сначала раскраска хешем, потом поправка до нужного числа протонов.
      let p = 0
      pts.forEach((pt, i) => {
        const isProton = (i * 7919) % total < protons
        if (isProton) p++
        const m = new T.Mesh(geo, isProton ? pMat : nMat)
        m.position.copy(pt)
        g.add(m)
      })
      for (let i = 0; i < g.children.length && p !== protons; i++) {
        const m = g.children[i] as THREE.Mesh
        if (p < protons && m.material === nMat) { m.material = pMat; p++ }
        else if (p > protons && m.material === pMat) { m.material = nMat; p-- }
      }
      return g
    },
  }
}

function shell(n: number, count: number, outer: boolean, el: ElementInfo): ModelPartSpec {
  const r = SHELL_R0 + SHELL_STEP * (n - 1)
  const letter = SHELL_LETTERS[n - 1]
  const cap = 2 * n * n
  const role = outer
    ? ` Это внешний уровень: его электроны и определяют химические свойства ${el.name.toLowerCase().replace(/й$/, 'я')}.`
    : ' Уровень заполнен и в реакциях не участвует.'
  return {
    id: `shell-${n}`,
    name: `${n}-й уровень (${letter})`,
    color: outer ? '#786AD7' : '#9A90DD',
    // Ярлыки уровней разводим по азимуту, иначе они встают в одну линию.
    anchor: [Math.cos(2.1 * n) * r, 0, Math.sin(2.1 * n) * r],
    info: `${count} ${plural(count, 'электрон', 'электрона', 'электронов')} из ${cap} возможных (2n², n = ${n}).${role}`,
    build: (T) => {
      const g = new T.Group()
      g.rotation.set(0.35 * n, 0, 0.42 * (n % 2 ? 1 : -1) * n)
      const ring = new T.Mesh(
        new T.TorusGeometry(r, 0.012, 8, 160),
        new T.MeshStandardMaterial({ color: outer ? '#786AD7' : '#A7A1D6', roughness: 0.6, transparent: true, opacity: 0.55 }),
      )
      ring.rotation.x = Math.PI / 2
      g.add(ring)
      const electrons = new T.Group()
      electrons.name = 'electrons'
      const geo = new T.SphereGeometry(0.11, 18, 12)
      const mat = new T.MeshStandardMaterial({ color: outer ? '#8E80F0' : '#B4ABEF', emissive: outer ? '#4B3FB0' : '#5A52A0', emissiveIntensity: 0.6, roughness: 0.35 })
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2
        const e = new T.Mesh(geo, mat)
        e.position.set(Math.cos(a) * r, 0, Math.sin(a) * r)
        electrons.add(e)
      }
      g.add(electrons)
      return g
    },
  }
}

export function atomSpec(key: string | number): ModelSpec | null {
  const el = findElement(key)
  if (!el) return null
  const shells = electronShells(el.z)
  const parts: ModelPartSpec[] = [nucleus(el), ...shells.map((count, i) => shell(i + 1, count, i === shells.length - 1, el))]
  const outerR = SHELL_R0 + SHELL_STEP * (shells.length - 1)
  return {
    id: `atom-${el.z}`,
    title: `${el.name} · ${el.symbol}`,
    subtitle: `Z = ${el.z}, электроны по уровням ${shells.join(', ')}. ${periodAndGroupNote(el)}.`,
    radius: outerR + 0.35,
    parts,
    canExplode: false,
    animate: (t, objects) => {
      shells.forEach((_, i) => {
        const g = objects.get(`shell-${i + 1}`)
        const e = g?.getObjectByName('electrons')
        // Внутренние уровни крутятся быстрее — как и положено ближним орбитам.
        if (e) e.rotation.y = t * (0.9 / Math.sqrt(i + 1)) * (i % 2 ? -1 : 1)
      })
    },
  }
}
