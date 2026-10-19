import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/db'

export type TestUser = {
  id: string
  email: string
  password: string
}

type LocalSupabase = {
  url: string
  anonKey: string
  serviceRoleKey: string
}

let cached: LocalSupabase | null = null

function parseStatusEnv(output: string): Record<string, string> {
  const env: Record<string, string> = {}
  for (const line of output.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match?.[1] || match[2] === undefined) continue
    env[match[1]] = match[2].replace(/^"|"$/g, '')
  }
  return env
}

/** Reads the running local stack. Requires `supabase start` in this repo. */
export function localSupabase(): LocalSupabase {
  if (cached) return cached

  const root = fileURLToPath(new URL('../..', import.meta.url))
  const output = execSync('pnpm exec supabase status -o env', {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  const env = parseStatusEnv(output)
  const url = env.API_URL ?? env.SUPABASE_URL
  const anonKey = env.ANON_KEY ?? env.SUPABASE_ANON_KEY ?? env.PUBLISHABLE_KEY
  const serviceRoleKey =
    env.SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY ?? env.SECRET_KEY

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(
      'Local Supabase is not ready. Run `pnpm exec supabase start` and retry.',
    )
  }

  cached = { url, anonKey, serviceRoleKey }
  return cached
}

export function serviceRole(): SupabaseClient<Database> {
  const { url, serviceRoleKey } = localSupabase()
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function signedOutClient(): SupabaseClient<Database> {
  const { url, anonKey } = localSupabase()
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Creates a confirmed auth User. The service role is only used for this fixture. */
export async function createTestUser(): Promise<TestUser> {
  const email = `user-${crypto.randomUUID()}@example.test`
  const password = `pw-${crypto.randomUUID()}`
  const { data, error } = await serviceRole().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) {
    throw new Error(error?.message ?? 'Could not create a test User')
  }
  return { id: data.user.id, email, password }
}

export async function deleteTestUser(userId: string) {
  const { error } = await serviceRole().auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)
}

/** Signs in as a test User and returns a client whose reads pass through RLS. */
export async function signInAs(user: TestUser): Promise<SupabaseClient<Database>> {
  const client = signedOutClient()
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  })
  if (error) throw new Error(error.message)
  return client
}

/**
 * Sets the super-admin flag directly. No app function can do this.
 * Later tickets use it to fixture a super admin.
 */
export async function setSuperAdmin(userId: string, isSuperAdmin: boolean) {
  const { error } = await serviceRole()
    .from('profiles')
    .update({ is_super_admin: isSuperAdmin })
    .eq('id', userId)
  if (error) throw new Error(error.message)
}

/**
 * Fixtures a Player on a Ladder. Join is not available yet, so this writes
 * the membership with the service role, the same way the super-admin flag is set.
 */
export async function addLadderPlayer(
  ladderId: string,
  userId: string,
  options?: { rating?: number; status?: 'active' | 'left' | 'removed' },
) {
  const { error } = await serviceRole().from('ladder_members').insert({
    ladder_id: ladderId,
    user_id: userId,
    role: 'player',
    status: options?.status ?? 'active',
    rating: options?.rating ?? 1000,
    rated_match_count: 0,
  })
  if (error) throw new Error(error.message)
}
