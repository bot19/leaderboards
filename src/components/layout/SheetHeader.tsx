// Copied from bao-ui: src/components/layout/SheetHeader.tsx

import { IconX } from '@tabler/icons-react'
import type {
  PointerEventHandler,
  ReactNode,
  RefObject,
} from 'react'
import { IconButton } from '@/components/ui/IconButton'

export type SheetHeaderDragHandlers = {
  onPointerDown: PointerEventHandler<HTMLDivElement>
  onPointerMove: PointerEventHandler<HTMLDivElement>
  onPointerUp: PointerEventHandler<HTMLDivElement>
  onPointerCancel: PointerEventHandler<HTMLDivElement>
}

type Props = {
  titleId: string
  title: string
  leading?: ReactNode
  closeRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  /**
   * Mobile sheet drag. When set, the header shows the grabber band and
   * receives pointer handlers. Omit on desktop modals.
   */
  dragHandlers?: SheetHeaderDragHandlers
}

/**
 * Shared chrome for FloatingPanel sheets: optional mobile grabber + title +
 * close. Drag attaches to the whole header (not the pill alone) so the hit
 * area stays consistent across Place / Activity / Search / Add review.
 */
export function SheetHeader({
  titleId,
  title,
  leading,
  closeRef,
  onClose,
  dragHandlers,
}: Props) {
  const draggable = dragHandlers != null

  return (
    <div
      {...dragHandlers}
      data-sheet-header=""
      className={
        draggable
          ? 'relative shrink-0 touch-none select-none'
          : 'relative shrink-0'
      }
    >
      {draggable ? (
        // Absolute so the pill rides in the title row's top padding: the
        // grabber adds no height, but the drag hit area is the whole header.
        <div
          className="pointer-events-none absolute inset-x-0 top-1.5 flex justify-center"
          aria-hidden="true"
        >
          <span className="h-1.5 w-10 rounded-full bg-neutral-300" />
        </div>
      ) : null}

      <div className="flex min-w-0 items-center gap-3 border-b border-neutral-100 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {leading}
          <h1
            id={titleId}
            className="min-w-0 truncate font-display text-lg text-ink"
          >
            {title}
          </h1>
        </div>
        <IconButton ref={closeRef} aria-label="Close" onClick={onClose}>
          <IconX size={20} stroke={1.75} />
        </IconButton>
      </div>
    </div>
  )
}
