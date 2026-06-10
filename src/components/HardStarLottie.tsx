import Lottie from 'lottie-react'
import animationData from '../../hard-star.json'

export default function HardStarLottie({ size = 28 }: { size?: number }) {
  return (
    <Lottie
      animationData={animationData}
      loop
      autoplay
      style={{ width: size, height: size, flexShrink: 0 }}
    />
  )
}
