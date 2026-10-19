import type { SupabaseClient } from '@supabase/supabase-js'
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
  displayName: string
  rating: number
}

export type LadderMemberRead = {
  displayName: string
  role: 'admin' | 'player'
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

export async function createLadder(
  name: string,
  client: LadderClient = getSupabase(),
): Promise<{ id: string }> {
  const { data, error } = await client.rpc('create_ladder', { p_name: name })
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
    .select('display_name, rating')
    .eq('ladder_id', ladderId)
    .order('rating', { ascending: false })
    .order('display_name', { ascending: true })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    displayName: row.display_name,
    rating: row.rating,
  }))
}

export async function listLadderMembers(
  ladderId: string,
  client: LadderClient = getSupabase(),
): Promise<LadderMemberRead[]> {
  const { data, error } = await client
    .from('ladder_members')
    .select('role, status, rating, rated_match_count, last_match_at, profiles(display_name)')
    .eq('ladder_id', ladderId)

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const displayName = embeddedDisplayName(row.profiles)
    if (!displayName) throw new Error('Ladder member is missing a display name')
    return {
      displayName,
      role: row.role,
      status: row.status,
      rating: row.rating,
      ratedMatchCount: row.rated_match_count,
      lastMatchAt: row.last_match_at,
    }
  })
}
