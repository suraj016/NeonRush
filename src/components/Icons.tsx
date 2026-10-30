type IconProps = { size?: number }

export function IconPause({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" fill="currentColor" rx="1" />
      <rect x="14" y="5" width="4" height="14" fill="currentColor" rx="1" />
    </svg>
  )
}

export function IconPlay({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l12-7z" fill="currentColor" />
    </svg>
  )
}

export function IconClose({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}
