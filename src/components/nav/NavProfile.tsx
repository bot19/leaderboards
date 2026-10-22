// Copied from food-friends: src/components/nav/NavProfile.tsx — second line is the User's Ladder count.

import { IconChevronRight } from '@tabler/icons-react'
import { UserAvatar } from '@/components/user/UserAvatar'

type Props = {
  displayName: string
  ladderLabel: string
  onOpenProfile: () => void
}

export function NavProfile({ displayName, ladderLabel, onOpenProfile }: Props) {
  return (
    <section aria-labelledby="nav-profile-heading" className="space-y-3">
      <h2
        id="nav-profile-heading"
        className="text-xs font-semibold tracking-wide text-neutral-500 uppercase"
      >
        Profile
      </h2>
      <button
        type="button"
        onClick={onOpenProfile}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-left hover:bg-neutral-100"
      >
        <UserAvatar
          username={displayName}
          className="h-14 w-14 rounded-lg text-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{displayName}</p>
          <p className="mt-0.5 truncate text-sm text-neutral-600">{ladderLabel}</p>
        </div>
        <IconChevronRight
          size={18}
          stroke={1.75}
          className="shrink-0 text-neutral-400"
          aria-hidden
        />
      </button>
    </section>
  )
}
