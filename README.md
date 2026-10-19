# Leaderboards

Elo Ladders for office games. React + Vite on the front, Supabase (Postgres, auth, PostgREST) behind it. The spec and tickets live in `.scratch/elo-ladder-mvp/`.

Tickets are built one at a time by an agent, each in its own git worktree. This file covers what the human does and what the agent does.

## The local Supabase stack

`pnpm test` runs integration tests against a real local Supabase. `supabase start` runs it as about 12 Docker containers. There is **one** stack, and the human owns it:

- Its name and ports come from `supabase/config.toml`, which stays the same in every worktree.
- The agent applies its worktree's migrations with `pnpm exec supabase db reset`. That wipes local data, which is fine because tests create their own Users.
- Only one ticket can use the stack at a time. That fits the tickets, which block one another in order.

## Human: once

```sh
pnpm install            # in this checkout, so you can run the Supabase CLI here
cp .env.example .env    # then paste PUBLISHABLE_KEY from `pnpm exec supabase status -o env`
```

## Human: each session

1. Open Docker Desktop.
2. From this checkout, run `pnpm exec supabase start`.
3. When you're done for the day, run `pnpm exec supabase stop`. Data volumes are kept.

## Human: each ticket

1. Tell the agent: *"Work the next ticket in `.scratch/elo-ladder-mvp/` following README.md."* You can name a specific ticket instead.
2. Answer the prompts that are left. `.cursor/cli.json` already allows `pnpm`, `git` and read-only shell commands. Anything else still asks: `docker`, `curl`, `python3`/`node` scripts, `rm`, and writes outside the allowed paths.
3. When the agent reports the ticket resolved, look over the merge on `elo-ladder-mvp`. Then delete the worktree: `git worktree remove ../leaderboards-wt/<NN-slug>`.

## Agent: working a ticket

1. **Pick.** Use the ticket you were given. Otherwise take the lowest-numbered ticket in `.scratch/elo-ladder-mvp/issues/` that isn't `claimed` or `resolved` and whose **Blocked by** tickets are all `resolved`.
2. **Claim.** On `elo-ladder-mvp` in this checkout, set `**Status:** claimed` and commit (`Claim the <ticket> ticket.`).
3. **Worktree.** Run `git worktree add ../leaderboards-wt/<NN-slug> -b ticket/<NN-slug> elo-ladder-mvp`. Then, inside it, run `pnpm install` and create `.env` from `.env.example` using `PUBLISHABLE_KEY` from `pnpm exec supabase status -o env`.
4. **Schema.** From the worktree, run `pnpm exec supabase db reset`. Run it again whenever you add or change a migration.
5. **Build** test-first. The ticket is done when every acceptance box is ticked and `pnpm typecheck`, `pnpm lint` and `pnpm test` are green in the worktree.
6. **Resolve.** In this checkout, merge `ticket/<NN-slug>` into `elo-ladder-mvp`. Then tick the boxes, set `**Status:** resolved` and commit (`Resolve the <ticket> ticket.`).

If `pnpm test` says *Local Supabase is not ready*, the stack is down. Stop and ask the human to start it.

## Troubleshooting

- **Stacks left over from older tickets.** List them with `docker ps --format '{{.Names}}'`. Stop one with `pnpm exec supabase stop --project-id <id>`.
- **`Command "supabase" not found`.** `pnpm install` hasn't been run in that checkout.
