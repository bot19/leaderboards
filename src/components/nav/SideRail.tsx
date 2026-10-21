// Copied from food-friends: src/components/nav/MapControlsRail.tsx — buttons are children, fixed to the viewport, no hide-while-panel behaviour.

import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

/**
 * Right-edge tools. Flush to the viewport edge; left corners rounded.
 * Under the nav drawer (z-50) and Record Match (z-40).
 */
export function SideRail({ children }: Props) {
  return (
    <div className="pointer-events-none fixed inset-y-0 right-0 z-30">
      <div className="pointer-events-auto absolute top-[60%] right-0 -translate-y-1/2 sm:top-1/2">
        <nav
          aria-label="Side menu"
          className="flex flex-col items-center gap-1.5 rounded-l-2xl bg-white/95 py-1.5 pr-[max(0.375rem,env(safe-area-inset-right))] pl-1.5 shadow-lg backdrop-blur"
        >
          {children}
        </nav>
      </div>
    </div>
  )
}
