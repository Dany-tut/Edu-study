// ─────────────────────────────────────────────────────────────────────────────
// Циклы по стадиям: жизненный цикл хламидомонады и цикл Кребса.
//
// Тексты — только из ChemBio_KB (правило ХимБио), страницы в поле sources.
// Чего в базе нет, того на модели нет: у хламидомонады не нарисованы глазок,
// пиреноид и сократительные вакуоли (в базе они описаны только у эвглены и
// хлореллы), число жгутиков в текстах не называется. У цикла Кребса число
// атомов углерода промежуточных веществ не указано — шарики углерода
// выводятся из того, что есть: ацетил 2С + оксалоацетат 4С = цитрат 6С,
// каждый CO₂ уносит один атом.
// ─────────────────────────────────────────────────────────────────────────────
import type * as THREE from 'three'
import type { ModelSpec, ModelPartSpec, ThreeNS } from './spec'

type V3 = [number, number, number]
const clamp = (x: number) => Math.max(0, Math.min(1, x))
const smooth = (t: number) => { const c = clamp(t); return c * c * (3 - 2 * c) }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]

function std(T: ThreeNS, color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new T.MeshStandardMaterial({ color, roughness: 0.5, ...extra })
}

/** Прозрачность объекта и всех потомков; базовая прозрачность материала — в userData.base. */
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

const K1 = 'textbooks/txt/1_Kempbell_Biologia_1_tom.txt'
const K2 = 'textbooks/txt/2_Kempbell_Biologia_2_tom.txt'
const TGS1 = 'textbooks/txt/Teylor_Grin_Staut_1_tom_2013.txt'
const TGS2 = 'textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt'
const P9 = 'textbooks/txt/Биология. Введение в общую биологию. 9 класс. Рабочая тетрадь к учебнику Каменского А.А. и др. - Пасечник В.В., Швецов Г.Г..txt'

// ═════════════════════════════════════════════════════════════════════════════
// Жизненный цикл хламидомонады — K2 стр. 191 (рис. 28.23)
// ═════════════════════════════════════════════════════════════════════════════

const PLUS = '#5FBF6A'
const MINUS = '#4FB3A8'

/** Маленькая клетка-зооспора или гамета: яйцевидное тело, чашевидный хлоропласт, жгутики. */
function miniCell(T: ThreeNS, tint: string, flagella = true) {
  const g = new T.Group()
  const bodyMat = std(T, '#DDEFD8', { transparent: true, opacity: 0.55, roughness: 0.3 })
  bodyMat.userData.base = 0.55
  const body = new T.Mesh(new T.SphereGeometry(0.3, 20, 16), bodyMat)
  body.scale.set(1, 1.25, 1)
  const cup = new T.Mesh(new T.SphereGeometry(0.27, 20, 14, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58), std(T, tint, { side: T.DoubleSide }))
  cup.scale.set(1, 1.25, 1)
  g.add(body, cup)
  if (flagella) {
    const fm = std(T, '#E8E2C8')
    for (const s of [-1, 1]) {
      const curve = new T.CatmullRomCurve3([
        new T.Vector3(0, 0.36, 0), new T.Vector3(s * 0.12, 0.55, 0.02), new T.Vector3(s * 0.32, 0.68, 0), new T.Vector3(s * 0.5, 0.62, -0.02),
      ])
      g.add(new T.Mesh(new T.TubeGeometry(curve, 16, 0.018, 6), fm))
    }
  }
  return g
}

export function chlamydomonasSpec(): ModelSpec {
  const N = 7
  const refs = {
    adult: [] as THREE.Object3D[], flag: null as THREE.Object3D | null,
    zoo: [] as THREE.Object3D[], zooFlag: [] as THREE.Object3D[], zooGroup: null as THREE.Object3D | null,
    gam: [] as THREE.Object3D[], gamGroup: null as THREE.Object3D | null,
    zyg: null as THREE.Object3D | null, zygWall: null as THREE.Object3D | null,
    meio: [] as THREE.Object3D[], meioGroup: null as THREE.Object3D | null,
  }
  const ZOO_IN: V3[] = [[-0.45, 0.5, 0], [0.45, 0.5, 0], [-0.45, -0.5, 0], [0.45, -0.5, 0]]
  const ZOO_OUT: V3[] = [[-2.2, 1.5, 0], [2.2, 1.5, 0], [-2.2, -1.5, 0], [2.2, -1.5, 0]]
  // Гаметы: четыре «+» слева, четыре «−» справа; первые в каждом ряду сливаются.
  const GAM: V3[] = [
    [-2.0, 0, 0], [-2.9, 1.2, 0.2], [-3.1, -0.9, -0.2], [-2.4, -2.0, 0.1],
    [2.0, 0, 0], [2.9, 1.1, -0.2], [3.1, -1.0, 0.2], [2.4, 1.9, -0.1],
  ]
  const MEIO_OUT: V3[] = [[-1.7, 1.3, 0], [1.7, 1.3, 0], [-1.7, -1.3, 0], [1.7, -1.3, 0]]

  const wall: ModelPartSpec = {
    id: 'wall', name: 'Клеточная стенка', color: '#B8D9A8', anchor: [-1.0, 1.1, 0.6],
    info: 'Оболочка клетки. Дочерние клетки строят себе новую оболочку внутри материнской и выходят из неё.',
    build: (T) => {
      const mat = std(T, '#B8D9A8', { transparent: true, opacity: 0.32, roughness: 0.3, side: T.DoubleSide })
      mat.userData.base = 0.32
      const m = new T.Mesh(new T.SphereGeometry(1.2, 40, 28), mat)
      m.scale.set(1, 1.25, 1)
      refs.adult.push(m)
      return m
    },
  }
  const chloro: ModelPartSpec = {
    id: 'chloro', name: 'Хлоропласт', color: '#5FBF6A', anchor: [0.9, -0.9, 0.5],
    info: 'Один чашевидный хлоропласт. У зелёных водорослей в нём хлорофиллы a и b, а запасной углевод — крахмал.',
    build: (T) => {
      const m = new T.Mesh(new T.SphereGeometry(1.08, 40, 24, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58), std(T, '#5FBF6A', { side: T.DoubleSide }))
      m.scale.set(1, 1.25, 1)
      refs.adult.push(m)
      return m
    },
  }
  const nucleus: ModelPartSpec = {
    id: 'nucleus', name: 'Ядро', color: '#8E7FE0', anchor: [0, 0.35, 0.3],
    info: 'Взрослая клетка гаплоидна: в ядре один набор хромосом (n). Диплоидна в цикле только зигота.',
    build: (T) => {
      const m = new T.Mesh(new T.SphereGeometry(0.36, 24, 18), std(T, '#8E7FE0'))
      m.position.set(0, 0.35, 0)
      refs.adult.push(m)
      return m
    },
  }
  const flagella: ModelPartSpec = {
    id: 'flagella', name: 'Жгутики', color: '#E8E2C8', anchor: [0.9, 2.3, 0],
    info: 'С помощью жгутиков хламидомонада плавает и движется к свету. Перед делением клетка их разбирает.',
    build: (T) => {
      const g = new T.Group()
      const fm = std(T, '#E8E2C8')
      for (const s of [-1, 1]) {
        const curve = new T.CatmullRomCurve3([
          new T.Vector3(0, 1.45, 0), new T.Vector3(s * 0.35, 1.95, 0.05), new T.Vector3(s * 0.95, 2.35, 0), new T.Vector3(s * 1.6, 2.15, -0.05),
        ])
        g.add(new T.Mesh(new T.TubeGeometry(curve, 32, 0.045, 8), fm))
      }
      refs.flag = g
      refs.adult.push(g)
      return g
    },
  }
  const zoospores: ModelPartSpec = {
    id: 'zoo', name: 'Зооспоры', color: PLUS, hideLabel: false,
    liveAnchor: () => { const z = refs.zoo[1]; return z ? [z.position.x + 0.5, z.position.y + 0.55, 0.2] : [0, 0, 0] },
    info: 'Четыре дочерние клетки после двух митозов (у некоторых видов делений больше). Получив жгутики и оболочку, выходят зооспорами и вырастают во взрослые клетки.',
    build: (T) => {
      const g = new T.Group()
      for (let i = 0; i < 4; i++) {
        const c = miniCell(T, PLUS)
        refs.zoo.push(c)
        refs.zooFlag.push(c.children[2], c.children[3])
        g.add(c)
      }
      refs.zooGroup = g
      return g
    },
  }
  const gametes: ModelPartSpec = {
    id: 'gametes', name: 'Гаметы «+» и «−»', color: MINUS,
    liveAnchor: () => { const z = refs.gam[5]; return z ? [z.position.x, z.position.y + 0.7, 0.2] : [0, 0, 0] },
    info: 'При нехватке питательных веществ, высыхании и другом стрессе клетки дают гаметы двух типов спаривания — «+» и «−».',
    build: (T) => {
      const g = new T.Group()
      GAM.forEach((p, i) => {
        const c = miniCell(T, i < 4 ? PLUS : MINUS)
        c.scale.setScalar(0.85)
        c.position.set(...p)
        c.rotation.z = i < 4 ? -0.5 : 0.5
        refs.gam.push(c)
        g.add(c)
      })
      refs.gamGroup = g
      return g
    },
  }
  const zygote: ModelPartSpec = {
    id: 'zygote', name: 'Зигота (2n)', color: '#C9A85A', anchor: [0.8, 0.8, 0.5],
    info: 'Диплоидная клетка после слияния гамет «+» и «−». Строит плотную оболочку и в покое переживает неблагоприятные условия.',
    build: (T) => {
      const g = new T.Group()
      const core = new T.Mesh(new T.SphereGeometry(0.75, 32, 24), std(T, '#7FB86A'))
      const wm = std(T, '#C9A85A', { transparent: true, opacity: 0.85, roughness: 0.85 })
      wm.userData.base = 0.85
      const w = new T.Mesh(new T.IcosahedronGeometry(0.95, 3), wm)
      refs.zygWall = w
      g.add(core, w)
      refs.zyg = g
      return g
    },
  }
  const meiosis: ModelPartSpec = {
    id: 'meio', name: 'Клетки после мейоза', color: '#9FD08A',
    liveAnchor: () => { const z = refs.meio[1]; return z ? [z.position.x + 0.5, z.position.y + 0.55, 0.2] : [0, 0, 0] },
    info: 'После покоя зигота делится мейозом: четыре гаплоидные клетки, по две каждого типа спаривания.',
    build: (T) => {
      const g = new T.Group()
      for (let i = 0; i < 4; i++) { const c = miniCell(T, i % 2 ? MINUS : PLUS); refs.meio.push(c); g.add(c) }
      refs.meioGroup = g
      return g
    },
  }

  const stages = [
    { name: 'Взрослая клетка (n)', info: 'Одноклеточная подвижная зелёная водоросль. Взрослая клетка гаплоидна, в ней один чашевидный хлоропласт.' },
    { name: 'Бесполое деление', info: 'Клетка разбирает жгутики и дважды делится митозом — внутри получаются четыре дочерние клетки.' },
    { name: 'Выход зооспор', info: 'У дочерних клеток появляются жгутики и оболочка. Они выходят из материнской клетки зооспорами и вырастают во взрослые.' },
    { name: 'Стресс → гаметы', info: 'При нехватке питательных веществ, высыхании и другом стрессе клетки дают гаметы двух типов — «+» и «−».' },
    { name: 'Слияние гамет', info: 'Гаметы «+» и «−» сливаются — это оплодотворение. Образуется диплоидная зигота.' },
    { name: 'Зигота в покое', info: 'Зигота строит плотную оболочку, которая защищает её от неблагоприятных условий.' },
    { name: 'Мейоз → 4 клетки', info: 'После покоя зигота делится мейозом: четыре гаплоидные особи, по две каждого типа спаривания.' },
  ]

  return {
    id: 'process-chlamydomonas', title: 'Жизненный цикл хламидомонады',
    subtitle: 'Гаплоидная клетка делится митозом на зооспоры, а в стресс даёт гаметы; зигота переживает невзгоды и делится мейозом.',
    radius: 3.6, canExplode: false, view: 'front',
    frame: { center: [0, 0.2, 0], radius: 3.4 },
    sources: [`${K2}#стр.190`, `${K2}#стр.191`, `${K1}#стр.150`, `${TGS1}#стр.51`, `${TGS2}#стр.247`, `${P9}#стр.104`],
    parts: [wall, chloro, nucleus, flagella, zoospores, gametes, zygote, meiosis],
    timeline: {
      stages, duration: 24,
      update: (p) => {
        const x = clamp(p) * (N - 1)
        const seg = (a: number) => smooth(x - a) // 0 → 1 на переходе a → a+1
        // Взрослая клетка: видна на 0–1, на 1→2 её содержимое уходит в зооспоры, стенка тает.
        // Содержимое (хлоропласт, ядро) уходит в дочерние клетки на 0→1, стенка тает на 1→2.
        const wallO = x <= 1 ? 1 : 1 - seg(1)
        const innerO = 1 - seg(0)
        refs.adult.forEach((o, i) => setOpacity(o, i === 0 ? wallO : i === 3 ? wallO : innerO))
        if (refs.flag) refs.flag.scale.setScalar(1 - seg(0)) // разбирает жгутики перед делением
        // Зооспоры: появляются внутри на 0→1, выходят на 1→2, тают на 2→3.
        const zIn = seg(0), zOut = seg(1), zFade = seg(2)
        if (refs.zooGroup) setOpacity(refs.zooGroup, x < 3 ? zIn * (1 - zFade) : 0)
        refs.zoo.forEach((c, i) => {
          c.position.set(...lerp3(ZOO_IN[i], ZOO_OUT[i], zOut))
          c.scale.setScalar(lerp(0.95, 1.1, zOut))
        })
        refs.zooFlag.forEach(f => f.scale.setScalar(Math.max(0.001, zOut)))
        // Гаметы: на 2→3 появляются, на 3→4 первая пара сливается в центре, остальные тают.
        const gIn = seg(2), fuse = seg(3)
        if (refs.gamGroup) refs.gamGroup.visible = x > 2.02 && x < 4.4
        refs.gam.forEach((c, i) => {
          const pair = i === 0 || i === 4
          const base = GAM[i]
          if (pair) {
            const to: V3 = [i === 0 ? -0.25 : 0.25, 0, 0]
            c.position.set(...lerp3(base, to, fuse))
            setOpacity(c, gIn * (1 - smooth((x - 3.6) / 0.4)))
          } else {
            c.position.set(base[0], base[1], base[2])
            setOpacity(c, gIn * (1 - fuse))
          }
        })
        // Зигота: проявляется в конце слияния, оболочка нарастает на 4→5, на 5→6 делится.
        const zyO = smooth((x - 3.5) / 0.5) * (1 - seg(5))
        if (refs.zyg) setOpacity(refs.zyg, zyO)
        if (refs.zygWall) {
          const w = x < 4 ? 0 : seg(4)
          refs.zygWall.scale.setScalar(lerp(0.82, 1.08, w))
          setOpacity(refs.zygWall, zyO * w)
        }
        // Клетки после мейоза: из центра наружу на 5→6.
        const m = seg(5)
        if (refs.meioGroup) setOpacity(refs.meioGroup, x > 5 ? m : 0)
        refs.meio.forEach((c, i) => c.position.set(...lerp3([0, 0, 0], MEIO_OUT[i], m)))
      },
    },
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Цикл Кребса — K1 стр. 237–240 (рис. 9.10–9.12), TGS1 стр. 347–348
// ═════════════════════════════════════════════════════════════════════════════

const R_RING = 2.3
const ang = (deg: number): V3 => [Math.cos(deg * Math.PI / 180) * R_RING, Math.sin(deg * Math.PI / 180) * R_RING, 0]

interface Station { id: string; name: string; color: string; deg: number; info: string }
const STATIONS: Station[] = [
  { id: 'oaa', name: 'Оксалоацетат', color: '#E8C35A', deg: 90, info: 'Щавелевоуксусная кислота, четыре атома углерода. Принимает ацетил, а в конце оборота образуется снова — цикл замыкается.' },
  { id: 'cit', name: 'Цитрат', color: '#E88A5A', deg: 45, info: 'Лимонная кислота, шесть атомов углерода: двухуглеродный ацетил присоединился к четырёхуглеродному оксалоацетату.' },
  { id: 'iso', name: 'Изоцитрат', color: '#E07A7A', deg: 0, info: 'Цитрат перестраивается в изоцитрат: одна молекула воды отщепляется, другая присоединяется.' },
  { id: 'akg', name: 'α-Кетоглутарат', color: '#D97AB0', deg: -45, info: 'Изоцитрат окисляется: образуется НАДН и отщепляется CO₂ — получается α-кетоглутарат.' },
  { id: 'sca', name: 'Сукцинил-КоА', color: '#B08AE0', deg: -90, info: 'От α-кетоглутарата отщепляется ещё один CO₂, образуется НАДН, а остаток соединяется с коферментом А.' },
  { id: 'suc', name: 'Сукцинат', color: '#8A9CE8', deg: -135, info: 'Янтарная кислота. Когда КоА заменяется фосфатом, образуется ГТФ (в части клеток сразу АТФ).' },
  { id: 'fum', name: 'Фумарат', color: '#6CB8E0', deg: 180, info: 'Сукцинат отдаёт два атома водорода на ФАД: получается фумарат и ФАДН₂. Фермент этой стадии сидит во внутренней мембране митохондрии.' },
  { id: 'mal', name: 'Малат', color: '#6CC29A', deg: 135, info: 'К фумарату присоединяется вода — получается малат. Он окисляется с образованием НАДН и снова даёт оксалоацетат.' },
]

export function krebsSpec(): ModelSpec {
  const N = 8
  const ENTRY: V3 = [-3.3, 3.1, 0.4]
  // Угол скелета на стадиях 1…7 (по часовой стрелке от оксалоацетата); стадия 7 — снова оксалоацетат.
  const DEG = [90, 45, 0, -45, -90, -135, -180, -270]
  const COUNT = [2, 6, 6, 5, 4, 4, 4, 4]
  const refs = {
    carbons: [] as THREE.Object3D[], oaa: [] as THREE.Object3D[],
    co2: [] as THREE.Object3D[], nadh: [] as THREE.Object3D[], fadh: [] as THREE.Object3D[], atp: [] as THREE.Object3D[],
    skel: [0, 0, 0] as V3,
  }
  // Где на кольце стоит скелет при прогрессе x (0…7).
  const skelPos = (x: number): V3 => {
    if (x <= 1) {
      const t = smooth(x)
      if (t < 0.5) return lerp3(ENTRY, ang(90), t * 2)
      return ang(lerp(90, 45, (t - 0.5) * 2))
    }
    const k = Math.min(6, Math.floor(x)), t = smooth(x - k)
    return ang(lerp(DEG[k], DEG[k + 1], t))
  }
  /** Выбросы: [стадия, где вылетают] — на переходе (стадия−1 → стадия); 0 — уже снаружи у входа. */
  const EMIT = { co2: [0, 3, 4], nadh: [0, 3, 4, 7], fadh: [6], atp: [5] }
  const outOf = (pos: V3, k: number, i: number, lane = 0): V3 => {
    // У входа выбросы стоят столбиком: CO₂ выше, НАДН ниже — не накладываются.
    if (k === 0) return [ENTRY[0] - 0.2, ENTRY[1] - 0.75 - lane * 0.5, 0.3]
    const l = Math.hypot(pos[0], pos[1]) || 1
    const s = 1.5 + lane * 0.22
    return [pos[0] / l * R_RING * s, pos[1] / l * R_RING * s, 0.3]
  }
  const emitted = (x: number, k: number, i: number, list: THREE.Object3D[], lane: number) => {
    const m = list[i]
    if (!m) return
    if (k === 0) { m.visible = true; m.position.set(...outOf(ENTRY, 0, i, lane)); return }
    const t = smooth((x - (k - 0.55)) / 0.55)
    m.visible = x > k - 0.55
    const from = skelPos(Math.max(0, k - 0.55))
    m.position.set(...lerp3(from, outOf(skelPos(k), k, i, lane), t))
  }

  const matrix: ModelPartSpec = {
    id: 'matrix', name: 'Матрикс митохондрии', color: '#7F6EDB', shell: true, anchor: [-3.2, -2.6, 0.5],
    info: 'Цикл идёт в матриксе митохондрий: здесь все его ферменты, кроме фермента стадии с ФАД, встроенного во внутреннюю мембрану.',
    build: (T) => {
      const mat = std(T, '#7F6EDB', { transparent: true, opacity: 0.1, side: T.DoubleSide, roughness: 0.3 })
      const m = new T.Mesh(new T.SphereGeometry(1, 48, 32), mat)
      m.scale.set(4.6, 3.9, 1.6)
      return m
    },
  }
  const stationParts: ModelPartSpec[] = STATIONS.map(s => ({
    id: s.id, name: s.name, color: s.color, info: s.info,
    anchor: (() => { const p = ang(s.deg); const k = 1.32; return [p[0] * k, p[1] * k, 0.2] as V3 })(),
    build: (T) => {
      const g = new T.Group()
      const ring = new T.Mesh(new T.TorusGeometry(0.42, 0.06, 12, 40), std(T, s.color, { emissive: s.color, emissiveIntensity: 0.25 }))
      ring.position.set(...ang(s.deg))
      g.add(ring)
      if (s.id === 'oaa') {
        // Свои четыре углерода оксалоацетата ждут ацетил у входа в цикл.
        const cm = std(T, '#5C5870', { roughness: 0.35, emissive: '#2A2838', emissiveIntensity: 0.4 })
        for (let i = 0; i < 4; i++) {
          const c = new T.Mesh(new T.SphereGeometry(0.12, 16, 12), cm)
          const p = ang(90)
          c.position.set(p[0] + (i - 1.5) * 0.2, p[1] + (i % 2 ? 0.08 : -0.08), 0.15)
          refs.oaa.push(c)
          g.add(c)
        }
      }
      return g
    },
  }))
  const arrows: ModelPartSpec = {
    id: 'ring', name: 'Ход цикла', color: '#A9A3C9', hideLabel: true,
    info: 'Оборот по часовой стрелке: оксалоацетат → цитрат → изоцитрат → α-кетоглутарат → сукцинил-КоА → сукцинат → фумарат → малат → оксалоацетат.',
    build: (T) => {
      const g = new T.Group()
      const mat = std(T, '#A9A3C9', { transparent: true, opacity: 0.55 })
      mat.userData.base = 0.55
      g.add(new T.Mesh(new T.TorusGeometry(R_RING, 0.025, 8, 160), mat))
      // Наконечники посередине между станциями, по часовой стрелке.
      for (let i = 0; i < 8; i++) {
        const d = 90 - 45 * i - 22.5
        const cone = new T.Mesh(new T.ConeGeometry(0.09, 0.24, 14), mat)
        cone.position.set(...ang(d))
        cone.rotation.z = (d - 180) * Math.PI / 180
        g.add(cone)
      }
      return g
    },
  }
  const acetyl: ModelPartSpec = {
    id: 'acetyl', name: 'Ацетил-КоА', color: '#F0D58A',
    liveAnchor: () => [refs.skel[0] + 0.6, refs.skel[1] + 0.45, 0.3],
    info: 'Пируват (3С) в митохондрии теряет CO₂ и отдаёт водород на НАД⁺; остаток (2С) связывается с коферментом А и входит в цикл. Шарики — атомы углерода.',
    build: (T) => {
      const g = new T.Group()
      const cm = std(T, '#5C5870', { roughness: 0.35, emissive: '#2A2838', emissiveIntensity: 0.4 })
      for (let i = 0; i < 6; i++) { const c = new T.Mesh(new T.SphereGeometry(0.13, 16, 12), cm); refs.carbons.push(c); g.add(c) }
      const coa = new T.Mesh(new T.SphereGeometry(0.16, 16, 12), std(T, '#F0D58A'))
      coa.name = 'coa'
      g.add(coa)
      return g
    },
  }
  const token = (id: string, name: string, color: string, info: string, n: number, list: THREE.Object3D[], kind: 'co2' | 'pill'): ModelPartSpec => ({
    id, name, color, info,
    liveAnchor: () => { const v = [...list].reverse().find(o => o.visible); return v ? [v.position.x + 0.45, v.position.y + 0.3, 0.4] : [0, 0, 0] },
    build: (T) => {
      const g = new T.Group()
      for (let i = 0; i < n; i++) {
        const t = new T.Group()
        if (kind === 'co2') {
          t.add(new T.Mesh(new T.SphereGeometry(0.12, 14, 10), std(T, '#5C5870')))
          for (const s of [-1, 1]) { const o = new T.Mesh(new T.SphereGeometry(0.1, 14, 10), std(T, '#E05A4F')); o.position.x = s * 0.2; t.add(o) }
        } else {
          t.add(new T.Mesh(new T.CapsuleGeometry(0.1, 0.22, 6, 12), std(T, color, { emissive: color, emissiveIntensity: 0.3 })))
          t.rotation.z = Math.PI / 2
        }
        t.visible = false
        list.push(t)
        g.add(t)
      }
      return g
    },
  })
  const co2 = token('co2', 'CO₂', '#E05A4F', 'Внутри цикла выделяются два CO₂ за оборот, ещё один — при окислении пирувата: всего три на молекулу пирувата.', 3, refs.co2, 'co2')
  const nadh = token('nadh', 'НАДН', '#8E7FE0', 'Три НАДН за оборот и ещё один при образовании ацетил-КоА. Они отдают электроны в дыхательную цепь на кристах.', 4, refs.nadh, 'pill')
  const fadh = token('fadh', 'ФАДН₂', '#4FB3E0', 'Один ФАДН₂ за оборот; тоже отдаёт электроны в дыхательную цепь.', 1, refs.fadh, 'pill')
  const atp = token('atp', 'АТФ (ГТФ)', '#F0A84F', 'Единственная АТФ цикла: образуется через ГТФ субстратным фосфорилированием.', 1, refs.atp, 'pill')

  const stages = [
    { name: 'Пируват → ацетил-КоА', info: 'Пируват входит в митохондрию, отщепляет CO₂ и отдаёт водород на НАД⁺ (образуется НАДН). Остаток связывается с коферментом А.' },
    { name: 'Образование цитрата', info: 'Двухуглеродный ацетил присоединяется к четырёхуглеродному оксалоацетату — получается шестиуглеродный цитрат (лимонная кислота).' },
    { name: 'Цитрат → изоцитрат', info: 'Цитрат перестраивается: одна молекула воды отщепляется, другая присоединяется.' },
    { name: 'Первый CO₂', info: 'Изоцитрат окисляется: образуется НАДН, отщепляется CO₂ — получается α-кетоглутарат.' },
    { name: 'Второй CO₂', info: 'От α-кетоглутарата отщепляется ещё один CO₂, образуется НАДН; остаток соединяется с КоА в сукцинил-КоА.' },
    { name: 'Сукцинат + ГТФ', info: 'КоА заменяется фосфатом, фосфат переходит на ГДФ — образуется ГТФ (в части клеток сразу АТФ). Получается сукцинат.' },
    { name: 'Фумарат + ФАДН₂', info: 'Два атома водорода переходят на ФАД — образуется ФАДН₂, сукцинат окисляется до фумарата.' },
    { name: 'Малат → оксалоацетат', info: 'К фумарату присоединяется вода — малат; он окисляется с образованием НАДН, и оксалоацетат возвращается. За оборот: 2 CO₂, 3 НАДН, ФАДН₂, АТФ.' },
  ]

  return {
    id: 'process-krebs', title: 'Цикл Кребса',
    subtitle: 'Ацетил-КоА соединяется с оксалоацетатом, цитрат теряет 2 CO₂ и даёт 3 НАДН, ФАДН₂ и АТФ. Чёрные шарики — углерод.',
    radius: 4.2, canExplode: false, view: 'front',
    frame: { center: [-0.2, 0.4, 0], radius: 5.0 },
    sources: [`${K1}#стр.237`, `${K1}#стр.238`, `${K1}#стр.239`, `${K1}#стр.240`, `${TGS1}#стр.347`, `${TGS1}#стр.348`],
    parts: [matrix, arrows, ...stationParts, acetyl, co2, nadh, fadh, atp],
    timeline: {
      stages, duration: 28,
      update: (p) => {
        const x = clamp(p) * (N - 1)
        const pos = skelPos(x)
        refs.skel = pos
        // Число углеродов: целое на стадиях, меняется в середине перехода.
        const k = Math.min(N - 1, Math.floor(x + 0.45))
        const merged = x > 0.5
        const n = merged ? COUNT[Math.max(1, k)] : 2
        refs.carbons.forEach((c, i) => {
          c.visible = i < n
          c.position.set(pos[0] + (i - (n - 1) / 2) * 0.22, pos[1] + (i % 2 ? 0.09 : -0.09), 0.2)
        })
        // КоА виден у ацетила до слияния и у сукцинил-КоА.
        const coa = refs.carbons[0]?.parent?.getObjectByName('coa')
        if (coa) {
          coa.visible = !merged || (x > 3.5 && x < 4.5)
          coa.position.set(pos[0] + (n / 2) * 0.22 + 0.12, pos[1], 0.2)
        }
        refs.oaa.forEach(c => { c.visible = !merged })
        EMIT.co2.forEach((s, i) => emitted(x, s, i, refs.co2, 0))
        EMIT.nadh.forEach((s, i) => emitted(x, s, i, refs.nadh, 1))
        EMIT.fadh.forEach((s, i) => emitted(x, s, i, refs.fadh, 0))
        EMIT.atp.forEach((s, i) => emitted(x, s, i, refs.atp, 0))
      },
    },
  }
}
