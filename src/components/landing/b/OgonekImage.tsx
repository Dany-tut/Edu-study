import type { CSSProperties } from 'react'
import { asset } from './kit'

type Props = {
  image: string
  alt?: string
  className?: string
  style?: CSSProperties
}

export default function OgonekImage({ image, alt = '', className, style }: Props) {
  return (
    <div className={className} style={style} aria-hidden={alt ? undefined : true}>
      <img src={asset(image)} alt={alt} decoding="async" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain" />
    </div>
  )
}
