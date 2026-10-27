import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { setDefaultLadder } from '@/data/ladder'
import { useAuth } from '@/features/auth/authContext'

export function useSetDefaultLadder() {
  const queryClient = useQueryClient()
  const { refreshProfile } = useAuth()
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function starLadder(ladderId: string) {
    setPendingId(ladderId)
    try {
      await setDefaultLadder(ladderId)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-ladders'] }),
        refreshProfile(),
      ])
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Could not choose a Default Ladder.'
      toast.error(message, { id: 'default-ladder', duration: Infinity })
    } finally {
      setPendingId(null)
    }
  }

  return { starLadder, pendingId }
}
