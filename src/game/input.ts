export type GameAction = 'left' | 'right' | 'jump' | 'slide' | 'pause'

type InputHandlers = {
  onAction: (action: GameAction) => void
  isGameplayActive: () => boolean
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

export class InputManager {
  private handlers: InputHandlers
  private pointers = new Map<number, { x: number; y: number }>()
  private element: HTMLElement
  private disposed = false

  constructor(element: HTMLElement, handlers: InputHandlers) {
    this.element = element
    this.handlers = handlers
    window.addEventListener('keydown', this.onKeyDown, { passive: false })
    element.addEventListener('pointerdown', this.onPointerDown)
    element.addEventListener('pointerup', this.onPointerUp)
    element.addEventListener('pointercancel', this.onPointerCancel)
    element.addEventListener('contextmenu', this.onContext)
    element.addEventListener('touchmove', this.onTouchMove, { passive: false })
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    window.removeEventListener('keydown', this.onKeyDown)
    this.element.removeEventListener('pointerdown', this.onPointerDown)
    this.element.removeEventListener('pointerup', this.onPointerUp)
    this.element.removeEventListener('pointercancel', this.onPointerCancel)
    this.element.removeEventListener('contextmenu', this.onContext)
    this.element.removeEventListener('touchmove', this.onTouchMove)
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
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  }

  private onPointerUp = (event: PointerEvent): void => {
    const start = this.pointers.get(event.pointerId)
    this.pointers.delete(event.pointerId)
    if (!start || !this.handlers.isGameplayActive()) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    const absX = Math.abs(dx)
    const absY = Math.abs(dy)
    if (absX < 28 && absY < 28) return
    if (absX > absY) this.handlers.onAction(dx > 0 ? 'right' : 'left')
    else this.handlers.onAction(dy > 0 ? 'slide' : 'jump')
  }

  private onPointerCancel = (event: PointerEvent): void => {
    this.pointers.delete(event.pointerId)
  }

  private onContext = (event: Event): void => {
    if (this.handlers.isGameplayActive()) event.preventDefault()
  }

  private onTouchMove = (event: TouchEvent): void => {
    if (this.handlers.isGameplayActive()) event.preventDefault()
  }
}
