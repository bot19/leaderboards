# Going live

Checklist for after ticket 09. Not a ticket: the agent's "Pick" rule only reads `issues/`.

## Code changes

- [ ] Ticket 10 (`issues/10-prepare-for-production.md`) resolved. Do it before linking: once the main checkout is linked, allowlisted `pnpm` would let an agent `db push` unprompted.

## Supabase (human)

- [ ] Create the project in a region near colleagues (Sydney). `pnpm exec supabase link`, then `pnpm exec supabase db push`.
- [ ] Auth → URL configuration: Site URL = Netlify URL. Redirect URLs = `https://<site>/auth/callback`.
- [ ] Auth → Email templates: copy `supabase/templates/magic_link.html` and `confirmation.html`, subject "Your Elo Ladder passcode". The templates must show `{{ .Token }}`. Set OTP length to 6. Hosted Supabase ignores `config.toml`.
- [ ] Resend: verify a domain you own (DNS records). Auth → SMTP: host `smtp.resend.com`, port 465, user `resend`, password = Resend API key. Raise the auth email rate limit.
- [ ] After signing up through the live app: `update profiles set is_super_admin = true where id = '<your user id>';`
- [ ] `select * from cron.job;` lists the auto-confirm schedule (ticket 06).

## Netlify (human)

- [ ] Merge `elo-ladder-mvp` into `main`, push, connect the repo with `main` as the production branch.
- [ ] Env vars: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the hosted project (never the secret or service-role key). `NODE_VERSION=24`.

## Smoke test

- [ ] Sign up with a real email and confirm the passcode arrives through Resend. Then onboard and create a Ladder.
- [ ] Open the Share link in a private window. Sign in and land back on the preview, then join with a second account.
- [ ] Record a Match and confirm it from the other account. Ratings move.

## Know before launch

- Free Supabase projects pause after about a week with no activity, and have no point-in-time backups. Either accept that and unpause when needed, or budget for Pro.
