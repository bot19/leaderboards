// Copied from bao-ui: src/components/user/UserAvatar.tsx

import type { ComponentPropsWithoutRef } from 'react'
import { colorFromSeed, initialsFromName } from '@/lib/avatar'

type Props = Omit<ComponentPropsWithoutRef<'span'>, 'children'> & {
  username: string
}

const baseClasses =
  'flex shrink-0 items-center justify-center font-display tracking-tight text-white'
const defaultClasses = 'h-10 w-10 rounded-lg text-sm font-semibold'

/**
 * Stable initials avatar for a user.
 *
 * `className` replaces the default dimensions, shape, and letter size while
 * retaining the shared layout, display font, tracking, and text colour.
 */
export function UserAvatar({ username, className, style, ...props }: Props) {
  return (
    <span
      aria-hidden
      {...props}
      className={`${baseClasses} ${className ?? defaultClasses}`}
      style={{ backgroundColor: colorFromSeed(username), ...style }}
    >
      {initialsFromName(username)}
    </span>
  )
}
