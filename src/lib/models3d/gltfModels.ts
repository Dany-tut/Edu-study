// ─────────────────────────────────────────────────────────────────────────────
// Готовые меши из открытых баз, упакованные в GLB с узлом на каждую часть.
//
// Первый источник — BodyParts3D (© The Database Center for Life Science,
// CC BY 4.0): настоящие органы человека, снятые с МРТ. Файлы собираются
// скриптом obj2glb из OBJ-деталей базы, лежат в public/models и грузятся
// по требованию. Здесь только раскладка: какой узел — какая часть, цвет и
// справка. Координаты базы в миллиметрах, ось Z вверх, лицо в −Y — поэтому
// меш поворачивается и масштабируется к радиусу ≈3, как у остальных моделей.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { ModelSpec, ModelPartSpec } from './spec'

interface GltfPart {
  node: string; name: string; color: string; info: string
  opacity?: number; shell?: boolean; hideLabel?: boolean
}
interface GltfModel {
  key: string; url: string; title: string; subtitle: string; credit: string
  parts: GltfPart[]
}

const BP3D_CREDIT = 'Меш: BodyParts3D, © The Database Center for Life Science, CC BY 4.0.'

const MODELS: GltfModel[] = [
  {
    key: 'bp3d-heart', url: '/models/bp3d-heart.glb', title: 'Сердце человека · по МРТ',
    subtitle: 'Настоящая форма органа из базы BodyParts3D, собранная из 90 деталей. Коронарные сосуды — отдельной частью.',
    credit: BP3D_CREDIT,
    parts: [
      { node: 'ra', name: 'Правое предсердие', color: '#6F8CE0', info: 'Принимает венозную кровь из полых вен. Здесь синусовый узел — водитель ритма.' },
      { node: 'la', name: 'Левое предсердие', color: '#E8827A', info: 'Принимает артериальную кровь из четырёх лёгочных вен и через митральный клапан отдаёт её левому желудочку.' },
      { node: 'rv', name: 'Правый желудочек', color: '#5B7FD6', info: 'Выталкивает венозную кровь в лёгочный ствол — малый круг. Стенка тоньше левой: давление в лёгких невысокое. В модели видны сосочковые мышцы и полость.' },
      { node: 'lv', name: 'Левый желудочек', color: '#D9524A', info: 'Самая мощная камера: толкает кровь в аорту и по большому кругу. Стенка втрое толще правой.' },
      { node: 'valves', name: 'Клапаны', color: '#F2DFA0', info: 'Створки трёхстворчатого, митрального, аортального и лёгочного клапанов — пропускают кровь только в одну сторону.' },
      { node: 'aorta', name: 'Аорта', color: '#C94A42', info: 'Восходящая часть и дуга: от левого желудочка вверх, затем поворот вниз к нисходящей аорте вдоль позвоночника. Начало большого круга.' },
      { node: 'pulm', name: 'Лёгочный ствол', color: '#7A95E0', info: 'Из правого желудочка к лёгким. Единственная артерия с венозной кровью.' },
      { node: 'cava', name: 'Верхняя полая вена', color: '#8AA0E0', info: 'Собирает кровь от головы, шеи и рук в правое предсердие. Нижняя полая вена в этой модели не показана: она уходит вниз через всю брюшную полость.' },
      { node: 'coronary', name: 'Коронарные сосуды', color: '#F0A070', info: 'Собственные артерии и вены сердца: отходят от аорты у самого её начала и питают миокард. Закупорка коронарной артерии — инфаркт.' },
    ],
  },
  {
    key: 'bp3d-eye', url: '/models/bp3d-eye.glb', title: 'Глазное яблоко · по МРТ',
    subtitle: 'Оболочки и преломляющие среды из базы BodyParts3D. Склера полупрозрачна, чтобы видеть хрусталик и связку.',
    credit: BP3D_CREDIT,
    parts: [
      { node: 'sclera', name: 'Склера', color: '#E9E6EE', opacity: 0.3, shell: true, info: 'Белочная оболочка — наружный каркас глаза. Спереди переходит в роговицу.' },
      { node: 'cornea', name: 'Роговица', color: '#9FD3F0', opacity: 0.5, info: 'Прозрачная выпуклая часть наружной оболочки. Главная преломляющая среда глаза.' },
      { node: 'choroid', name: 'Сосудистая оболочка', color: '#C97A6A', opacity: 0.85, info: 'Средняя оболочка с сосудами и пигментом: питает сетчатку и гасит рассеянный свет. Спереди переходит в ресничное тело и радужку.' },
      { node: 'iris', name: 'Радужка', color: '#6B8BC7', info: 'Кольцо с пигментом и двумя мышцами; отверстие в центре — зрачок.' },
      { node: 'lens', name: 'Хрусталик', color: '#F2DFA0', opacity: 0.85, info: 'Двояковыпуклая линза. Меняет кривизну — аккомодация.' },
      { node: 'ligament', name: 'Ресничный поясок', color: '#D98A7A', info: 'Тонкие волокна, на которых хрусталик подвешен к ресничному телу. Их натяжение меняет форму хрусталика.' },
      { node: 'vitreous', name: 'Стекловидное тело', color: '#BFE3F5', opacity: 0.15, hideLabel: true, info: 'Прозрачный гель, заполняющий глаз за хрусталиком.' },
    ],
  },
]

export const GLTF_KEYS = MODELS.map(m => m.key)

const loader = new GLTFLoader()

export async function gltfModelSpec(key: string): Promise<ModelSpec | null> {
  const def = MODELS.find(m => m.key === key)
  if (!def) return null
  const gltf = await loader.loadAsync(def.url)
  // Общий бокс по всем нужным узлам: модель масштабируется целиком, а не по частям.
  const union = new THREE.Box3()
  const nodes = new Map<string, THREE.Object3D>()
  for (const p of def.parts) {
    const n = gltf.scene.getObjectByName(p.node)
    if (!n) continue
    nodes.set(p.node, n)
    if (!p.shell) union.expandByObject(n)
  }
  const centre = union.getCenter(new THREE.Vector3())
  const scale = 3 / Math.max(union.getBoundingSphere(new THREE.Sphere()).radius, 1)
  /**
   * Точка подписи — на поверхности, а не в центре бокса: у дуги аорты или
   * полой камеры центр висит в пустоте, и булавка «не пойми где». Берём
   * вершину меша, ближайшую к центру бокса, в координатах собранной части.
   */
  const surfaceAnchor = (node: THREE.Object3D): [number, number, number] | undefined => {
    const box = new THREE.Box3().expandByObject(node)
    const c = box.getCenter(new THREE.Vector3())
    let best: THREE.Vector3 | null = null, bestD = Infinity
    node.updateWorldMatrix(true, false)
    node.traverse(o => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const pos = mesh.geometry.getAttribute('position')
      const v = new THREE.Vector3()
      for (let i = 0; i < pos.count; i += 3) {
        v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
        const d = v.distanceToSquared(c)
        if (d < bestD) { bestD = d; best = v.clone() }
      }
    })
    if (!best) return undefined
    const a = (best as THREE.Vector3).sub(centre).multiplyScalar(scale)
    return [a.x, a.y, a.z]
  }
  const parts: ModelPartSpec[] = def.parts.filter(p => nodes.has(p.node)).map(p => ({
    id: p.node, name: p.name, color: p.color, info: p.info, shell: p.shell, hideLabel: p.hideLabel,
    anchor: surfaceAnchor(nodes.get(p.node)!),
    build: (T) => {
      const g = new T.Group()
      const src = nodes.get(p.node)!.clone()
      src.traverse(o => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.material = new T.MeshStandardMaterial({
          color: p.color, roughness: 0.55, metalness: 0,
          transparent: (p.opacity ?? 1) < 1, opacity: p.opacity ?? 1, side: T.DoubleSide,
        })
      })
      // Сначала в ноль и в масштаб, потом Z-вверх → Y-вверх.
      const inner = new T.Group()
      inner.add(src)
      inner.position.copy(centre).negate().multiplyScalar(scale)
      inner.scale.setScalar(scale)
      g.add(inner)
      g.rotation.x = -Math.PI / 2
      return g
    },
  }))
  return {
    id: `gltf-${def.key}`, title: def.title, subtitle: `${def.subtitle} ${def.credit}`,
    radius: 3.2, parts, canExplode: true,
  }
}
