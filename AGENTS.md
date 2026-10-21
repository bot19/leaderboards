## Build docs

Versioned updates live in `.scratch/updates/<version>-<slug>.md`. To write or implement one, follow `docs/agents/build-docs.md`.

## Working a ticket

Follow `README.md` → "Agent: working a ticket" for every ticket: claim, worktree, schema, build, resolve.

The local Supabase stack is shared and owned by the human. Your only stack commands are `supabase status`, `supabase db reset` and `supabase migration up`. Keep `supabase/config.toml`'s `project_id` and ports as they are. If the stack is down, stop and ask the human to start it. Never start or stop it yourself, and never run `docker`.

Never run `supabase link`, `supabase db push`, or any Supabase command with `--linked`. Production database changes are the human's (see `.scratch/elo-ladder-mvp/deploy.md`).

## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
