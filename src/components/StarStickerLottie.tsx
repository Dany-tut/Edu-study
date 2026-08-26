import LottieIcon from './LottieIcon'

// Тот же файл, что и у HardStarLottie: star-sticker.json был его точной копией.
export default function StarStickerLottie({ size = 40 }: { size?: number }) {
  return <LottieIcon name="star" size={size} />
}
