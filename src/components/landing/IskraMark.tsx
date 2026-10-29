// Живой знак Искры — 3D «Матовое стекло на фиолетовом Искры» из Figma
// (файл «Искра», страница «кит»), та же картинка, что public/icon-512.png.
// Растр не перерисовываем: он разрезан на слои в public/brand/ —
//   mark-base.webp   — плитка с буквой, искра стёрта (фон под ней дорисован);
//   mark-spark.webp  — сама искра с прозрачностью, ровно по своему месту;
//   mark-letter.png  — маска стеклянной буквы, по ней бежит блик.
// В покое слои складываются в исходную иконку один в один.
//
// Вход: плитка выпрыгивает → по стеклу пробегает блик → искра влетает с
// поворотом и вспыхивает. Дальше раз в 8 с искра мерцает и снова бежит блик;
// наведение на .iskra-host повторяет блик и крутит искру. Только CSS:
// rAF в превью не срабатывает (см. [[preview-no-raf]]).

const CSS = `
.iskra-mark { position: relative; display: inline-block; flex-shrink: 0; border-radius: 22.5%; animation: im-pop .5s cubic-bezier(.34,1.56,.64,1) both; }
.iskra-mark > img { position: absolute; display: block; pointer-events: none; user-select: none; }
.iskra-mark .im-base { inset: 0; width: 100%; height: 100%; border-radius: inherit; }
.iskra-mark .im-spark { left: 58.2%; top: 14.45%; width: 23.05%; height: 21.875%; transform-origin: 50% 50%;
  animation: im-spark .6s cubic-bezier(.34,1.56,.64,1) .6s both, im-twinkle 8s ease-in-out 3s infinite; }
.iskra-mark .im-shine { position: absolute; inset: 0; overflow: hidden; pointer-events: none;
  -webkit-mask: url(/brand/mark-letter.png) 0 0 / 100% 100% no-repeat; mask: url(/brand/mark-letter.png) 0 0 / 100% 100% no-repeat; }
.iskra-mark .im-shine::before { content: ''; position: absolute; inset: -10% 0; transform: translateX(-110%);
  background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.95) 50%, transparent 70%);
  animation: im-sweep .9s cubic-bezier(.4,0,.2,1) .3s both, im-sweep-idle 8s cubic-bezier(.4,0,.2,1) 3s infinite; }
.iskra-host:hover .iskra-mark .im-spark { animation: im-spin .7s cubic-bezier(.34,1.56,.64,1) both; }
.iskra-host:hover .iskra-mark .im-shine::before { animation: im-sweep-hover .8s cubic-bezier(.4,0,.2,1) both; }

@keyframes im-pop { from { transform: scale(.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
@keyframes im-spark {
  from { transform: scale(0) rotate(-140deg); opacity: 0; filter: drop-shadow(0 0 0 rgba(255,255,255,0)) }
  55%  { opacity: 1; filter: drop-shadow(0 0 6px rgba(255,255,255,.95)) }
  to   { transform: scale(1) rotate(0); opacity: 1; filter: drop-shadow(0 0 0 rgba(255,255,255,0)) } }
@keyframes im-twinkle {
  0%, 86%, 100% { transform: scale(1) rotate(0); filter: drop-shadow(0 0 0 rgba(255,255,255,0)) }
  90% { transform: scale(.8) rotate(25deg) }
  94% { transform: scale(1.15) rotate(-8deg); filter: drop-shadow(0 0 5px rgba(255,255,255,.9)) } }
@keyframes im-spin {
  from { transform: scale(1) rotate(0) }
  50%  { transform: scale(1.25) rotate(100deg); filter: drop-shadow(0 0 6px rgba(255,255,255,.95)) }
  to   { transform: scale(1) rotate(180deg); filter: drop-shadow(0 0 0 rgba(255,255,255,0)) } }
@keyframes im-sweep { from { transform: translateX(-110%) } to { transform: translateX(110%) } }
@keyframes im-sweep-hover { from { transform: translateX(-110%) } to { transform: translateX(110%) } }
@keyframes im-sweep-idle { 0%, 84% { transform: translateX(-110%) } 96%, 100% { transform: translateX(110%) } }

@media (prefers-reduced-motion: reduce) {
  .iskra-mark, .iskra-mark *, .iskra-mark .im-shine::before,
  .iskra-host:hover .iskra-mark .im-spark, .iskra-host:hover .iskra-mark .im-shine::before { animation: none !important; }
  .iskra-mark .im-shine { display: none; }
}
`

export default function IskraMark({ size = 30 }: { size?: number }) {
  return (
    <span className="iskra-mark" aria-hidden style={{ width: size, height: size }}>
      <style>{CSS}</style>
      <img className="im-base" src="/brand/mark-base.webp" alt="" draggable={false} />
      <span className="im-shine" />
      <img className="im-spark" src="/brand/mark-spark.webp" alt="" draggable={false} />
    </span>
  )
}
