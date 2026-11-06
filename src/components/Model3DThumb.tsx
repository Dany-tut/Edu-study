// Миниатюра 3D-модели: живая сцена без шапки, подписей и кнопок — для карточек
// библиотеки и выбора модели в редакторе. Крутится сама, на клик не реагирует.
import { useEffect, useRef, useState } from 'react'
import { retryImport } from '../lib/chunkError'
import { loadModelSpec } from '../lib/models3d/registry'
import type { ModelViewer } from '../lib/models3d/viewer'
import './model3dFigure.css'

export default function Model3DThumb({ src, className, style }: { src: string; className?: string; style?: React.CSSProperties }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewerRef = useRef<ModelViewer | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    Promise.all([retryImport(() => import('../lib/models3d/viewer')), loadModelSpec(src)])
      .then(([mod, spec]) => {
        if (!alive || !spec || !canvasRef.current) { if (alive) setFailed(true); return }
        viewerRef.current = mod.createModelViewer(canvasRef.current, spec, {})
        viewerRef.current.setAutoRotate(true)
      })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false; viewerRef.current?.dispose(); viewerRef.current = null }
  }, [src])
  return (
    <div className={className} style={{ position: 'relative', background: 'var(--m3d-scene, #EEEDF6)', ...style }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', pointerEvents: 'none' }} />
      {failed && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 12, color: 'var(--color-muted)' }}>нет модели</div>}
    </div>
  )
}
