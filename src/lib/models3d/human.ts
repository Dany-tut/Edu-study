// ─────────────────────────────────────────────────────────────────────────────
// Органы человека из примитивов: глаз, нейрон, сердце. Стилизация, а не
// анатомический скан: пропорции школьные, части названы по кодификатору.
// Глаз смотрит вдоль +Z (роговица спереди), сердце — как на схеме:
// левая половина справа от зрителя.
// ─────────────────────────────────────────────────────────────────────────────
import type * as THREE from 'three'
import type { ModelSpec, ModelPartSpec, ThreeNS } from './spec'

type V3 = [number, number, number]
const std = (T: ThreeNS, color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new T.MeshStandardMaterial({ color, roughness: 0.5, ...extra })

function ell(T: ThreeNS, s: V3, mat: THREE.Material, at: V3 = [0, 0, 0], rot: V3 = [0, 0, 0]) {
  const m = new T.Mesh(new T.SphereGeometry(1, 40, 28), mat)
  m.scale.set(...s); m.position.set(...at); m.rotation.set(...rot)
  return m
}
function tube(T: ThreeNS, pts: V3[], r: number, mat: THREE.Material, segs = 40) {
  const curve = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p)))
  return new T.Mesh(new T.TubeGeometry(curve, segs, r, 10, false), mat)
}

// ── Глаз ─────────────────────────────────────────────────────────────────────
export function eyeSpec(): ModelSpec {
  const R = 2
  const parts: ModelPartSpec[] = [
    {
      id: 'sclera', name: 'Склера', color: '#E9E6EE', shell: true, anchor: [R * 0.5, R * 0.75, -R * 0.3],
      info: 'Плотная белочная оболочка — наружный каркас глаза. Спереди переходит в прозрачную роговицу. К склере крепятся глазодвигательные мышцы.',
      build: (T) => ell(T, [R, R, R], std(T, '#ECEAF0', { transparent: true, opacity: 0.28, side: T.DoubleSide, roughness: 0.3 })),
    },
    {
      id: 'cornea', name: 'Роговица', color: '#9FD3F0', anchor: [0, 0.6, R + 0.25],
      info: 'Прозрачная выпуклая часть наружной оболочки. Преломляет свет сильнее хрусталика (около 40 дптр), но не меняет кривизну. Лишена сосудов, питается слёзной жидкостью.',
      build: (T) => {
        const m = new T.Mesh(new T.SphereGeometry(1.15, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.42), std(T, '#9FD3F0', { transparent: true, opacity: 0.35, roughness: 0.15, side: T.DoubleSide }))
        m.rotation.x = Math.PI / 2
        m.position.z = R - 0.65
        return m
      },
    },
    {
      id: 'iris', name: 'Радужка и зрачок', color: '#6B8BC7', anchor: [0.9, 0.3, R * 0.75],
      info: 'Радужка — передняя часть сосудистой оболочки с пигментом (цвет глаз) и двумя мышцами. Они меняют диаметр зрачка — отверстия в центре: на свету сужают, в темноте расширяют.',
      build: (T) => {
        const g = new T.Group()
        const iris = new T.Mesh(new T.RingGeometry(0.38, 1.0, 48), std(T, '#6B8BC7', { side: T.DoubleSide }))
        const pupil = new T.Mesh(new T.CircleGeometry(0.38, 40), std(T, '#15131F'))
        iris.position.z = pupil.position.z = R * 0.72
        g.add(iris, pupil)
        return g
      },
    },
    {
      id: 'lens', name: 'Хрусталик', color: '#F2DFA0', anchor: [0, -0.7, R * 0.5],
      info: 'Двояковыпуклая эластичная линза за зрачком. Ресничная мышца меняет её кривизну — это аккомодация, наводка на близкие и далёкие предметы. С возрастом хрусталик твердеет: дальнозоркость.',
      build: (T) => ell(T, [0.85, 0.85, 0.38], std(T, '#F2DFA0', { transparent: true, opacity: 0.75, roughness: 0.2 }), [0, 0, R * 0.52]),
    },
    {
      id: 'ciliary', name: 'Ресничное тело', color: '#D98A7A', anchor: [-1.35, 0.9, R * 0.45],
      info: 'Кольцо мышцы вокруг хрусталика, держит его на тонких связках. Сокращение мышцы ослабляет связки, и хрусталик становится выпуклее — видим вблизи.',
      build: (T) => {
        const m = new T.Mesh(new T.TorusGeometry(1.45, 0.14, 12, 48), std(T, '#D98A7A'))
        m.position.z = R * 0.5
        return m
      },
    },
    {
      id: 'vitreous', name: 'Стекловидное тело', color: '#BFE3F5', anchor: [0.3, 0, 0.2], hideLabel: true,
      info: 'Прозрачный гель, заполняющий глазное яблоко за хрусталиком. Держит форму глаза и проводит свет к сетчатке.',
      build: (T) => ell(T, [1.7, 1.7, 1.7], std(T, '#BFE3F5', { transparent: true, opacity: 0.12, roughness: 0.1 }), [0, 0, -0.1]),
    },
    {
      id: 'retina', name: 'Сетчатка', color: '#E59A6B', anchor: [-R * 0.55, -R * 0.4, -R * 0.65],
      info: 'Внутренняя оболочка с фоторецепторами: палочки (сумеречное зрение, около 120 млн) и колбочки (цвет, около 6 млн). Напротив зрачка — жёлтое пятно, место лучшего видения; место выхода нерва — слепое пятно.',
      build: (T) => {
        const m = new T.Mesh(new T.SphereGeometry(R * 0.93, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.62), std(T, '#E59A6B', { side: T.DoubleSide, roughness: 0.6 }))
        m.rotation.x = -Math.PI / 2
        return m
      },
    },
    {
      id: 'nerve', name: 'Зрительный нерв', color: '#F2C864', anchor: [-0.9, -0.3, -R - 1.1],
      info: 'Около миллиона аксонов ганглиозных клеток сетчатки. Несёт сигнал в зрительную зону коры затылочной доли. Место его выхода на сетчатке не видит — слепое пятно.',
      build: (T) => tube(T, [[-0.3, -0.2, -R * 0.85], [-0.55, -0.3, -R - 0.6], [-1.0, -0.4, -R - 1.6]], 0.28, std(T, '#F2C864'), 24),
    },
  ]
  return { id: 'organ-eye', title: 'Глаз человека', subtitle: 'Оболочки и оптическая система. Разберите, чтобы увидеть хрусталик и сетчатку по отдельности.', radius: 3.4, parts, canExplode: true }
}

// ── Нейрон ───────────────────────────────────────────────────────────────────
export function neuronSpec(): ModelSpec {
  const axon: V3[] = [[0.5, 0, 0], [2.0, 0.1, 0.1], [3.5, -0.1, -0.1], [5.0, 0.1, 0.05], [6.3, 0, 0]]
  const parts: ModelPartSpec[] = [
    {
      id: 'soma', name: 'Тело нейрона', color: '#9A8CE6', anchor: [0, 0.85, 0.3],
      info: 'Сома с ядром и органеллами. Здесь синтезируются белки и медиаторы, суммируются сигналы от дендритов. Аксонный холмик — место, где рождается импульс.',
      build: (T) => {
        const g = new T.Group()
        g.add(ell(T, [0.8, 0.72, 0.72], std(T, '#9A8CE6', { transparent: true, opacity: 0.85 })))
        g.add(ell(T, [0.34, 0.34, 0.34], std(T, '#5B4BB8'), [-0.05, 0.05, 0]))
        return g
      },
    },
    {
      id: 'dendrites', name: 'Дендриты', color: '#B4ABEF', anchor: [-2.0, 1.1, 0.4],
      info: 'Короткие ветвящиеся отростки. Принимают сигнал от других нейронов через синапсы и проводят его К телу. У одного нейрона их много.',
      build: (T) => {
        const g = new T.Group()
        const mat = std(T, '#B4ABEF')
        const branches: V3[][] = [
          [[-0.5, 0.4, 0], [-1.3, 0.9, 0.3], [-2.2, 1.3, 0.5]], [[-1.3, 0.9, 0.3], [-1.9, 0.5, 0.9]],
          [[-0.6, -0.3, 0.2], [-1.4, -0.7, 0.6], [-2.1, -1.2, 0.8]], [[-1.4, -0.7, 0.6], [-2.0, -0.3, 1.2]],
          [[-0.3, 0.6, -0.4], [-0.8, 1.3, -0.9], [-1.1, 2.0, -1.2]], [[-0.5, -0.4, -0.5], [-1.0, -1.1, -1.1], [-1.2, -1.9, -1.3]],
          [[0.2, 0.7, 0.3], [0.5, 1.5, 0.7], [0.4, 2.2, 1.0]],
        ]
        branches.forEach((b, i) => g.add(tube(T, b, i % 2 ? 0.05 : 0.08, mat, 16)))
        return g
      },
    },
    {
      id: 'axon', name: 'Аксон', color: '#6FAEE0', anchor: [2.7, 0.35, 0],
      info: 'Один длинный отросток, иногда больше метра. Проводит импульс ОТ тела к другим клеткам. Внутри — аксональный транспорт по микротрубочкам.',
      build: (T) => tube(T, axon, 0.11, std(T, '#6FAEE0'), 60),
    },
    {
      id: 'myelin', name: 'Миелиновая оболочка', color: '#F2DFA0', anchor: [3.5, 0.5, 0.3],
      info: 'Шванновские клетки обёртывают аксон слоями мембраны, как изолентой. Между ними перехваты Ранвье. Импульс прыгает от перехвата к перехвату — в десятки раз быстрее, чем по голому волокну.',
      build: (T) => {
        const g = new T.Group()
        const mat = std(T, '#F2DFA0', { roughness: 0.6 })
        const curve = new T.CatmullRomCurve3(axon.map(p => new T.Vector3(...p)))
        for (let i = 0; i < 5; i++) {
          const t0 = 0.12 + i * 0.17, t1 = t0 + 0.13
          const pts = [0, 0.25, 0.5, 0.75, 1].map(k => curve.getPoint(t0 + (t1 - t0) * k))
          g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 12, 0.24, 12, false), mat))
        }
        return g
      },
    },
    {
      id: 'terminals', name: 'Синаптические окончания', color: '#F09A5B', anchor: [7.2, 0.9, 0.3],
      info: 'Аксон ветвится и заканчивается утолщениями с пузырьками медиатора. Импульс выбрасывает медиатор в синаптическую щель, и следующая клетка возбуждается или тормозится.',
      build: (T) => {
        const g = new T.Group()
        const mat = std(T, '#F09A5B')
        const ends: V3[][] = [[[6.3, 0, 0], [6.9, 0.5, 0.2], [7.4, 0.9, 0.3]], [[6.3, 0, 0], [6.9, -0.4, 0.3], [7.4, -0.8, 0.5]], [[6.3, 0, 0], [6.9, 0.1, -0.4], [7.4, 0.2, -0.8]]]
        for (const e of ends) {
          g.add(tube(T, e, 0.06, mat, 12))
          g.add(ell(T, [0.17, 0.17, 0.17], mat, e[2]))
        }
        return g
      },
    },
  ]
  return { id: 'organ-neuron', title: 'Нейрон', subtitle: 'Сигнал идёт слева направо: дендриты → тело → аксон → синапсы.', radius: 4.6, parts, canExplode: true }
}

// ── Сердце ───────────────────────────────────────────────────────────────────
export function heartSpec(): ModelSpec {
  const RED = '#E2574C', BLUE = '#5B7FD6', WALL = { transparent: true, opacity: 0.8, roughness: 0.45 } as const
  const parts: ModelPartSpec[] = [
    {
      id: 'ra', name: 'Правое предсердие', color: BLUE, anchor: [-1.4, 1.35, 0.3],
      info: 'Принимает венозную (бедную кислородом) кровь от всего тела по верхней и нижней полым венам. Здесь синусовый узел — водитель ритма.',
      build: (T) => ell(T, [0.85, 0.75, 0.75], std(T, '#7A95E0', WALL), [-1.1, 1.0, 0]),
    },
    {
      id: 'la', name: 'Левое предсердие', color: RED, anchor: [1.4, 1.35, 0.3],
      info: 'Принимает артериальную кровь из лёгких по четырём лёгочным венам и через двустворчатый (митральный) клапан отдаёт её левому желудочку.',
      build: (T) => ell(T, [0.85, 0.75, 0.75], std(T, '#E8827A', WALL), [1.1, 1.0, 0]),
    },
    {
      id: 'rv', name: 'Правый желудочек', color: BLUE, anchor: [-1.2, -0.9, 0.6],
      info: 'Толкает венозную кровь в лёгочный ствол — малый круг. Стенка тоньше левого: давление в лёгких невысокое.',
      build: (T) => ell(T, [1.0, 1.35, 0.95], std(T, '#6F8CE0', WALL), [-0.75, -0.55, 0], [0, 0, 0.25]),
    },
    {
      id: 'lv', name: 'Левый желудочек', color: RED, anchor: [1.3, -1.2, 0.6],
      info: 'Самая мощная камера: выталкивает кровь в аорту и по всему большому кругу. Стенка втрое толще правого желудочка. Давление здесь — те самые 120 мм рт. ст.',
      build: (T) => ell(T, [1.15, 1.6, 1.05], std(T, '#D9524A', WALL), [0.7, -0.75, 0], [0, 0, -0.2]),
    },
    {
      id: 'valves', name: 'Клапаны', color: '#F2DFA0', anchor: [0, 0.2, 1.0],
      info: 'Трёхстворчатый справа и двустворчатый слева между предсердиями и желудочками; полулунные на выходе в аорту и лёгочный ствол. Пропускают кровь только в одну сторону — отсюда тоны сердца.',
      build: (T) => {
        const g = new T.Group()
        const mat = std(T, '#F2DFA0')
        for (const x of [-1.0, 1.0]) { const r = new T.Mesh(new T.TorusGeometry(0.45, 0.07, 10, 36), mat); r.position.set(x, 0.25, 0); r.rotation.x = Math.PI / 2; g.add(r) }
        for (const x of [-0.35, 0.3]) { const r = new T.Mesh(new T.TorusGeometry(0.3, 0.06, 10, 36), mat); r.position.set(x, 0.75, 0.25); r.rotation.x = Math.PI / 2; g.add(r) }
        return g
      },
    },
    {
      id: 'aorta', name: 'Аорта', color: RED, anchor: [0.4, 3.1, 0],
      info: 'Самая крупная артерия. Из левого желудочка дугой вверх, затем вниз вдоль позвоночника. Начало большого круга кровообращения.',
      build: (T) => tube(T, [[0.3, 0.6, 0.3], [0.4, 1.8, 0.2], [0.2, 2.8, 0], [-0.7, 3.0, -0.3], [-1.3, 2.3, -0.5], [-1.4, 0.5, -0.6]], 0.3, std(T, '#D9524A'), 40),
    },
    {
      id: 'pulm', name: 'Лёгочный ствол', color: BLUE, anchor: [-1.0, 2.5, 0.7],
      info: 'Выходит из правого желудочка и делится на две лёгочные артерии. Единственные артерии с венозной кровью. Начало малого круга.',
      build: (T) => {
        const g = new T.Group(), mat = std(T, '#6F8CE0')
        g.add(tube(T, [[-0.35, 0.7, 0.45], [-0.6, 1.7, 0.6], [-0.8, 2.3, 0.6]], 0.26, mat, 20))
        g.add(tube(T, [[-0.8, 2.3, 0.6], [-1.6, 2.6, 0.8]], 0.18, mat, 8), tube(T, [[-0.8, 2.3, 0.6], [0.2, 2.5, 0.9]], 0.18, mat, 8))
        return g
      },
    },
    {
      id: 'cava', name: 'Полые вены', color: BLUE, anchor: [-1.9, 2.0, -0.2],
      info: 'Верхняя собирает кровь от головы и рук, нижняя — от туловища и ног. Обе впадают в правое предсердие. Вены — сосуды к сердцу, артерии — от сердца.',
      build: (T) => {
        const g = new T.Group(), mat = std(T, '#8AA0E0')
        g.add(tube(T, [[-1.3, 1.6, 0], [-1.5, 2.3, -0.1], [-1.6, 3.0, -0.2]], 0.24, mat, 12))
        g.add(tube(T, [[-1.4, 0.4, 0.1], [-1.9, -0.6, 0.1], [-2.0, -1.6, 0.1]], 0.24, mat, 12))
        return g
      },
    },
    {
      id: 'pv', name: 'Лёгочные вены', color: RED, anchor: [2.2, 1.7, 0.2],
      info: 'Четыре вены приносят артериальную кровь из лёгких в левое предсердие. Единственные вены с артериальной кровью.',
      build: (T) => {
        const g = new T.Group(), mat = std(T, '#E8827A')
        for (const [dy, dz] of [[0.25, 0.3], [-0.15, -0.3]]) g.add(tube(T, [[1.7, 1.0 + dy, dz], [2.5, 1.2 + dy, dz * 1.5]], 0.14, mat, 8))
        return g
      },
    },
  ]
  return { id: 'organ-heart', title: 'Сердце человека', subtitle: 'Четыре камеры и крупные сосуды. Синее — венозная кровь, красное — артериальная. Левая половина, как на схеме, справа.', radius: 3.6, parts, canExplode: true }
}
