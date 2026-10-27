// Copied from food-friends: src/components/nav/MapNavBar.tsx — buttons are children; fixed to the viewport (MapNavBar is absolute over a map).

import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

/**
 * Bottom padding for `<main>` so the last row scrolls clear of the floating bar,
 * including `env(safe-area-inset-bottom)` on an iPhone home-screen app.
 */
export const bottomNavMainPaddingClass =
  'pb-[calc(5.5rem+env(safe-area-inset-bottom))]'

/**
 * Primary chrome. Fixed to the viewport bottom; under Record Match (z-40) and
 * the nav drawer (z-50).
 */
export function BottomNavBar({ children }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <nav aria-label="Primary" className="pointer-events-auto">
        <div className="flex w-max items-end justify-between gap-3 rounded-2xl bg-white/95 px-5 py-3 shadow-lg backdrop-blur">
          {children}
        </div>
      </nav>
    </div>
  )
}
