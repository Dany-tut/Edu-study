import { createContext, forwardRef, useContext, type ReactElement, type ReactNode, type SVGProps } from 'react'
import type { LucideIcon, LucideProps } from 'lucide-react'
import { useIsDesktop } from '../../lib/useIsDesktop'

const LoopContext = createContext(false)

export function useLoopIcons() { return useContext(LoopContext) }

/** Preserve legacy inline SVGs on desktop while replacing their mobile glyph. */
export function LoopInlineIcon({ icon: Icon, children, color }: {
  icon: LucideIcon
  children: ReactElement<SVGProps<SVGSVGElement>>
  color?: string
}) {
  const mobile = useLoopIcons()
  if (!mobile) return children
  const { width, height, viewBox: _viewBox, children: _children, ...props } = children.props
  return <Icon {...props} size={height ?? width ?? 16} color={color} />
}

export function LoopTextIcon({ icon: Icon, children, size = '1em' }: { icon: LucideIcon; children: ReactNode; size?: number | string }) {
  return useLoopIcons()
    ? <><Icon size={size} style={{ display: 'inline-block', verticalAlign: '-0.12em' }} />{typeof children === 'string' && /\s$/.test(children) ? ' ' : null}</>
    : <>{children}</>
}

/** Translated action labels keep their old desktop text; mobile uses a real glyph. */
export function LoopActionLabel({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return useLoopIcons()
    ? <>{label.replace(/\s*[→›✓]$/, '')} <Icon size="1em" style={{ display: 'inline-block', verticalAlign: '-0.12em' }} /></>
    : <>{label}</>
}

/** One viewport subscription for the whole app; React portals retain this context. */
export function LoopIconProvider({ enabled = true, children }: { enabled?: boolean; children: ReactNode }) {
  const desktop = useIsDesktop()
  return <LoopContext.Provider value={enabled && !desktop}>{children}</LoopContext.Provider>
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

/** Same props, refs and events as Lucide; the desktop component remains the fallback. */
export function createResponsiveIcon(name: string, Desktop: LucideIcon, artwork: ReactNode): LucideIcon {
  const Icon = forwardRef<SVGSVGElement, LucideProps>(function ResponsiveIcon(props, ref) {
    const mobile = useContext(LoopContext)
    return mobile
      ? <LoopSvg {...props} name={name} artwork={artwork} ref={ref} />
      : <Desktop {...props} ref={ref} />
  })
  Icon.displayName = `AppIcon(${name})`
  return Icon
}
