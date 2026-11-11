// Огонёк первого экрана — живая 3D-модель (поза hero: дышит, следит за курсором
// и раз в несколько секунд машет рукой). По клику подпрыгивает. Под ним — тёплое
// пятно света от его огонька, чтобы он «стоял» на поверхности, а не висел.
//
// Пока модель грузится, при «Уменьшить движение» и без WebGL сквозь прозрачный
// холст видна картинка ogonek-wave.webp (fallback внутри OgonekModel).

import { useRef } from 'react'
import { useT } from '../../../lib/i18n'
import type { OgonekHandle } from '../../../lib/ogonek3d/ogonekViewer'
import OgonekModel from './OgonekModel'

export default function HeroOgonek() {
  const t = useT()
  const handle = useRef<OgonekHandle | null>(null)

  return (
    <div className="pointer-events-none relative mt-8 flex flex-col items-center lg:absolute lg:left-1/2 lg:top-[468px] lg:mt-0 lg:-translate-x-1/2">
      <button
        type="button"
        onClick={() => handle.current?.play('jump')}
        aria-label={t('Огонёк машет рукой')}
        className="pointer-events-auto relative h-[255px] w-[150px] cursor-pointer rounded-[40px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] sm:h-[340px] sm:w-[200px] lg:h-[404px] lg:w-[238px]"
      >
        <OgonekModel
          pose="hero"
          fallback="ogonek-wave.webp"
          className="h-full w-full"
          onReady={h => { handle.current = h }}
        />
      </button>
      {/* Пол: тёплое пятно света от огонька — он стоит на поверхности. Тень под
          ногами рисует сама модель. */}
      <div aria-hidden className="relative -mt-7 h-[44px] w-[230px] sm:w-[280px] lg:w-[330px]">
        <span className="lp-floor-light absolute inset-x-0 -top-6 bottom-[-18px] rounded-[50%]" style={{ background: 'radial-gradient(closest-side, rgba(255,186,110,0.45), rgba(255,186,110,0.14) 55%, rgba(255,186,110,0) 100%)' }} />
      </div>
    </div>
  )
}
