# 10: Prepare for production

**What to build:** The code changes the app needs before it goes on Netlify against a hosted Supabase project. The password login disappears from production builds, deep links (Share links, the magic-link callback) load on Netlify, and agents are kept off the production database. The human does the hosting setup itself; see `../deploy.md`.

**Blocked by:** 09 Leaderboard details

**Status:** resolved

- [x] `TEMP_PASSWORD_AUTH` is `import.meta.env.DEV`, so the password login shows in local development and never in a production build
- [x] `netlify.toml` follows `/Users/teex/Code/food-friends/netlify.toml`, which fixed stale-deploy errors there (HTML served for a `.js` URL, MIME errors, a stuck cache). Copy its comments explaining why. It:
  - builds with `pnpm build` and publishes `dist`
  - sends `/assets/*` to `/404.html` with status 404 *before* the SPA fallback, plus a `public/404.html`, so a missing hashed chunk 404s instead of getting the app shell
  - serves `index.html` for every other path (`/* → /index.html 200`), so `/join/…` and `/auth/callback` load when opened directly
  - caches `/assets/*` for a week (`public, max-age=604800`), not a year-long immutable cache
  - sets `no-cache, no-store, must-revalidate` on every path that serves the app shell, matched on the request path: `/`, `/:route` (login, signup, onboarding), `/auth/callback`, `/join/:token`, `/ladders/:ladderId`, `/ladders/:ladderId/members/:memberId`
- [x] Test: every route path in `src/routeTree.gen.ts` is covered by a no-cache header rule in `netlify.toml`, so a new route can't silently miss one
- [x] AGENTS.md gains a guardrail: agents never run `supabase link`, `supabase db push` or any command with `--linked`; production changes are the human's
- [x] Test: the login page shows no password form when `TEMP_PASSWORD_AUTH` is false
- [x] `pnpm build` succeeds, and `dist/` from that build contains no "Local development password" text
- [x] Ticket 01's open box (password login for local development only) is ticked, and its comment is updated to point here
