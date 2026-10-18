# Each Participant's Rating moves by their own K-factor

When a Match is Confirmed, each Participant's Rating change is their own K-factor times the difference between their Side's actual and expected Result, and a Provisional Ladder member has a higher K-factor. Teammates therefore move by the same amount unless one of them is Provisional, in which case the Provisional teammate moves further. We chose this so a newcomer's Rating settles quickly without making their established partner's Rating swing harder. The known cost is that a Match with a Provisional Participant doesn't balance exactly: the winners can gain more than the losers lose, as in standard Elo, but only during a Ladder member's first few rated Matches.

## Considered Options

- **One K-factor per Side** (e.g. the average of its Participants'). Teammates always move together, but the newcomer settles more slowly and an established Ladder member is penalised with bigger swings just for partnering one.
