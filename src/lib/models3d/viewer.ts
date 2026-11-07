// ─────────────────────────────────────────────────────────────────────────────
// Сцена 3D-модели конспекта на чистом three.js.
//
// Почему не react-three-fiber: three уже в проекте (голо-стикеры), а R3F+drei
// добавили бы ~150 КБ ради орбиты и подписей, которые здесь — сто строк.
// Модуль грузится ленивым import() из Model3DFigure, в основной бандл не
// попадает.
//
// Что умеет: орбита пальцем/мышью, автовращение до первого касания, разбор
// на части (части уезжают по своим векторам), изоляция одной части (остальные
// гаснут), подсветка при наведении, выбор по клику и проекция точек подписей
// в экранные координаты для DOM-ярлыков.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { ModelSpec } from './spec'

export interface LabelAnchor {
  id: string
  /** Экранные координаты в px относительно канвы. */
  x: number
  y: number
  /** Точка закрыта другой частью или за камерой. */
  hidden: boolean
}

export interface ViewerCallbacks {
  onHover?: (id: string | null) => void
  /** Клик по части; point — точка касания на поверхности (мировые координаты). */
  onSelect?: (id: string | null, point?: THREE.Vector3) => void
  onAnchors?: (anchors: LabelAnchor[]) => void
  /** Пользователь начал крутить сам — автовращение остановлено. */
  onInteract?: () => void
  /** Текущий прогресс стадий (при проигрывании — каждый кадр). */
  onProgress?: (p: number) => void
}

export interface ModelViewer {
  setExplode(v: number): void
  setIsolate(id: string | null): void
  setHighlight(id: string | null): void
  /** Метка в точке поверхности части: проецируется в onAnchors под id «__marker». */
  setMarker(id: string | null, worldPoint?: THREE.Vector3): void
  /** Акцент: выбранная часть ярче, остальные заметно гаснут (мягче изоляции). */
  setEmphasis(id: string | null): void
  setAutoRotate(on: boolean): void
  /** Покадровая анимация модели (электроны и т. п.); орбита при этом живёт. */
  setAnimation(on: boolean): void
  /** Стадии: целевой прогресс 0…1, сцена доезжает плавно. */
  setProgress(p: number): void
  /** Автопроигрывание стадий по кругу; onProgress получает текущее значение. */
  setPlaying(on: boolean): void
  setPaused(on: boolean): void
  /** Подвести камеру к части; null — вернуться к общему виду. */
  focusPart(id: string | null): void
  /**
   * Справа на сцене стоит карточка шириной px: центр кадра сдвигается в
   * свободную часть, чтобы приближенная деталь не уходила под карточку.
   */
  setViewInset(px: number): void
  resetView(): void
  resize(): void
  dispose(): void
}

type Part = {
  id: string
  root: THREE.Group
  /** Собранный объект части — в его координатах задана точка подписи. */
  obj: THREE.Object3D
  home: THREE.Vector3
  explode: THREE.Vector3
  /** Центр части в координатах модели (до сдвига к центру габаритов). */
  centre: THREE.Vector3
  liveAnchor?: () => [number, number, number]
  anchor: THREE.Vector3
  shell: boolean
  /** Все материалы полупрозрачны (вакуоль, оболочка ядра) — подписи за ней не прячем. */
  translucent: boolean
  hideLabel: boolean
  materials: Array<THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial>
  baseOpacity: number[]
  baseEmissive: THREE.Color[]
}

const UP = new THREE.Vector3(0, 1, 0)

export function createModelViewer(canvas: HTMLCanvasElement, spec: ModelSpec, cb: ViewerCallbacks = {}): ModelViewer {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  // Срезы (глаз в разрезе): материалы со своими clippingPlanes.
  renderer.localClippingEnabled = true
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200)

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a86a8, 1.35))
  const key = new THREE.DirectionalLight(0xffffff, 1.6)
  key.position.set(5, 8, 6)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xbfb6ff, 0.7)
  rim.position.set(-6, -2, -5)
  scene.add(rim)

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  // Панорама нужна: у вытянутых моделей (нейрон) края иначе не рассмотреть.
  controls.enablePan = true
  controls.panSpeed = 0.7
  controls.screenSpacePanning = true
  controls.autoRotate = spec.view !== 'front'
  controls.autoRotateSpeed = 0.9
  controls.addEventListener('start', () => {
    focus = null
    if (controls.autoRotate) { controls.autoRotate = false; cb.onInteract?.() }
  })

  // ── Части ────────────────────────────────────────────────────────────────
  const root = new THREE.Group()
  scene.add(root)
  const parts: Part[] = []
  const byId = new Map<string, Part>()
  const objects = new Map<string, THREE.Object3D>()
  const pickables: THREE.Object3D[] = []
  const union = new THREE.Box3()

  for (const ps of spec.parts) {
    const obj = ps.build(THREE)
    const group = new THREE.Group()
    group.add(obj)
    root.add(group)
    const materials: Part['materials'] = []
    obj.traverse(o => {
      o.userData.partId = ps.id
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      pickables.push(mesh)
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of mats) {
        const sm = m as THREE.MeshStandardMaterial
        if (sm.isMeshStandardMaterial && !materials.includes(sm)) materials.push(sm)
      }
    })
    // Центр части — для ярлыка и для направления разбора по умолчанию.
    const box = new THREE.Box3().setFromObject(obj)
    const centre = box.getCenter(new THREE.Vector3())
    const anchor = ps.anchor ? new THREE.Vector3(...ps.anchor) : centre.clone()
    // Вектор разбора считается ниже, когда известен центр всей модели.
    const explode = ps.explode ? new THREE.Vector3(...ps.explode) : new THREE.Vector3()
    if (!ps.shell) union.union(box)
    const part: Part = {
      id: ps.id, root: group, obj, home: new THREE.Vector3(), explode, anchor, centre, liveAnchor: ps.liveAnchor,
      shell: !!ps.shell, hideLabel: !!ps.hideLabel, materials,
      translucent: materials.length > 0 && materials.every(m => m.opacity < 0.7),
      baseOpacity: materials.map(m => m.opacity),
      baseEmissive: materials.map(m => m.emissive.clone()),
    }
    parts.push(part)
    byId.set(ps.id, part)
    objects.set(ps.id, obj)
  }

  // ── Центр и дистанция по габаритам, а не по нулевой точке модели ─────────
  //
  // Нейрон тянется от −2 до +7.5: если крутить вокруг нуля, хвост уезжает за
  // край и к нему не приблизиться. Поэтому всё смещается так, чтобы центр
  // габаритного куба (оболочки не в счёт) встал в ноль, и от него же считаются
  // разбор и дистанция камеры.
  if (union.isEmpty()) union.setFromObject(root)
  const modelCentre = spec.frame ? new THREE.Vector3(...spec.frame.center) : union.getCenter(new THREE.Vector3())
  root.position.copy(modelCentre).negate()
  const fitRadius = spec.frame ? spec.frame.radius : Math.max(union.getBoundingSphere(new THREE.Sphere()).radius, 0.5)
  for (const part of parts) {
    if (spec.parts.find(ps => ps.id === part.id)?.explode) continue
    const dir = part.centre.clone().sub(modelCentre)
    if (dir.lengthSq() > 1e-6) part.explode.copy(dir.normalize().multiplyScalar(fitRadius * 0.6))
  }
  const dist = fitRadius * 2.9
  if (spec.view === 'front') camera.position.set(0, dist * 0.12, dist)
  else camera.position.set(dist * 0.55, dist * 0.42, dist * 0.78)
  controls.minDistance = fitRadius * 0.3
  controls.maxDistance = fitRadius * 6
  controls.update()

  // Наезд камеры на часть: цель и дистанция доезжают плавно в step().
  let focus: { target: THREE.Vector3; dist: number } | null = null
  const partBox = (part: Part) => new THREE.Box3().setFromObject(part.obj)

  // ── Состояние ────────────────────────────────────────────────────────────
  let explodeTarget = 0
  let explodeNow = 0
  let isolated: string | null = null
  let highlighted: string | null = null
  let marker: { part: Part; local: THREE.Vector3 } | null = null
  let emphasis: string | null = null
  let paused = false
  let animating = true
  let animT = 0
  let progressTarget = 0
  let progressNow = 0
  let playing = false
  let disposed = false
  const dim = new Map<string, number>() // текущая «погашенность» 0..1 по частям
  parts.forEach(p => dim.set(p.id, 0))

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const tmp = new THREE.Vector3()

  function applyMaterials(part: Part, d: number, hot: boolean) {
    const shellFade = part.shell ? Math.max(explodeNow, isolated && isolated !== part.id ? 1 : 0) : 0
    part.materials.forEach((m, i) => {
      const base = part.baseOpacity[i]
      // Погашенная часть почти прозрачна, оболочка при разборе тоже тает.
      // Погашенная часть остаётся на 5 %: силуэт виден, но не спорит с выбранной.
      const target = base * (1 - d * 0.95) * (1 - shellFade * 0.85)
      // Флаг прозрачности не липкий: непрозрачная часть снова рисуется как
      // непрозрачная, иначе сортировка прозрачных даёт просветы в стенках.
      // Признак прозрачности three.js вшивает в шейдер (define OPAQUE: альфа
      // принудительно 1). Сменили флаг — материал надо пересобрать, иначе
      // часть остаётся непрозрачной при любой opacity: так у Дани в Edge
      // остальные части не гасли до 5 %.
      // Материалы, прозрачность которых ведёт сам процесс (userData.anim), не трогаем.
      const wantTransparent = m.userData.anim === true || base < 0.999 || target < 0.999
      if (m.transparent !== wantTransparent) { m.transparent = wantTransparent; m.needsUpdate = true }
      m.opacity = target
      m.depthWrite = target > 0.5
      m.emissive.copy(part.baseEmissive[i])
      // Подсветка едва заметная: сильный emissive вымывал цвет до пастели.
      if (hot) m.emissive.offsetHSL(0, 0, emphasis === part.id ? 0.1 : 0.05)
    })
  }

  function step(dt: number) {
    explodeNow += (explodeTarget - explodeNow) * Math.min(1, dt * 7)
    // Разобранная модель шире собранной: ужимаем всю сцену, а не отъезжаем
    // камерой, чтобы не спорить с зумом пользователя.
    const k = 1 / (1 + 0.42 * explodeNow)
    root.scale.setScalar(k)
    for (const part of parts) {
      // Акцент гасит остальное почти как изоляция: выбранное должно читаться сразу.
      const wantDim = isolated && isolated !== part.id ? 1 : emphasis && emphasis !== part.id ? 1 : 0
      const d = dim.get(part.id)! + (wantDim - dim.get(part.id)!) * Math.min(1, dt * 8)
      dim.set(part.id, d)
      const k = part.shell ? 0 : explodeNow
      part.root.position.copy(part.home).addScaledVector(part.explode, k)
      applyMaterials(part, d, highlighted === part.id || emphasis === part.id)
    }
    if (focus) {
      const k = Math.min(1, dt * 5)
      controls.target.lerp(focus.target, k)
      const dir = camera.position.clone().sub(controls.target)
      const len = dir.length() + (focus.dist - dir.length()) * k
      camera.position.copy(controls.target).add(dir.normalize().multiplyScalar(len))
      if (controls.target.distanceTo(focus.target) < 0.01 && Math.abs(len - focus.dist) < 0.01) focus = null
    }
    // Своё время, а не часы: после паузы движение продолжается с места.
    if (animating) animT += dt
    spec.animate?.(animT, objects)
    if (spec.timeline) {
      if (playing) {
        progressTarget = (progressTarget + dt / spec.timeline.duration) % 1
        progressNow = progressTarget
      } else {
        progressNow += (progressTarget - progressNow) * Math.min(1, dt * 5)
      }
      spec.timeline.update(progressNow, objects)
      cb.onProgress?.(progressNow)
    }
  }

  function projectAnchors(): LabelAnchor[] {
    const w = canvas.clientWidth, h = canvas.clientHeight
    const camPos = camera.position
    const out: LabelAnchor[] = []
    if (marker) {
      tmp.copy(marker.local)
      marker.part.obj.localToWorld(tmp)
      const ndc = tmp.project(camera)
      out.push({ id: '__marker', x: (ndc.x * 0.5 + 0.5) * w, y: (-ndc.y * 0.5 + 0.5) * h, hidden: ndc.z > 1 })
    }
    return out.concat(parts.filter(p => !p.hideLabel).map(part => {
      if (part.liveAnchor) { tmp.set(...part.liveAnchor()); root.localToWorld(tmp) }
      else { tmp.copy(part.anchor); part.obj.localToWorld(tmp) }
      const toAnchor = tmp.distanceTo(camPos)
      // Закрыта ли точка другой частью: луч от камеры к точке.
      raycaster.set(camPos, tmp.clone().sub(camPos).normalize())
      raycaster.far = toAnchor - 0.02
      const hits = raycaster.intersectObjects(pickables, false)
      const blocker = hits.find(hit => {
        const pid = hit.object.userData.partId as string
        if (pid === part.id) return false
        const other = byId.get(pid)
        // Полупрозрачное и погашенное не закрывает.
        return !(other?.shell) && !(other?.translucent) && (dim.get(pid) ?? 0) < 0.5
      })
      const ndc = tmp.project(camera)
      // Часть, которой сейчас нет на сцене (процесс ещё не дошёл), подписи не получает.
      let shown = false
      part.obj.traverse(o => { if ((o as THREE.Mesh).isMesh && o.visible) { let p: THREE.Object3D | null = o; let vis = true; while (p && p !== part.obj) { if (!p.visible) { vis = false; break } p = p.parent } if (vis) shown = true } })
      const hidden = !shown || !part.obj.visible || !!blocker || ndc.z > 1 || (isolated !== null && isolated !== part.id)
      return { id: part.id, x: (ndc.x * 0.5 + 0.5) * w, y: (-ndc.y * 0.5 + 0.5) * h, hidden }
    }))
  }

  // ── Указатель ────────────────────────────────────────────────────────────
  let downAt: [number, number] | null = null
  function pick(ev: PointerEvent): { id: string; point: THREE.Vector3 } | null {
    const r = canvas.getBoundingClientRect()
    pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    raycaster.far = Infinity
    const hits = raycaster.intersectObjects(pickables, false)
    for (const hit of hits) {
      const pid = hit.object.userData.partId as string
      const part = byId.get(pid)
      if (!part) continue
      if ((dim.get(pid) ?? 0) > 0.5) continue
      // Оболочку выбираем, только если за ней ничего нет.
      if (part.shell && hits.some(h2 => h2 !== hit && (dim.get(h2.object.userData.partId as string) ?? 0) < 0.5 && !byId.get(h2.object.userData.partId as string)?.shell)) continue
      return { id: pid, point: hit.point.clone() }
    }
    return null
  }
  const onMove = (ev: PointerEvent) => {
    if (ev.pointerType === 'touch') return
    const id = pick(ev)?.id ?? null
    if (id !== highlighted) { highlighted = id; cb.onHover?.(id) }
    canvas.style.cursor = id ? 'pointer' : 'grab'
  }
  const onDown = (ev: PointerEvent) => { downAt = [ev.clientX, ev.clientY] }
  const onUp = (ev: PointerEvent) => {
    if (!downAt) return
    const moved = Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1])
    downAt = null
    if (moved > 6) return
    const hit = pick(ev)
    cb.onSelect?.(hit?.id ?? null, hit?.point)
  }
  const onLeave = () => { if (highlighted) { highlighted = null; cb.onHover?.(null) } }
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointerleave', onLeave)

  // ── Цикл ─────────────────────────────────────────────────────────────────
  let viewInset = 0
  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // Сдвиг на половину карточки: картинка уезжает влево, центр модели встаёт
    // посередине свободной части. Подписи и выбор кликом считаются через ту же
    // матрицу проекции, поэтому остаются на своих местах.
    if (viewInset > 0) camera.setViewOffset(w, h, viewInset / 2, 0, w, h)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
  }
  resize()
  const ro = new ResizeObserver(() => { resize(); if (paused) frame(performance.now(), true) })
  ro.observe(canvas)

  let last = performance.now()
  let raf = 0
  let anchorTick = 0
  function frame(now: number, once = false) {
    if (disposed) return
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    controls.update()
    step(dt)
    renderer.render(scene, camera)
    // Подписи — через кадр: проекция с лучами дороже самого рендера.
    if ((anchorTick++ & 1) === 0 || once) cb.onAnchors?.(projectAnchors())
    if (!paused && !once) raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)

  const home = camera.position.clone()
  return {
    setExplode(v) { explodeTarget = Math.max(0, Math.min(1, v)) },
    setIsolate(id) { isolated = id },
    setHighlight(id) { highlighted = id },
    setEmphasis(id) { emphasis = id },
    setViewInset(px) { viewInset = Math.max(0, px); resize() },
    setMarker(id, worldPoint) {
      const part = id ? byId.get(id) : null
      if (!part || !worldPoint) { marker = null; return }
      // Точка хранится в координатах объекта части: едет и при вращении, и при разборе.
      marker = { part, local: part.obj.worldToLocal(worldPoint.clone()) }
    },
    setAutoRotate(on) { controls.autoRotate = on },
    setAnimation(on) { animating = on },
    setProgress(p) { progressTarget = Math.max(0, Math.min(1, p)) },
    setPlaying(on) { playing = on },
    setPaused(on) {
      if (on === paused) return
      paused = on
      if (!on) { last = performance.now(); raf = requestAnimationFrame(frame) }
      else cancelAnimationFrame(raf)
    },
    focusPart(id) {
      const part = id ? byId.get(id) : null
      if (!part) { focus = { target: new THREE.Vector3(), dist }; return }
      const box = partBox(part)
      const r = Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, fitRadius * 0.12)
      focus = { target: box.getCenter(new THREE.Vector3()), dist: Math.min(controls.maxDistance, Math.max(controls.minDistance, r * 3.2)) }
    },
    resetView() {
      focus = null
      camera.position.copy(home)
      controls.target.set(0, 0, 0)
      camera.lookAt(0, 0, 0)
      camera.up.copy(UP)
      controls.update()
    },
    resize,
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointerleave', onLeave)
      controls.dispose()
      scene.traverse(o => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.geometry.dispose()
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach(m => m.dispose())
      })
      renderer.dispose()
    },
  }
}
