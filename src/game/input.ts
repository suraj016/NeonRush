export type GameAction = 'left' | 'right' | 'jump' | 'slide' | 'pause'

type InputHandlers = {
  onAction: (action: GameAction) => void
  isGameplayActive: () => boolean
}

type PointerState = {
  x: number
  y: number
  fired: boolean
  lastFire: number
}

const KEY_MAP: Record<string, GameAction> = {
  a: 'left',
  arrowleft: 'left',
  d: 'right',
  arrowright: 'right',
  w: 'jump',
  arrowup: 'jump',
  ' ': 'jump',
  s: 'slide',
  arrowdown: 'slide',
  escape: 'pause',
  p: 'pause',
}

const SWIPE_COOLDOWN_MS = 80

export function swipeThreshold(width: number, height: number): number {
  return Math.max(16, Math.min(width, height) * 0.04)
}

export function readSwipe(dx: number, dy: number, threshold: number): GameAction | null {
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)
  if (absX < threshold && absY < threshold) return null
  if (absX >= absY) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'slide' : 'jump'
}

export class InputManager {
  private handlers: InputHandlers
  private pointers = new Map<number, PointerState>()
  private element: HTMLElement
  private disposed = false

  constructor(element: HTMLElement, handlers: InputHandlers) {
    this.element = element
    this.handlers = handlers
    window.addEventListener('keydown', this.onKeyDown, { passive: false })
    element.addEventListener('pointerdown', this.onPointerDown)
    window.addEventListener('pointermove', this.onPointerMove, { passive: false })
    window.addEventListener('pointerup', this.onPointerUp)
    window.addEventListener('pointercancel', this.onPointerCancel)
    element.addEventListener('contextmenu', this.onContext)
    element.addEventListener('touchstart', this.onTouchBlock, { passive: false })
    element.addEventListener('touchmove', this.onTouchBlock, { passive: false })
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    window.removeEventListener('keydown', this.onKeyDown)
    this.element.removeEventListener('pointerdown', this.onPointerDown)
    window.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerup', this.onPointerUp)
    window.removeEventListener('pointercancel', this.onPointerCancel)
    this.element.removeEventListener('contextmenu', this.onContext)
    this.element.removeEventListener('touchstart', this.onTouchBlock)
    this.element.removeEventListener('touchmove', this.onTouchBlock)
    this.pointers.clear()
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    const action = KEY_MAP[event.key.toLowerCase()]
    if (!action) return
    if (this.handlers.isGameplayActive()) {
      event.preventDefault()
      if (event.repeat && (action === 'left' || action === 'right')) return
      this.handlers.onAction(action)
    } else if (action === 'pause' && event.key.toLowerCase() === 'escape') {
      this.handlers.onAction(action)
    }
  }

  private onPointerDown = (event: PointerEvent): void => {
    const target = event.target as HTMLElement | null
    if (target?.closest('button, a, input, label, [role="dialog"]')) return
    if (!this.handlers.isGameplayActive()) return
    if (event.isPrimary === false) return
    try {
      this.element.setPointerCapture(event.pointerId)
    } catch {
      /* capture is optional on some hosts */
    }
    this.pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      fired: false,
      lastFire: 0,
    })
  }

  private onPointerMove = (event: PointerEvent): void => {
    const point = this.pointers.get(event.pointerId)
    if (!point || !this.handlers.isGameplayActive()) return
    event.preventDefault()
    this.applySwipe(point, event.clientX, event.clientY)
  }

  private onPointerUp = (event: PointerEvent): void => {
    const point = this.pointers.get(event.pointerId)
    this.release(event.pointerId)
    if (!point || !this.handlers.isGameplayActive()) return
    if (!point.fired) this.applySwipe(point, event.clientX, event.clientY)
  }

  private onPointerCancel = (event: PointerEvent): void => {
    this.release(event.pointerId)
  }

  private onContext = (event: Event): void => {
    if (this.handlers.isGameplayActive()) event.preventDefault()
  }

  private onTouchBlock = (event: TouchEvent): void => {
    if (!this.handlers.isGameplayActive()) return
    if ((event.target as HTMLElement | null)?.closest('button, a, input, label, [role="dialog"]')) return
    event.preventDefault()
  }

  private applySwipe(point: PointerState, x: number, y: number): void {
    const now = performance.now()
    if (now - point.lastFire < SWIPE_COOLDOWN_MS) return
    const action = readSwipe(x - point.x, y - point.y, swipeThreshold(window.innerWidth, window.innerHeight))
    if (!action) return
    this.handlers.onAction(action)
    point.x = x
    point.y = y
    point.fired = true
    point.lastFire = now
  }

  private release(id: number): void {
    this.pointers.delete(id)
    try {
      if (this.element.hasPointerCapture(id)) this.element.releasePointerCapture(id)
    } catch {
      /* already released */
    }
  }
}
