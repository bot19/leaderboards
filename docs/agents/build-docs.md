# Build docs

A **build doc** describes one versioned update to the app: a feature, a fix, a UI change. Each one lives at `.scratch/updates/<version>-<slug>.md` (for example `.scratch/updates/0.3.0-win-streaks.md`) and carries its own **Version**.

Build docs replace the MVP's ticket-and-worktree flow in `README.md`: work happens directly on `dev` in this checkout.

## Implementing a build doc

1. **Read.** Read the build doc, `GLOSSARY.md`, and any ADR in `docs/adr/` that touches the area. Use glossary terms in code, copy and commit messages.
2. **Branch.** Confirm `git branch --show-current` prints `dev`. If it doesn't, stop and ask the human. Changes already in `git status` belong to the human: leave them unstaged and stage only the files you touch.
3. **Version.** Set `"version"` in `package.json` to the build doc's **Version**. Change nothing else in that file unless the build doc says so.
4. **Schema** (only when the build doc needs a database change). Add a migration under `supabase/migrations/`, then run `pnpm exec supabase db reset`, and again after every migration edit. The stack rules in `AGENTS.md` apply. Production is the human's: record the migration in your report so they can apply it.
5. **Build** test-first, following **UI rules** below for anything a user sees. Done when every acceptance box in the build doc is met.
6. **Gate.** `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` all green. If you can drive a browser, check each changed screen at 300px, 375px, 512px and 1280px wide. If you can't, say so in your review.
7. **Review.** With the gate green and nothing committed, ask the human whether they want any changes before you commit. In the same message, summarise what you built, any migration production needs, and every judgement call the build doc didn't settle (including UI with no food-friends equivalent). Apply each change they ask for, rerun the gate, and ask again. Move on only when the human says there are no more changes.
8. **Commit** on `dev`, following **Commit messages** below. In the last commit, tick the build doc's boxes and set its `**Status:** resolved`. Stop any dev server or watcher you started. Leave pushing to the human.
9. **Report.** List the commits, and repeat any migration production needs.

## Commit messages

```
<version> <type>: <description>
```

- `<version>` is the build doc's **Version**, on every commit for that build doc.
- `<type>` is one lowercase word for what the commit does: `feature`, `fix`, `test`, `refactor`, `style`, `docs`, `chore`, or another plain verb that fits better.
- `<description>` is lowercase, present tense, no trailing period, and says what changed for the user or the code.

```
0.3.0 feature: show each Ladder member's win streak on the Leaderboard
0.3.1 fix: Leaderboard names overflow at 300px
0.3.2 test: cover streak reset after a lost Match
```

One build doc is usually one commit. Split it only when the pieces stand alone (a refactor the feature needs, then the feature), and keep the gate green at every commit.

## UI rules

### Reference app: food-friends

food-friends is a sibling app at `/Users/teex/Code/food-friends` on the same stack (React 19, TanStack Router and Query, Tailwind v4, sonner, Tabler icons, react-hook-form with zod). It is the reference for how UI looks and behaves here. Read it; never edit it.

- **Find the equivalent first.** Before building a UI piece, open the food-friends component the build doc names. If it names none, search food-friends' `src/components/` and `src/features/` for the closest match (panel, list row, form, avatar, pill, empty state, skeleton). Mirror its structure, Tailwind classes, spacing, states and accessibility behaviour: focus moves into a panel on open, is trapped while open, returns to the trigger on close, and `Escape` closes.
- **Its rules carry over.** food-friends' `docs/init/CODING.md` sets the shared conventions: a skeleton for first load, a spinner inside the button for an in-flight action, nothing for background refetch, persistent error toasts with a stable `id`, an `aria-label` on every icon-only control, sentence-case copy with contractions.
- **Copy, then adapt.** Copy a food-friends file into this repo when it fits; never import across repos. Start a copied file with a provenance line, as the bao-ui copies already do:
  ```ts
  // Copied from food-friends: src/components/ui/RemovablePill.tsx — <what changed>
  ```
  Swap food-friends' domain words for this app's glossary terms, and its colours for the tokens in `src/index.css` (`primary`, `coral`, `green-soft`, `celadon`, `ink`).
- **No equivalent.** Follow the nearest existing pattern in this repo and list it in your report.

### Mobile first, 300px to 512px

Every screen sits in one centred column: `mx-auto max-w-lg px-4` on the route's `<main>`, 512px wide. Design for that column at its narrowest.

- **Base classes target 300px.** Unprefixed Tailwind classes are the 300px layout; `sm:` and wider only add to it.
- **Nothing overflows at 300px.** No horizontal scroll. Long Ladder and display names truncate or wrap (`min-w-0` on flex children, `truncate` or `break-words`). Rows that can't fit side by side stack.
- **Touch first.** Tap targets at least 44px tall; every action reachable by tap, with no hover-only controls.
- **Desktop works, unpolished.** Above 512px the column stays centred and everything stays usable. Desktop-specific layouts come only when a build doc asks for them.

## Writing a build doc

For the agent that turns the human's feature description into a build doc. Settle open questions with the human before writing; the implementing agent should find nothing left to decide.

```md
# <version>: <short title>

**Version:** <version>

**Status:** ready-for-agent

**What to build:** <the change, from a user's point of view, in glossary terms. Name the screens and routes it touches.>

**food-friends reference:** <food-friends file(s) to mirror, and what to take from each. "None" when nothing fits.>

**Schema:** <the database change and the database function it goes through (ADR-0003), or "None">

- [ ] <acceptance criterion: observable behaviour, checkable>
- [ ] <UI criterion, including how it fits at 300px>
- [ ] <test criterion: which behaviours the tests pin down>

**Out of scope:** <what a reasonable agent might add but shouldn't>
```
