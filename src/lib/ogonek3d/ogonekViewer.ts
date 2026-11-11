// ─────────────────────────────────────────────────────────────────────────────
// 3D-Огонёк: маскот Искры на чистом three.
//
// Модель собирается в Blender скриптами scripts/ogonek/ и лежит в
// public/models/ogonek/ogonek.glb: тело на скелете (14 костей: корпус, голова,
// три звена язычка, два звена бокового язычка, плечо и кисть с каждой
// стороны, ножки), лицо — отдельные меши на кости головы с морфами:
//   глаза  look_left/right/up/down, blink, lid_closed, lid_half, lid_sad, happy;
//   рот    mouth_joy, mouth_o, mouth_sad, mouth_smile (рот и язык — одни имена);
//   брови  brow_up, brow_sad, brow_angry, brow_joy.
// Клипы скелета (30 к/с): idle 2 с (петля: дыхание и пламя), wave 2.4 с,
// think 3 с, point 2 с, read 3 с, joy 2 с, coin 2 с (петли) и разовые turn 3 с,
// jump 1.6 с, cheer 2 с. Реквизит (книга со страницей, монета, палец) висит на
// своих костях и виден только в своём клипе (масштаб 0.001 в остальных).
// Свечение живота — альфа цвета вершин тела (COLOR_0.a): при загрузке
// переносится в атрибут _glow и добавляется к emissive шейдером.
// Файл для веба сжат gltfpack (EXT_meshopt_compression + квантование):
// нужен MeshoptDecoder, он идёт в составе three.
//
// Модуль самостоятельный: в основной бандл не входит, грузится стендом
// dev-ogonek.html. Встраивание на лендинг — отдельное решение через оператора.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

export type OgonekEmotion = 'base' | 'smile' | 'joy' | 'surprise' | 'think' | 'sad' | 'angry'
export type OgonekClip = 'idle' | 'wave' | 'think' | 'point' | 'read' | 'joy' | 'coin' | 'turn' | 'jump' | 'cheer'

/** Места лендинга: петля, эмоция, куда смотрит без курсора, разовый акцент раз в N секунд. */
export interface OgonekPose { loop: OgonekClip; emotion: OgonekEmotion; gaze?: [number, number]; follow?: boolean; accent?: { clip: OgonekClip; every: number } }
export type OgonekPoseName = 'hero' | 'why' | 'day' | 'student' | 'eco' | 'faq' | 'cta' | 'price'
export const POSES: Record<OgonekPoseName, OgonekPose> = {
  hero: { loop: 'idle', emotion: 'base', follow: true, accent: { clip: 'wave', every: 6 } },
  why: { loop: 'think', emotion: 'think', gaze: [0.5, 0.65], follow: false },
  day: { loop: 'point', emotion: 'base', gaze: [0.6, 0.15], follow: false },
  student: { loop: 'read', emotion: 'base', gaze: [0.1, 0.15], follow: false },
  eco: { loop: 'idle', emotion: 'smile', follow: true },
  faq: { loop: 'think', emotion: 'think', gaze: [-0.5, 0.65], follow: false },
  cta: { loop: 'joy', emotion: 'joy', follow: true },
  price: { loop: 'coin', emotion: 'joy', follow: true },
}

export const EMOTIONS: Record<OgonekEmotion, Record<string, number>> = {
  base: {},
  smile: { mouth_smile: 1 },
  joy: { mouth_joy: 1, happy: 1, lid_closed: 1, brow_joy: 1 },
  surprise: { mouth_o: 1, brow_up: 1 },
  think: { mouth_o: 0.55, brow_up: 0.5 },
  sad: { mouth_sad: 1, brow_sad: 1, lid_sad: 1 },
  angry: { mouth_sad: 0.6, brow_angry: 1, lid_half: 0.5 },
}

export interface OgonekOptions {
  url?: string
  dark?: boolean
  /** глаза и голова следят за курсором */
  follow?: boolean
  /** место лендинга: задаёт петлю, эмоцию и взгляд */
  pose?: OgonekPoseName
}

export interface OgonekHandle {
  play(clip: OgonekClip): void
  setEmotion(e: OgonekEmotion): void
  setDark(dark: boolean): void
  setFollow(on: boolean): void
  setAutoRotate(on: boolean): void
  setPose(p: OgonekPoseName): void
  dispose(): void
  ready: Promise<void>
}

export function mountOgonek(host: HTMLElement, opts: OgonekOptions = {}): OgonekHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  host.appendChild(renderer.domElement)
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.35

  const camera = new THREE.PerspectiveCamera(24, 1, 2, 40)
  camera.position.set(0, 1.25, 8.2)
  camera.lookAt(0, 1.08, 0)

  // свет как в рендерах согласования: ключ слева сверху, контровой справа сзади
  const hemi = new THREE.HemisphereLight(0xf4f0ff, 0x6a5a8a, 0.9)
  scene.add(hemi)
  const key = new THREE.DirectionalLight(0xffffff, 1.6)
  key.position.set(-2.6, 4.4, 3.6)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.radius = 8
  key.shadow.camera.left = -1.5; key.shadow.camera.right = 1.5
  key.shadow.camera.top = 2.6; key.shadow.camera.bottom = -0.5
  key.shadow.bias = -0.0005
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xe6d2ff, 1.4)
  rim.position.set(3, 2.2, -1.2)
  scene.add(rim)
  const fill = new THREE.DirectionalLight(0xebe6ff, 0.35)
  fill.position.set(3.4, 1.4, 3.4)
  scene.add(fill)

  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48), new THREE.ShadowMaterial({ opacity: 0.16 }))
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)

  const root = new THREE.Group()
  scene.add(root)

  let mixer: THREE.AnimationMixer | null = null
  const clips = new Map<string, THREE.AnimationAction>()
  let idle: THREE.AnimationAction | null = null
  const gaze = new THREE.Vector2(0, 0)
  let accent: OgonekPose['accent'] | undefined
  let accentT = 0
  let headBone: THREE.Bone | null = null
  let lookPivot: THREE.Group | null = null
  const neck = new THREE.Vector3()
  const morphMeshes: THREE.Mesh[] = []
  const target: Record<string, number> = {}
  const current: Record<string, number> = {}
  let follow = opts.follow ?? true
  let autoRotate = false
  let blinkT = 0
  let nextBlink = 2 + Math.random() * 3
  const pointer = new THREE.Vector2(0, 0)
  const look = new THREE.Vector2(0, 0)
  const glowUniform = { value: 0.22 }

  function setDark(dark: boolean) {
    hemi.intensity = dark ? 0.6 : 0.9
    ;(floor.material as THREE.ShadowMaterial).opacity = dark ? 0.32 : 0.16
    glowUniform.value = dark ? 0.36 : 0.22
  }
  setDark(!!opts.dark)

  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder)
  const ready = loader.loadAsync(opts.url ?? '/models/ogonek/ogonek-web.glb').then(gltf => {
    const model = gltf.scene
    model.traverse(o => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = true
      // gltfpack снимает имена с мешей — часть узнаём по имени материала
      const matName = (m.material as THREE.Material).name
      const name = ({ Ogonek_Body: 'Body', Ogonek_Blush: 'Blush', Ogonek_Sclera: 'Eye.', Ogonek_Highlight: 'Highlight', Ogonek_EyeGloss: 'Iris' } as Record<string, string>)[matName] || m.name || m.parent?.name || ''
      m.name = name
      // альфа цвета вершин тела = сила свечения; цвет оставляем RGB
      const colAttr = m.geometry.getAttribute('color')
      if (colAttr && colAttr.itemSize === 4) {
        const n = colAttr.count
        const rgb = new Float32Array(n * 3), glow = new Float32Array(n)
        for (let i = 0; i < n; i++) {
          rgb[i * 3] = colAttr.getX(i); rgb[i * 3 + 1] = colAttr.getY(i); rgb[i * 3 + 2] = colAttr.getZ(i)
          glow[i] = colAttr.getW(i)
        }
        m.geometry.setAttribute('color', new THREE.BufferAttribute(rgb, 3))
        m.geometry.setAttribute('_glow', new THREE.BufferAttribute(name === 'Body' ? glow : new Float32Array(n), 1))
      }
      const src = m.material as THREE.MeshStandardMaterial
      if (name === 'Body' || matName === 'Ogonek_Feet') {
        const mat = new THREE.MeshPhysicalMaterial({
          vertexColors: true, roughness: 0.55, metalness: 0,
          sheen: 0.35, sheenColor: new THREE.Color('#d9c8ff'), sheenRoughness: 0.6,
        })
        if (name === 'Body') {
          mat.onBeforeCompile = sh => {
            sh.uniforms.uGlowK = glowUniform
            sh.vertexShader = sh.vertexShader
              .replace('#include <common>', '#include <common>\nattribute float _glow;\nvarying float vGlow;')
              .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = _glow;')
            sh.fragmentShader = sh.fragmentShader
              .replace('#include <common>', '#include <common>\nvarying float vGlow;\nuniform float uGlowK;')
              .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * vGlow * uGlowK;')
          }
        }
        m.material = mat
      } else if (name.startsWith('Highlight')) {
        m.material = new THREE.MeshBasicMaterial({ vertexColors: true })
      } else if (name.startsWith('Blush')) {
        src.transparent = true; src.depthWrite = false
        m.castShadow = false
      } else if (name.startsWith('Eye.')) {
        m.material = new THREE.MeshStandardMaterial({ color: '#f6f3fb', emissive: '#c9c4d6', roughness: 0.45, envMapIntensity: 0.15 })
      } else if (src && 'vertexColors' in src) {
        src.vertexColors = !!m.geometry.getAttribute('color')
        if (name.startsWith('Iris')) {
          // радужка светится своим цветом: фиолетовый низ и чёрный зрачок читаются при любом свете
          const iris = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, envMapIntensity: 0.12 })
          iris.onBeforeCompile = sh => {
            sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * 0.9;')
          }
          m.material = iris
        }
      }
      if (m.morphTargetDictionary) morphMeshes.push(m)
      if (['Ogonek_Lid', 'Ogonek_Face', 'Ogonek_Blush', 'Ogonek_Highlight'].includes(matName)) {
        m.castShadow = false
      }
    })
    model.traverse(o => { if ((o as THREE.Bone).isBone && o.name === 'head') headBone = o as THREE.Bone })
    // поворот к курсору — на промежуточном узле между корпусом и головой:
    // клип пишет кость головы как обычно, а узел добавляет поворот вокруг шеи
    if (headBone) {
      const hb = headBone as THREE.Bone
      const parent = hb.parent!
      lookPivot = new THREE.Group()
      lookPivot.name = 'lookPivot'
      lookPivot.matrixAutoUpdate = false
      parent.add(lookPivot)
      lookPivot.add(hb)
      neck.copy(hb.position)
    }
    root.add(model)
    mixer = new THREE.AnimationMixer(model)
    for (const c of gltf.animations) {
      const a = mixer.clipAction(c)
      clips.set(c.name, a)
    }
    idle = clips.get('idle') ?? null
    if (idle) { idle.setLoop(THREE.LoopRepeat, Infinity); idle.play() }
    if (opts.pose) setPose(opts.pose)
    mixer.addEventListener('finished', e => {
      const a = e.action as THREE.AnimationAction
      if (a === idle || !idle) return
      idle.reset().play()
      a.crossFadeTo(idle, 0.35, false)
    })
  })

  function setMorph(name: string, v: number) {
    for (const m of morphMeshes) {
      const i = m.morphTargetDictionary![name]
      if (i !== undefined) m.morphTargetInfluences![i] = v
    }
  }
  /** открытое веко прячется в глазнице вплотную к белку — показываем веко только когда оно работает */
  function syncLids() {
    for (const m of morphMeshes) {
      if ((m.material as THREE.Material).name !== 'Ogonek_Lid') continue
      m.visible = m.morphTargetInfluences!.some(v => v > 0.02)
    }
  }

  function setEmotion(e: OgonekEmotion) {
    for (const k of Object.keys(target)) target[k] = 0
    Object.assign(target, EMOTIONS[e])
  }

  /** разовый клип поверх текущей петли; по окончании — обратно в петлю */
  function play(name: OgonekClip) {
    const a = clips.get(name)
    if (!a || !idle || a === idle) return
    a.reset()
    a.setLoop(THREE.LoopOnce, 1)
    a.clampWhenFinished = false
    a.play()
    idle.crossFadeTo(a, 0.25, false)
  }

  /** сменить петлю (idle, think, read…) плавным переходом */
  function setLoop(name: OgonekClip) {
    const a = clips.get(name)
    if (!a || a === idle) return
    a.reset().setLoop(THREE.LoopRepeat, Infinity).play()
    if (idle) idle.crossFadeTo(a, 0.4, false)
    idle = a
  }

  function setPose(p: OgonekPoseName) {
    const P = POSES[p]
    setLoop(P.loop)
    setEmotion(P.emotion)
    gaze.set(P.gaze?.[0] ?? 0, P.gaze?.[1] ?? 0)
    follow = P.follow ?? follow
    accent = P.accent
    accentT = 0
  }

  const onPointer = (ev: PointerEvent) => {
    const r = renderer.domElement.getBoundingClientRect()
    // точка лица на экране ≈ 40 % высоты холста
    const fx = r.left + r.width / 2, fy = r.top + r.height * 0.42
    pointer.set(
      THREE.MathUtils.clamp((ev.clientX - fx) / (r.width * 0.6), -1, 1),
      THREE.MathUtils.clamp(-(ev.clientY - fy) / (r.height * 0.6), -1, 1),
    )
  }
  window.addEventListener('pointermove', onPointer)

  function resize() {
    const w = host.clientWidth, h = host.clientHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // модель целиком в кадре и в узком, и в широком окне
    const fitH = 3.15, fitW = 2.0
    const vFov = THREE.MathUtils.degToRad(camera.fov)
    const distH = fitH / 2 / Math.tan(vFov / 2)
    const distW = fitW / 2 / Math.tan(vFov / 2) / camera.aspect
    const d = Math.max(distH, distW)
    camera.position.set(0, 1.35, d)
    camera.lookAt(0, 1.22, 0)
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(host)
  resize()

  const clock = new THREE.Clock()
  const headQ = new THREE.Quaternion()
  const pivotM = new THREE.Matrix4(), rotM = new THREE.Matrix4(), backM = new THREE.Matrix4()
  const tmpE = new THREE.Euler()
  let raf = 0
  function tick() {
    raf = requestAnimationFrame(tick)
    const dt = Math.min(clock.getDelta(), 0.05)
    mixer?.update(dt)

    // взгляд: мягко догоняет курсор
    if (accent) {
      accentT += dt
      if (accentT > accent.every) { accentT = 0; play(accent.clip) }
    }
    const tx = follow ? pointer.x : gaze.x, ty = follow ? pointer.y : gaze.y
    look.x += (tx - look.x) * Math.min(1, dt * 8)
    look.y += (ty - look.y) * Math.min(1, dt * 8)
    if (lookPivot) {
      // в осях корпуса: Y — вдоль корпуса (вверх), X — вбок
      tmpE.set(-look.y * 0.12, look.x * 0.22, 0, 'YXZ')
      headQ.setFromEuler(tmpE)
      pivotM.makeTranslation(neck.x, neck.y, neck.z)
        .multiply(rotM.makeRotationFromQuaternion(headQ))
        .multiply(backM.makeTranslation(-neck.x, -neck.y, -neck.z))
      lookPivot.matrix.copy(pivotM)
      lookPivot.matrixWorldNeedsUpdate = true
    }
    if (autoRotate) root.rotation.y += dt * 0.6

    // морфы эмоций — плавно
    for (const k of new Set([...Object.keys(target), ...Object.keys(current)])) {
      const t = target[k] ?? 0
      const c = current[k] ?? 0
      current[k] = c + (t - c) * Math.min(1, dt * 10)
      setMorph(k, current[k])
    }
    // моргание
    blinkT += dt
    let blink = 0
    if (blinkT > nextBlink) {
      const p = (blinkT - nextBlink) / 0.16
      blink = p < 1 ? Math.sin(p * Math.PI) : 0
      if (p >= 1) { blinkT = 0; nextBlink = 2 + Math.random() * 3.5 }
    }
    if ((target.lid_closed ?? 0) < 0.5) setMorph('blink', blink)
    // глаза
    // ход радужки ограничен: дальше она выходит за край белка
    const LX = 0.7, LY = 0.65
    setMorph('look_left', Math.min(Math.max(look.x, 0), LX))
    setMorph('look_right', Math.min(Math.max(-look.x, 0), LX))
    setMorph('look_up', Math.min(Math.max(look.y, 0), LY))
    setMorph('look_down', Math.min(Math.max(-look.y, 0), LY))
    syncLids()

    renderer.render(scene, camera)
  }
  tick()

  return {
    play, setEmotion, setDark, setPose,
    setFollow: on => { follow = on },
    setAutoRotate: on => { autoRotate = on; if (!on) root.rotation.y = 0 },
    ready,
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('pointermove', onPointer)
      renderer.dispose(); pmrem.dispose()
      renderer.domElement.remove()
    },
  }
}
