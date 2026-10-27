import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  deleteLadder,
  leaveLadder,
  listLadderMembers,
  reinstateLadderMember,
  removeLadderMember,
  setLadderMemberRole,
  type LadderMemberRead,
} from '@/data/ladder'
import { useAuth } from '@/features/auth/authContext'
import {
  demoteToPlayerConfirm,
  leaveLadderConfirm,
  removeMemberConfirm,
} from '@/lib/confirmAction'

const statusOrder: Record<LadderMemberRead['status'], number> = {
  active: 0,
  left: 1,
  removed: 2,
}

const statusLabel: Record<LadderMemberRead['status'], string> = {
  active: 'Joined',
  left: 'Left',
  removed: 'Removed',
}

type Props = {
  ladderId: string
}

export function MembersPanel({ ladderId }: Props) {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate({ from: '/ladders/$ladderId' })
  const queryClient = useQueryClient()
  const members = useQuery({
    queryKey: ['ladder-members', ladderId],
    queryFn: () => listLadderMembers(ladderId),
  })

  const mine = members.data?.find((member) => member.userId === profile?.id)
  const canManage =
    Boolean(profile?.isSuperAdmin) ||
    (mine?.status === 'active' && mine.role === 'admin')
  const canLeave = mine?.status === 'active'
  const sorted = [...(members.data ?? [])].sort((a, b) => {
    const byStatus = statusOrder[a.status] - statusOrder[b.status]
    if (byStatus !== 0) return byStatus
    return a.displayName.localeCompare(b.displayName)
  })

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['ladder-members', ladderId] }),
      queryClient.invalidateQueries({ queryKey: ['leaderboard', ladderId] }),
      queryClient.invalidateQueries({ queryKey: ['inactive-members', ladderId] }),
      queryClient.invalidateQueries({ queryKey: ['my-ladders'] }),
      queryClient.invalidateQueries({ queryKey: ['roster', ladderId] }),
    ])
  }

  const leave = useMutation({
    mutationFn: () => leaveLadder(ladderId),
    onSuccess: async () => {
      toast.success('You left this Ladder')
      await refresh()
      await refreshProfile()
      await navigate({ to: '/' })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const remove = useMutation({
    mutationFn: (memberId: string) => removeLadderMember(memberId),
    onSuccess: async () => {
      toast.success('Ladder member Removed')
      await refresh()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const reinstate = useMutation({
    mutationFn: (memberId: string) => reinstateLadderMember(memberId),
    onSuccess: async () => {
      toast.success('Ladder member reinstated')
      await refresh()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const setRole = useMutation({
    mutationFn: (input: { memberId: string; role: 'admin' | 'player' }) =>
      setLadderMemberRole(input.memberId, input.role),
    onSuccess: async (_data, input) => {
      toast.success(input.role === 'admin' ? 'Appointed as Admin' : 'Demoted to Player')
      await refresh()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const removeLadder = useMutation({
    mutationFn: () => deleteLadder(ladderId),
    onSuccess: async () => {
      toast.success('Ladder deleted')
      await queryClient.invalidateQueries({ queryKey: ['my-ladders'] })
      await refreshProfile()
      await navigate({ to: '/' })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <section aria-label="Ladder members" className="space-y-4">
      <h2 className="sr-only">Ladder members</h2>
      {members.isLoading ? <p className="text-neutral-600">Loading Ladder members…</p> : null}
      {members.isError ? (
        <p className="text-sm text-red-700">Could not load Ladder members.</p>
      ) : null}
      {sorted.length > 0 ? (
        <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl bg-white shadow-sm">
          {sorted.map((member) => (
            <li key={member.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium text-ink">
                  <button
                    type="button"
                    onClick={() => {
                      void navigate({
                        search: (prev) => ({
                          ...prev,
                          nav: 'member' as const,
                          member: member.id,
                        }),
                      })
                    }}
                    className="underline-offset-2 hover:underline"
                  >
                    {member.displayName}
                  </button>
                </p>
                <p className="text-sm text-neutral-600">
                  {member.role === 'admin' ? 'Admin' : 'Player'} · {statusLabel[member.status]}
                </p>
              </div>
              {canManage ? <MemberAdminActions member={member} remove={remove} reinstate={reinstate} setRole={setRole} /> : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {canLeave ? (
          <button
            type="button"
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-ink"
            disabled={leave.isPending}
            onClick={() => {
              if (window.confirm(leaveLadderConfirm())) {
                leave.mutate()
              }
            }}
          >
            Leave Ladder
          </button>
        ) : null}
        {profile?.isSuperAdmin ? (
          <button
            type="button"
            className="rounded-md bg-red-800 px-3 py-2 text-sm font-medium text-white"
            disabled={removeLadder.isPending}
            onClick={() => {
              if (window.confirm('Delete this Ladder and all of its data?')) {
                removeLadder.mutate()
              }
            }}
          >
            Delete Ladder
          </button>
        ) : null}
      </div>
    </section>
  )
}

function MemberAdminActions({
  member,
  remove,
  reinstate,
  setRole,
}: {
  member: LadderMemberRead
  remove: { mutate: (id: string) => void; isPending: boolean }
  reinstate: { mutate: (id: string) => void; isPending: boolean }
  setRole: {
    mutate: (input: { memberId: string; role: 'admin' | 'player' }) => void
    isPending: boolean
  }
}) {
  if (member.status === 'removed') {
    return (
      <button
        type="button"
        className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white"
        disabled={reinstate.isPending}
        onClick={() => reinstate.mutate(member.id)}
      >
        Reinstate
      </button>
    )
  }

  if (member.status !== 'active') return null

  return (
    <div className="flex flex-wrap gap-2">
      {member.role === 'player' ? (
        <button
          type="button"
          className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white"
          disabled={setRole.isPending}
          onClick={() => setRole.mutate({ memberId: member.id, role: 'admin' })}
        >
          Make Admin
        </button>
      ) : (
        <button
          type="button"
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-ink"
          disabled={setRole.isPending}
          onClick={() => {
            if (window.confirm(demoteToPlayerConfirm(member.displayName))) {
              setRole.mutate({ memberId: member.id, role: 'player' })
            }
          }}
        >
          Demote to Player
        </button>
      )}
      <button
        type="button"
        className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-ink"
        disabled={remove.isPending}
        onClick={() => {
          if (window.confirm(removeMemberConfirm(member.displayName))) {
            remove.mutate(member.id)
          }
        }}
      >
        Remove
      </button>
    </div>
  )
}
