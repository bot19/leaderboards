import { IconPingPong, IconQuestionMark, IconSportBilliard } from '@tabler/icons-react'
import { gameIconKind } from './gameIconKind'

type Props = {
  gameName: string
  /** Matches the text size beside the icon. */
  size?: number
}

export function GameIcon({ gameName, size = 16 }: Props) {
  const props = { size, stroke: 1.75, 'aria-hidden': true, className: 'shrink-0' } as const
  const kind = gameIconKind(gameName)
  if (kind === 'table-tennis') return <IconPingPong {...props} />
  if (kind === 'billiards') return <IconSportBilliard {...props} />
  return <IconQuestionMark {...props} />
}
