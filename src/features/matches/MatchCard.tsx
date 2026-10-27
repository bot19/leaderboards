import { IconBan, IconCircleCheck, IconCircleX, IconClock, type Icon } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import type { MatchRead, MatchSide } from '@/data/match'
import {
  formatLocalDateTime,
  formatRatingChange,
  matchResultLabel,
  matchStatusLabel,
  recorderName,
  sideNames,
} from '@/features/matches/labels'
import { confirmedSideTone, matchCardClassName } from '@/features/matches/matchStyles'
import { formatRelativeTime } from '@/lib/relativeTime'

type MemberName = {
  userId: string | null
  displayName: string
}

type Props = {
  match: MatchRead
  members: MemberName[]
  onVoid?: () => void
  voiding?: boolean
  children?: ReactNode
}

export function MatchCard({ match, members, onVoid, voiding = false, children }: Props) {
  const status = statusPresentation(match)
  const StatusIcon = status?.icon
  const recordedBy = recorderName(match, members)
  const summary = matchSummary(match)

  return (
    <article className={matchCardClassName[match.status]}>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-medium break-words text-ink">
          {sideNames(match, 'a')} vs {sideNames(match, 'b')}
        </p>
        {status && StatusIcon ? (
          <p className={`flex shrink-0 items-center gap-1.5 text-sm ${status.labelClassName}`}>
            <StatusIcon
              size={19}
              stroke={1.75}
              className={`shrink-0 ${status.iconClassName}`}
              aria-hidden
            />
            {status.label}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center text-xs text-neutral-500">
        {recordedBy ? <span>Recorded by {recordedBy}</span> : null}
        {recordedBy ? <span aria-hidden className="mx-1.5 shrink-0">·</span> : null}
        <time dateTime={match.recordedAt} title={formatLocalDateTime(match.recordedAt)}>
          {formatRelativeTime(match.recordedAt)}
        </time>
        {onVoid ? (
          <>
            <span aria-hidden className="mx-1.5 shrink-0">·</span>
            <button
              type="button"
              disabled={voiding}
              className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-ink disabled:opacity-60"
              onClick={onVoid}
            >
              <IconBan size={14} stroke={1.75} className="shrink-0" aria-hidden />
              Void
            </button>
          </>
        ) : null}
      </div>
      {summary ? (
        <p className="text-sm break-words text-neutral-700">
          {summary.result ? <span className="font-bold">{summary.result}</span> : null}
          {summary.result && summary.notes ? ' · ' : null}
          {summary.notes}
        </p>
      ) : null}
      <RatingChanges match={match} />
      {children ? <div className="flex flex-wrap gap-2 pt-1">{children}</div> : null}
    </article>
  )
}

function matchSummary(match: MatchRead): { result: string | null; notes: string | null } | null {
  const notes = match.notes
  if (match.status === 'confirmed' && match.result !== 'draw') {
    return notes ? { result: null, notes } : null
  }
  const result = match.status === 'confirmed' ? 'Draw' : matchResultLabel(match)
  return { result, notes }
}

function statusPresentation(match: MatchRead): {
  label: string
  labelClassName: string
  iconClassName: string
  icon: Icon
} | null {
  const label = matchStatusLabel(match.status, match.voidKind)
  if (match.status === 'confirmed') {
    return {
      label,
      labelClassName: 'text-green-700',
      iconClassName: 'text-green-600',
      icon: IconCircleCheck,
    }
  }
  if (match.status === 'pending') {
    return {
      label,
      labelClassName: 'text-orange-900',
      iconClassName: 'text-orange-600',
      icon: IconClock,
    }
  }
  if (match.voidKind === 'rejected') {
    return {
      label,
      labelClassName: 'text-neutral-600',
      iconClassName: 'text-neutral-500',
      icon: IconCircleX,
    }
  }
  return {
    label,
    labelClassName: 'text-neutral-600',
    iconClassName: 'text-neutral-500',
    icon: IconBan,
  }
}

function rowTone(match: MatchRead, side: MatchSide): string {
  if (match.result === 'draw' || match.status !== 'confirmed') return 'text-neutral-800'
  const won =
    (match.result === 'side_a_won' && side === 'a') ||
    (match.result === 'side_b_won' && side === 'b')
  return confirmedSideTone(won)
}

function RatingChanges({ match }: { match: MatchRead }) {
  if (match.status !== 'confirmed') return null
  return (
    <ul className="space-y-1 text-sm">
      {match.participants.map((participant) => (
        <li
          key={participant.ladderMemberId}
          className={`flex justify-between gap-3 ${rowTone(match, participant.side)}`}
        >
          <span className="min-w-0 break-words">{participant.displayName}</span>
          <span className="shrink-0 tabular-nums">{formatRatingChange(participant.ratingChange)}</span>
        </li>
      ))}
    </ul>
  )
}
