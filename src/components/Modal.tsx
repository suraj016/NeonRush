import type { ReactNode } from 'react'
import { Button } from './Button.tsx'

type Props = {
  title: string
  children: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function Modal({
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="panel">
        <h2 id="modal-title" className="title" style={{ fontSize: 24 }}>
          {title}
        </h2>
        <p className="subtitle" style={{ margin: '10px 0 18px' }}>
          {children}
        </p>
        <div className="stack">
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
