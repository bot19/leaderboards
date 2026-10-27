import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/features/auth/authContext'

type AppSearch = {
  nav?: 'menu' | 'profile'
  tab?: 'leaderboard' | 'matches' | 'members'
  record?: 'open'
  redirect?: string
}

type SearchNavigate = (options: {
  to: '/ladders/$ladderId'
  params: { ladderId: string }
  search: (prev: AppSearch) => AppSearch
}) => Promise<void>

/** Refresh the Ladder list and profile, close the drawer, and open the Leaderboard. */
export function useOpenLadder() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { refreshProfile } = useAuth()

  return async (ladderId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['my-ladders'] }),
      refreshProfile(),
    ])
    const go = navigate as unknown as SearchNavigate
    await go({
      to: '/ladders/$ladderId',
      params: { ladderId },
      search: (prev) => ({
        ...prev,
        tab: 'leaderboard',
        nav: undefined,
      }),
    })
  }
}
