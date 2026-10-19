# A super admin replaces the Ladder Owner

Ladders have only two Roles, Admin and Player, and whoever creates a Ladder becomes its first Admin. Above every Ladder sits a super admin: a flag on a User, set directly in the database, that can do anything an Admin can on any Ladder and is the only one who can delete a Ladder. We chose this because the app is small and run for people who know each other, so the rare problems an Owner Role exists for (an absent Owner, a Ladder left with no one in charge, a request to take over) can be settled by asking the super admin outside the app. That removes the "exactly one Owner" rule, ownership transfer, and the special cases for an Owner leaving or being removed. The known cost is that Admins on a Ladder are equals, so one Admin can demote another; if that becomes a problem, the remedy is to bring back an Owner Role, not to build more Admin rules.

## Considered Options

- **One Owner per Ladder with ownership transfer.** Clear control of each Ladder, but it needs transfer flows and rules for an Owner who leaves or goes quiet, all for a situation that should almost never arise.
- **In-app requests to take over a Ladder.** Lets people ask the super admin without leaving the app, but it means building requests and notifications for a rare edge case that a message solves.
