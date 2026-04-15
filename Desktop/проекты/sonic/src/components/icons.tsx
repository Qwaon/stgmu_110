import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { className?: string }

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function IconPlay({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} className={className} width={16} height={16}>
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

export function IconStop({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} className={className} width={16} height={16}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  )
}

export function IconX({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} className={className} width={16} height={16}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function IconCalendar({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} className={className} width={14} height={14}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export function IconAlert({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} className={className} width={14} height={14}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export function IconList({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} className={className} width={16} height={16}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

export function IconPlus({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} className={className} width={16} height={16}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export function IconPause({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} className={className} width={16} height={16}>
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  )
}

export function IconResume({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} className={className} width={16} height={16}>
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

export function IconDownload({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} className={className} width={16} height={16}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

export function IconLogOut({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} className={className} width={14} height={14}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export function IconCheck({ className, ...props }: IconProps) {
  return (
    <svg {...base} {...props} className={className} width={14} height={14}>
      <polyline points="20,6 9,17 4,12" />
    </svg>
  )
}

/** Placeholder — user replaces this with their own SVG */
export function LogoPlaceholder({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" {...props} className={className} width={28} height={28}>
      {/* INSERT_LOGO_SVG — replace the content below with your logo paths */}
      <rect x="2" y="2" width="28" height="28" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <text x="16" y="21" textAnchor="middle" fontSize="14" fontWeight="700" fill="currentColor" fontFamily="Outfit">S</text>
    </svg>
  )
}
