# 05: Record and confirm a Match (1v1 and 2v2)

**What to build:** A Player records a pool Match they played, 1v1 or 2v2, choosing both Sides, who won and optional notes. It starts Pending and moves no Ratings. A Participant on the opposing Side sees it in a "waiting for you" list and confirms it; at that moment the Participants' Ratings move through the rating module, and the Leaderboard updates. The Ladder's Match history tab shows every Match with its Sides, Result, status and Rating changes. See the spec's **Match lifecycle**, **Validation on recording** and **Rating calculation** decisions, and ADRs 0002, 0004 and 0005.

**Blocked by:** 02 Pure rating module, 04 Join a Ladder from its Share link

**Status:** resolved

- [x] Matches table (status Pending / Confirmed / Voided, Result, notes, recorded-by, recorded-at, confirmed-at, and void fields for 07 to use) and Participants table (Match, Ladder member, Side, Rating before, Rating change)
- [x] Record function refuses: unequal Sides, empty Sides, a Side larger than the Game allows, a Draw in a Game without Draws, anyone not an active Ladder member of this Ladder, a Ladder member listed twice, and a recorder who isn't a Participant
- [x] Confirm function: only a Participant on the opposing Side may confirm; the recorder's Side is refused; confirming rates the Match once, in the same transaction, using Ratings as they stand at that moment, and stores Rating before and change on each Participant
- [x] Confirming updates each Participant's Rating, rated-Match count and last-Match time
- [x] RLS: Ladder members read their Ladder's Matches and Participants; the super admin reads all
- [x] UI: a record-Match panel opened from a search param, a "waiting for you" list, and a Matches tab showing history with Rating changes
- [x] Integration tests: each validation refusal; recording leaves Ratings unchanged; the recorder's Side can't confirm; the opposing Side confirms and Ratings match the rating module; 2v2 averaging; two Matches confirmed in the opposite order from recording are rated in confirmation order; outsiders can't read Matches
