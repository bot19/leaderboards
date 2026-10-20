# 10: Prepare for production

**What to build:** The code changes the app needs before it goes on Netlify against a hosted Supabase project. The password login disappears from production builds, deep links (Share links, the magic-link callback) load on Netlify, and agents are kept off the production database. The human does the hosting setup itself; see `../deploy.md`.

**Blocked by:** 09 Leaderboard details

**Status:** ready-for-agent

- [ ] `TEMP_PASSWORD_AUTH` is `import.meta.env.DEV`, so the password login shows in local development and never in a production build
- [ ] `netlify.toml` builds with `pnpm build`, publishes `dist`, and serves `index.html` for every path (`/* → /index.html 200`) so `/join/…` and `/auth/callback` load when opened directly
- [ ] AGENTS.md gains a guardrail: agents never run `supabase link`, `supabase db push` or any command with `--linked`; production changes are the human's
- [ ] Test: the login page shows no password form when `TEMP_PASSWORD_AUTH` is false
- [ ] `pnpm build` succeeds, and `dist/` from that build contains no "Local development password" text
- [ ] Ticket 01's open box (password login for local development only) is ticked, and its comment is updated to point here
