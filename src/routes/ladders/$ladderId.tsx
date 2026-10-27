import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { IconLink, IconList, IconPlus } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { bottomNavMainPaddingClass } from '@/components/nav/BottomNavBar'
import { IconButton } from '@/components/ui/IconButton'
import { fetchLadder, fetchShareToken, listLadderMembers, listLeaderboard } from '@/data/ladder'
import { countMatches } from '@/data/match'
import { useAuth } from '@/features/auth/authContext'
import { GameIcon } from '@/features/ladders/GameIcon'
import { JoinCodeCard } from '@/features/ladders/JoinCodeCard'
import { LeaderboardPanel } from '@/features/ladders/LeaderboardPanel'
import { MembersPanel } from '@/features/ladders/MembersPanel'
import { ladderSearchSchema, ladderTabs, type LadderTab } from '@/features/ladders/search'
import { MatchHistory } from '@/features/matches/MatchHistory'
import { RecordMatchPanel } from '@/features/matches/RecordMatchPanel'
import { WaitingForYou } from '@/features/matches/WaitingForYou'
import { SignedInChrome } from '@/features/nav/SignedInChrome'
import { resolveAuthDestination } from '@/lib/authDestination'

const textItemClass = 'inline-flex items-center gap-1 text-base leading-5 text-neutral-700'
const textLinkClass = `${textItemClass} underline hover:text-ink`

const tabLabel: Record<LadderTab, string> = {
  leaderboard: 'Leaderboard',
  matches: 'Matches',
  members: 'Ladder members',
}

export const Route = createFileRoute('/ladders/$ladderId')({
  validateSearch: ladderSearchSchema,
  beforeLoad: ({ context }) => {
    if (context.auth.isLoading) return
    const destination = resolveAuthDestination({
      session: context.auth.session,
      profile: context.auth.profile,
    })
    if (destination === '/login' || destination === '/onboarding') {
      throw redirect({ to: destination })
    }
  },
  component: LadderPage,
})

function LadderPage() {
  const { ladderId } = Route.useParams()
  const { tab, record } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { profile } = useAuth()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const ladder = useQuery({
    queryKey: ['ladder', ladderId],
    queryFn: () => fetchLadder(ladderId),
  })
  const shareToken = useQuery({
    queryKey: ['share-token', ladderId],
    queryFn: () => fetchShareToken(ladderId),
    enabled: Boolean(ladder.data),
  })
  const shareLink = shareToken.data
    ? `${window.location.origin}/join/${shareToken.data}`
    : null
  const leaderboard = useQuery({
    queryKey: ['leaderboard', ladderId],
    queryFn: () => listLeaderboard(ladderId),
    enabled: Boolean(ladder.data),
  })
  const matchCount = useQuery({
    queryKey: ['matches', ladderId, 'count'],
    queryFn: () => countMatches(ladderId),
    enabled: Boolean(ladder.data),
  })
  const ladderMembers = useQuery({
    queryKey: ['ladder-members', ladderId],
    queryFn: () => listLadderMembers(ladderId),
    enabled: Boolean(ladder.data),
  })
  const counts: Record<LadderTab, number | null> = {
    leaderboard: leaderboard.data ? leaderboard.data.length : null,
    matches: matchCount.data == null ? null : matchCount.data,
    members: ladderMembers.data
      ? ladderMembers.data.filter((entry) => entry.status === 'active').length
      : null,
  }

  useEffect(() => {
    if (copyState === 'idle') return
    const timer = window.setTimeout(() => setCopyState('idle'), 2000)
    return () => window.clearTimeout(timer)
  }, [copyState])

  function openRecord() {
    void navigate({
      search: (prev) => ({ ...prev, record: 'open' }),
    })
  }

  if (!profile) return null

  return (
    <>
    <main className={`mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 pt-5 ${bottomNavMainPaddingClass}`}>
      <div className="min-w-0 space-y-2">
        <div className="flex min-w-0 flex-nowrap items-center gap-2">
          <button
            type="button"
            className={`${textLinkClass} shrink-0`}
            onClick={() => {
              void navigate({
                search: (prev) => ({ ...prev, nav: 'menu' }),
              })
            }}
          >
            <IconList size={16} stroke={1.75} aria-hidden />
            Ladders
          </button>
          {ladder.data ? (
            <>
              <span aria-hidden className="text-neutral-400">·</span>
              <span className={`${textItemClass} min-w-0`}>
                <GameIcon gameName={ladder.data.gameName} />
                <span className="truncate">{ladder.data.gameName}</span>
              </span>
            </>
          ) : null}
          {shareLink ? (
            <>
              <span aria-hidden className="text-neutral-400">·</span>
              <button
                type="button"
                className={`${textLinkClass} shrink-0`}
                aria-expanded={inviteOpen}
                onClick={() => setInviteOpen((open) => !open)}
              >
                <IconLink size={16} stroke={1.75} aria-hidden />
                Invite
              </button>
            </>
          ) : null}
        </div>
        {inviteOpen && shareToken.data && shareLink ? (
          <JoinCodeCard
            code={shareToken.data}
            copyState={copyState}
            onCopyCode={() => {
              const code = shareToken.data
              if (!code) return
              void navigator.clipboard.writeText(code).then(
                () => setCopyState('copied'),
                () => setCopyState('failed'),
              )
            }}
            onCopyLink={() => {
              void navigator.clipboard.writeText(shareLink).then(
                () => toast.success('Share link copied'),
                () => toast.error('Could not copy the Share link'),
              )
            }}
          />
        ) : null}
        {ladder.isLoading ? <p className="text-neutral-600">Loading Ladder…</p> : null}
        {ladder.data ? (
          <h1 className="break-words font-display text-3xl text-ink">{ladder.data.name}</h1>
        ) : null}
        {ladder.isSuccess && !ladder.data ? (
          <h1 className="font-display text-3xl text-ink">This Ladder is not available.</h1>
        ) : null}
      </div>
      {ladder.data ? (
        <>
          <div className="flex min-w-0 flex-wrap gap-2" role="tablist" aria-label="Ladder">
            {ladderTabs.map((item) => {
              const count = counts[item]
              const label = tabLabel[item]
              return (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={tab === item}
                  aria-label={count == null ? label : `${label}, ${count}`}
                  className={
                    tab === item
                      ? 'rounded-full bg-ink px-3 py-1.5 text-sm font-medium text-white'
                      : 'rounded-full bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm'
                  }
                  onClick={() => {
                    void navigate({
                      search: (prev) => ({
                        ...prev,
                        tab: item,
                      }),
                    })
                  }}
                >
                  {label}
                  {count != null ? <span className="opacity-60"> · {count}</span> : null}
                </button>
              )
            })}
          </div>
          <WaitingForYou ladderId={ladderId} />
          {tab === 'leaderboard' ? <LeaderboardPanel ladderId={ladderId} /> : null}
          {tab === 'matches' ? <MatchHistory ladderId={ladderId} /> : null}
          {tab === 'members' ? <MembersPanel ladderId={ladderId} /> : null}
        </>
      ) : null}
      {ladder.data && record === 'open' ? (
        <RecordMatchPanel
          ladderId={ladderId}
          onClose={() => {
            void navigate({
              search: (prev) => ({ ...prev, record: undefined }),
            })
          }}
        />
      ) : null}
    </main>
    <SignedInChrome
      barBeforeNav={
        <>
          {ladder.data ? (
            <IconButton
              aria-label="Record a Match"
              className="h-10 w-10 !bg-neutral-200 hover:!bg-neutral-300"
              onClick={openRecord}
            >
              <IconPlus size={22} stroke={2} />
            </IconButton>
          ) : null}
        </>
      }
    />
    </>
  )
}
