// Copied from bao-ui: src/components/ui/InfoBox.tsx

import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconInfoCircle,
  IconMessageCircle,
  type Icon,
} from '@tabler/icons-react'
import type { ReactNode } from 'react'

export type InfoBoxVariant =
  | 'error'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'success'

type Props = {
  variant?: InfoBoxVariant
  children: ReactNode
}

const variants: Record<
  InfoBoxVariant,
  { className: string; iconClassName: string; icon: Icon }
> = {
  error: {
    className: 'border-red-200 bg-red-50 text-red-900',
    iconClassName: 'text-red-600',
    icon: IconCircleX,
  },
  warning: {
    className: 'border-orange-200 bg-orange-50 text-orange-900',
    iconClassName: 'text-orange-600',
    icon: IconAlertTriangle,
  },
  info: {
    className: 'border-blue-200 bg-blue-50 text-blue-900',
    iconClassName: 'text-blue-600',
    icon: IconInfoCircle,
  },
  neutral: {
    className: 'border-neutral-200 bg-neutral-50 text-neutral-800',
    iconClassName: 'text-neutral-500',
    icon: IconMessageCircle,
  },
  success: {
    className: 'border-green-200 bg-green-50 text-green-900',
    iconClassName: 'text-green-600',
    icon: IconCircleCheck,
  },
}

export function InfoBox({ variant = 'info', children }: Props) {
  const styles = variants[variant]
  const StatusIcon = styles.icon

  return (
    <div
      role={variant === 'error' ? 'alert' : 'note'}
      className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm ${styles.className}`}
    >
      <StatusIcon
        size={19}
        stroke={1.75}
        className={`mt-0.5 shrink-0 ${styles.iconClassName}`}
        aria-hidden
      />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
