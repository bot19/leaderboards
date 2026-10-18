# Ratings and match history belong to the Ladder member, not the User

A User's Rating, Role and status are stored on their Ladder member, and Participants in a Match reference the Ladder member rather than the User. We chose this so Guests can play and be rated before they have an account, and a Claim becomes a single change to the Ladder member instead of a migration of Match history. It also means a User has a separate Rating on every Ladder, which is intended.
