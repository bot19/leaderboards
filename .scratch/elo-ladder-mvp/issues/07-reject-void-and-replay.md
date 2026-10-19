# 07: Reject, void and Replay

**What to build:** A Participant on the opposing Side Rejects a Pending Match that's wrong, which Voids it. An Admin (or the super admin) voids any Match that isn't already Voided, including a Confirmed one; voiding a Confirmed Match Replays the whole Ladder so every later Rating is what it would have been without that Match. Voided Matches stay visible in history, marked as Rejected or voided by an Admin. See the spec's **Match lifecycle** and **Replay** decisions and ADR-0002.

**Blocked by:** 05 Record and confirm a Match (1v1 and 2v2)

**Status:** claimed

- [ ] Reject function: only a Participant on the opposing Side, only while Pending; the Match becomes Voided and no Ratings change
- [ ] Void function: uses the shared Admin-or-super-admin check; refuses an already-Voided Match; records who voided it and when
- [ ] Internal Replay function: in one transaction, resets every Ladder member to the starting Rating and zero rated Matches, walks non-Voided Confirmed Matches in confirmed-at order through the rating module, rewrites each Match's Participant rows, and writes final Ratings and counts back
- [ ] Voiding a Confirmed Match triggers Replay; voiding a Pending Match doesn't
- [ ] UI: Reject on the "waiting for you" list; void for Admins on the Matches tab; Voided Matches shown as such
- [ ] Integration tests: Reject by the opposing Side; Reject refused for the recorder's Side and for non-Pending Matches; void refused for a Player; void allowed for an Admin and the super admin; voiding a Confirmed Match leaves Ratings identical to a fresh Ladder that played the same Matches without it; Replay with nothing Voided reproduces the stored Ratings exactly
