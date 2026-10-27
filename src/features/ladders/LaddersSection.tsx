import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { IconKey, IconLoader2, IconPlus, IconStar, IconStarFilled, IconX } from '@tabler/icons-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { IconButton } from '@/components/ui/IconButton'
import { InfoBox } from '@/components/ui/InfoBox'
import {
  createLadder,
  fetchLadderIdByShareToken,
  joinLadder,
  listMyLadders,
} from '@/data/ladder'
import { useAuth } from '@/features/auth/authContext'
import { canonicalJoinCode } from '@/lib/joinCode'
import { GameIcon } from './GameIcon'
import { JoinLadderForm } from './JoinLadderForm'
import { MakeDefaultLadderCheckbox } from './MakeDefaultLadderCheckbox'
import { ladderNameSchema, type LadderNameValues } from './schemas'
import { useJoinCodeLookup } from './useJoinCodeLookup'
import { useOpenLadder } from './useOpenLadder'
import { useSetDefaultLadder } from './useSetDefaultLadder'

type Props = {
  /** Keeps input ids unique when Home and the drawer are both mounted. */
  idPrefix?: string
  /** Drawer uses the same uppercase section label as Profile. */
  variant?: 'page' | 'drawer'
}

export function LaddersSection({ idPrefix = '', variant = 'page' }: Props) {
  const { profile } = useAuth()
  const openLadder = useOpenLadder()
  const { starLadder, pendingId } = useSetDefaultLadder()
  const [openForm, setOpenForm] = useState<'join' | 'new' | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [makeDefault, setMakeDefault] = useState(false)
  const lookup = useJoinCodeLookup(joinCode)
  const ladders = useQuery({
    queryKey: ['my-ladders'],
    queryFn: () => listMyLadders(),
  })
  const ladderForm = useForm<LadderNameValues>({
    resolver: zodResolver(ladderNameSchema),
    defaultValues: { name: '' },
  })
  const joinInputId = `${idPrefix}join-code`
  const ladderNameId = `${idPrefix}ladder-name`
  const hasLadder = (ladders.data?.length ?? 0) > 0
  const makeDefaultControl: ReactNode = hasLadder ? (
    <MakeDefaultLadderCheckbox checked={makeDefault} onCheckedChange={setMakeDefault} />
  ) : null

  useEffect(() => {
    if (openForm === 'new') document.getElementById(ladderNameId)?.focus()
    if (openForm === 'join') document.getElementById(joinInputId)?.focus()
  }, [openForm, joinInputId, ladderNameId])

  if (!profile) return null

  function toggleForm(form: 'join' | 'new') {
    setOpenForm((current) => (current === form ? null : form))
    setMakeDefault(false)
  }

  async function onJoin() {
    const code = canonicalJoinCode(joinCode)
    setJoining(true)
    setJoinError(null)
    try {
      await joinLadder(code, { makeDefault })
      const ladderId = await fetchLadderIdByShareToken(code)
      if (!ladderId) throw new Error('Could not open this Ladder')
      await openLadder(ladderId)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not join this Ladder.'
      setJoinError(message)
      toast.error(message, { id: 'join-ladder', duration: Infinity })
    } finally {
      setJoining(false)
    }
  }

  const ladderCount = ladders.data?.length
  const showHeadingActions = (ladderCount ?? 0) > 0 || openForm !== null
  const heading =
    variant === 'drawer' ? (
      <h2
        id={`${idPrefix}ladders-heading`}
        className="min-w-0 flex-1 truncate text-xs font-semibold tracking-wide text-neutral-500 uppercase"
      >
        {ladderCount == null
          ? 'Manage your Leaderboards'
          : `Manage your Leaderboards (${ladderCount})`}
      </h2>
    ) : (
      <h2 className="min-w-0 flex-1 truncate font-display text-2xl tracking-tight text-ink">
        Leaderboards
      </h2>
    )

  return (
    <section
      className="space-y-3"
      aria-labelledby={variant === 'drawer' ? `${idPrefix}ladders-heading` : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        {heading}
        {showHeadingActions ? (
          <div className="flex shrink-0 items-center gap-1">
            <IconButton
              aria-label={openForm === 'join' ? 'Close join a Ladder' : 'Join a Ladder'}
              className="h-10 w-10"
              onClick={() => toggleForm('join')}
            >
              {openForm === 'join' ? (
                <IconX size={22} stroke={1.75} aria-hidden />
              ) : (
                <IconKey size={22} stroke={1.75} aria-hidden />
              )}
            </IconButton>
            <IconButton
              aria-label={openForm === 'new' ? 'Close new Ladder' : 'New Ladder'}
              className="h-10 w-10"
              onClick={() => toggleForm('new')}
            >
              {openForm === 'new' ? (
                <IconX size={22} stroke={1.75} aria-hidden />
              ) : (
                <IconPlus size={22} stroke={1.75} aria-hidden />
              )}
            </IconButton>
          </div>
        ) : null}
      </div>
      {openForm === 'join' ? (
        <JoinLadderForm
          inputId={joinInputId}
          joinCode={joinCode}
          onJoinCodeChange={(value) => {
            setJoinCode(value)
            setJoinError(null)
          }}
          lookup={lookup}
          onJoin={() => {
            void onJoin()
          }}
          joining={joining}
          joinError={joinError}
          makeDefaultControl={makeDefaultControl}
        />
      ) : null}
      {openForm === 'new' ? (
        <form
          className="space-y-3"
          onSubmit={ladderForm.handleSubmit(async (values) => {
            try {
              const ladder = await createLadder(values.name, { makeDefault })
              ladderForm.reset({ name: '' })
              setMakeDefault(false)
              await openLadder(ladder.id)
            } catch (caught) {
              const message = caught instanceof Error ? caught.message : 'Could not create a Ladder.'
              toast.error(message, { id: 'new-ladder', duration: Infinity })
            }
          })}
        >
          <label className="block text-sm font-medium text-neutral-800" htmlFor={ladderNameId}>
            New Ladder
          </label>
          <input
            id={ladderNameId}
            className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-ink"
            placeholder="Friday pool"
            {...ladderForm.register('name')}
          />
          {ladderForm.formState.errors.name ? (
            <p className="text-sm text-red-700">{ladderForm.formState.errors.name.message}</p>
          ) : null}
          {makeDefaultControl}
          <button
            type="submit"
            disabled={ladderForm.formState.isSubmitting}
            className="min-h-11 rounded-md bg-ink px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Create Ladder
          </button>
        </form>
      ) : null}
      {openForm ? <hr className="border-neutral-200" /> : null}
      {ladders.isLoading ? <p className="text-neutral-600">Loading Ladders…</p> : null}
      {ladders.isError ? (
        <p className="text-sm text-red-700">Could not load your Ladders.</p>
      ) : null}
      {ladders.data && ladders.data.length === 0 && !openForm ? (
        <div className="space-y-3">
          <p className="text-neutral-700">
            Join a Ladder with a code from a friend, or start your own.
          </p>
          <button
            type="button"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-ink"
            onClick={() => toggleForm('join')}
          >
            <IconKey size={18} stroke={1.75} aria-hidden />
            Join with a code
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-medium text-white"
            onClick={() => toggleForm('new')}
          >
            <IconPlus size={18} stroke={1.75} aria-hidden />
            New Ladder
          </button>
        </div>
      ) : null}
      {ladders.data && ladders.data.length >= 2 && !profile.defaultLadderId ? (
        <InfoBox>Star a Ladder to open it when you sign in.</InfoBox>
      ) : null}
      {ladders.data && ladders.data.length > 0 ? (
        <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl bg-white shadow-sm">
          {ladders.data.map((ladder) => {
            const isDefault = profile.defaultLadderId === ladder.id
            const pending = pendingId === ladder.id
            return (
              <li key={ladder.id} className="flex min-w-0 items-center">
                <IconButton
                  aria-label={
                    isDefault
                      ? `${ladder.name} is your Default Ladder`
                      : `Make ${ladder.name} your Default Ladder`
                  }
                  aria-pressed={isDefault}
                  className="group h-11 w-11 shrink-0 hover:bg-transparent active:bg-transparent active:text-current"
                  onClick={() => {
                    if (isDefault || pending) return
                    void starLadder(ladder.id)
                  }}
                >
                  {pending ? (
                    <IconLoader2 size={18} stroke={2} className="animate-spin" aria-hidden />
                  ) : isDefault ? (
                    <IconStarFilled
                      size={18}
                      stroke={1.75}
                      className="text-primary group-hover:text-primary"
                      aria-hidden
                    />
                  ) : (
                    <IconStar
                      size={18}
                      stroke={1.75}
                      className="group-hover:text-primary"
                      aria-hidden
                    />
                  )}
                </IconButton>
                <Link
                  to="/ladders/$ladderId"
                  params={{ ladderId: ladder.id }}
                  search={(prev) => ({ ...prev, tab: 'leaderboard', nav: undefined })}
                  className="flex min-w-0 flex-1 items-baseline justify-between gap-3 py-3 pr-4 hover:bg-neutral-50"
                >
                  <span className="min-w-0 truncate font-medium text-ink">{ladder.name}</span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm text-neutral-600">
                    <GameIcon gameName={ladder.gameName} size={14} />
                    {ladder.gameName}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
