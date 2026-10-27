import type { SupabaseClient } from '@supabase/supabase-js'
import { asNumber } from '@/data/numeric'
import { canonicalJoinCode } from '@/lib/joinCode'
import { getSupabase } from '@/lib/supabase'
import type { Database } from '@/types/db'

type LadderClient = SupabaseClient<Database>

export type LadderSummary = {
  id: string
  name: string
  gameName: string
  joinPolicy: 'open'
}

export type MyLadder = {
  id: string
  name: string
  gameName: string
}

export type LeaderboardEntry = {
  ladderMemberId: string
  displayName: string
  rating: number
  rank: number
  provisional: boolean
  inactive: boolean
  rankChange: number | null
}

export type LadderMemberRecord = {
  wins: number
  losses: number
  draws: number
  form: Array<'W' | 'L' | 'D'>
  streakResult: 'W' | 'L' | 'D' | null
  streakLength: number
  peakRating: number | null
  peakAt: string | null
}

export type LadderMemberDetail = {
  id: string
  ladderId: string
  ladderName: string
  drawsAllowed: boolean
  displayName: string
  role: 'admin' | 'player'
  status: 'active' | 'left' | 'removed'
  rating: number
  ratedMatchCount: number
  provisional: boolean
}

export type LadderMemberRead = {
  id: string
  userId: string | null
  displayName: string
  role: 'admin' | 'player'
  status: 'active' | 'left' | 'removed'
  rating: number
  ratedMatchCount: number
  lastMatchAt: string | null
}

export type RosterMember = {
  id: string
  userId: string | null
  displayName: string
  status: 'active' | 'left' | 'removed'
  rating: number
  ratedMatchCount: number
  lastMatchAt: string | null
}

function embeddedName(
  embedded: { name: string } | { name: string }[] | null,
): string | null {
  if (!embedded) return null
  if (Array.isArray(embedded)) return embedded[0]?.name ?? null
  return embedded.name
}

function embeddedDisplayName(
  embedded: { display_name: string } | { display_name: string }[] | null,
): string | null {
  if (!embedded) return null
  if (Array.isArray(embedded)) return embedded[0]?.display_name ?? null
  return embedded.display_name
}

export async function assertActiveLadderAdmin(
  ladderId: string,
  client: LadderClient = getSupabase(),
) {
  const { error } = await client.rpc('assert_active_ladder_admin', {
    p_ladder_id: ladderId,
  })
  if (error) throw new Error(error.message)
}

export type LadderPreview = {
  name: string
  gameName: string
  memberCount: number
}

export async function fetchShareToken(
  ladderId: string,
  client: LadderClient = getSupabase(),
): Promise<string> {
  const { data, error } = await client
    .from('ladders')
    .select('share_token')
    .eq('id', ladderId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data?.share_token) throw new Error('This Ladder has no Share link')
  return data.share_token
}

export async function previewLadder(
  shareToken: string,
  client: LadderClient = getSupabase(),
): Promise<LadderPreview> {
  const { data, error } = await client.rpc('preview_ladder', {
    p_share_token: shareToken,
  })
  if (error) throw new Error(error.message)
  if (!data?.name || !data.game_name || data.member_count == null) {
    throw new Error('No Ladder matches this Share link')
  }
  return {
    name: data.name,
    gameName: data.game_name,
    memberCount: data.member_count,
  }
}

type LadderWriteOptions = {
  makeDefault?: boolean
  client?: LadderClient
}

function resolveLadderCall(
  clientOrOptions?: LadderClient | LadderWriteOptions,
): { client: LadderClient; makeDefault: boolean } {
  if (!clientOrOptions) return { client: getSupabase(), makeDefault: false }
  if ('rpc' in clientOrOptions) return { client: clientOrOptions, makeDefault: false }
  return {
    client: clientOrOptions.client ?? getSupabase(),
    makeDefault: clientOrOptions.makeDefault ?? false,
  }
}

export async function joinLadder(
  shareToken: string,
  clientOrOptions?: LadderClient | LadderWriteOptions,
): Promise<{ outcome: 'joined' }> {
  const { client, makeDefault } = resolveLadderCall(clientOrOptions)
  const { data, error } = await client.rpc('join_ladder', {
    p_share_token: shareToken,
    p_make_default: makeDefault,
  })
  if (error) throw new Error(error.message)
  if (data !== 'joined') throw new Error('Could not join this Ladder')
  return { outcome: 'joined' }
}

export async function leaveLadder(
  ladderId: string,
  client: LadderClient = getSupabase(),
) {
  const { error } = await client.rpc('leave_ladder', { p_ladder_id: ladderId })
  if (error) throw new Error(error.message)
}

export async function removeLadderMember(
  ladderMemberId: string,
  client: LadderClient = getSupabase(),
) {
  const { error } = await client.rpc('remove_ladder_member', {
    p_ladder_member_id: ladderMemberId,
  })
  if (error) throw new Error(error.message)
}

export async function reinstateLadderMember(
  ladderMemberId: string,
  client: LadderClient = getSupabase(),
) {
  const { error } = await client.rpc('reinstate_ladder_member', {
    p_ladder_member_id: ladderMemberId,
  })
  if (error) throw new Error(error.message)
}

export async function setLadderMemberRole(
  ladderMemberId: string,
  role: 'admin' | 'player',
  client: LadderClient = getSupabase(),
) {
  const { error } = await client.rpc('set_ladder_member_role', {
    p_ladder_member_id: ladderMemberId,
    p_role: role,
  })
  if (error) throw new Error(error.message)
}

export async function deleteLadder(
  ladderId: string,
  client: LadderClient = getSupabase(),
) {
  const { error } = await client.rpc('delete_ladder', { p_ladder_id: ladderId })
  if (error) throw new Error(error.message)
}

export async function fetchLadderIdByShareToken(
  shareToken: string,
  client: LadderClient = getSupabase(),
): Promise<string | null> {
  const { data, error } = await client
    .from('ladders')
    .select('id')
    .eq('share_token', canonicalJoinCode(shareToken))
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data?.id ?? null
}

export async function setDefaultLadder(
  ladderId: string,
  client: LadderClient = getSupabase(),
) {
  const { error } = await client.rpc('set_default_ladder', {
    p_ladder_id: ladderId,
  })
  if (error) throw new Error(error.message)
}

export async function createLadder(
  name: string,
  clientOrOptions?: LadderClient | LadderWriteOptions,
): Promise<{ id: string }> {
  const { client, makeDefault } = resolveLadderCall(clientOrOptions)
  const { data, error } = await client.rpc('create_ladder', {
    p_name: name,
    p_make_default: makeDefault,
  })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Could not create a Ladder')
  return { id: data }
}

export async function fetchLadder(
  ladderId: string,
  client: LadderClient = getSupabase(),
): Promise<LadderSummary | null> {
  const { data, error } = await client
    .from('ladders')
    .select('id, name, join_policy, games(name)')
    .eq('id', ladderId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const gameName = embeddedName(data.games)
  if (!gameName) throw new Error('Ladder is missing its Game')
  return {
    id: data.id,
    name: data.name,
    gameName,
    joinPolicy: data.join_policy,
  }
}

export async function listLadders(
  client: LadderClient = getSupabase(),
): Promise<LadderSummary[]> {
  const { data, error } = await client
    .from('ladders')
    .select('id, name, join_policy, games(name)')

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const gameName = embeddedName(row.games)
    if (!gameName) throw new Error('Ladder is missing its Game')
    return {
      id: row.id,
      name: row.name,
      gameName,
      joinPolicy: row.join_policy,
    }
  })
}

export async function listMyLadders(
  client: LadderClient = getSupabase(),
): Promise<MyLadder[]> {
  const { data, error } = await client
    .from('my_ladders')
    .select('id, name, game_name')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    gameName: row.game_name,
  }))
}

export async function listLeaderboard(
  ladderId: string,
  client: LadderClient = getSupabase(),
): Promise<LeaderboardEntry[]> {
  const { data, error } = await client
    .from('leaderboard')
    .select('ladder_member_id, display_name, rating, provisional, inactive, rank, rank_change')
    .eq('ladder_id', ladderId)
    .order('rank', { ascending: true })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    ladderMemberId: row.ladder_member_id,
    displayName: row.display_name,
    rating: asNumber(row.rating),
    rank: asNumber(row.rank),
    provisional: row.provisional,
    inactive: row.inactive,
    rankChange: row.rank_change == null ? null : asNumber(row.rank_change),
  }))
}

const PROVISIONAL_THRESHOLD = 5

function asFormResult(value: string): 'W' | 'L' | 'D' {
  if (value === 'W' || value === 'L' || value === 'D') return value
  throw new Error(`Unexpected form result: ${value}`)
}

export async function fetchLadderMember(
  ladderMemberId: string,
  client: LadderClient = getSupabase(),
): Promise<LadderMemberDetail | null> {
  const { data, error } = await client
    .from('ladder_members')
    .select(
      'id, ladder_id, role, status, rating, rated_match_count, profiles(display_name), ladders(name, games(draws_allowed))',
    )
    .eq('id', ladderMemberId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const displayName = embeddedDisplayName(data.profiles)
  if (!displayName) throw new Error('Ladder member is missing a display name')

  const ladder = Array.isArray(data.ladders) ? data.ladders[0] : data.ladders
  if (!ladder) throw new Error('Ladder member is missing its Ladder')
  const game = Array.isArray(ladder.games) ? ladder.games[0] : ladder.games
  if (!game) throw new Error('Ladder is missing its Game')

  return {
    id: data.id,
    ladderId: data.ladder_id,
    ladderName: ladder.name,
    drawsAllowed: game.draws_allowed,
    displayName,
    role: data.role,
    status: data.status,
    rating: asNumber(data.rating),
    ratedMatchCount: data.rated_match_count,
    provisional: data.rated_match_count < PROVISIONAL_THRESHOLD,
  }
}

export async function fetchLadderMemberRecord(
  ladderMemberId: string,
  client: LadderClient = getSupabase(),
): Promise<LadderMemberRecord> {
  const { data, error } = await client.rpc('ladder_member_record', {
    p_ladder_member_id: ladderMemberId,
  })
  if (error) throw new Error(error.message)
  const row = data?.[0]
  if (!row) {
    return {
      wins: 0,
      losses: 0,
      draws: 0,
      form: [],
      streakResult: null,
      streakLength: 0,
      peakRating: null,
      peakAt: null,
    }
  }
  return {
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
    form: (row.form ?? []).map(asFormResult),
    streakResult: row.streak_result ? asFormResult(row.streak_result) : null,
    streakLength: row.streak_length,
    peakRating: row.peak_rating == null ? null : asNumber(row.peak_rating),
    peakAt: row.peak_at,
  }
}

export async function listLadderMembers(
  ladderId: string,
  client: LadderClient = getSupabase(),
): Promise<LadderMemberRead[]> {
  const { data, error } = await client
    .from('ladder_members')
    .select(
      'id, user_id, role, status, rating, rated_match_count, last_match_at, profiles(display_name)',
    )
    .eq('ladder_id', ladderId)

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const displayName = embeddedDisplayName(row.profiles)
    if (!displayName) throw new Error('Ladder member is missing a display name')
    return {
      id: row.id,
      userId: row.user_id,
      displayName,
      role: row.role,
      status: row.status,
      rating: asNumber(row.rating),
      ratedMatchCount: row.rated_match_count,
      lastMatchAt: row.last_match_at,
    }
  })
}

export async function listRoster(
  ladderId: string,
  client: LadderClient = getSupabase(),
): Promise<RosterMember[]> {
  const { data, error } = await client
    .from('ladder_members')
    .select('id, user_id, status, rating, rated_match_count, last_match_at, profiles(display_name)')
    .eq('ladder_id', ladderId)

  if (error) throw new Error(error.message)

  return (data ?? [])
    .map((row) => {
      const displayName = embeddedDisplayName(row.profiles)
      if (!displayName) throw new Error('Ladder member is missing a display name')
      return {
        id: row.id,
        userId: row.user_id,
        displayName,
        status: row.status,
        rating: asNumber(row.rating),
        ratedMatchCount: row.rated_match_count,
        lastMatchAt: row.last_match_at,
      }
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}
