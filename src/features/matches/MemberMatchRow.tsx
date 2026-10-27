import { IconClock } from '@tabler/icons-react'
import type { MatchRead } from '@/data/match'
import { formatLocalDateTime, formatRating, formatRatingChange } from '@/features/matches/labels'
import { matchCardClassName, memberOutcomeTone } from '@/features/matches/matchStyles'
import { memberMatchOutcome } from '@/features/matches/memberMatchOutcome'
import { formatRelativeTime } from '@/lib/relativeTime'

const resultLabel = {
  won: 'Won',
  lost: 'Lost',
  drew: 'Drew',
} as const

type Props = {
  match: MatchRead
  ladderMemberId: string
}

export function MemberMatchRow({ match, ladderMemberId }: Props) {
  const outcome = memberMatchOutcome(match, ladderMemberId)
  if (!outcome) return null

  const tone = memberOutcomeTone(outcome.result)
  const pending = match.status === 'pending'
  const vs = outcome.opponents.join(' & ')
  const withPartner = outcome.partner ? `with ${outcome.partner}` : null

  return (
    <article className={matchCardClassName[match.status]}>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-medium text-ink">
          {pending ? (
            <span className="mr-1.5 inline-flex items-center gap-1 align-middle text-sm text-orange-900">
              <IconClock size={16} stroke={1.75} className="shrink-0 text-orange-600" aria-hidden />
              Pending
            </span>
          ) : null}
          <span className={tone}>{resultLabel[outcome.result]}</span>
          <span className="text-neutral-800">
            {' '}
            vs <span className="inline-block max-w-[300px] truncate align-bottom">{vs}</span>
          </span>
        </p>
        {!pending && outcome.ratingChange != null ? (
          <span className={`shrink-0 tabular-nums ${tone}`}>
            {formatRatingChange(outcome.ratingChange)}
          </span>
        ) : null}
      </div>
      <div className="flex items-start justify-between gap-3 text-xs text-neutral-500">
        <p className="min-w-0">
          <span>{outcome.format}</span>
          {withPartner ? (
            <>
              <span aria-hidden className="mx-1.5">
                ·
              </span>
              <span className="inline-block max-w-[300px] truncate align-bottom">{withPartner}</span>
            </>
          ) : null}
          <span aria-hidden className="mx-1.5">
            ·
          </span>
          <time dateTime={outcome.at} title={formatLocalDateTime(outcome.at)}>
            {formatRelativeTime(outcome.at)}
          </time>
        </p>
        {!pending && outcome.ratingBefore != null && outcome.ratingAfter != null ? (
          <span className="shrink-0 whitespace-nowrap tabular-nums">
            {formatRating(outcome.ratingBefore)} → {formatRating(outcome.ratingAfter)}
          </span>
        ) : null}
      </div>
    </article>
  )
}
