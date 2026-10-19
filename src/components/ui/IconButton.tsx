// Copied from bao-ui: src/components/ui/IconButton.tsx

import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'

export type IconButtonVariant = 'surface' | 'elevated'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** Accessible label is required because this button has no visible text. */
  'aria-label': string
  variant?: IconButtonVariant
  isActive?: boolean
  statusIndicator?: ReactNode
  ref?: Ref<HTMLButtonElement>
  children: ReactNode
}

const BASE =
  'inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md active:bg-ink active:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-800 disabled:cursor-not-allowed disabled:opacity-50'

const VARIANT_STRUCTURE: Record<IconButtonVariant, string> = {
  surface: '',
  elevated: 'border border-neutral-200 shadow-md',
}

const VARIANT_COLORS: Record<IconButtonVariant, string> = {
  surface:
    'bg-transparent text-neutral-700 hover:bg-neutral-300 hover:text-ink',
  elevated:
    'bg-white text-neutral-700 hover:bg-neutral-50 hover:text-ink',
}

export function IconButton({
  variant = 'surface',
  isActive = false,
  statusIndicator,
  className = '',
  type = 'button',
  children,
  ...buttonProps
}: Props) {
  const visualClass = isActive
    ? 'bg-ink text-white hover:bg-neutral-800 hover:text-white'
    : VARIANT_COLORS[variant]
  const indicatorClass = statusIndicator != null ? 'relative' : ''

  return (
    <button
      {...buttonProps}
      type={type}
      aria-current={isActive ? 'page' : buttonProps['aria-current']}
      className={`${BASE} ${VARIANT_STRUCTURE[variant]} ${visualClass} ${indicatorClass} ${className}`}
    >
      {children}
      {statusIndicator != null ? (
        <span
          aria-hidden
          className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-primary px-1 text-[10px] leading-none font-semibold text-white shadow-sm"
        >
          {statusIndicator}
        </span>
      ) : null}
    </button>
  )
}
