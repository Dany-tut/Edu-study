import Lottie from 'lottie-react'
import animationData from '../../star-sticker.json'

export default function StarStickerLottie({ size = 40 }: { size?: number }) {
  return (
    <Lottie
      animationData={animationData}
      loop
      autoplay
      style={{ width: size, height: size, flexShrink: 0 }}
    />
  )
}
