import { useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { SheetHeader } from '@/components/layout/SheetHeader'
import { recordMatch } from '@/data/match'
import { listRoster, type RosterMember } from '@/data/ladder'
import { formatRating } from '@/features/matches/labels'
import { recordMatchSchema, type RecordMatchValues } from '@/features/matches/schema'

const emptyValues: RecordMatchValues = {
  format: 'singles',
  a1: '',
  a2: '',
  b1: '',
  b2: '',
  winner: 'a',
  notes: '',
}

type Props = {
  ladderId: string
  onClose: () => void
}

export function RecordMatchPanel({ ladderId, onClose }: Props) {
  const queryClient = useQueryClient()
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = 'record-match-title'
  const roster = useQuery({
    queryKey: ['roster', ladderId],
    queryFn: () => listRoster(ladderId),
  })
  const active = (roster.data ?? []).filter((member) => member.status === 'active')
  const form = useForm<RecordMatchValues>({
    resolver: zodResolver(recordMatchSchema),
    defaultValues: emptyValues,
  })
  const [format, setFormat] = useState(emptyValues.format)
  const [winner, setWinner] = useState(emptyValues.winner)
  const doubles = format === 'doubles'

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center">
      <button
        type="button"
        aria-label="Close record Match"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <SheetHeader titleId={titleId} title="Record a Match" closeRef={closeRef} onClose={onClose} />
        <form
          className="space-y-4 overflow-y-auto px-4 py-4"
          onSubmit={form.handleSubmit(async (values) => {
            const sideA = [values.a1, doubles ? values.a2 : ''].filter((id) => id !== '')
            const sideB = [values.b1, doubles ? values.b2 : ''].filter((id) => id !== '')
            try {
              await recordMatch({
                ladderId,
                sideA,
                sideB,
                result: values.winner === 'a' ? 'side_a_won' : 'side_b_won',
                notes: values.notes,
              })
              await queryClient.invalidateQueries({ queryKey: ['matches', ladderId] })
              await queryClient.invalidateQueries({ queryKey: ['matches-waiting', ladderId] })
              toast.success('Match recorded')
              onClose()
            } catch (caught) {
              const message = caught instanceof Error ? caught.message : 'Could not record this Match.'
              toast.error(message)
            }
          })}
        >
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-neutral-800">Format</legend>
            <div className="flex gap-2">
              <FormatButton
                pressed={!doubles}
                onClick={() => {
                  setFormat('singles')
                  form.setValue('format', 'singles')
                }}
                label="1v1"
              />
              <FormatButton
                pressed={doubles}
                disabled={active.length < 4}
                onClick={() => {
                  setFormat('doubles')
                  form.setValue('format', 'doubles')
                }}
                label="2v2"
              />
            </div>
          </fieldset>
          <MemberField
            id="side-a-1"
            label={doubles ? 'Side A, first' : 'Side A'}
            members={active}
            registration={form.register('a1')}
          />
          {doubles ? (
            <MemberField
              id="side-a-2"
              label="Side A, second"
              members={active}
              registration={form.register('a2')}
            />
          ) : null}
          <MemberField
            id="side-b-1"
            label={doubles ? 'Side B, first' : 'Side B'}
            members={active}
            registration={form.register('b1')}
          />
          {doubles ? (
            <MemberField
              id="side-b-2"
              label="Side B, second"
              members={active}
              registration={form.register('b2')}
            />
          ) : null}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-neutral-800">Who won</legend>
            <div className="flex gap-2">
              <FormatButton
                pressed={winner === 'a'}
                onClick={() => {
                  setWinner('a')
                  form.setValue('winner', 'a')
                }}
                label="Side A"
              />
              <FormatButton
                pressed={winner === 'b'}
                onClick={() => {
                  setWinner('b')
                  form.setValue('winner', 'b')
                }}
                label="Side B"
              />
            </div>
          </fieldset>
          <label className="block space-y-1 text-sm font-medium text-neutral-800" htmlFor="match-notes">
            Notes
            <textarea
              id="match-notes"
              rows={2}
              className="block w-full rounded-md border border-neutral-300 px-3 py-2 font-normal text-ink"
              {...form.register('notes')}
            />
          </label>
          {form.formState.errors.a1 ? (
            <p className="text-sm text-red-700">{form.formState.errors.a1.message}</p>
          ) : null}
          {form.formState.errors.notes ? (
            <p className="text-sm text-red-700">{form.formState.errors.notes.message}</p>
          ) : null}
          <button
            type="submit"
            disabled={form.formState.isSubmitting || roster.isLoading}
            className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Record Match
          </button>
        </form>
      </div>
    </div>
  )
}

function FormatButton({
  pressed,
  disabled = false,
  onClick,
  label,
}: {
  pressed: boolean
  disabled?: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={
        pressed
          ? 'rounded-full bg-ink px-3 py-1.5 text-sm font-medium text-white'
          : 'rounded-full bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm disabled:opacity-50'
      }
    >
      {label}
    </button>
  )
}

function MemberField({
  id,
  label,
  members,
  registration,
}: {
  id: string
  label: string
  members: RosterMember[]
  registration: UseFormRegisterReturn
}) {
  return (
    <label className="block space-y-1 text-sm font-medium text-neutral-800" htmlFor={id}>
      {label}
      <select
        id={id}
        className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 font-normal text-ink"
        {...registration}
      >
        <option value="">Choose a Ladder member</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.displayName} · {formatRating(member.rating)}
          </option>
        ))}
      </select>
    </label>
  )
}
