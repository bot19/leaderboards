# 02: Pure rating module

**What to build:** The Elo calculation that every Rating change in the app goes through: given both Sides' Participants (each with their current Rating and rated-Match count) and the Result, return each Participant's Rating change. It's an immutable SQL function that reads and writes no tables, so confirmation and Replay can call it inside their own transactions (ADR-0003). See the spec's **Pure rating module** decision and ADR-0006.

**Blocked by:** 01 Walking skeleton

**Status:** resolved

- [x] A Side's Rating is the mean of its Participants' Ratings; the expected score uses standard Elo on the two Side Ratings
- [x] Win, Draw and loss score 1, 0.5 and 0 (Draws are supported in the maths even though release 1 refuses them on recording)
- [x] Each Participant's change is their own K-factor × (actual − expected): K = 32, or 64 while Provisional (fewer than 5 rated Matches)
- [x] The tunable constants (starting Rating, K-factors, Provisional threshold) are defined in one place that later tickets also read
- [x] Vitest unit tests call the function directly with chosen inputs against local Postgres, with no tables or fixtures: equal and unequal Sides, wins, losses and Draws, 2v2 averaging, the Provisional K-factor and the threshold boundary (4 vs 5 rated Matches), changes balancing when K-factors match, and a few hand-checked Elo examples
