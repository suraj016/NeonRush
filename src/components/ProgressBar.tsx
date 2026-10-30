import { clamp } from '../utils/math.ts'

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = clamp(max <= 0 ? 0 : value / max, 0, 1) * 100
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}
