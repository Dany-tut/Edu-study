import OgonekImage from './OgonekImage'

export default function HeroOgonek() {
  return (
    <div className="pointer-events-none relative mt-8 flex flex-col items-center lg:absolute lg:left-1/2 lg:top-[468px] lg:mt-0 lg:-translate-x-1/2">
      <div className="relative h-[255px] w-[150px] sm:h-[340px] sm:w-[200px] lg:h-[404px] lg:w-[238px]">
        <OgonekImage
          image="ogonek-wave.webp"
          className="h-full w-full"
        />
      </div>
      {/* Пол: тёплое пятно света от огонька — он стоит на поверхности. Тень под
          ногами рисует сама модель. */}
      <div aria-hidden className="relative -mt-7 h-[44px] w-[230px] sm:w-[280px] lg:w-[330px]">
        <span className="lp-floor-light absolute inset-x-0 -top-6 bottom-[-18px] rounded-[50%]" style={{ background: 'radial-gradient(closest-side, rgba(255,186,110,0.45), rgba(255,186,110,0.14) 55%, rgba(255,186,110,0) 100%)' }} />
      </div>
    </div>
  )
}
