# Elo Ladder App

Friends record the results of games they play against each other, and each Ladder ranks its members by an Elo Rating that moves as Matches are confirmed.

## Language

### People and membership

**User**:
A person with an account in the app.
_Avoid_: account, profile (the profile is just the User's display details)

**Ladder member**:
A User's or Guest's place on one Ladder, holding their Role, status and Rating for that Ladder. A User has one Ladder member per Ladder they join.
_Avoid_: member (on its own), entrant, player (see Flagged ambiguities)

**Guest**:
A Ladder member with no User behind it, added by an Admin by display name so their Matches can be recorded before they sign up.
_Avoid_: placeholder, ghost, temp player

**Claim**:
A User taking over a Guest, so the Guest's Rating and Match history become theirs.
_Avoid_: merge, link account

**Role**:
What a Ladder member may do on their Ladder: Owner, Admin or Player.

**Owner**:
The single Ladder member with full control of a Ladder, including deleting it and appointing Admins. Every Ladder has exactly one Owner.

**Admin**:
A Ladder member who can approve Join requests, add Guests, remove Ladder members and settle Disputed Matches.
_Avoid_: moderator, manager

**Player**:
The default Role: a Ladder member who records and confirms their own Matches.

**Join request**:
A User's request to become a Ladder member, which an Owner or Admin approves or rejects.
_Avoid_: invite, application

**Share link**:
The link that leads a User to a Ladder's preview, where they can make a Join request. It grants nothing on its own.
_Avoid_: invite link (it does not admit anyone)

**Left / Removed**:
A Ladder member who chose to go (Left) or was taken off by an Admin (Removed). Their Matches stay in history; a Removed member needs approval to return.

### Competition

**Ladder**:
A competition for one Game among a set of Ladder members, with one Leaderboard. The Ladder is the unit people join and the boundary of what they can see.
_Avoid_: group, league, tournament

**Game**:
A kind of game that Ladders are played in, such as pool, with its rules: whether Draws are allowed and the largest Side allowed. Games are shared by everyone.
_Avoid_: game type, sport, activity

**Rating**:
A Ladder member's Elo number on one Ladder. Everyone starts at the same Rating, and it changes only when a Match is Confirmed.
_Avoid_: score, points, rank (rank is a position on the Leaderboard)

**Leaderboard**:
A Ladder's active Ladder members ordered by Rating.
_Avoid_: ladder (the Ladder is the competition; the Leaderboard is its ranking), table, standings

**Provisional**:
A Ladder member who has played fewer than a set number of rated Matches on that Ladder. Their Rating moves faster while Provisional.
_Avoid_: new player, unranked

**Inactive**:
A Ladder member who has not played a Match on the Ladder for a set number of days. Shown apart from the Leaderboard; their Rating is untouched.
_Avoid_: dormant, decayed

### Matches

**Match**:
One recorded contest on a Ladder between two Sides, with its Result and notes.
_Avoid_: game (a Game is the kind of contest), result, fixture

**Side**:
The Ladder members playing together in a Match. Both Sides in a Match have the same number of Participants.
_Avoid_: team (fine in speech, but Side is the term), pair

**Participant**:
A Ladder member taking part in a particular Match.
_Avoid_: player, competitor

**Result**:
Which Side won the Match, or that it was a Draw.
_Avoid_: score, outcome

**Draw**:
A Result where neither Side won, allowed only in Games that permit it.
_Avoid_: tie

**Pending**:
A Match that has been recorded but not yet agreed. It has no effect on Ratings.

**Confirmed**:
A Match whose Result is agreed, either by the opposing Side or by the Confirmation window running out. Only Confirmed Matches change Ratings.
_Avoid_: approved, verified

**Disputed**:
A Match the opposing Side says is wrong, waiting for an Admin to confirm it or void it.
_Avoid_: contested, flagged

**Voided**:
A Match an Admin has struck out. It no longer counts, and if it had been Confirmed, every Rating on the Ladder is recalculated without it.
_Avoid_: deleted, cancelled

**Confirmation window**:
How long the opposing Side has to confirm or dispute a Pending Match before it becomes Confirmed on its own.
_Avoid_: timeout, grace period

**Replay**:
Recalculating every Rating on a Ladder from the start, using its Confirmed Matches in the order they were Confirmed.
_Avoid_: recalc, rebuild

## Relationships

- A **User** has zero or more **Ladder members**, at most one per **Ladder**.
- A **Ladder** is played in exactly one **Game** and has many **Ladder members**, exactly one of whom is the **Owner**.
- A **Match** belongs to one **Ladder** and has exactly two **Sides** of equal size.
- A **Participant** is a **Ladder member** of the Match's own Ladder.
- A **Guest** is a **Ladder member** with no **User**, until it is **Claimed**.

## Example dialogue

> **Dev:** When Sam and Priya beat Dave and Alex at doubles, whose Rating changes?
> **Domain expert:** All four. Each Side's Rating is the average of its Participants, and every Participant on a Side moves by the same amount. But only once the Match is Confirmed. While it's Pending, nothing moves.
> **Dev:** And if Alex is a Guest, who confirms?
> **Domain expert:** Dave can, since he's on the opposing Side. If nobody does, it's Confirmed when the Confirmation window runs out.
> **Dev:** Say Dave disputes it a week later and an Admin voids it. Do we just undo those four Rating changes?
> **Domain expert:** No. It had been Confirmed, so we Replay the whole Ladder without it. Later Matches were rated off those numbers.
> **Dev:** Is "the pool ladder" the Leaderboard?
> **Domain expert:** The Ladder is the competition. The Leaderboard is just its ranking of active Ladder members.

## Flagged ambiguities

- **"Player"** is used in speech for anyone who plays. In this project it means only the lowest **Role**. Someone in a Match is a **Participant**; someone on a Ladder is a **Ladder member**.
- **"Game"** is used in speech for a single contest ("we played five games"). Here a **Game** is the kind of contest (pool); one contest is a **Match**.
- **"Group"** is reserved for a later idea: a set of Users tied together outside any Ladder. It never means a Ladder.
