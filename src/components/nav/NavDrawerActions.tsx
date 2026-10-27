// Copied from food-friends: src/components/user/UserProfilePanel.tsx (UserDrawerActions)

import { IconMenu2, IconX } from '@tabler/icons-react'

type Props = {
  onOpenNav: () => void
  onClose: () => void
}

export function NavDrawerActions({ onOpenNav, onClose }: Props) {
  return (
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        onClick={onOpenNav}
        className="inline-flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-3 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
      >
        <IconMenu2 size={18} stroke={1.75} />
        Nav
      </button>
      <button
        type="button"
        data-nav-close
        onClick={onClose}
        className="inline-flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-3 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
      >
        <IconX size={18} stroke={1.75} />
        Close
      </button>
    </div>
  )
}
