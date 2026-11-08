# Leaderboards

Elo Ladders for office games. React + Vite on the front, Supabase (Postgres, auth, PostgREST) behind it. `docs/app.md` describes the app as it is now.

Every change is a build doc in `.scratch/updates/`, which an agent implements directly on `dev` by following `docs/agents/build-docs.md`. `.scratch/elo-ladder-mvp/` holds the finished release-1 spec and tickets, kept as history, plus the production deploy guide (`deploy.md`).

## The local Supabase stack

`pnpm test` runs integration tests against a real local Supabase. `supabase start` runs it as about 12 Docker containers. There is **one** stack, and the human owns it:

- Its name and ports come from `supabase/config.toml`.
- The agent applies migrations with `pnpm exec supabase db reset`. That wipes local data, which is fine because tests create their own Users and the seed rebuilds the test Users below.

## Local test Users

`pnpm exec supabase db reset` rebuilds these Users. The shared password is `password123`. Sign in through the local development password form.

| Email | What they're for |
|---|---|
| `sam@example.com` | Super admin. Admin of Friday pool and Lunch table tennis. One Friday pool Match is waiting for them. |
| `alex@example.com` | Player on both Ladders. One Friday pool Match is waiting for them. |
| `jamie@example.com` | Has a profile and is on no Ladder, so Home is empty. |

Friday pool also has Jordan, Taylor, Morgan, Riley and Casey (`jordan@example.com` and the same pattern). They use the same password.

## Human: once

```sh
pnpm install            # so you can run the Supabase CLI here
pnpm env:local          # with the stack running: writes .env from `supabase status`
```

In the Cursor chat panel, add these to Settings → Agents → Auto-Run → Command Allowlist: `git pnpm ls cat head tail wc grep rg pwd cd test true echo`. The chat panel ignores `.cursor/cli.json`, which only applies to `cursor-agent` in a terminal.

## Human: each session

1. Open Docker Desktop.
2. From this checkout, run `pnpm exec supabase start`.
3. When you're done for the day, run `pnpm exec supabase stop`. Data volumes are kept.

## Human: each build doc

1. Tell the agent: *"Implement `.scratch/updates/<file>.md`."* Or describe a feature and ask it to write the build doc first.
2. Answer the prompts that are left. The allowlist above covers routine work, so anything else still asks: `docker`, `curl`, `python3`/`node` scripts, `rm` and `kill`.
3. When the agent asks for changes before committing, review the work and answer.
4. After it commits on `dev`, push. To ship, follow **Human: releasing** below.

## Human: releasing

Run these from this checkout, which is linked to the production Supabase project. Agents never run them (`AGENTS.md`).

1. **Migrations first**, if the release has any. The new client may need them, and the old client keeps working with them in place:

   ```sh
   pnpm exec supabase migration list --linked   # local vs production: what's not applied yet
   pnpm exec supabase db push --dry-run         # lists what it would apply, changes nothing
   pnpm exec supabase db push                   # applies them
   ```

2. **Then the client.** Open a PR `dev` → `main` and merge it. Netlify deploys `main`.

The first-time production setup is in `.scratch/elo-ladder-mvp/deploy.md`.

## Troubleshooting

- **`Local Supabase is not ready`** from `pnpm test`. The stack is down: start it.
- **Stacks left over from the release-1 worktrees.** List them with `docker ps --format '{{.Names}}'`. Stop one with `pnpm exec supabase stop --project-id <id>`.
- **`Command "supabase" not found`.** `pnpm install` hasn't been run in that checkout.
