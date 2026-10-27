// Copied from food-friends: src/components/nav/NavDrawer.tsx — fixed to the viewport, version sits in flow beside the lockup, focus stays inside the dialog.

import { IconRefresh, IconX } from '@tabler/icons-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { BRAND_NAME, BrandLockup } from '@/components/brand/BrandLockup'
import { IconButton } from '@/components/ui/IconButton'

type Props = {
  /**
   * Drawer title. Omit (or pass the brand name) for the Leaderboards lockup;
   * any other string shows a plain heading (the User's display name).
   */
  title?: string
  /** Subtitle under a custom title. Ignored for the brand lockup. */
  tagline?: string
  onClose: () => void
  /** When set, shows a top-right refresh control to refetch server data. */
  onRefresh?: () => void | Promise<void>
  /** Show the app version beside the wordmark. Defaults to true. */
  showVersion?: boolean
  /** False while the panel is sliding off, or before it has slid in. */
  shown?: boolean
  children: ReactNode
}

const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

/**
 * Right-slide nav drawer (~90% width). The page stays mounted underneath.
 */
export function NavDrawer({
  title = BRAND_NAME,
  tagline = '',
  onClose,
  onRefresh,
  showVersion = true,
  shown = true,
  children,
}: Props) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const isBrand = title === BRAND_NAME

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!shown) return
    const previouslyFocused = document.activeElement
    panelRef.current?.querySelector<HTMLElement>('[data-nav-close]')?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)]
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return
      const active = document.activeElement
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus()
      }
    }
    // Re-run only when the drawer opens or closes. A new onClose must not pull focus back to Close.
  }, [shown])

  async function handleRefresh() {
    if (!onRefresh || isRefreshing) return
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50"
      inert={!shown}
      aria-hidden={shown ? undefined : true}
    >
      <button
        type="button"
        aria-label="Dismiss navigation"
        className={`absolute inset-0 bg-ink/25 motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-out ${shown ? 'pointer-events-auto opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`absolute inset-y-0 right-0 flex h-full w-[90%] max-w-md flex-col bg-white shadow-2xl motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out ${shown ? 'pointer-events-auto translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-start justify-between gap-2 border-b border-neutral-100 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4">
          <div className="min-w-0 flex-1">
            {isBrand ? (
              <div className="flex min-w-0 flex-wrap items-start gap-x-1">
                <BrandLockup
                  className="min-w-0"
                  titleAs="h1"
                  titleId={titleId}
                  titleClassName="text-lg leading-tight break-words"
                />
                {showVersion ? (
                  <p className="shrink-0 pt-0.5 text-xs leading-none text-neutral-400">
                    v{__APP_VERSION__}
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <h1
                  id={titleId}
                  className="truncate font-display text-2xl tracking-tight text-ink"
                >
                  {title}
                </h1>
                {tagline ? (
                  <p className="mt-1 text-sm text-neutral-600">{tagline}</p>
                ) : null}
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onRefresh ? (
              <IconButton
                aria-label="Refresh"
                disabled={isRefreshing}
                className="h-10 w-10 disabled:cursor-wait"
                onClick={() => {
                  void handleRefresh()
                }}
              >
                <IconRefresh
                  size={22}
                  stroke={1.75}
                  className={isRefreshing ? 'animate-spin' : undefined}
                  aria-hidden
                />
              </IconButton>
            ) : null}
            <IconButton
              data-nav-close
              aria-label="Close"
              className="h-10 w-10"
              onClick={onClose}
            >
              <IconX size={22} stroke={1.75} aria-hidden />
            </IconButton>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  )
}
