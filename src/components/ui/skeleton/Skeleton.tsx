// Copied from bao-ui: src/components/ui/skeleton/Skeleton.tsx

import type { CSSProperties, ReactNode } from 'react'

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

type BoxProps = {
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

/** Base shimmer surface — size/shape via className. */
export function SkeletonBlock({ className, style, children }: BoxProps) {
  return (
    <div aria-hidden className={cx('skeleton-shimmer', className)} style={style}>
      {children}
    </div>
  )
}

/** Single text-line placeholder (default ~text-sm line box). */
export function SkeletonText({ className }: { className?: string }) {
  return <SkeletonBlock className={cx('h-4 rounded', className ?? 'w-2/3')} />
}

type CircleProps = {
  /** Pixel diameter (width + height). */
  size?: number
  className?: string
  /** Optional muted icon centred in the circle (e.g. bookmark). */
  icon?: ReactNode
}

/** Circular badge / avatar / header leading placeholder. */
export function SkeletonCircle({ size = 32, className, icon }: CircleProps) {
  return (
    <SkeletonBlock
      className={cx(
        'relative flex shrink-0 items-center justify-center rounded-full',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {icon ? (
        <span className="text-neutral-400/70" aria-hidden>
          {icon}
        </span>
      ) : null}
    </SkeletonBlock>
  )
}

type IconBoxProps = {
  className?: string
  icon?: ReactNode
}

/** Rounded rect with optional centred icon (covers, thumbs). */
export function SkeletonIconBox({ className, icon }: IconBoxProps) {
  return (
    <SkeletonBlock
      className={cx(
        'relative flex items-center justify-center rounded-xl',
        className,
      )}
    >
      {icon ? (
        <span className="text-neutral-400/70" aria-hidden>
          {icon}
        </span>
      ) : null}
    </SkeletonBlock>
  )
}

type CoverProps = {
  /**
   * `photo` = PlaceDetail photo cover (h-44).
   * `fallback` = colour/icon cover (h-22).
   * `fill` = stretch to a sized parent (e.g. SkeletonImage frame).
   */
  size?: 'fallback' | 'photo' | 'fill'
  icon?: ReactNode
  className?: string
}

/** Place panel cover placeholder — same footprint as the real cover. */
export function SkeletonCover({
  size = 'fallback',
  icon,
  className,
}: CoverProps) {
  const sizeClass =
    size === 'photo'
      ? 'h-44 w-full'
      : size === 'fill'
        ? 'h-full w-full'
        : 'h-22 w-full'
  return (
    <SkeletonIconBox className={cx(sizeClass, className)} icon={icon} />
  )
}

/**
 * Header rating pill — matches `rounded-full px-2.5 py-1 text-sm` leading.
 * Slightly wider than tall so it reads as a badge, not a pin.
 */
export function SkeletonRatingPill({ className }: { className?: string }) {
  return (
    <SkeletonBlock
      className={cx('h-8 min-w-10 shrink-0 rounded-full', className)}
    />
  )
}

type ListRowsProps = {
  count?: number
  /** Thumb size class, e.g. h-14 w-14 rounded-lg. */
  thumbClassName?: string
  /** Per-row padding / borders to match the real list item. */
  rowClassName?: string
  className?: string
  thumbIcon?: ReactNode
  /** Second text line — set false for single-line rows (friends). */
  showSubline?: boolean
}

/** Stack of list-row placeholders (activity, reviews, friends, savers). */
export function SkeletonListRows({
  count = 3,
  thumbClassName = 'h-14 w-14 rounded-lg',
  rowClassName = 'py-3',
  className,
  thumbIcon,
  showSubline = true,
}: ListRowsProps) {
  return (
    <div className={cx('space-y-0', className)} aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={cx('flex items-center gap-3', rowClassName)}
        >
          <SkeletonIconBox
            className={cx('shrink-0', thumbClassName)}
            icon={thumbIcon}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonText className="w-2/3" />
            {showSubline ? <SkeletonText className="w-1/3" /> : null}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Full place-panel body while the map place row is still loading. */
export function SkeletonPlacePanel() {
  return (
    <div className="space-y-5" aria-hidden>
      <SkeletonCover size="photo" />
      <div className="space-y-2">
        <SkeletonText className="w-3/4" />
        <SkeletonText className="w-1/2" />
        <SkeletonText className="mt-1 w-48" />
      </div>
      {/* Primary teaser card ≈ p-4 block. */}
      <SkeletonBlock className="h-28 w-full rounded-xl" />
      {/* CTA row ≈ py-2.5 buttons. */}
      <div className="flex gap-2">
        <SkeletonBlock className="h-10 min-w-0 flex-1 rounded-md" />
        <SkeletonBlock className="h-10 min-w-0 flex-1 rounded-md" />
      </div>
    </div>
  )
}
