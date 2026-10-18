# Spec: Elo Ladder app (MVP)

Status: ready-for-agent

## Problem Statement

Friends who regularly play games against each other, like pool, have no shared, trustworthy record of who beats whom. Results are argued over or forgotten. Nobody can tell who is actually the strongest, and a single person keeping score by hand becomes a bottleneck and a source of disputes. Friends also mix singles and doubles, some people they play with haven't signed up to anything, and a score that one person can change without the others agreeing isn't trusted.

## Solution

An app where friends set up a Ladder for a Game, invite each other with a Share link, and record each Match as it happens. The opposing Side confirms a recorded Match. If nobody responds, the Match confirms itself when the Confirmation window runs out. Only Confirmed Matches move Ratings, which use Elo, so the Leaderboard reflects results everyone has agreed. Admins can add Guests so that friends without an account can play and be rated straight away. A Guest's history passes to them when they sign up and Claim it. When a Result is wrong, the opposing Side disputes it, and an Admin confirms or voids it. Voiding a Confirmed Match triggers a Replay of the whole Ladder, so every later Rating is correct.

## User Stories

### Ladders and Games

1. As a User, I want to create a Ladder for a Game, so that my friends and I have a place to record our Matches.
2. As a User creating a Ladder, I want to become its Owner automatically, so that I control it from the start.
3. As a User creating a Ladder, I want to choose from shared Games such as pool, so that the Ladder follows that Game's rules.
4. As a User, I want each Game's rules (whether Draws are allowed, and the largest Side allowed) to apply to every Ladder of that Game, so that Matches can't break the rules.
5. As a User, I want to belong to several Ladders at once, so that I can compete in different Games or friend circles.
6. As a User, I want a separate Rating on each Ladder, so that my pool skill doesn't affect my table-tennis standing.
7. As an Owner, I want to delete my Ladder, so that I can remove a competition nobody uses any more.
8. As an Owner, I want to hand ownership to another Ladder member, so that the Ladder can continue if I step back.

### Joining and membership

9. As an Owner or Admin, I want to copy a Share link for my Ladder, so that I can send it to friends.
10. As a User who opens a Share link, I want to see a preview of the Ladder (its name, Game and how many Ladder members it has), so that I can decide whether to join.
11. As a User who opens a Share link, I want the link alone not to admit me, so that strangers who get hold of it can't join without approval.
12. As a User, I want to make a Join request from the Ladder preview, so that I can ask to become a Ladder member.
13. As an Owner or Admin, I want to see pending Join requests, so that I can decide who gets in.
14. As an Owner or Admin, I want to approve or reject a Join request, so that only people we know join the Ladder.
15. As a User whose Join request is approved, I want to start at the same Rating as everyone else, so that the competition is fair.
16. As a User who isn't a Ladder member, I want to be unable to see a Ladder's Matches, Leaderboard or Ladder members beyond the preview, so that each Ladder's activity stays private to it.
17. As a Ladder member, I want to leave a Ladder, so that I can stop taking part.
18. As a Ladder member who Left, I want my Matches to stay in the Ladder's history, so that other people's Ratings and history stay consistent.
19. As a Ladder member who Left, I want to come back without needing approval, keeping my Rating, so that taking a break costs me nothing.
20. As an Admin, I want to remove a Ladder member, so that I can deal with someone who shouldn't be there.
21. As an Admin, I want a Removed Ladder member to need approval to come back, so that removing someone actually sticks.
22. As an Owner, I want to appoint and demote Admins, so that I can share the running of the Ladder.
23. As an Owner, I want to be the only Ladder member who can delete the Ladder, appoint Admins or hand over ownership, so that control can't be taken from me.
24. As an Owner, I want to be unable to leave without first handing over ownership, so that every Ladder always has exactly one Owner.

### Guests and Claims

25. As an Admin, I want to add a Guest by display name, so that Matches with friends who haven't signed up can be recorded now.
26. As an Admin, I want Guests to have a Rating and appear on the Leaderboard like anyone else, so that their results count from the first Match.
27. As a User whose friends recorded Matches for me as a Guest, I want to Claim that Guest when I join, so that its Rating and Match history become mine.
28. As an Owner or Admin, I want to approve a Claim as part of the Join request, so that nobody can take over a Guest's history by impersonating them.
29. As a User who is already a Ladder member, I want to be prevented from Claiming a Guest on the same Ladder, so that I can't end up with two places on one Ladder.
30. As a Ladder member, I want a Claimed Guest's past Matches to show the User's name, so that history reads correctly after the Claim.

### Recording Matches

31. As a Player, I want to record a Match I took part in, choosing both Sides and the Result, so that it can be rated.
32. As an Admin, I want to record a Match between any Ladder members, including two Sides made up only of Guests, so that games played without the app still get recorded.
33. As a Player, I want to record singles (1v1) and doubles (2v2) or larger Matches on the same Ladder, so that we can play however we like.
34. As a Player, I want the app to refuse a Match whose Sides are different sizes, so that Ratings stay balanced.
35. As a Player, I want the app to refuse a Match with a Side larger than the Game allows, so that Matches follow the Game's rules.
36. As a Player, I want the app to refuse a Draw in a Game that doesn't allow Draws, so that Results are valid for the Game.
37. As a Player, I want the app to refuse a Match that includes someone who isn't an active Ladder member of this Ladder, or lists the same person twice, so that only real Matches get recorded.
38. As a Player, I want to add notes to a Match, so that we remember details like who broke or where we played.
39. As a Player, I want a newly recorded Match to be Pending and not affect anyone's Rating yet, so that nothing moves until it's agreed.

### Confirming and disputing

40. As a Participant on the opposing Side, I want to see Matches waiting for my confirmation, so that I can deal with them quickly.
41. As a Participant on the opposing Side, I want to confirm a Pending Match, so that its Result counts.
42. As a Participant on the Side that recorded the Match, I want to be unable to confirm it myself, so that one Side can't award itself a win.
43. As a Participant, I want a Pending Match to become Confirmed on its own when the Confirmation window runs out, so that Matches against Guests or slow friends still count.
44. As a Participant on the opposing Side, I want to dispute a Pending Match, so that a wrong Result doesn't count.
45. As a Participant, I want a Disputed Match to stop its Confirmation window, so that it can't become Confirmed while it's under dispute.
46. As a Participant, I want to be able to dispute a Match after it has been Confirmed, so that mistakes found later can still be fixed.
47. As an Admin, I want to see Disputed Matches, so that I can settle them.
48. As an Admin, I want to confirm a Disputed Match, so that a valid Result counts.
49. As an Admin, I want to void a Match, so that a wrong or fake Match no longer counts.
50. As a Ladder member, I want voiding a Confirmed Match to trigger a Replay of the Ladder, so that every Rating afterwards is what it would have been without that Match.
51. As a Ladder member, I want a Voided Match to stay visible as Voided in history, so that it's clear what happened.

### Ratings and Leaderboard

52. As a Ladder member, I want my Rating to change only when a Match I played in is Confirmed, so that only agreed Results count.
53. As a Ladder member, I want Rating changes calculated in the order Matches are Confirmed, using Ratings as they stand at that moment, so that my Rating never shifts later for no visible reason.
54. As a Participant in a team Match, I want each Side's strength to be the average Rating of its Participants, so that doubles are rated fairly against the pairing.
55. As a Participant in a team Match, I want every Participant on my Side to move by the same amount when we share Provisional status, so that teammates share the result.
56. As a Participant in a Draw, I want Ratings to move toward each other, so that a Draw against a stronger Side is rewarded.
57. As a Provisional Ladder member, I want my Rating to move faster, so that I reach my true level quickly.
58. As a Ladder member, I want to see that someone is Provisional, so that I don't read too much into a new person's Rating.
59. As a Ladder member, I want to see the Leaderboard of active Ladder members ordered by Rating, so that I know who's on top.
60. As a Ladder member, I want my rank on the Leaderboard shown, so that I know where I stand.
61. As a Ladder member, I want Inactive Ladder members shown apart from the Leaderboard with their Rating untouched, so that the ranking reflects people who are actually playing.
62. As an Inactive Ladder member, I want to return to the Leaderboard as soon as I play a Match, so that coming back is easy.
63. As a Ladder member, I want to see my Rating history on a Ladder, with each Match's change, so that I can see how I'm doing.
64. As a Ladder member, I want to see the Ladder's Match history with Sides, Result, status and Rating changes, so that I can check what happened.

### Safety and integrity

65. As a Ladder member, I want every rule (equal Sides, membership, Role checks, who may confirm) enforced even when someone calls the API by hand, so that nobody can cheat by skipping the app.
66. As a Ladder member, I want recording, confirming, voiding and Claiming to happen all at once or not at all, so that a failure halfway never leaves Ratings or history inconsistent.
67. As a Ladder member, I want a Replay to reproduce exactly the Ratings we'd have if the Voided Match had never existed, so that I can trust the numbers.

## Implementation Decisions

- **Platform.** Supabase: Postgres, Supabase Auth for Users, row-level security for reads, and RPC for all writes. The client app's framework isn't fixed by this spec.
- **All writes through database functions (ADR-0003).** The client never writes tables directly. Every change in this spec is a Postgres function called through RPC. Functions that run with elevated privileges check the caller's identity, Ladder membership and Role themselves, and each function runs in a single transaction.
- **Ladder member as the unit of rating (ADR-0001).** Rating, Role, status (active / Left / Removed), rated-Match count and last-Match time live on the Ladder member. Participants reference a Ladder member, not a User. A Guest is a Ladder member with no User. A Claim sets the User on that Ladder member and changes nothing else. A User has at most one Ladder member per Ladder.
- **Schema (described in prose).**
  - **Games:** seeded reference data, each with a name, whether Draws are allowed, and the largest Side allowed.
  - **Ladders:** name, Game, Share link token and creation time.
  - **Ladder members:** Ladder, optional User, display name for Guests, Role, status, Rating, rated-Match count and last-Match time.
  - **Join requests:** Ladder, requesting User, optional Guest to Claim, status, and who decided.
  - **Matches:** Ladder, status (Pending / Confirmed / Disputed / Voided), Result (Side A won / Side B won / Draw), notes, recorded-by, recorded-at, confirmed-at, and who disputed or voided it and when.
  - **Participants:** Match, Ladder member, Side, Rating before the Match, and Rating change. The last two are empty until the Match is Confirmed.
- **Public write functions (the RPC surface).**
  - Ladders: create a Ladder, delete a Ladder, transfer ownership.
  - Membership: view the Ladder preview by Share link token, make a Join request (optionally naming a Guest to Claim), approve or reject a Join request, leave, rejoin after leaving, remove a Ladder member, set Role.
  - Guests: add a Guest.
  - Matches: record a Match, confirm a Match, dispute a Match, Admin-confirm a Disputed Match, void a Match.
- **Internal functions (not callable by clients).**
  - Apply a Match's Rating changes on confirmation.
  - Replay a Ladder.
  - Confirm expired Pending Matches as of a given time. pg_cron calls this on a schedule in production. It takes the time as an argument so tests can drive it, and that's why clients can't call it.
- **Reads.** Row-level security lets Ladder members read their own Ladder's Ladder members, Matches, Participants and Join requests (Join requests for Owners and Admins only). The Ladder preview is the only thing a non-member can see. Leaderboard and Inactive lists are read views over Ladder members.
- **Match lifecycle.**
  - Recording creates a Pending Match. A Player may record only Matches they're a Participant in. Owners and Admins may record any Match on their Ladder.
  - Any User-backed Participant on the opposing Side (the Side the recorder isn't on) may confirm or dispute. When an Admin who isn't a Participant records a Match, either Side may confirm or dispute it.
  - A Pending Match with no response becomes Confirmed when the Confirmation window runs out, with its confirmed-at time set to that moment.
  - Disputing stops the Confirmation window.
  - A Confirmed Match may be disputed later. Its Rating effect stays in place until an Admin acts.
  - An Admin confirming a Disputed Match makes it Confirmed. If it had never been Confirmed, it's rated at that moment. If it had been, it keeps its original confirmed-at and Rating changes.
  - An Admin may void any non-Voided Match. Voiding a Match that had ever been Confirmed triggers a Replay of its Ladder.
- **Validation on recording (ADR-0004).** Two non-empty Sides of equal size, no larger than the Game's largest Side. A Draw only if the Game allows it. Every Participant is an active Ladder member of this Ladder and appears once.
- **Rating calculation (ADR-0002).** A Match's Rating changes are computed once, when it is Confirmed, from the Participants' Ratings at that moment. They're stored on the Participants and never revisited, except by a Replay.
- **One Rating for every Side size (ADR-0005).** Singles and team Matches move the same Rating and feed the same Leaderboard.
- **Pure rating module (a test seam).** An immutable SQL function that reads and writes no tables.
  - Input: both Sides' Participants (each with their current Rating and rated-Match count) and the Result.
  - Output: each Participant's Rating change.
  - Rules:
    - A Side's Rating is the mean of its Participants' Ratings.
    - The expected score uses standard Elo on the two Side Ratings.
    - Win, Draw and loss score 1, 0.5 and 0.
    - Each Participant's change is their K-factor × (actual − expected), with a higher K-factor while Provisional.
  - The confirm and Replay functions both call it, so ratings are calculated the same way everywhere. It stays in SQL so that rating writes stay atomic with confirmation, as ADR-0003 requires.
- **Replay.** Inside one transaction:
  1. Reset every Ladder member on the Ladder to the starting Rating and zero rated Matches.
  2. Walk the Ladder's non-Voided Matches that have been Confirmed, in confirmed-at order. For each one, call the rating module and rewrite that Match's Participant rows.
  3. Write the final Ratings and counts back to the Ladder members.

  Running Replay with no Voided Matches must reproduce the stored Ratings exactly.
- **Tunable constants (app-wide, in one place).** Starting Rating (default 1000), K-factor (default 32), Provisional K-factor (default 64), Provisional threshold (default 5 rated Matches), Inactive threshold (default 30 days), and Confirmation window (default 48 hours).
- **Leaderboard.** Active Ladder members (not Left or Removed) whose last Match was within the Inactive threshold, ordered by Rating, with rank and a Provisional marker. Inactive Ladder members are listed separately. Being Inactive never changes a Rating.
- **Ownership.** Creating a Ladder creates its Owner Ladder member. Transferring ownership turns the current Owner into an Admin. The Owner can't leave or be removed. Deleting a Ladder removes all its data.

## Testing Decisions

- **What makes a good test.** It checks behaviour someone can observe: given an action through the public surface, what Ratings, statuses and permissions result, and what each User can and can't read. Tests never assert on internal table layouts, intermediate rows or how a function is built, so the schema can change without breaking them.
- **Seam 1: the RPC surface.** Integration tests run against a local Supabase stack. Each test signs in as one or more test Users (Owner, Admin, Player, outsider), calls public functions through the Supabase client, and checks results only through RLS-protected reads made as those Users. This seam covers:
  - Ladder and membership flows, and Role permissions (including refusals for callers without the right Role).
  - Guests and Claims.
  - Match validation and the full Match lifecycle.
  - Disputes and voiding.
  - Replay correctness. In particular, voiding a Confirmed Match gives the same Ratings as a fresh Ladder that never had that Match.
  - Confirmation-order rating.
  - Leaderboard and Inactive views.
  - Read isolation between Ladders.

  Time-dependent behaviour (Confirmation window, Inactive) is driven by calling the internal confirm-expired function with a chosen time, using the service role. Backdated timestamps can also be set up through a service-role fixture. Assertions still go through the public surface.
- **Seam 2: the pure rating module.** Called directly with chosen inputs. No tables or fixtures are involved. It covers:
  - Expected score for equal and unequal Sides.
  - Wins, losses and Draws.
  - Side averaging in team Matches.
  - The Provisional K-factor and the threshold boundary.
  - Changes balancing between the Sides when K-factors match.
  - A few hand-checked Elo examples.
- **Prior art.** None yet. This is a new repo, and these tests set the pattern for later work.

## Out of Scope

- Unrated or uneven Matches (2v1, handicaps). ADR-0004 points to unrated Matches as the future route.
- Separate singles and doubles Ratings, or a reduced rating change for team Matches (ADR-0005 names this as the future remedy if needed).
- User-created Games, or per-Ladder overrides of Game rules or of the tunable constants.
- Groups: sets of Users tied together outside any Ladder (a reserved future idea).
- Rating decay for Inactive Ladder members.
- Notifications (push or email) for Matches waiting for confirmation, Join requests or disputes.
- Editing a recorded Match. Corrections are made by voiding and recording again.
- Seasons, resets, tournaments and brackets.
- Rotating or revoking Share links.
- Score lines within a Match (frames, sets). A Result is only win, loss or Draw.

## Further Notes

- **Mixed Provisional status in team Matches (decided, ADR-0006).** Each Participant uses their own K-factor, so a Provisional Participant moves faster than an established teammate. This settles a newcomer's Rating quickly without inflating their partner's swings. The cost is that a Match with a Provisional Participant doesn't balance exactly (winners gain more than losers lose), which also happens in standard Elo and lasts only for the first 5 rated Matches. A single K-factor per Side was rejected because it slows the newcomer and penalises established players for partnering them.
- **Default constants** (starting Rating, K-factors, thresholds, Confirmation window) are agreed starting values. Tune them once real data is in.
- **Disputing a Confirmed Match** has no time limit in this spec. That's accepted for now; add one if late disputes get abused.
- **The Elo module lives in SQL,** not in client or Edge Function code. Moving it out would mean rating writes no longer happen in the same transaction as confirmation, which contradicts ADR-0003.
