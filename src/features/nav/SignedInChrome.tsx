import { IconMenu2 } from '@tabler/icons-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { useCallback, useState, type ReactNode } from 'react'
import { NavDrawer } from '@/components/nav/NavDrawer'
import { NavDrawerActions } from '@/components/nav/NavDrawerActions'
import { NavFooter } from '@/components/nav/NavFooter'
import { NavProfile } from '@/components/nav/NavProfile'
import { SideRail } from '@/components/nav/SideRail'
import { IconButton } from '@/components/ui/IconButton'
import { UserAvatar } from '@/components/user/UserAvatar'
import { useSignOut } from '@/data/auth'
import { listMyLadders } from '@/data/ladder'
import { useAuth } from '@/features/auth/authContext'
import { LaddersSection } from '@/features/ladders/LaddersSection'
import { DisplayNameForm } from './DisplayNameForm'
import { ladderCountLabel, type NavView } from './navSearch'

type AppSearch = {
  nav?: NavView
  tab?: 'leaderboard' | 'matches' | 'members'
  record?: 'open'
  redirect?: string
}

type SearchNavigate = (options: {
  search: (prev: AppSearch) => AppSearch
  replace?: boolean
}) => Promise<void>

/** useNavigate() has no single `from` route here, so its search callback types as never. */
function updateSearch(
  navigate: SearchNavigate,
  search: (prev: AppSearch) => AppSearch,
  replace?: boolean,
) {
  void navigate({ search, replace })
}

type Props = {
  /** Rail buttons between the avatar and Nav. */
  railBeforeNav?: ReactNode
}

/** Scrollable middle of the drawer. Side inset is 20px; 16px where it meets the header and footer. */
const drawerContentClass = 'min-h-0 flex-1 overflow-y-auto px-5 py-4'

/** Pinned bottom of the drawer. Owns the side inset, the divider, and the bottom safe area. */
const drawerFooterClass =
  'shrink-0 border-t border-neutral-100 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]'

export function SignedInChrome({ railBeforeNav }: Props) {
  const { profile, refreshProfile } = useAuth()
  const { nav } = useSearch({ from: '__root__' })
  const navigate = useNavigate()
  const router = useRouter()
  const queryClient = useQueryClient()
  const signOut = useSignOut()
  const ladders = useQuery({
    queryKey: ['my-ladders'],
    queryFn: () => listMyLadders(),
  })

  const isOpen = nav === 'menu' || nav === 'profile'
  // Remember the open view so the panel can slide out without swapping content.
  const [view, setView] = useState<NavView>(nav === 'profile' ? 'profile' : 'menu')

  const setNav = useCallback(
    (next: NavView) => {
      setView(next)
      const open = router.state.location.search.nav
      // useNavigate() isn't tied to one route, so its search callback types as never.
      void updateSearch(navigate as unknown as SearchNavigate, (prev) => ({ ...prev, nav: next }), open === 'menu' || open === 'profile')
    },
    [navigate, router],
  )

  const close = useCallback(() => {
    void updateSearch(navigate as unknown as SearchNavigate, (prev) => ({ ...prev, nav: undefined }), true)
  }, [navigate])

  const refresh = useCallback(async () => {
    await Promise.all([queryClient.invalidateQueries(), refreshProfile()])
  }, [queryClient, refreshProfile])

  const handleSignOut = useCallback(() => {
    void signOut.mutateAsync().then(() => navigate({ to: '/login' }))
  }, [navigate, signOut])

  if (!profile) return null

  return (
    <>
      <SideRail>
        <button
          type="button"
          aria-label="Profile"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-neutral-300"
          onClick={() => setNav('profile')}
        >
          <UserAvatar username={profile.displayName} />
        </button>
        {railBeforeNav}
        <IconButton
          aria-label="Nav"
          className="h-10 w-10"
          onClick={() => setNav('menu')}
        >
          <IconMenu2 size={22} stroke={1.75} />
        </IconButton>
      </SideRail>
      <NavDrawer
        shown={isOpen}
        title={view === 'profile' ? profile.displayName : undefined}
        showVersion={view === 'menu'}
        onRefresh={view === 'menu' ? refresh : undefined}
        onClose={close}
      >
        {view === 'menu' ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className={drawerContentClass}>
              <LaddersSection idPrefix="drawer-" variant="drawer" />
            </div>
            <div className={`${drawerFooterClass} space-y-3`}>
              <NavProfile
                displayName={profile.displayName}
                ladderLabel={ladderCountLabel(ladders.data?.length)}
                onOpenProfile={() => setNav('profile')}
              />
              <NavFooter
                onSignOut={handleSignOut}
                isSigningOut={signOut.isPending}
                onClose={close}
              />
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className={drawerContentClass}>
              <DisplayNameForm />
            </div>
            <div className={drawerFooterClass}>
              <NavDrawerActions onOpenNav={() => setNav('menu')} onClose={close} />
            </div>
          </div>
        )}
      </NavDrawer>
    </>
  )
}
