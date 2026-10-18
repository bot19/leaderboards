# Ratings are calculated when a Match is Confirmed, in confirmation order

Matches can sit Pending for up to the Confirmation window, so they can be Confirmed in a different order from the one they were played in. We calculate each Match's Rating change at the moment it is Confirmed, using Ratings as they stand then, and never revisit it afterwards. A Replay also orders Matches by when they were Confirmed, so it reproduces the same numbers. We accepted the small inaccuracy of rating a game as if it happened slightly later, in exchange for Ratings that never shift retroactively.

## Considered Options

- **Played order.** More accurate, but a late confirmation would rewrite every later Rating, and people would see their Rating change for no visible reason.
- **Apply on recording, revert on dispute.** Ratings would move before anyone agreed the Result, which defeats the point of confirmation.
