import Lottie from 'lottie-react'
import animationData from '../../party-popper.json'

export default function PartyPopperLottie({ size = 54 }: { size?: number }) {
  return (
    <Lottie
      animationData={animationData}
      loop={false}
      autoplay
      style={{ width: size, height: size, flexShrink: 0 }}
    />
  )
}
