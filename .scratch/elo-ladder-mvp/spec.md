# Spec: Elo Ladder app (release 1)

Status: ready-for-agent

## Problem Statement

Colleagues who play pool at work, both singles and doubles, have no shared, trustworthy record of who beats whom. Results are argued over or forgotten. Nobody can tell who is actually the strongest, and one person keeping score by hand becomes a bottleneck. A score that one person can change without the others agreeing isn't trusted.

## Solution

An app where colleagues set up a Ladder for pool, share its link so others can join, and record each Match (1v1 or 2v2) as it happens. The opposing Side confirms a recorded Match or Rejects it if it's wrong. If nobody responds, the Match confirms itself when the Confirmation window runs out. Only Confirmed Matches move Ratings, which use Elo, so the Leaderboard reflects results everyone has agreed. If a Confirmed Match turns out to be wrong, an Admin voids it, and the Ladder is Replayed so every later Rating is correct. A super admin (the app's maintainer) can step in on any Ladder.

Release 1 targets one company: pool only, 1v1 and 2v2, one or two Ladders. The data model is built so that later releases can add Guests, Claims, Join requests, Draws and other Games without reworking it.

## User Stories

### Accounts and navigation

1. As a colleague, I want to sign up and sign in with a passcode sent to my email, so that I don't need a password.
2. As a colleague signing in, I want a mistyped email to fail instead of creating a new account, so that I don't end up with two accounts.
3. As a new User, I want to set my display name before using the app, so that my colleagues recognise me on Leaderboards.
4. As a User, I want to change my display name, so that I can fix a typo or use a nickname.
5. As a User, I want the screen I'm on (Ladder, tab, filters, open panel) reflected in the URL, so that reloading or sharing a link brings me back to the same view.
6. As a User who opens a Share link while signed out, I want to return to that Ladder's preview after signing in, so that joining doesn't lose my place.

### Ladders

7. As a User, I want to create a Ladder for pool, so that my colleagues and I have a place to record our Matches.
8. As a User creating a Ladder, I want to become its Admin automatically, so that I can run it from the start.
9. As a User, I want to see the Ladders I belong to on my home screen, so that I can open the right one quickly.
10. As a User, I want to belong to more than one Ladder, with a separate Rating on each, so that, say, an office ladder and a team ladder don't mix.
11. As a User who isn't a Ladder member, I want to be unable to see a Ladder's Matches, Leaderboard or Ladder members beyond its preview, so that each Ladder's activity stays private to it.

### Joining and membership

12. As a Ladder member, I want to copy a Share link for my Ladder, so that I can send it to colleagues.
13. As a User who opens a Share link, I want to see a preview of the Ladder (its name, Game and how many Ladder members it has), so that I know what I'm joining.
14. As a User on a Ladder's preview, I want to join with one tap, so that I can start playing straight away.
15. As a User who has just joined, I want to start at the same Rating as everyone else, so that the competition is fair.
16. As a Ladder member, I want to leave a Ladder, so that I can stop taking part.
17. As a Ladder member who Left, I want my Matches to stay in the Ladder's history, so that other people's Ratings and history stay consistent.
18. As a Ladder member who Left, I want to rejoin from the Share link and keep my Rating, so that taking a break costs me nothing.
19. As an Admin, I want to remove a Ladder member, so that I can deal with someone who shouldn't be there.
20. As an Admin, I want a Removed Ladder member to be unable to rejoin from the Share link, so that removing someone actually sticks.
21. As an Admin, I want to reinstate a Removed Ladder member, so that I can undo a removal.
22. As an Admin, I want to appoint and demote Admins, so that I can share the running of the Ladder.

### Super admin

23. As the super admin, I want to do anything an Admin can on every Ladder, even ones I'm not a member of, so that I can sort out problems such as a Ladder whose Admins have all left.
24. As the super admin, I want to change anyone's Role on any Ladder, so that I can hand control of a Ladder to someone when asked.
25. As the super admin, I want to be the only one who can delete a Ladder, so that a Ladder and its history can't be lost by accident.
26. As a User, I want super admin rights to be granted only in the database, never through the app, so that nobody can make themselves super admin.

### Recording Matches

27. As a Player, I want to record a Match I took part in, choosing both Sides and who won, so that it can be rated.
28. As a Player, I want to record singles (1v1) and doubles (2v2) Matches on the same Ladder, so that we can play however we like.
29. As a Player, I want the app to refuse a Match whose Sides are different sizes, or larger than the Game allows, so that Ratings stay balanced and Matches follow pool's rules.
30. As a Player, I want the app to refuse a Draw in pool, so that Results are valid for the Game.
31. As a Player, I want the app to refuse a Match that includes someone who isn't an active Ladder member of this Ladder, or lists the same person twice, so that only real Matches get recorded.
32. As a Player, I want to add notes to a Match, so that we remember details like who broke or which table we played on.
33. As a Player, I want a newly recorded Match to be Pending and not affect anyone's Rating yet, so that nothing moves until it's agreed.

### Confirming, Rejecting and voiding

34. As a Participant on the opposing Side, I want to see Matches waiting for my confirmation, so that I can deal with them quickly.
35. As a Participant on the opposing Side, I want to confirm a Pending Match, so that its Result counts.
36. As a Participant on the Side that recorded the Match, I want to be unable to confirm it myself, so that one Side can't award itself a win.
37. As a Participant on the opposing Side, I want to Reject a Pending Match that's wrong, so that it's Voided and doesn't count.
38. As a Participant, I want a Pending Match to become Confirmed on its own when the Confirmation window runs out, so that Matches against slow colleagues still count.
39. As an Admin, I want to void a Match, including one that's already Confirmed, so that a wrong Result no longer counts.
40. As a Ladder member, I want voiding a Confirmed Match to trigger a Replay of the Ladder, so that every Rating afterwards is what it would have been without that Match.
41. As a Ladder member, I want a Voided Match to stay visible as Voided in history, so that it's clear what happened.

### Ratings and Leaderboard

42. As a Ladder member, I want my Rating to change only when a Match I played in is Confirmed, so that only agreed Results count.
43. As a Ladder member, I want Rating changes calculated in the order Matches are Confirmed, using Ratings as they stand at that moment, so that my Rating never shifts later for no visible reason.
44. As a Participant in a 2v2 Match, I want each Side's strength to be the average Rating of its Participants, so that doubles are rated fairly against the pairing.
45. As a Participant in a 2v2 Match, I want both Participants on my Side to move by the same amount when we share Provisional status, so that teammates share the result.
46. As a Provisional Ladder member, I want my Rating to move faster, so that I reach my true level quickly.
47. As a Ladder member, I want to see that someone is Provisional, so that I don't read too much into a new person's Rating.
48. As a Ladder member, I want to see the Leaderboard of active Ladder members ordered by Rating, with ranks, so that I know who's on top and where I stand.
49. As a Ladder member, I want Inactive Ladder members shown apart from the Leaderboard with their Rating untouched, so that the ranking reflects people who are actually playing.
50. As an Inactive Ladder member, I want to return to the Leaderboard as soon as I play a Match, so that coming back is easy.
51. As a Ladder member, I want to see my Rating history on a Ladder, with each Match's change, so that I can see how I'm doing.
52. As a Ladder member, I want to see the Ladder's Match history with Sides, Result, status and Rating changes, so that I can check what happened.

### Safety and integrity

53. As a Ladder member, I want every rule (equal Sides, membership, Role checks, who may confirm or Reject) enforced even when someone calls the API by hand, so that nobody can cheat by skipping the app.
54. As a Ladder member, I want recording, confirming, Rejecting and voiding to happen all at once or not at all, so that a failure halfway never leaves Ratings or history inconsistent.
55. As a Ladder member, I want a Replay to reproduce exactly the Ratings we'd have if the Voided Match had never existed, so that I can trust the numbers.

## Implementation Decisions

### Stack

- **Platform.** Supabase: Postgres, Supabase Auth for Users, row-level security for reads, RPC for all writes, and pg_cron for scheduled work. The local stack runs through the Supabase CLI, installed as a dev dependency.
- **Client stack.** A Vite + React + TypeScript single-page app with no server framework, since every rule lives in the database. It follows the stack of the food-friends repo:
  - TanStack Router (file-based routes) and TanStack Query
  - zod, and react-hook-form for forms
  - sonner for toasts
  - Tailwind v4 and Tabler icons
  - Vitest for tests
  - pnpm as the package manager
- **UI kit.** Base the look on the bao-ui repo. bao-ui isn't published as a package yet, so copy in only what this app needs: the CSS tokens and the general-purpose components (icon button, info box, combobox, avatar, skeleton, sheet header, brand lockup). Each copied file notes its bao-ui source. Switch to the published package once it exists. Don't copy bao-ui's map, review or place components.
- **Sign-in (food-friends pattern).** An emailed passcode: `signInWithOtp` sends a code and the User types it into the app (`verifyOtp`). Login sets `shouldCreateUser: false`, so a mistyped email can't create a second account. Also follow food-friends for:
  - a callback route that accepts a magic link, as a fallback
  - an auth provider that exposes the session and profile
  - a single function that decides where a signed-in User is sent (sign-in, onboarding or the app)
  - a password login for local development only, behind a flag

  Unlike food-friends, the profile (display name) is created through a database function, not a direct table insert, to keep to ADR-0003. A User with a session but no profile is sent to onboarding. A signed-out visitor to a Share link is sent back to it after signing in.
- **View state in the URL.** As in food-friends, any view state worth sharing or reloading lives in the URL:
  - the current Ladder and the Share link preview are route paths
  - tabs (Leaderboard, Matches, Ladder members), filters and open panels (such as recording a Match) are zod-validated search params

  Form drafts aren't put in the URL.

### Data and rules

- **All writes through database functions (ADR-0003).** The client never writes tables directly. Every change in this spec is a Postgres function called through RPC. Functions that run with elevated privileges check the caller's identity, Ladder membership and Role themselves, and each function runs in a single transaction.
- **One permission check for Admin actions.** Every Admin-only function uses a single shared check: "the caller is an active Admin of this Ladder, or is the super admin". Later functions reuse it, so the super admin never needs its own code path.
- **Super admin (ADR-0007).** A flag on the User's profile. No function can set it; it's granted only by editing the database directly. The super admin can read every Ladder, pass every Admin check on every Ladder, and is the only caller allowed to delete a Ladder. There is no Owner Role.
- **Ladder member as the unit of rating (ADR-0001).** Rating, Role (Admin or Player), status (active / Left / Removed), rated-Match count and last-Match time live on the Ladder member. Participants reference a Ladder member, not a User. A User has at most one Ladder member per Ladder. The User link on a Ladder member is nullable, so that Guests can be added later without a schema change, but release 1 never creates a Ladder member without a User.
- **Joining, built for Join requests later.** Each Ladder stores a join policy. Release 1 has one value, "open", and it's the default. A single join function takes a Share link token and returns an outcome, which in release 1 is always "joined". Release 2 adds an "approval" policy, where the same function creates a Join request and returns "requested", without the client's join call changing. Outcomes for the token's caller:
  - not a Ladder member: becomes an active Player at the starting Rating
  - Left: becomes active again, keeping their Rating and history
  - Removed: refused, and only an Admin can reinstate them
  - already active: no change
- **Schema (described in prose).**
  - **Profiles:** one per User, keyed by the auth User's id, holding the display name and the super admin flag. Email stays in auth and isn't copied.
  - **Games:** reference data, each with a name, whether Draws are allowed, and the largest Side allowed. Release 1 seeds only pool, with no Draws and a largest Side of 2.
  - **Ladders:** name, Game, Share link token, join policy and creation time.
  - **Ladder members:** Ladder, User (nullable, for later Guests), Role, status, Rating, rated-Match count and last-Match time.
  - **Matches:** Ladder, status (Pending / Confirmed / Voided), Result (Side A won / Side B won / Draw), notes, recorded-by, recorded-at, confirmed-at, and who voided it, when, and whether it was Rejected or voided by an Admin.
  - **Participants:** Match, Ladder member, Side, Rating before the Match, and Rating change. The last two are empty until the Match is Confirmed.
- **Public write functions (the RPC surface).**
  - Profiles: create the caller's profile, update their display name.
  - Ladders: create a Ladder (the creator becomes its Admin), delete a Ladder (super admin only).
  - Membership: view the Ladder preview by Share link token, join by Share link token, leave, remove a Ladder member, reinstate a Removed Ladder member, set a Ladder member's Role.
  - Matches: record a Match, confirm a Match, Reject a Match, void a Match.
- **Internal functions (not callable by clients).**
  - Apply a Match's Rating changes on confirmation.
  - Replay a Ladder.
  - Confirm expired Pending Matches as of a given time. pg_cron calls this on a schedule in production. It takes the time as an argument so tests can drive it, which is why clients can't call it.
- **Reads.** Row-level security lets Ladder members read their own Ladder's Ladder members, Matches and Participants, and lets the super admin read everything. The Ladder preview is the only thing a non-member can see. The Leaderboard and the Inactive list are read views over Ladder members.
- **Match lifecycle.**
  - Recording creates a Pending Match. The recorder must be one of its Participants.
  - Any Participant on the opposing Side (the Side the recorder isn't on) may confirm or Reject it. Rejecting voids it.
  - A Pending Match with no response becomes Confirmed when the Confirmation window runs out, with its confirmed-at time set to that moment.
  - An Admin (or the super admin) may void any Match that isn't already Voided. Voiding a Confirmed Match triggers a Replay of its Ladder.
- **Validation on recording (ADR-0004).** Two non-empty Sides of equal size, no larger than the Game's largest Side. A Draw only if the Game allows it, so never in release 1. Every Participant is an active Ladder member of this Ladder and appears once.
- **Rating calculation (ADR-0002).** A Match's Rating changes are computed once, when it is Confirmed, from the Participants' Ratings at that moment. They're stored on the Participants and never revisited, except by a Replay.
- **One Rating for every Side size (ADR-0005).** Singles and doubles move the same Rating and feed the same Leaderboard.
- **Pure rating module (a test seam).** An immutable SQL function that reads and writes no tables.
  - Input: both Sides' Participants (each with their current Rating and rated-Match count) and the Result.
  - Output: each Participant's Rating change.
  - Rules:
    - A Side's Rating is the mean of its Participants' Ratings.
    - The expected score uses standard Elo on the two Side Ratings.
    - Win, Draw and loss score 1, 0.5 and 0. Draws are supported here even though release 1 refuses them on recording.
    - Each Participant's change is their own K-factor × (actual − expected), with a higher K-factor while Provisional (ADR-0006).
  - The confirm and Replay functions both call it, so ratings are calculated the same way everywhere. It stays in SQL so that rating writes stay atomic with confirmation, as ADR-0003 requires.
- **Replay.** Inside one transaction:
  1. Reset every Ladder member on the Ladder to the starting Rating and zero rated Matches.
  2. Walk the Ladder's non-Voided Matches that have been Confirmed, in confirmed-at order. For each one, call the rating module and rewrite that Match's Participant rows.
  3. Write the final Ratings and counts back to the Ladder members.

  Running Replay with no Voided Matches must reproduce the stored Ratings exactly.
- **Tunable constants (app-wide, in one place).** Starting Rating 1000, K-factor 32, Provisional K-factor 64, Provisional threshold 5 rated Matches, Inactive threshold 30 days, and Confirmation window 48 hours.
- **Leaderboard.** Active Ladder members (not Left or Removed) whose last Match was within the Inactive threshold, ordered by Rating, with rank and a Provisional marker. A Ladder member who has never played is listed as normal until they pass the Inactive threshold since joining. Inactive Ladder members are listed separately. Being Inactive never changes a Rating.

## Testing Decisions

- **What makes a good test.** It checks behaviour someone can observe: given an action through the public surface, what Ratings, statuses and permissions result, and what each User can and can't read. Tests never assert on internal table layouts, intermediate rows or how a function is built, so the schema can change without breaking them.
- **Seam 1: the RPC surface.** Integration tests run against a local Supabase stack. Each test signs in as one or more test Users (Admin, Player, outsider, super admin), calls public functions through the Supabase client, and checks results only through RLS-protected reads made as those Users. This seam covers:
  - Ladder and membership flows, and Role permissions (including refusals for callers without the right Role, and the super admin passing every Admin check).
  - Match validation and the full Match lifecycle, including Reject.
  - Voiding, and Replay correctness. In particular, voiding a Confirmed Match gives the same Ratings as a fresh Ladder that never had that Match.
  - Confirmation-order rating.
  - Leaderboard and Inactive views.
  - Read isolation between Ladders.

  Time-dependent behaviour (Confirmation window, Inactive) is driven by calling the internal confirm-expired function with a chosen time, using the service role. Backdated timestamps and the super admin flag can be set up through a service-role fixture. Assertions still go through the public surface.
- **Seam 2: the pure rating module.** Called directly with chosen inputs from Vitest, against the same local Postgres as Seam 1. It's a pure-input unit test that touches no tables or fixtures, and it needs no separate SQL test framework. It covers:
  - Expected score for equal and unequal Sides.
  - Wins, losses and Draws.
  - Side averaging in 2v2 Matches.
  - The Provisional K-factor and the threshold boundary.
  - Changes balancing between the Sides when K-factors match.
  - A few hand-checked Elo examples.
- **Prior art.** None in this repo yet. These tests set the pattern for later work. The food-friends repo uses Vitest with Testing Library and MSW for component tests. Follow it if UI tests are added, but the UI isn't a required test seam in this spec.

## Out of Scope

Deferred to release 2, with the data model already allowing for them:

- Guests and Claims.
- Join requests and Ladders that require approval to join.
- Draws in the UI, and Games other than pool.
- Admins recording Matches they didn't play in.

Not planned:

- An Owner Role or ownership transfer (replaced by the super admin, ADR-0007).
- A Disputed state, or disputing a Confirmed Match (replaced by Reject and Admin voiding).
- In-app requests to the super admin. These happen outside the app.
- A screen for granting super admin.
- Unrated or uneven Matches (2v1, handicaps). ADR-0004 points to unrated Matches as the future route.
- Separate singles and doubles Ratings, or a reduced rating change for team Matches (ADR-0005 names this as the future remedy if needed).
- User-created Games, or per-Ladder overrides of Game rules or of the tunable constants.
- Groups: sets of Users tied together outside any Ladder (a reserved future idea).
- Rating decay for Inactive Ladder members.
- Notifications (push or email) for Matches waiting for confirmation.
- Editing a recorded Match. Corrections are made by Rejecting or voiding and recording again.
- Seasons, resets, tournaments and brackets.
- Rotating or revoking Share links.
- Score lines within a Match (frames, racks). A Result is only who won.

## Further Notes

- **Mixed Provisional status in 2v2 Matches (decided, ADR-0006).** Each Participant uses their own K-factor, so a Provisional Participant moves faster than an established teammate. The cost is that a Match with a Provisional Participant doesn't balance exactly (winners gain more than losers lose), which also happens in standard Elo and lasts only for the first 5 rated Matches.
- **Default constants** are agreed starting values. Tune them once real data is in.
- **The Share link admits anyone who has it** in release 1. That's acceptable while it's only shared inside the company; Admins can remove anyone who shouldn't be there, and release 2's approval policy closes the gap if needed.
- **A Ladder can end up with no active Admin** (for example if they all leave). The super admin fixes this by appointing one; the app doesn't prevent it.
- **Custom SMTP (for example Resend) is a deployment prerequisite.** Supabase's built-in email only delivers to the project's own team members, so colleagues wouldn't get passcodes without it. Local development uses the local stack's mail catcher and the password login.
- **The Elo module lives in SQL,** not in client or Edge Function code. Moving it out would mean rating writes no longer happen in the same transaction as confirmation, which contradicts ADR-0003.
