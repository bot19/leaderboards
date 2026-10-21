# Going live

Checklist for after ticket 09. Not a ticket: the agent's "Pick" rule only reads `issues/`.

## Code changes

- [x] Ticket 10 (`issues/10-prepare-for-production.md`) resolved. Do it before linking: once the main checkout is linked, allowlisted `pnpm` would let an agent `db push` unprompted.

## Supabase (human)

- [x] Create the project in a region near colleagues (Sydney). `pnpm exec supabase link`, then `pnpm exec supabase db push`.
- [x] Auth → Email templates → Magic Link: paste `supabase/templates/magic_link.html` (code only, `{{ .Token }}`), subject "Your Leaderboards App passcode". Confirm email off, so Confirm signup is unused. OTP length 6, expiry 3600. Hosted Supabase ignores `config.toml`.
- [x] Resend: verify a domain you own (DNS records). Auth → SMTP: host `smtp.resend.com`, port 465, user `resend`, password = Resend API key. Raise the auth email rate limit.
- [x] After signing up through the live app: `update profiles set is_super_admin = true where id = '<your user id>';`
- [x] `select * from cron.job;` lists the auto-confirm schedule (ticket 06).

## Netlify (human)

- [x] Open a PR `dev` → `main` and merge it. Connect the repo in Netlify with `main` as the production branch.
- [x] Env vars: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the hosted project (never the secret or service-role key). `NODE_VERSION=24`.
- [x] **After the Netlify subdomain is set:** Auth → URL configuration → Site URL = `https://<subdomain>` (until then, `https://leaderboards-app.netlify.app` works). Redirect URLs: leave empty (emails carry a code, no link). Add `https://<subdomain>/auth/callback` only if a link goes back into the template.

## Smoke test

- [x] Sign up with a real email and confirm the passcode arrives through Resend. Then onboard and create a Ladder.
- [x] Open the Share link in a private window. Sign in and land back on the preview, then join with a second account. (verified on local Supabase)
- [x] Record a Match and confirm it from the other account. Ratings move. (verified on local Supabase)

## Know before launch

- Free Supabase projects pause after about a week with no activity, and have no point-in-time backups. Either accept that and unpause when needed, or budget for Pro.
