// Writes .env for the running local Supabase stack, so the app can reach it.
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const output = execSync('supabase status -o env', {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
})
const env = Object.fromEntries(
  output
    .split('\n')
    .map((line) => line.match(/^([A-Z0-9_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map(([, key, value]) => [key, value]),
)

if (!env.API_URL || !env.PUBLISHABLE_KEY) {
  console.error('Local Supabase is not ready. Ask the human to start it.')
  process.exit(1)
}

writeFileSync(
  '.env',
  `VITE_SUPABASE_URL=${env.API_URL}\nVITE_SUPABASE_PUBLISHABLE_KEY=${env.PUBLISHABLE_KEY}\n`,
)
console.log(`Wrote .env for ${env.API_URL}`)
