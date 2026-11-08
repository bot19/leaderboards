# The app as it is now

What the Elo Ladder app does today. Keep this file current: every build doc that changes behaviour updates it (see `docs/agents/build-docs.md`). History lives in `.scratch/updates/` and git. Terms are defined in `GLOSSARY.md`, and the reasons behind big decisions are in `docs/adr/`.

## Purpose

Colleagues record the pool Matches they play (1v1 and 2v2) on a shared Ladder. The opposing Side confirms or Rejects each Match, and only Confirmed Matches move Elo Ratings. That keeps the Leaderboard to results everyone has agreed.

The data model already allows for Guests, Claims, Join requests, Draws and other Games, but none of them are built.

## Stack

- **Backend.** Supabase does all of it: Postgres, Auth, row-level security for reads, RPC for every write (ADR-0003), and pg_cron for scheduled work. Every rule lives in the database.
- **Client.** A Vite + React + TypeScript single-page app with no server, deployed on Netlify. It uses:
  - TanStack Router (file-based) and TanStack Query
  - zod and react-hook-form for forms
  - sonner for toasts
  - Tailwind v4 and Tabler icons
  - Vitest for tests, and pnpm as the package manager
- **UI rules.** Mobile first, from 300px to 512px. The food-friends repo is the UI reference. Both are covered in `docs/agents/build-docs.md`.
- **Hosting.** Production is the Supabase project in Sydney. Deploy steps are in `.scratch/elo-ladder-mvp/deploy.md`.
- **Home screen.** Saved to a phone's home screen, the app opens full screen through a web manifest. It has no service worker and no offline mode.

## Screens and navigation

| Route | Shows |
|---|---|
| `/login`, `/signup` | Sign-in with an emailed 6-digit passcode. Login never creates an account |
| `/onboarding` | Set a display name. It includes a Sign out link |
| `/auth/callback` | Fallback for a magic link |
| `/` | Redirects to the User's Default Ladder. With no Default Ladder, shows the Ladders section |
| `/ladders/$ladderId` | The Ladder page. Tabs (`?tab=`): Leaderboard, Matches, Members |
| `/join/$token` | The Ladder preview from a Share link, with a Join button. Signed in only |

- **Signed-out visitors.** A signed-out User is sent to login and then back to where they were going (`redirect` param).
- **Deleted accounts.** On load, the app checks the session with the server, so a deleted User is signed out instead of being stuck.
- **View state lives in the URL** as zod-validated search params, so Back, reload and shared links all restore the same view:
  - `tab` and `record=open` (the Record a Match panel) on the Ladder page
  - `nav` and `member` (the drawer) on every signed-in route
- **Bottom nav bar.** Every signed-in screen has a floating bar centred at the bottom. It holds:
  - the Profile avatar, which opens the drawer's profile view
  - Record a Match, on the Ladder page only
  - Nav, which opens the drawer's menu view
  - The bar sits under the drawer and under Record a Match. Pages pad their bottom so nothing ends up hidden behind it.
- **Nav drawer.** It slides in from the right, with Refresh and Close in its header and the app version shown. It has three views, set by `nav`:
  - **`menu`:** the Ladders section, then the profile card, Sign out and Close.
  - **`profile`:** a form to change the display name.
  - **`member` (`&member=<ladder member id>`):** the member view (see below).

### Ladders section

It's shown on `/` when the User has no Default Ladder, and always in the drawer's menu view. It contains:

- a **Leaderboards** heading with two buttons: Join a Ladder (key icon) and New Ladder (plus icon). Each opens its form inline, and only one can be open at a time.
- **Join form:** type a Join code to see a live preview of the Ladder (name, Game, member count), then join it.
- **List:** each of the User's Joined Ladders, with a star. The filled star marks the Default Ladder, and tapping another Ladder's star moves the default there.
- **"Make this my Default Ladder" checkbox:** on the Join and New forms and on `/join/<code>`. It appears only once the User already has a Ladder.
- **No Ladders yet:** a welcome line, plus full-width "Join with a code" and "New Ladder" buttons.
- **No Default Ladder with 2+ Ladders:** a hint to star one.

### Ladder page

- **Top row:**
  - a Ladders button that opens the drawer
  - the Game
  - **Invite**, which opens a card with the Join code (copy button) and a Copy link button for the Share link
- **Waiting for you:** above the tabs. Lists the Pending Matches the User can confirm or Reject, with a divider below.
- **Leaderboard tab:**
  - rank, with 🥇🥈🥉 and a tinted row for the top three
  - name, then the badges `New` (Provisional) and `Inactive` (the row dimmed)
  - rank movement: green ↑n or red ↓n
  - Rating
- **Matches tab:** Match cards, newest first, 10 at a time with load more and "Showing n of total Matches".
  - **Each card:** both Sides by name, the status with its icon, `Recorded by <name> · <relative time>`, the Result by name (`Alex & Sam won` or `Draw`) with notes, and, once Confirmed, each Participant's Rating change in green or red.
  - **Status styles:** Pending cards are orange. Rejected and Voided by Admin cards are dimmed. Confirmed cards are white.
  - **Void:** Admins see a Void button.
- **Members tab:**
  - Joined, Left and Removed Ladder members, with their Role
  - Admin actions: remove, reinstate, Make Admin, Demote to Player
  - Leave Ladder for yourself
  - Delete Ladder for the super admin
- **Tab counts:** each tab shows a count. Matches shows the total.
- **Member names:** tapping a name on the Leaderboard or Members tab opens the member view.

### Member view (drawer)

It's titled with the member's name, with the Ladder's name underneath. It shows:

- **Summary:**
  - Rating, with `New` if Provisional
  - rank (shown with the `Inactive` badge if they're Inactive), or `Left` or `Removed` instead
  - their record, for example `12W · 5L · 1D`
  - their last 5 results as coloured dots, and their streak when it's 2 or more
  - their peak Rating and when they reached it
- **Their Matches:** Confirmed and Pending only, 10 at a time with load more. Each row is told from their side:
  - `Won`, `Lost` or `Drew` vs the opponents, in green, red or neutral
  - the format (1v1 or 2v2), and their partner in a 2v2
  - relative time, Rating change, and Rating before → after
  - Pending rows use the Pending style and show no Rating numbers.

### Confirmations

Impactful actions ask first with `window.confirm`. These are Leave, Remove, Demote, Void, Reject and Delete Ladder.

## Rules

### Accounts

- **Sign-in:** an emailed passcode (`signInWithOtp` then `verifyOtp`), with `shouldCreateUser: false` on login. Email goes through Resend as custom SMTP. Local development also has a password login.
- **Profiles:** each User has one profile, created by a database function. It holds the display name, the super admin flag and the Default Ladder.
- **Super admin (ADR-0007):** set only by editing the database directly. The super admin passes every Admin check on every Ladder, can read everything, and is the only one who can delete a Ladder. There's no Owner Role.

### Ladders and joining

- **Creating a Ladder.** Any User can create one. Release 1 seeds only pool, which has no Draws and a largest Side of 2. The creator becomes its first Admin.
- **Join code.** Every Ladder has a 6-character Join code drawn from `1-9A-Z`, and it doubles as the Share link token (`/join/<code>`). Lookups ignore case and surrounding spaces.
- **Joining** takes a Join code. The outcome depends on the caller:
  - New to the Ladder: they become a Joined Player at the starting Rating.
  - Left: they're Joined again, keeping their Rating and history.
  - Removed: refused. Only an Admin can reinstate them.
  - Already Joined: nothing changes.
- **Join policy.** Every Ladder's join policy is `open`. Join requests aren't built.
- **The Ladder preview** shows the name, Game and member count. It's signed-in only.
- **Ladder members (ADR-0001).** Rating, Role, status (Joined, Left or Removed), rated-Match count and last-Match time all live on the Ladder member. A User has at most one Ladder member per Ladder.
- **Admin actions:** appoint and demote Admins, remove and reinstate Ladder members, and void Matches. They all go through one shared check: "Joined Admin of this Ladder, or the super admin".

### Default Ladder

- It's always a Ladder the User is Joined to.
- **One rule keeps that true:** if a User has no Default Ladder and exactly one Joined Ladder, that Ladder becomes the default. It's applied after create, join, leave, remove, reinstate and delete.
- **Moving it:** with the star, or by ticking `make default` when creating or joining. It can be moved but not cleared.
- **Losing it:** leaving, being Removed from, or deleting the Default Ladder clears it, or moves it to the one remaining Ladder if there's exactly one.

### Matches

- **Validation on recording (ADR-0004):**
  - two non-empty Sides of equal size, no larger than the Game allows
  - a Draw only if the Game allows one (pool doesn't)
  - every Participant is a Joined Ladder member of this Ladder and appears once
  - the recorder is a Participant
  - notes are optional
- **Lifecycle:**
  1. A recorded Match starts **Pending**. It doesn't affect Ratings.
  2. Any Participant on the opposing Side can **confirm** it, or **Reject** it, which Voids it. The recording Side can't confirm its own Match.
  3. If nobody responds within the **Confirmation window (30 minutes)**, it becomes Confirmed on its own, with its confirmed time set to the recorded time plus the window. A pg_cron job checks every minute.
  4. An Admin can **void** any Match that isn't already Voided. Voiding a Confirmed Match triggers a **Replay**.
- **Voided Matches** stay in history, marked Rejected or Voided by Admin.

### Ratings

- **When they're calculated (ADR-0002):** once, at confirmation, from Ratings as they stand at that moment. The result is stored on each Participant as Rating before and Rating change.
- **The rating function:** a pure SQL function. Each Side's Rating is the mean of its Participants' Ratings, the expected score is standard Elo, and a win, Draw or loss scores 1, 0.5 or 0. Each Participant moves by their own K-factor × (actual − expected). The K-factor is higher while Provisional (ADR-0006).
- **One Rating per Ladder member:** singles and doubles share it (ADR-0005).
- **Replay**, in one transaction:
  1. Reset everyone to the starting Rating.
  2. Walk the Confirmed, non-Voided Matches in confirmation order (`confirmed_at`, then `id`), rewriting each Participant's Rating before and change.
  3. Write the final Ratings back.

  With no Voided Matches, a Replay reproduces the stored Ratings exactly.

### Leaderboard

- **Who's on it:** every Joined Ladder member, ordered by `rating desc, display_name asc` and ranked with `rank()`. Inactive members are ranked like everyone else and keep their medals.
- **Inactive:** no Match, or no join if they've never played, within the Inactive threshold. Being Inactive never changes a Rating.
- **Provisional:** fewer rated Matches than the Provisional threshold. Shown on screen as `New`.
- **Rank movement:** each member's previous rank minus their current rank, across the Ladder's latest Confirmed Match.
  - Their previous Rating is their Rating before in that Match, or their current Rating if they didn't play in it.
  - Members who joined after that Match show no movement.

### Constants

These are app-wide, set in `public.rating_constants()`:

| Constant | Value |
|---|---|
| Starting Rating | 1000 |
| K-factor | 32 |
| Provisional K-factor | 64 |
| Provisional threshold | 5 rated Matches |
| Confirmation window | 30 minutes |
| Inactive threshold | 30 days |

## Data

### Tables

| Table | Holds |
|---|---|
| `profiles` | display name, `is_super_admin`, `default_ladder_id` (null when unset, cleared if the Ladder is deleted) |
| `games` | name, Draws allowed, largest Side |
| `ladders` | name, Game, `share_token` (the Join code), join policy, created time |
| `ladder_members` | Ladder, User (nullable, so Guests can be added later), Role, status, Rating, rated-Match count, last-Match time, joined time |
| `matches` | Ladder, status, Result, notes, recorded by and when, confirmed when, voided by and when, and whether it was Rejected or voided by an Admin |
| `participants` | Match, Ladder member, Side, Rating before, Rating change (both empty until Confirmed) |

### Public functions (RPC)

| Area | Functions |
|---|---|
| Profiles | `create_profile`, `update_display_name` |
| Ladders | `create_ladder(name, make_default)`, `delete_ladder` (super admin only), `set_default_ladder` |
| Membership | `preview_ladder(code)`, `join_ladder(code, make_default)`, `leave_ladder`, `remove_ladder_member`, `reinstate_ladder_member`, `set_ladder_member_role`, `assert_active_ladder_admin` |
| Matches | `record_match`, `confirm_match`, `reject_match`, `void_match` |
| Reads | `ladder_member_record` (W, L, D, form, streak and peak, over Confirmed Matches), `rating_changes` (the pure rating function), `rating_constants` |

The internal functions in the `private` schema can't be called by clients:

- applying a Match's Ratings, and Replay
- `confirm_expired_pending_matches(now)`, which takes the time as an argument so tests can drive it
- `settle_default_ladder`
- generating Join codes
- the permission checks

### Reads

- **Row-level security:** Ladder members can read their own Ladders' Ladder members, Matches and Participants. The super admin can read everything. Outside the Ladder, only the signed-in preview is visible.
- **Read views.** Views store nothing: each is computed when it's read, and row-level security applies to it (`security_invoker`).
  - `leaderboard`, which includes the `inactive` and `rank_change` columns
  - `my_ladders`: the caller's Joined Ladders, filtered on `auth.uid()`. It looks empty in the Supabase dashboard because nobody is signed in there
  - `rating_history`: Confirmed Matches' Participant rows. Only integration tests read it

## Testing

- **Seam 1: the RPC surface.** Integration tests against the local Supabase stack. They sign in as test Users, call the public functions, and check results only through reads that row-level security filters. Time-dependent behaviour is driven through the service role.
- **Seam 2: the rating function.** It's called directly with chosen inputs.
- **Component tests** use Vitest and Testing Library, following food-friends.

## Not built

These are planned for later, and the data model already allows for them:

- Guests and Claims
- Join requests and Ladders that need approval
- Draws in the UI
- Games other than pool
- Admins recording Matches they didn't play

These aren't planned at all:

- an Owner Role
- a Disputed state
- editing a recorded Match
- unrated or uneven Matches
- separate singles and doubles Ratings
- per-Ladder rules or constants
- rating decay
- notifications
- seasons
- rotating Join codes
- score lines
- a Rating chart
- head-to-head records
