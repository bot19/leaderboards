import type { SupabaseClient } from '@supabase/supabase-js'
import { asNumber } from '@/data/numeric'
import { getSupabase } from '@/lib/supabase'
import type { Database } from '@/types/db'

type MatchClient = SupabaseClient<Database>

export type MatchResult = 'side_a_won' | 'side_b_won' | 'draw'
export type MatchStatus = 'pending' | 'confirmed' | 'voided'
export type MatchSide = 'a' | 'b'
export type MatchVoidKind = 'rejected' | 'admin'

export type MatchParticipantRead = {
  ladderMemberId: string
  userId: string | null
  displayName: string
  side: MatchSide
  ratingBefore: number | null
  ratingChange: number | null
}

export type MatchRead = {
  id: string
  status: MatchStatus
  result: MatchResult
  notes: string | null
  recordedBy: string
  recordedAt: string
  confirmedAt: string | null
  voidedBy: string | null
  voidedAt: string | null
  voidKind: MatchVoidKind | null
  participants: MatchParticipantRead[]
}

type ProfileEmbed = { display_name: string } | { display_name: string }[] | null

type MemberEmbed = {
  id: string
  user_id: string | null
  profiles: ProfileEmbed
} | {
  id: string
  user_id: string | null
  profiles: ProfileEmbed
}[] | null

type ParticipantRow = {
  side: MatchSide
  rating_before: number | string | null
  rating_change: number | string | null
  ladder_members: MemberEmbed
}

function one<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function displayNameOf(profiles: ProfileEmbed): string | null {
  const profile = one(profiles)
  return profile?.display_name ?? null
}

function asOptionalNumber(value: number | string | null): number | null {
  if (value == null) return null
  return asNumber(value)
}

function toMatch(row: {
  id: string
  status: MatchStatus
  result: MatchResult
  notes: string | null
  recorded_by: string
  recorded_at: string
  confirmed_at: string | null
  voided_by: string | null
  voided_at: string | null
  void_kind: MatchVoidKind | null
  participants: ParticipantRow[] | null
}): MatchRead {
  const participants = (row.participants ?? []).map((participant) => {
    const member = one(participant.ladder_members)
    const displayName = member ? displayNameOf(member.profiles) : null
    if (!member || !displayName) throw new Error('Participant is missing a display name')
    return {
      ladderMemberId: member.id,
      userId: member.user_id,
      displayName,
      side: participant.side,
      ratingBefore: asOptionalNumber(participant.rating_before),
      ratingChange: asOptionalNumber(participant.rating_change),
    }
  })

  return {
    id: row.id,
    status: row.status,
    result: row.result,
    notes: row.notes,
    recordedBy: row.recorded_by,
    recordedAt: row.recorded_at,
    confirmedAt: row.confirmed_at,
    voidedBy: row.voided_by,
    voidedAt: row.voided_at,
    voidKind: row.void_kind,
    participants: participants.sort((a, b) => {
      if (a.side !== b.side) return a.side.localeCompare(b.side)
      return a.displayName.localeCompare(b.displayName)
    }),
  }
}

export async function recordMatch(
  input: {
    ladderId: string
    sideA: string[]
    sideB: string[]
    result: MatchResult
    notes?: string
  },
  client: MatchClient = getSupabase(),
): Promise<{ id: string }> {
  const { data, error } = await client.rpc('record_match', {
    p_ladder_id: input.ladderId,
    p_side_a: input.sideA,
    p_side_b: input.sideB,
    p_result: input.result,
    p_notes: input.notes ?? null,
  })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Could not record this Match')
  return { id: data }
}

export async function confirmMatch(
  matchId: string,
  client: MatchClient = getSupabase(),
) {
  const { error } = await client.rpc('confirm_match', { p_match_id: matchId })
  if (error) throw new Error(error.message)
}

export async function rejectMatch(
  matchId: string,
  client: MatchClient = getSupabase(),
) {
  const { error } = await client.rpc('reject_match', { p_match_id: matchId })
  if (error) throw new Error(error.message)
}

export async function voidMatch(
  matchId: string,
  client: MatchClient = getSupabase(),
) {
  const { error } = await client.rpc('void_match', { p_match_id: matchId })
  if (error) throw new Error(error.message)
}

export async function listMatches(
  ladderId: string,
  client: MatchClient = getSupabase(),
): Promise<MatchRead[]> {
  const { data, error } = await client
    .from('matches')
    .select(
      `id, status, result, notes, recorded_by, recorded_at, confirmed_at,
       voided_by, voided_at, void_kind,
       participants(side, rating_before, rating_change, ladder_members(id, user_id, profiles(display_name)))`,
    )
    .eq('ladder_id', ladderId)
    .order('recorded_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => toMatch(row))
}

export async function listMatchesWaitingForMe(
  ladderId: string,
  client: MatchClient = getSupabase(),
): Promise<MatchRead[]> {
  const { data: userResult, error: userError } = await client.auth.getUser()
  if (userError) throw new Error(userError.message)
  const userId = userResult.user?.id
  if (!userId) return []

  const matches = await listMatches(ladderId, client)
  return matches
    .filter((match) => isWaitingFor(match, userId))
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
}

export function isWaitingFor(match: MatchRead, userId: string): boolean {
  if (match.status !== 'pending') return false
  const mine = match.participants.find((participant) => participant.userId === userId)
  const recorder = match.participants.find((participant) => participant.userId === match.recordedBy)
  if (!mine || !recorder) return false
  return mine.side !== recorder.side
}
