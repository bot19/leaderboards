import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase'
import type { Database } from '@/types/db'

export type Profile = {
  id: string
  displayName: string
  isSuperAdmin: boolean
  defaultLadderId: string | null
}

type ProfileClient = SupabaseClient<Database>

type ProfileRow = Database['public']['Tables']['profiles']['Row']

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    isSuperAdmin: row.is_super_admin,
    defaultLadderId: row.default_ladder_id,
  }
}

export async function fetchProfile(
  userId: string,
  client: ProfileClient = getSupabase(),
): Promise<Profile | null> {
  const { data, error } = await client
    .from('profiles')
    .select('id, display_name, is_super_admin, default_ladder_id')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapProfile(data)
}

/** Creates the signed-in User's profile. The super-admin flag stays false. */
export async function createProfile(
  displayName: string,
  client: ProfileClient = getSupabase(),
) {
  const { error } = await client.rpc('create_profile', {
    p_display_name: displayName,
  })
  if (error) throw new Error(error.message)
}

export async function updateDisplayName(
  displayName: string,
  client: ProfileClient = getSupabase(),
) {
  const { error } = await client.rpc('update_display_name', {
    p_display_name: displayName,
  })
  if (error) throw new Error(error.message)
}
