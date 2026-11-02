import { createContext, forwardRef, useContext, type ReactElement, type ReactNode, type SVGProps } from 'react'
import type { LucideIcon, LucideProps } from 'lucide-react'

const LoopContext = createContext(true)

export function useLoopIcons() { return useContext(LoopContext) }

/** Adapt legacy inline controls to the shared Loop family at every viewport. */
export function LoopInlineIcon({ icon: Icon, children, color }: {
  icon: LucideIcon
  children: ReactElement<SVGProps<SVGSVGElement>>
  color?: string
}) {
  const loop = useLoopIcons()
  if (!loop) return children
  const { width, height, viewBox: _viewBox, children: _children, ...props } = children.props
  return <Icon {...props} size={height ?? width ?? 16} color={color} />
}

export function LoopTextIcon({ icon: Icon, children, size = '1em' }: { icon: LucideIcon; children: ReactNode; size?: number | string }) {
  return useLoopIcons()
    ? <><Icon size={size} style={{ display: 'inline-block', verticalAlign: '-0.12em' }} />{typeof children === 'string' && /\s$/.test(children) ? ' ' : null}</>
    : <>{children}</>
}

/** Keep translated labels while replacing trailing text symbols with Loop artwork. */
export function LoopActionLabel({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return useLoopIcons()
    ? <>{label.replace(/\s*[→›✓]$/, '')} <Icon size="1em" style={{ display: 'inline-block', verticalAlign: '-0.12em' }} /></>
    : <>{label}</>
}

/** React portals and standalone previews use the same family as the app. */
export function LoopIconProvider({ enabled = true, children }: { enabled?: boolean; children: ReactNode }) {
  return <LoopContext.Provider value={enabled}>{children}</LoopContext.Provider>
}

export const LoopSvg = forwardRef<SVGSVGElement, LucideProps & { name: string; artwork: ReactNode }>(
  function LoopSvg({ name, artwork, size = 24, strokeWidth = 2, absoluteStrokeWidth, color = 'currentColor', className, children, ...props }, ref) {
    const opticalStroke = Number(strokeWidth) * 1.15
    const width = absoluteStrokeWidth && Number(size) > 0 ? opticalStroke * 32 / Number(size) : opticalStroke
    const labelled = props['aria-label'] || props['aria-labelledby'] || props.role === 'img'
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={labelled ? undefined : true}
        role={labelled ? 'img' : undefined}
        focusable="false"
        className={`lucide taskli-loop-icon${className ? ` ${className}` : ''}`}
        data-loop-icon={name}
        {...props}
      >
        {artwork}
        {children}
      </svg>
    )
  },
)

/** Lucide-compatible props, refs and events; one family at every viewport. */
export function createLoopIcon(name: string, artwork: ReactNode): LucideIcon {
  const Icon = forwardRef<SVGSVGElement, LucideProps>(function AppLoopIcon(props, ref) {
    return <LoopSvg {...props} name={name} artwork={artwork} ref={ref} />
  })
  Icon.displayName = `AppIcon(${name})`
  return Icon
}
