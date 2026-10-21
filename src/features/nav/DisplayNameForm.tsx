import { zodResolver } from '@hookform/resolvers/zod'
import { IconLoader2 } from '@tabler/icons-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { updateDisplayName } from '@/data/profile'
import { useAuth } from '@/features/auth/authContext'
import { displayNameSchema, type DisplayNameValues } from '@/features/auth/schemas'

export function DisplayNameForm() {
  const { profile, refreshProfile } = useAuth()
  const form = useForm<DisplayNameValues>({
    resolver: zodResolver(displayNameSchema),
    values: { displayName: profile?.displayName ?? '' },
  })
  const error = form.formState.errors.displayName
  const errorId = 'display-name-error'

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit(async (values) => {
        try {
          await updateDisplayName(values.displayName)
          await refreshProfile()
          toast.success('Display name updated')
        } catch (caught) {
          const message =
            caught instanceof Error ? caught.message : 'Could not update your display name.'
          toast.error(message, { id: 'display-name', duration: Infinity })
        }
      })}
    >
      <label className="block text-sm font-medium text-neutral-800" htmlFor="display-name">
        Display name
      </label>
      <input
        id="display-name"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-ink"
        {...form.register('displayName')}
      />
      {error ? (
        <p id={errorId} className="text-sm text-red-700">
          {error.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={form.formState.isSubmitting}
        aria-busy={form.formState.isSubmitting}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ink px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {form.formState.isSubmitting ? (
          <IconLoader2 size={17} stroke={2} className="animate-spin" aria-hidden />
        ) : null}
        Save display name
      </button>
    </form>
  )
}
