# Seed local data

Implement this by following `docs/agents/build-docs.md`.

**Version:** none

**Status:** resolved

**Blocked by:** 0.3.0

**What to build:** A `supabase/seed.sql` that fills the local database with Users, Ladders and Matches, so humans and agents can sign in and see a populated app after every `pnpm exec supabase db reset`. `supabase/config.toml` already loads `./seed.sql` after migrations; the file just doesn't exist yet. Local only: nothing here touches production.

**food-friends reference:** None.

**Schema:** None. The seed writes data, not schema.

### How the seed writes

The seed runs as the database superuser, so it inserts rows directly. ADR-0003 governs the app's writes, not fixtures; `src/test/harness.ts` already inserts with the service role. Ratings are never hand-calculated:

1. Insert Users, profiles, Ladders and Ladder members, with every member at the starting Rating from `rating_constants()`.
2. Insert Matches and Participants with their status, Result, Sides and timestamps, leaving `rating_before` and `rating_change` empty.
3. Call `private.replay_ladder(<ladder id>)` for each Ladder. That fills every Rating, Rating change, rated Match count and last-Match time, the same way the app does after a Void.

Use fixed UUIDs, fixed Share link tokens and timestamps relative to `now()` (e.g. `now() - interval '45 days'`), so Inactive and the Confirmation window behave the same on every reset.

### Signing in as a seeded User

Insert into `auth.users` **and** `auth.identities` (provider `email`), with `encrypted_password = crypt('<password>', gen_salt('bf'))`, `email_confirmed_at` set, `aud` and `role` both `authenticated`, and `raw_app_meta_data` `{"provider":"email","providers":["email"]}`. Set `confirmation_token`, `recovery_token`, `email_change_token_new` and `email_change` to `''`, not null; GoTrue fails sign-in on nulls there. Every seeded User gets the password `password123` and signs in through the dev-only password form.

### Users

| User | Email | Who they are |
|---|---|---|
| Sam | `sam@example.com` | Super admin; Admin of both Ladders |
| Alex | `alex@example.com` | Player on both Ladders |
| Jamie | `jamie@example.com` | Has a profile, on no Ladder: the empty Home |
| Jordan, Taylor, Morgan, Riley, Casey | `<name>@example.com` | Filler Ladder members on Friday pool. Nobody needs to sign in as them, but they can |

### Ladders

**Friday pool** (Game: Pool), every state the Ladder page shows:

- Active on the Leaderboard: Sam, Alex, Jordan, Taylor (at least four, so ranks 1–3 get the 0.3.2 podium and rank 4 shows a number)
- Provisional: Taylor, with fewer rated Matches than the Provisional threshold
- Inactive: Morgan, last Match 45 days ago
- Left: Riley; Removed: Casey (each played a Match before going, so their history shows)
- About 15 Confirmed Matches over the last 40 days, mostly 1v1 plus two 2v2, with at least one Draw and notes on a few
- One Pending Match recorded by Jordan against Alex an hour ago, so Alex sees "Waiting for you"
- One Pending Match recorded by Alex against Sam an hour ago, so Sam sees it too
- One Match Rejected while Pending, and one Confirmed Match later voided by Sam (`void_kind` as the app writes it)

**Lunch table tennis** (a second Game): Sam (Admin) and Alex, no Matches. Home lists two Ladders, and the Ladder page's empty states have somewhere to show.

### README

Add a **Local test Users** section to `README.md`, under "The local Supabase stack": the three main emails, the shared password, what each User is for, and that `db reset` rebuilds them.

- [x] `pnpm exec supabase db reset` runs the seed without errors
- [x] Sam, Alex and Jamie can each sign in locally with `password123` and land on Home (not onboarding)
- [x] Friday pool shows all of the above: four or more ranked, Taylor Provisional, Morgan Inactive, Riley Left, Casey Removed, Pending, Rejected and Voided Matches
- [x] Every Rating shown came from `private.replay_ladder`, and each Ladder member's Rating history adds up to their current Rating
- [x] Alex and Sam each see one Match in "Waiting for you"
- [x] `pnpm test` passes after a reset with the seed loaded. Check every test that counts rows or lists all Ladders or Users, and fix any that assumed an empty database by scoping it to the Users and Ladders that test created
- [x] The README section exists and matches the seed

**Out of scope:** A User with no profile (onboarding); seeding production or the hosted project; a script to re-seed without a reset.
