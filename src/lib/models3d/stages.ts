// ─────────────────────────────────────────────────────────────────────────────
// Модели со стадиями: сцена, которую ведут по времени. Прогресс 0…1 — это
// путь от первой стадии к последней, промежуточные положения интерполируются,
// поэтому «плёнка» едет плавно, а не прыгает по кадрам. Первый образец —
// митоз: тот самый вопрос ЕГЭ «что происходит с хромосомами в анафазе».
// Тем же механизмом делаются развитие зародыша, прорастание семени, фазы
// мейоза: нужны только ключевые положения частей на каждой стадии.
// ─────────────────────────────────────────────────────────────────────────────
import type * as THREE from 'three'
import type { ModelSpec, ModelPartSpec, ThreeNS } from './spec'

type V3 = [number, number, number]
interface Key { pos: V3; rot: V3; scale: V3; opacity: number }

const smooth = (t: number) => t * t * (3 - 2 * t)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]

/** Положение между соседними стадиями: progress → (индекс, доля). */
function at(progress: number, n: number): [number, number] {
  const x = Math.max(0, Math.min(1, progress)) * (n - 1)
  const i = Math.min(n - 2, Math.floor(x))
  return [i, smooth(x - i)]
}

function applyKey(obj: THREE.Object3D, keys: Key[], progress: number, mat?: THREE.MeshStandardMaterial) {
  const [i, t] = at(progress, keys.length)
  const a = keys[i], b = keys[i + 1]
  obj.position.set(...lerp3(a.pos, b.pos, t))
  obj.rotation.set(...lerp3(a.rot, b.rot, t))
  obj.scale.set(...lerp3(a.scale, b.scale, t))
  if (mat) {
    mat.opacity = lerp(a.opacity, b.opacity, t)
    // Прозрачность ведёт плёнка: помечаем, чтобы сцена её не сбрасывала (см. viewer).
    if (!mat.transparent) { mat.transparent = true; mat.needsUpdate = true }
    mat.userData.anim = true
    mat.visible = mat.opacity > 0.02
  }
}

const K = (pos: V3, rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1], opacity = 1): Key => ({ pos, rot, scale, opacity })

export function mitosisSpec(): ModelSpec {
  const POLE = 2.3
  // Четыре хромосомы: исходные (рыхлые) положения в ядре и места на экваторе.
  const loose: Array<{ pos: V3; rot: V3 }> = [
    { pos: [0.4, 0.5, 0.2], rot: [0.4, 0.2, 0.9] }, { pos: [-0.5, -0.3, 0.5], rot: [1.1, 0.5, 0.3] },
    { pos: [0.2, -0.6, -0.5], rot: [0.2, 1.2, 1.4] }, { pos: [-0.4, 0.4, -0.4], rot: [0.9, 0.1, 0.6] },
  ]
  const plate: V3[] = [[0, 0.95, 0.1], [0, -0.95, -0.1], [0, 0.1, 0.95], [0, -0.1, -0.95]]

  const refs = {
    chromatids: [] as Array<{ mesh: THREE.Object3D; mat: THREE.MeshStandardMaterial; keys: Key[] }>,
    fibers: [] as Array<{ mesh: THREE.Mesh; chrom: number; sister: number; pole: 1 | -1 }>,
    fiberMat: null as THREE.MeshStandardMaterial | null,
    envelopes: [] as Array<{ mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; keys: Key[] }>,
    cells: [] as Array<{ mesh: THREE.Mesh; keys: Key[] }>,
    centrioles: [] as Array<{ obj: THREE.Object3D; keys: Key[] }>,
  }

  const membrane: ModelPartSpec = {
    id: 'membrane', name: 'Клеточная мембрана', color: '#8FA8E6', shell: true, anchor: [1.2, 2.1, 1.2],
    info: 'В телофазе по экватору затягивается перетяжка, и цитоплазма делится надвое — цитокинез. У растений вместо перетяжки в центре строится клеточная пластинка.',
    build: (T) => {
      const g = new T.Group()
      const mat = new T.MeshStandardMaterial({ color: '#8FA8E6', transparent: true, opacity: 0.18, side: T.DoubleSide, roughness: 0.25 })
      for (const side of [-1, 1] as const) {
        const m = new T.Mesh(new T.SphereGeometry(1, 40, 28), mat)
        const home = K([0, 0, 0], [0, 0, 0], [2.6, 2.4, 2.4])
        refs.cells.push({ mesh: m, keys: [home, home, home, K([side * 0.5, 0, 0], [0, 0, 0], [2.5, 2.3, 2.3]), K([side * 1.5, 0, 0], [0, 0, 0], [1.9, 1.8, 1.8])] })
        g.add(m)
      }
      return g
    },
  }

  const envelope: ModelPartSpec = {
    id: 'envelope', name: 'Ядерная оболочка', color: '#9A8CE6', anchor: [0.3, 1.25, 0.4],
    info: 'В конце профазы распадается на пузырьки, чтобы веретено добралось до хромосом; в телофазе собирается заново вокруг каждой из двух групп хромосом.',
    build: (T) => {
      const g = new T.Group()
      for (const side of [-1, 1] as const) {
        const mat = new T.MeshStandardMaterial({ color: '#9A8CE6', transparent: true, opacity: 0.45, roughness: 0.35 })
        const m = new T.Mesh(new T.SphereGeometry(1, 32, 24), mat)
        const home = K([0, 0, 0], [0, 0, 0], [1.35, 1.3, 1.3], 0.45)
        refs.envelopes.push({ mesh: m, mat, keys: [home, K([0, 0, 0], [0, 0, 0], [1.4, 1.35, 1.35], 0.12), K([0, 0, 0], [0, 0, 0], [1.4, 1.35, 1.35], 0), K([side * 1.2, 0, 0], [0, 0, 0], [0.5, 0.5, 0.5], 0), K([side * 1.5, 0, 0], [0, 0, 0], [0.95, 0.9, 0.9], 0.45)] })
        g.add(m)
      }
      return g
    },
  }

  const chromosomes: ModelPartSpec = {
    id: 'chrom', name: 'Хромосомы', color: '#5B4BB8', anchor: [0, 1.3, 0.3],
    info: 'Каждая хромосома после репликации — две сестринские хроматиды, скреплённые центромерой. В метафазе выстраиваются по экватору, в анафазе хроматиды расходятся к полюсам и становятся самостоятельными хромосомами.',
    build: (T) => {
      const g = new T.Group()
      const geo = new T.CapsuleGeometry(0.085, 0.75, 6, 12)
      loose.forEach((l, i) => {
        for (const sister of [-1, 1] as const) {
          const mat = new T.MeshStandardMaterial({ color: '#5B4BB8', roughness: 0.5, transparent: true })
          const m = new T.Mesh(geo, mat)
          // Хроматиды в X: сдвиг и наклон в разные стороны от центромеры.
          const off: V3 = [sister * 0.07, 0, 0]
          const tilt: V3 = [0, 0, sister * 0.32]
          const add = (p: V3, q: V3): V3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]]
          const inter = K(add(l.pos, off), add(l.rot, tilt), [0.45, 1.25, 0.45], 0.55)
          const pro = K(add(l.pos, off), add(l.rot, tilt))
          const meta = K(add(plate[i], off), tilt)
          const ana = K(add(plate[i], [sister * 1.35, 0, 0]), [0, 0, 0])
          const telo = K(add(plate[i], [sister * 1.5, 0, 0]), [sister * 0.5, 0.4 * i, 0.3], [0.45, 1.25, 0.45], 0.55)
          // Ближе к полюсу хромосомы сходятся: экваториальный разброс сжимаем.
          telo.pos = [telo.pos[0], telo.pos[1] * 0.45, telo.pos[2] * 0.45]
          refs.chromatids.push({ mesh: m, mat, keys: [inter, pro, meta, ana, telo] })
          g.add(m)
        }
      })
      return g
    },
  }

  const spindle: ModelPartSpec = {
    id: 'spindle', name: 'Веретено деления', color: '#6EC26E', anchor: [-1.4, 0.9, 0],
    info: 'Микротрубочки от центриолей на полюсах прикрепляются к центромерам. Укорачиваясь, они тянут хроматиды к полюсам. Колхицин разрушает веретено — хромосомы остаются на экваторе.',
    build: (T) => {
      const g = new T.Group()
      const mat = new T.MeshStandardMaterial({ color: '#6EC26E', transparent: true, opacity: 0, roughness: 0.6 })
      refs.fiberMat = mat
      const geo = new T.CylinderGeometry(0.018, 0.018, 1, 6)
      loose.forEach((_, i) => {
        for (const sister of [-1, 1] as const) {
          const m = new T.Mesh(geo, mat)
          refs.fibers.push({ mesh: m, chrom: i, sister, pole: sister })
          g.add(m)
        }
      })
      // Центриоли на полюсах — две пары цилиндров.
      const cMat = new T.MeshStandardMaterial({ color: '#4FA54F', roughness: 0.5 })
      for (const side of [-1, 1] as const) {
        const pair = new T.Group()
        const a = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.3, 10), cMat)
        const b = a.clone(); b.rotation.z = Math.PI / 2; b.position.set(0.15, -0.2, 0)
        pair.add(a, b)
        refs.centrioles.push({ obj: pair, keys: [K([0.35 * side, 0.9, 0.2]), K([side * 1.4, 0.3, 0.1]), K([side * POLE, 0, 0]), K([side * POLE, 0, 0]), K([side * POLE, 0, 0])] })
        g.add(pair)
      }
      return g
    },
  }

  const stages = [
    { name: 'Интерфаза', info: 'Хроматин рыхлый, ДНК уже удвоена (S-период). Ядро целое, центриоли удвоены.' },
    { name: 'Профаза', info: 'Хромосомы спирализуются и становятся видны в виде X. Ядерная оболочка распадается, центриоли расходятся к полюсам, начинает собираться веретено.' },
    { name: 'Метафаза', info: 'Хромосомы выстраиваются по экватору — метафазная пластинка. Самый удобный момент, чтобы сосчитать и рассмотреть хромосомы.' },
    { name: 'Анафаза', info: 'Центромеры делятся, сестринские хроматиды расходятся к полюсам. У каждого полюса — полный диплоидный набор однохроматидных хромосом.' },
    { name: 'Телофаза', info: 'Хромосомы деспирализуются, вокруг каждой группы собирается ядерная оболочка, цитоплазма делится. Две одинаковые клетки.' },
  ]

  const up = { v: null as THREE.Vector3 | null }
  return {
    id: 'stages-mitosis',
    title: 'Митоз',
    subtitle: 'Пять стадий одного деления. Проиграйте плёнку или нажмите на стадию.',
    radius: 3.2,
    // Кадр — по клетке целиком: в телофазе дочерние клетки расходятся до ±3.4.
    frame: { center: [0, 0, 0], radius: 3.6 },
    parts: [membrane, envelope, chromosomes, spindle],
    canExplode: false,
    timeline: {
      stages,
      duration: 14,
      update: (p, objects) => {
        for (const c of refs.chromatids) applyKey(c.mesh, c.keys, p, c.mat)
        for (const e of refs.envelopes) applyKey(e.mesh, e.keys, p, e.mat)
        for (const c of refs.cells) applyKey(c.mesh, c.keys, p)
        for (const c of refs.centrioles) applyKey(c.obj, c.keys, p)
        // Нити веретена: от полюса к центромере своей хроматиды.
        if (refs.fiberMat) {
          const op = [0, 0.35, 0.75, 0.75, 0]
          const [i, t] = at(p, op.length)
          refs.fiberMat.opacity = lerp(op[i], op[i + 1], t)
          refs.fiberMat.visible = refs.fiberMat.opacity > 0.02
        }
        const spindleRoot = objects.get('spindle')
        if (!spindleRoot) return
        for (const f of refs.fibers) {
          const chromatid = refs.chromatids[f.chrom * 2 + (f.sister === -1 ? 0 : 1)].mesh
          const pole = refs.centrioles[f.pole === -1 ? 0 : 1].obj.position
          const target = chromatid.position
          const mid = pole.clone().add(target).multiplyScalar(0.5)
          const len = pole.distanceTo(target)
          f.mesh.position.copy(mid)
          f.mesh.scale.set(1, Math.max(0.01, len), 1)
          up.v ??= new (f.mesh.position.constructor as new (x: number, y: number, z: number) => THREE.Vector3)(0, 1, 0)
          f.mesh.quaternion.setFromUnitVectors(up.v, target.clone().sub(pole).normalize())
        }
      },
    },
  }
}
