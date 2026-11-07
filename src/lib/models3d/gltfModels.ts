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
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import type { ModelSpec, ModelPartSpec } from './spec'

interface GltfPart {
  node: string; name: string; color: string; info: string
  opacity?: number; shell?: boolean; hideLabel?: boolean
  /**
   * Место в стопке разбора вдоль оси (см. GltfModel.explodeAxis): 0 — самая
   * задняя часть, стоит на месте; остальные встают перед ней по порядку.
   */
  explodeStep?: number
  /**
   * Явный сдвиг при разборе в итоговых координатах (Y вверх, +Z к зрителю,
   * +X — левая сторона тела), радиус модели ≈3. Нужен органам, где части
   * вложены друг в друга (сердце): разбор «от центра» разводит их наугад.
   */
  explode?: [number, number, number]
}
interface GltfModel {
  key: string; url: string; title: string; subtitle: string; credit: string
  parts: GltfPart[]
  /**
   * Разбор вдоль оси «от узла → к узлу» (центры их габаритов), по шагам
   * explodeStep. Нужен органам, где части лежат стопкой на одной оси (глаз):
   * разбор «от центра» разводит их почти одинаково, и стопка остаётся слипшейся.
   */
  explodeAxis?: [string, string]
  /** Откуда тексты справок: файл ChemBio_KB#стр.N (правило ХимБио — только из базы). */
  sources?: string[]
}

const BP3D_CREDIT = 'Меш: BodyParts3D, © The Database Center for Life Science, CC BY 4.0.'

const MODELS: GltfModel[] = [
  {
    key: 'bp3d-heart', url: '/models/bp3d-heart.glb', title: 'Сердце человека · по МРТ',
    subtitle: 'Настоящая форма органа из базы BodyParts3D, собранная из 90 деталей. Коронарные сосуды — отдельной частью.',
    credit: BP3D_CREDIT,
    parts: [
      { node: 'ra', explode: [-2.0, 0.3, 0.4], name: 'Правое предсердие', color: '#6F8CE0', info: 'Принимает венозную кровь из полых вен. Здесь синусовый узел — водитель ритма.' },
      { node: 'la', explode: [0.4, 0.6, -2.2], name: 'Левое предсердие', color: '#E8827A', info: 'Принимает артериальную кровь из четырёх лёгочных вен и через митральный клапан отдаёт её левому желудочку.' },
      { node: 'rv', explode: [-0.6, -0.8, 2.0], name: 'Правый желудочек', color: '#5B7FD6', info: 'Выталкивает венозную кровь в лёгочный ствол — малый круг. Стенка тоньше левой: давление в лёгких невысокое. В модели видны сосочковые мышцы и полость.' },
      { node: 'lv', explode: [2.0, -0.7, 0.2], name: 'Левый желудочек', color: '#D9524A', info: 'Самая мощная камера: толкает кровь в аорту и по большому кругу. Стенка втрое толще правой.' },
      { node: 'valves', explode: [0, 0.1, 0], name: 'Клапаны', color: '#F2DFA0', info: 'Створки трёхстворчатого, митрального, аортального и лёгочного клапанов — пропускают кровь только в одну сторону.' },
      { node: 'aorta', explode: [0.2, 2.2, -0.6], name: 'Аорта', color: '#C94A42', info: 'Восходящая часть и дуга: от левого желудочка вверх, затем поворот вниз к нисходящей аорте вдоль позвоночника. Начало большого круга.' },
      { node: 'pulm', explode: [0.6, 1.6, 1.6], name: 'Лёгочный ствол', color: '#7A95E0', info: 'Из правого желудочка к лёгким. Единственная артерия с венозной кровью.' },
      { node: 'cava', explode: [-1.6, 1.8, -0.2], name: 'Верхняя полая вена', color: '#8AA0E0', info: 'Собирает кровь от головы, шеи и рук в правое предсердие. Нижняя полая вена в этой модели не показана: она уходит вниз через всю брюшную полость.' },
      { node: 'coronary', explode: [0, -3.0, 0.4], name: 'Коронарные сосуды', color: '#F0A070', info: 'Собственные артерии и вены сердца: отходят от аорты у самого её начала и питают миокард. Закупорка коронарной артерии — инфаркт.' },
    ],
  },
  {
    key: 'bp3d-eye', url: '/models/bp3d-eye.glb', title: 'Глазное яблоко · по МРТ',
    explodeAxis: ['choroid', 'cornea'],
    subtitle: 'Оболочки и преломляющие среды из базы BodyParts3D. Склера полупрозрачна, чтобы видеть хрусталик и связку.',
    credit: BP3D_CREDIT,
    parts: [
      { node: 'sclera', name: 'Склера', color: '#E9E6EE', opacity: 0.3, shell: true, info: 'Белочная оболочка — наружный каркас глаза. Спереди переходит в роговицу.' },
      { node: 'cornea', explodeStep: 5, name: 'Роговица', color: '#9FD3F0', opacity: 0.5, info: 'Прозрачная выпуклая часть наружной оболочки. Главная преломляющая среда глаза.' },
      { node: 'choroid', explodeStep: 0, name: 'Сосудистая оболочка', color: '#C97A6A', opacity: 0.85, info: 'Средняя оболочка с сосудами и пигментом: питает сетчатку и гасит рассеянный свет. Спереди переходит в ресничное тело и радужку.' },
      { node: 'iris', explodeStep: 4, name: 'Радужка', color: '#6B8BC7', info: 'Кольцо с пигментом и двумя мышцами; отверстие в центре — зрачок.' },
      { node: 'lens', explodeStep: 3, name: 'Хрусталик', color: '#F2DFA0', opacity: 0.85, info: 'Двояковыпуклая линза. Меняет кривизну — аккомодация.' },
      { node: 'ligament', explodeStep: 2, name: 'Ресничный поясок', color: '#D98A7A', info: 'Тонкие волокна, на которых хрусталик подвешен к ресничному телу. Их натяжение меняет форму хрусталика.' },
      { node: 'vitreous', explodeStep: 1, name: 'Стекловидное тело', color: '#BFE3F5', opacity: 0.15, hideLabel: true, info: 'Прозрачный гель, заполняющий глаз за хрусталиком.' },
    ],
  },
  {
    key: 'bp3d-brain', sources: ['textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.305', 'textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.307', 'textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.309', 'textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.310', 'textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.311', 'textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.314', 'textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.330'], url: '/models/bp3d-brain.glb', title: 'Головной мозг · по МРТ',
    subtitle: 'Три отдела — передний, средний и задний мозг; кора больших полушарий поделена на доли с разными функциями.', credit: BP3D_CREDIT,
    parts: [
      { node: 'frontal', name: 'Лобная доля', color: '#8E7FE0', info: 'В лобной доле рядом с участком двигательной коры, управляющим ртом, лежит зона Брока — она отвечает за произнесение слов.' },
      { node: 'parietal', name: 'Теменная доля', color: '#5FA8D8', info: 'Доля коры больших полушарий. Поражение участка на границе теменной и височной долей мешает подбирать нужные слова.' },
      { node: 'temporal', name: 'Височная доля', color: '#E0A35F', info: 'Сюда приходят сигналы от ушей: первичная слуховая кора покрывает височные доли. Здесь же хранятся прежние зрительные образы, помогающие понять увиденное.' },
      { node: 'occipital', name: 'Затылочная доля', color: '#6CC28E', info: 'Здесь первичная зрительная зона: она получает сигналы от глаз. Её повреждение вызывает слепоту даже при здоровых глазах.' },
      { node: 'cerebellum', name: 'Мозжечок', color: '#E07F9E', info: 'Лежит в задней части мозга под большими полушариями. Отвечает за равновесие и согласует работу мышц, делая привычные движения автоматическими.' },
      { node: 'midbrain', name: 'Средний мозг', color: '#D9C36A', info: 'К нему подходят зрительные нервы. Управляет рефлекторными поворотами глаз, головы и туловища на свет и звук, размером зрачка и формой хрусталика.' },
      { node: 'pons', name: 'Мост', color: '#C98A5C', info: 'Варолиев мост — передаточная станция: переключает нервные импульсы на мозжечок, спинной мозг и другие отделы головного мозга.' },
      { node: 'medulla', name: 'Продолговатый мозг', color: '#B5795A', info: 'Отвечает за жизненно важные функции: здесь центры дыхания и работы сердца, а также рефлексы кашля, чихания, глотания и рвоты.' },
      { node: 'hypothal', name: 'Гипоталамус', color: '#F0E08A', info: 'Главный центр вегетативной нервной системы. Управляет гипофизом и следит за составом крови, температурой тела, голодом и жаждой.' },
      { node: 'ventricles', name: 'Желудочки мозга', color: '#7FD3E8', info: 'Четыре полости внутри мозга, заполненные спинномозговой жидкостью. Она омывает мозг, смягчает удары и помогает его питать.' },
    ],
  },
  {
    key: 'bp3d-lungs', sources: ['textbooks/txt/Teylor_Grin_Staut_1_tom_2013.txt#стр.366', 'textbooks/txt/Teylor_Grin_Staut_1_tom_2013.txt#стр.368', 'textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.149', 'textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.156'], url: '/models/bp3d-lungs.glb', title: 'Дыхательные пути и сосуды лёгких · по МРТ',
    subtitle: 'Путь воздуха от трахеи до бронхиол и сосуды малого круга, которые несут кровь через лёгкие.', credit: BP3D_CREDIT,
    parts: [
      { node: 'trachea', name: 'Трахея', color: '#E8DCC0', info: 'Трубка перед пищеводом, ведущая воздух в грудную полость. С-образные хрящи не дают ей спадаться при вдохе; внизу она делится на два бронха.' },
      { node: 'bronchiR', name: 'Правое бронхиальное дерево', color: '#E3C9A0', info: 'Правый бронх в лёгком многократно ветвится на всё более тонкие бронхиолы, а те заканчиваются альвеолами, где идёт газообмен.' },
      { node: 'bronchiL', name: 'Левое бронхиальное дерево', color: '#D8BA8C', info: 'Бронхи левого лёгкого выстланы мерцательным эпителием: слизь ловит пыль и бактерии, а реснички гонят её к ротовой полости.' },
      { node: 'arteries', name: 'Лёгочные артерии', color: '#6F8CE0', info: 'Несут бедную кислородом кровь из правого желудочка в лёгкие — единственные такие артерии. В лёгких ветвятся на капилляры вокруг альвеол.' },
      { node: 'veins', name: 'Лёгочные вены', color: '#D9524A', info: 'Собирают кровь от капилляров альвеол и несут её, уже богатую кислородом, в левое предсердие. Единственные вены с такой кровью.' },
    ],
  },
  {
    key: 'bp3d-urinary', sources: ['textbooks/txt/Teylor_Grin_Staut_3_tom_2013.txt#стр.17', 'textbooks/txt/Teylor_Grin_Staut_3_tom_2013.txt#стр.18', 'textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.345', 'textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.346'], url: '/models/bp3d-urinary.glb', title: 'Мочевыделительная система · по МРТ',
    subtitle: 'Почки очищают кровь и образуют мочу, которая по мочеточникам стекает в мочевой пузырь.', credit: BP3D_CREDIT,
    parts: [
      { node: 'kidneyR', name: 'Правая почка', color: '#B5544C', info: 'Парный орган у задней стенки брюшной полости. Снаружи — корковое вещество, внутри — мозговое с почечными пирамидами; правая почка чуть ниже левой.' },
      { node: 'kidneyL', name: 'Левая почка', color: '#C45F55', info: 'Левая почка лежит немного выше правой. В ней около миллиона нефронов: они фильтруют кровь и возвращают в неё почти всю воду, образуя мочу.' },
      { node: 'ureters', name: 'Мочеточники', color: '#E8C76A', info: 'Две трубки, по которым моча стекает из почек в мочевой пузырь. Начало мочеточника расширено в почечную лоханку.' },
      { node: 'bladder', name: 'Мочевой пузырь', color: '#E8B04F', info: 'Копит мочу, пока она не будет выведена через мочеиспускательный канал. Выход окружают два сфинктера, один из них подчиняется нашей воле.' },
      { node: 'arteries', name: 'Почечные артерии', color: '#E05A4F', info: 'Отходят от аорты и несут кровь в почки. Почки снабжаются кровью обильно и поддерживают её состав постоянным.' },
      { node: 'adrenal', name: 'Надпочечники', color: '#9C7FD8', info: 'Парные железы на верхушках почек. Кора выделяет стероидные гормоны, а мозговое вещество — адреналин, готовящий тело «бей или беги».' },
    ],
  },
  // Череп: лобная, теменные, клиновидная, скуловые и носовые кости в базе не
  // описаны — у них общие факты о черепе и носе, а не о самой кости. Заменить,
  // когда в ChemBio_KB появится учебник анатомии.
  {
    key: 'bp3d-skull', sources: ['textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.331', 'textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.375', 'textbooks/txt/Teylor_Grin_Staut_1_tom_2013.txt#стр.308', 'textbooks/txt/Teylor_Grin_Staut_1_tom_2013.txt#стр.366', 'textbooks/txt/2_Kempbell_Biologia_2_tom.txt#стр.362'], url: '/models/bp3d-skull.glb', title: 'Череп · по МРТ',
    subtitle: 'Мозговая коробка из плоских костей, сросшаяся с ней верхняя челюсть и подвижная нижняя.', credit: BP3D_CREDIT,
    parts: [
      { node: 'frontal', name: 'Лобная кость', color: '#E9DFC6', info: 'Плоские кости мозговой коробки прочно соединены неподвижными швами и защищают головной мозг.' },
      { node: 'parietal', name: 'Теменные кости', color: '#D9E3C2', info: 'Кости мозговой коробки защищают не только мозг, но и органы обоняния, слуха и глаза.' },
      { node: 'temporal', name: 'Височные кости', color: '#E8CDB0', info: 'Внутри височной кости находится костный лабиринт внутреннего уха — система каналов и полостей, заполненных жидкостью.' },
      { node: 'occipital', name: 'Затылочная кость', color: '#CFD9E6', info: 'Сзади два затылочных мыщелка образуют сустав с атлантом — первым шейным позвонком, поэтому мы киваем. Через затылочное отверстие проходит спинной мозг.' },
      { node: 'sphenoid', name: 'Клиновидная кость', color: '#C9B8E0', info: 'Череп — часть осевого скелета: его мозговая коробка защищает головной мозг и органы чувств.' },
      { node: 'zygomatic', name: 'Скуловые кости', color: '#E8B9B0', info: 'Череп соединён с позвоночником суставом и вместе с ним, рёбрами и грудиной образует осевой скелет.' },
      { node: 'maxilla', name: 'Верхняя челюсть', color: '#B9DCD6', info: 'Неподвижно срастается с мозговой коробкой. Несёт верхний ряд зубов: у взрослого с каждой стороны резцы, клык, премоляры и моляры — всего по восемь.' },
      { node: 'nasal', name: 'Носовые кости', color: '#F0D79A', info: 'Воздух входит через ноздри; в носовых ходах он согревается и увлажняется, а мы различаем запахи.' },
      { node: 'mandible', name: 'Нижняя челюсть', color: '#A9C6E8', info: 'В отличие от верхней челюсти подвижна: соединена с черепом суставами и приводится в движение мышцами. Несёт нижний ряд зубов.' },
    ],
  },
  {
    key: 'bp3d-digestive', sources: ['textbooks/txt/Teylor_Grin_Staut_1_tom_2013.txt#стр.308', 'textbooks/txt/Teylor_Grin_Staut_1_tom_2013.txt#стр.312', 'textbooks/txt/Teylor_Grin_Staut_1_tom_2013.txt#стр.313', 'textbooks/txt/Teylor_Grin_Staut_1_tom_2013.txt#стр.314', 'textbooks/txt/Teylor_Grin_Staut_1_tom_2013.txt#стр.316', 'textbooks/txt/Teylor_Grin_Staut_1_tom_2013.txt#стр.319', 'textbooks/txt/Teylor_Grin_Staut_1_tom_2013.txt#стр.320', 'textbooks/txt/Teylor_Grin_Staut_1_tom_2013.txt#стр.322', 'textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.348', 'textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.349', 'textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.423', 'textbooks/txt/Teylor_Grin_Staut_2_tom_2013.txt#стр.426'], url: '/models/bp3d-digestive.glb', title: 'Пищеварительная система · по МРТ',
    subtitle: 'Путь пищи от пищевода до прямой кишки и железы, выделяющие пищеварительные соки.', credit: BP3D_CREDIT,
    parts: [
      { node: 'esophagus', name: 'Пищевод', color: '#E59A8C', info: 'Мышечная трубка длиной около 25 см. Волны перистальтики быстро проталкивают по ней пищевой комок из глотки в желудок.' },
      { node: 'stomach', name: 'Желудок', color: '#E58A7A', info: 'Мышечный мешок под диафрагмой слева, вмещает около 5 л. Хранит и перемешивает пищу; соляная кислота убивает бактерии, а пепсин расщепляет белки.' },
      { node: 'liver', name: 'Печень', color: '#9E4A3E', info: 'Самый крупный внутренний орган, лежит под диафрагмой. Образует желчь, запасает гликоген и поддерживает постоянный состав крови.' },
      { node: 'gallbladder', name: 'Желчный пузырь', color: '#7FB86A', info: 'Хранит и концентрирует желчь из печени. Сокращаясь, выпускает её в двенадцатиперстную кишку, где желчь дробит жир на мелкие капли.' },
      { node: 'pancreas', name: 'Поджелудочная железа', color: '#E8C77A', info: 'Крупная железа за желудком. Её сок с ферментами для белков, жиров и углеводов идёт в двенадцатиперстную кишку, а островки выделяют инсулин и глюкагон.' },
      { node: 'duodenum', name: 'Двенадцатиперстная кишка', color: '#F0A88A', info: 'Первый отдел тонкой кишки, около 25 см. Сюда открываются протоки поджелудочной железы и желчного пузыря; щелочная среда гасит кислоту из желудка.' },
      { node: 'smallInt', name: 'Тонкая кишка', color: '#F2B9A0', info: 'Главное место всасывания: ворсинки и микроворсинки во много раз увеличивают поверхность. Сахара и аминокислоты уходят в кровь, жиры — в лимфу.' },
      { node: 'colon', name: 'Толстая кишка', color: '#C99A7A', info: 'Пища здесь уже не переваривается, но всасывается оставшаяся вода. Бактерии толстой кишки синтезируют витамины, в том числе витамин K.' },
      { node: 'rectum', name: 'Прямая кишка', color: '#B5826A', info: 'Конечный отдел кишечника: здесь каловые массы недолго хранятся перед выведением. Анальное отверстие замыкают два сфинктера.' },
    ],
  },
]

export const GLTF_KEYS = MODELS.map(m => m.key)

// Меши сжаты meshopt (упрощение ×0,5 + квантование, ~×4,5 меньше): декодер
// на чистом JS/wasm внутри модуля, отдельных файлов не тянет.
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)

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
  // Точки и ось разбора в итоговых координатах модели: тот же сдвиг, масштаб и
  // поворот Z-вверх → Y-вверх, что и у самих частей (rotation.x = −π/2).
  const toFinal = (v: THREE.Vector3) => v.clone().sub(centre).multiplyScalar(scale).applyAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
  /**
   * Точка подписи — на наружной поверхности части. Центр бокса не годится: у
   * дуги аорты или полой камеры он висит в пустоте, а ближайшая к нему вершина
   * лежит на внутренней стенке, и подпись закрыта собственными стенками и
   * коронарными сосудами. Поэтому идём лучом от центра органа через центр
   * части и берём вершину, где этот луч выходит наружу: крайнюю по лучу из
   * тех, что лежат к нему близко.
   */
  const surfaceAnchor = (node: THREE.Object3D): [number, number, number] | undefined => {
    const c = new THREE.Box3().expandByObject(node).getCenter(new THREE.Vector3())
    const dir = c.clone().sub(centre)
    if (dir.lengthSq() < 1e-6) dir.set(0, -1, 0) // часть в самом центре — точка спереди (лицо в −Y)
    // С наклоном вверх (в базе вверх — +Z): у вложенных частей (хрусталик за
    // радужкой) точка строго «наружу» смотрит в соседнюю часть и закрыта ею,
    // а верхний край виден и в собранном, и в разобранном виде.
    dir.normalize().add(new THREE.Vector3(0, 0, 0.7)).normalize()
    let best: THREE.Vector3 | null = null, bestS = -Infinity
    node.updateWorldMatrix(true, false)
    const v = new THREE.Vector3(), rel = new THREE.Vector3()
    node.traverse(o => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const pos = mesh.geometry.getAttribute('position')
      for (let i = 0; i < pos.count; i += 2) {
        v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
        rel.copy(v).sub(c)
        const along = rel.dot(dir)
        const perp = Math.sqrt(Math.max(0, rel.lengthSq() - along * along))
        const score = along - 1.5 * perp
        if (score > bestS) { bestS = score; best = v.clone() }
      }
    })
    if (!best) return undefined
    // В координатах модели: тот же сдвиг, масштаб и поворот Z-вверх → Y-вверх, что у части.
    const a = toFinal(best as THREE.Vector3)
    return [a.x, a.y, a.z]
  }
  let axis: THREE.Vector3 | null = null
  if (def.explodeAxis && nodes.has(def.explodeAxis[0]) && nodes.has(def.explodeAxis[1])) {
    const a = toFinal(new THREE.Box3().expandByObject(nodes.get(def.explodeAxis[0])!).getCenter(new THREE.Vector3()))
    const b = toFinal(new THREE.Box3().expandByObject(nodes.get(def.explodeAxis[1])!).getCenter(new THREE.Vector3()))
    axis = b.sub(a).normalize()
  }
  // Стопка по реальной толщине: каждая часть встаёт перед предыдущей с
  // зазором. Фиксированный шаг не годился: стекловидное тело почти с глаз
  // размером и оставалось внутри сосудистой оболочки.
  const explodeOf = new Map<string, [number, number, number]>()
  if (axis) {
    const GAP = 0.35
    const proj = (node: THREE.Object3D) => {
      const box = new THREE.Box3().expandByObject(node)
      let lo = Infinity, hi = -Infinity
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const d = toFinal(new THREE.Vector3(x, y, z)).dot(axis!)
        lo = Math.min(lo, d); hi = Math.max(hi, d)
      }
      return { lo, hi }
    }
    const stack = def.parts.filter(p => p.explodeStep !== undefined && nodes.has(p.node)).sort((a, b) => a.explodeStep! - b.explodeStep!)
    let cursor = -Infinity
    for (const p of stack) {
      const { lo, hi } = proj(nodes.get(p.node)!)
      const target = cursor === -Infinity ? lo : cursor
      const shift = target - lo
      explodeOf.set(p.node, axis.clone().multiplyScalar(shift).toArray() as [number, number, number])
      cursor = hi + shift + GAP
    }
  }
  const parts: ModelPartSpec[] = def.parts.filter(p => nodes.has(p.node)).map(p => ({
    id: p.node, name: p.name, color: p.color, info: p.info, shell: p.shell, hideLabel: p.hideLabel,
    explode: p.explode ?? explodeOf.get(p.node),
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
    radius: 3.2, parts, canExplode: true, sources: def.sources,
  }
}
