import { IconMenu2 } from '@tabler/icons-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { useCallback, useState, type ReactNode } from 'react'
import { BottomNavBar } from '@/components/nav/BottomNavBar'
import { NavDrawer } from '@/components/nav/NavDrawer'
import { NavDrawerActions } from '@/components/nav/NavDrawerActions'
import { NavFooter } from '@/components/nav/NavFooter'
import { NavProfile } from '@/components/nav/NavProfile'
import { IconButton } from '@/components/ui/IconButton'
import { UserAvatar } from '@/components/user/UserAvatar'
import { useSignOut } from '@/data/auth'
import { fetchLadderMember, listMyLadders } from '@/data/ladder'
import { useAuth } from '@/features/auth/authContext'
import { LaddersSection } from '@/features/ladders/LaddersSection'
import { DisplayNameForm } from './DisplayNameForm'
import { MemberPanel } from './MemberPanel'
import { ladderCountLabel, type NavView } from './navSearch'

type AppSearch = {
  nav?: NavView
  member?: string
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
  /** Bar buttons between the avatar and Nav. */
  barBeforeNav?: ReactNode
}

/** Scrollable middle of the drawer. Side inset is 20px; 16px where it meets the header and footer. */
const drawerContentClass = 'min-h-0 flex-1 overflow-y-auto px-5 py-4'

/** Pinned bottom of the drawer. Owns the side inset, the divider, and the bottom safe area. */
const drawerFooterClass =
  'shrink-0 border-t border-neutral-100 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]'

export function SignedInChrome({ barBeforeNav }: Props) {
  const { profile, refreshProfile } = useAuth()
  const { nav, member: memberId } = useSearch({ from: '__root__' })
  const navigate = useNavigate()
  const router = useRouter()
  const queryClient = useQueryClient()
  const signOut = useSignOut()
  const ladders = useQuery({
    queryKey: ['my-ladders'],
    queryFn: () => listMyLadders(),
  })
  const member = useQuery({
    queryKey: ['ladder-member', memberId],
    queryFn: () => {
      if (!memberId) throw new Error('Missing Ladder member id')
      return fetchLadderMember(memberId)
    },
    enabled: Boolean(memberId) && nav === 'member',
  })

  const isOpen = nav === 'menu' || nav === 'profile' || nav === 'member'
  // Remember the open view so the panel can slide out without swapping content.
  const [view, setView] = useState<NavView>(
    nav === 'profile' || nav === 'member' ? nav : 'menu',
  )
  const [prevNav, setPrevNav] = useState(nav)
  if (nav !== prevNav) {
    setPrevNav(nav)
    if (nav === 'menu' || nav === 'profile' || nav === 'member') {
      setView(nav)
    }
  }

  const setNav = useCallback(
    (next: NavView) => {
      setView(next)
      const open = router.state.location.search.nav
      const drawerOpen = open === 'menu' || open === 'profile' || open === 'member'
      // useNavigate() isn't tied to one route, so its search callback types as never.
      void updateSearch(
        navigate as unknown as SearchNavigate,
        (prev) => ({
          ...prev,
          nav: next,
          member: next === 'member' ? prev.member : undefined,
        }),
        drawerOpen,
      )
    },
    [navigate, router],
  )

  const close = useCallback(() => {
    void updateSearch(
      navigate as unknown as SearchNavigate,
      (prev) => ({ ...prev, nav: undefined, member: undefined }),
      true,
    )
  }, [navigate])

  const openMenu = useCallback(() => {
    setView('menu')
    void updateSearch(
      navigate as unknown as SearchNavigate,
      (prev) => ({ ...prev, nav: 'menu', member: undefined }),
      true,
    )
  }, [navigate])

  const refresh = useCallback(async () => {
    await Promise.all([queryClient.invalidateQueries(), refreshProfile()])
  }, [queryClient, refreshProfile])

  const handleSignOut = useCallback(() => {
    void signOut.mutateAsync().then(() => navigate({ to: '/login' }))
  }, [navigate, signOut])

  if (!profile) return null

  const profileOpen = nav === 'profile'
  const menuOpen = nav === 'menu'
  const drawerTitle =
    view === 'profile'
      ? profile.displayName
      : view === 'member'
        ? (member.data?.displayName ?? 'Ladder member')
        : undefined
  const drawerTagline = view === 'member' ? (member.data?.ladderName ?? '') : undefined

  return (
    <>
      <BottomNavBar>
        <button
          type="button"
          aria-label="Profile"
          aria-current={profileOpen ? 'page' : undefined}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${
            profileOpen
              ? 'bg-ink text-white hover:bg-neutral-800 hover:text-white'
              : 'hover:bg-neutral-300'
          }`}
          onClick={() => setNav('profile')}
        >
          <UserAvatar
            username={profile.displayName}
            className="h-10 w-10 rounded-lg text-xs font-semibold !tracking-normal"
          />
        </button>
        {barBeforeNav}
        <IconButton
          aria-label="Nav"
          isActive={menuOpen}
          className="h-10 w-10"
          onClick={() => setNav('menu')}
        >
          <IconMenu2 size={22} stroke={1.75} />
        </IconButton>
      </BottomNavBar>
      <NavDrawer
        shown={isOpen}
        title={drawerTitle}
        tagline={drawerTagline}
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
        ) : view === 'member' && memberId ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className={drawerContentClass}>
              <MemberPanel memberId={memberId} />
            </div>
            <div className={drawerFooterClass}>
              <NavDrawerActions onOpenNav={openMenu} onClose={close} />
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className={drawerContentClass}>
              <DisplayNameForm />
            </div>
            <div className={drawerFooterClass}>
              <NavDrawerActions onOpenNav={openMenu} onClose={close} />
            </div>
          </div>
        )}
      </NavDrawer>
    </>
  )
}
