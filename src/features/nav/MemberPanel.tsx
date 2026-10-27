import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { SkeletonBlock, SkeletonText } from '@/components/ui/skeleton'
import {
  fetchLadderMember,
  fetchLadderMemberRecord,
  listInactiveMembers,
  listLeaderboard,
  type LadderMemberDetail,
  type LadderMemberRecord,
} from '@/data/ladder'
import { listMemberMatchesPage } from '@/data/match'
import { joinMatchPages } from '@/features/matches/joinMatchPages'
import { formatRating } from '@/features/matches/labels'
import { MemberMatchRow } from '@/features/matches/MemberMatchRow'
import { memberOutcomeTone } from '@/features/matches/matchStyles'
import { MATCH_PAGE_SIZE, loadMoreLabel } from '@/lib/listPage'
import { formatRelativeTime } from '@/lib/relativeTime'

type Props = {
  memberId: string
}

/** Scrollable body of the member drawer view. Footer actions live in SignedInChrome. */
export function MemberPanel({ memberId }: Props) {
  const member = useQuery({
    queryKey: ['ladder-member', memberId],
    queryFn: () => fetchLadderMember(memberId),
  })

  if (member.isLoading) {
    return <MemberPanelSkeleton />
  }

  if (member.isError || !member.data) {
    return <p className="text-sm text-neutral-600">This Ladder member is not available.</p>
  }

  return <MemberPanelBody member={member.data} />
}

function MemberPanelBody({ member }: { member: LadderMemberDetail }) {
  const record = useQuery({
    queryKey: ['ladder-member-record', member.id],
    queryFn: () => fetchLadderMemberRecord(member.id),
  })
  const leaderboard = useQuery({
    queryKey: ['leaderboard', member.ladderId],
    queryFn: () => listLeaderboard(member.ladderId),
  })
  const inactive = useQuery({
    queryKey: ['inactive-members', member.ladderId],
    queryFn: () => listInactiveMembers(member.ladderId),
  })
  const matches = useInfiniteQuery({
    queryKey: ['member-matches', member.id, 'pages'],
    queryFn: ({ pageParam }) =>
      listMemberMatchesPage(member.id, { offset: pageParam, limit: MATCH_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.matches.length === 0) return undefined
      const nextOffset = allPages.reduce((sum, page) => sum + page.matches.length, 0)
      if (nextOffset >= lastPage.total) return undefined
      return nextOffset
    },
  })

  const pages = matches.data?.pages ?? []
  const items = joinMatchPages(pages)
  const total = pages.length > 0 ? (pages[pages.length - 1]?.total ?? 0) : 0
  const remaining = total - items.length
  const rankLabel = memberRankLabel({
    member,
    leaderboard: leaderboard.data,
    inactiveIds: new Set((inactive.data ?? []).map((entry) => entry.ladderMemberId)),
  })

  return (
    <div className="space-y-4">
      {record.isLoading || leaderboard.isLoading || inactive.isLoading ? (
        <div className="space-y-2" aria-hidden>
          <SkeletonText className="w-32" />
          <SkeletonBlock className="h-20 w-full rounded-lg" />
        </div>
      ) : record.data ? (
        <MemberSummary member={member} record={record.data} rankLabel={rankLabel} />
      ) : null}

      <section aria-label="Matches" className="space-y-3">
        {matches.isLoading ? (
          <div className="space-y-3" aria-hidden>
            <SkeletonBlock className="h-16 w-full rounded-xl" />
            <SkeletonBlock className="h-16 w-full rounded-xl" />
          </div>
        ) : null}
        {matches.isError ? (
          <p className="text-sm text-red-700">Could not load Matches.</p>
        ) : null}
        {matches.isSuccess && items.length === 0 ? (
          <p className="text-neutral-700">No Matches yet.</p>
        ) : null}
        {items.length > 0 ? (
          <>
            <ol className="space-y-3">
              {items.map((match) => (
                <li key={match.id}>
                  <MemberMatchRow match={match} ladderMemberId={member.id} />
                </li>
              ))}
            </ol>
            <p className="text-center text-sm text-neutral-600">
              Showing {items.length} of {total} Matches
            </p>
            {matches.hasNextPage ? (
              <button
                type="button"
                disabled={matches.isFetchingNextPage}
                className="min-h-11 w-full cursor-pointer rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => {
                  void matches.fetchNextPage()
                }}
              >
                {matches.isFetchingNextPage
                  ? 'Loading…'
                  : loadMoreLabel(remaining, MATCH_PAGE_SIZE)}
              </button>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  )
}

function MemberSummary({
  member,
  record,
  rankLabel,
}: {
  member: LadderMemberDetail
  record: LadderMemberRecord
  rankLabel: string
}) {
  const recordParts = [
    `${record.wins}W`,
    `${record.losses}L`,
    record.draws > 0 || member.drawsAllowed ? `${record.draws}D` : null,
  ].filter(Boolean)

  return (
    <section aria-label="Record" className="space-y-2 rounded-xl bg-neutral-50 px-3 py-3 text-sm">
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-ink">
        <span>
          Rating{' '}
          <span className="font-medium tabular-nums">{formatRating(member.rating)}</span>
        </span>
        {member.provisional ? (
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Provisional
          </span>
        ) : null}
        <span className="text-neutral-500">·</span>
        <span className="text-neutral-700">{rankLabel}</span>
      </p>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 leading-none">
        <span className="tabular-nums leading-5 text-neutral-800">
          {recordParts.join(' · ')}
        </span>
        {record.form.length > 0 ? (
          <>
            <FormDots form={record.form} />
            {record.streakResult && record.streakLength >= 2 ? (
              <span
                className={`leading-5 ${memberOutcomeTone(streakToResult(record.streakResult))}`}
              >
                Streak {record.streakResult}
                {record.streakLength}
              </span>
            ) : null}
          </>
        ) : null}
      </p>
      {record.peakRating != null && record.peakAt ? (
        <p className="text-neutral-600">
          Peak {formatRating(record.peakRating)} · {formatRelativeTime(record.peakAt)}
        </p>
      ) : null}
    </section>
  )
}

function FormDots({ form }: { form: Array<'W' | 'L' | 'D'> }) {
  const words = form.map((result) =>
    result === 'W' ? 'won' : result === 'L' ? 'lost' : 'drew',
  )
  return (
    <span
      className="inline-flex h-5 shrink-0 items-center gap-1 self-center"
      aria-label={`Last ${form.length}: ${words.join(', ')}`}
    >
      {form.map((result, index) => (
        <span
          key={`${result}-${index}`}
          aria-hidden
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            result === 'W'
              ? 'bg-green-600'
              : result === 'L'
                ? 'bg-red-600'
                : 'bg-neutral-400'
          }`}
        />
      ))}
    </span>
  )
}

function streakToResult(result: 'W' | 'L' | 'D') {
  if (result === 'W') return 'won' as const
  if (result === 'L') return 'lost' as const
  return 'drew' as const
}

function memberRankLabel({
  member,
  leaderboard,
  inactiveIds,
}: {
  member: LadderMemberDetail
  leaderboard: { ladderMemberId: string; rank: number }[] | undefined
  inactiveIds: Set<string>
}): string {
  if (member.status === 'left') return 'Left'
  if (member.status === 'removed') return 'Removed'
  if (inactiveIds.has(member.id)) return 'Inactive'
  const entry = leaderboard?.find((row) => row.ladderMemberId === member.id)
  if (entry && leaderboard) return `#${entry.rank} of ${leaderboard.length}`
  return 'Inactive'
}

function MemberPanelSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <SkeletonText className="w-24" />
      <SkeletonBlock className="h-20 w-full rounded-lg" />
      <SkeletonBlock className="h-14 w-full rounded-xl" />
      <SkeletonBlock className="h-14 w-full rounded-xl" />
    </div>
  )
}
