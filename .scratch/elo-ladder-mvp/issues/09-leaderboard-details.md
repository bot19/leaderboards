# 09: Leaderboard details: Provisional, Inactive, Rating history

**What to build:** The Leaderboard shows each active Ladder member's rank and marks anyone Provisional. Ladder members who haven't played for 30 days are listed separately as Inactive with their Rating untouched, and return to the Leaderboard as soon as they play. Each Ladder member has a Rating history view showing every Confirmed Match and its Rating change. See the spec's **Leaderboard** decision.

**Blocked by:** 05 Record and confirm a Match (1v1 and 2v2)

**Status:** claimed

- [ ] Leaderboard read view: active Ladder members whose last Match (or joining, if they've never played) is within the Inactive threshold, ordered by Rating, with rank and a Provisional flag (fewer than 5 rated Matches)
- [ ] Inactive read view: active Ladder members past the Inactive threshold (30 days, from the tunable constants); being Inactive never changes a Rating
- [ ] Rating history for a Ladder member: their Confirmed Matches in confirmation order with Rating before and change
- [ ] UI: ranks and a Provisional marker on the Leaderboard, a separate Inactive list, and a Rating history view per Ladder member (routed, so it can be linked)
- [ ] Integration tests (backdated timestamps via a service-role fixture): ranks follow Rating; the Provisional flag clears at 5 rated Matches; a Ladder member past the threshold appears only in the Inactive list with the same Rating; playing a Match returns them to the Leaderboard; Rating history matches the Participants' stored changes
