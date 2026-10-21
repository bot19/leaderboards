// Copied from food-friends: src/components/nav/NavFooter.tsx

import { IconLogout, IconX } from '@tabler/icons-react'

type Props = {
  onSignOut: () => void
  isSigningOut: boolean
  onClose: () => void
}

export function NavFooter({ onSignOut, isSigningOut, onClose }: Props) {
  return (
    <div className="flex gap-2 pt-2">
      <button
        type="button"
        onClick={onSignOut}
        disabled={isSigningOut}
        className="inline-flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-3 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <IconLogout size={18} stroke={1.75} aria-hidden />
        {isSigningOut ? 'Signing out…' : 'Sign out'}
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
