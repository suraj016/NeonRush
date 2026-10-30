import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { getEngine } from '../game/bridge.ts'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  children: ReactNode
}

export function Button({ variant = 'secondary', className = '', onClick, children, ...rest }: Props) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} ${className}`}
      onClick={(event) => {
        getEngine()?.uiClick()
        onClick?.(event)
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
