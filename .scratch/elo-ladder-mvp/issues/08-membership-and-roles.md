# 08: Membership and Roles: leave, remove, reinstate, Admins, delete Ladder

**What to build:** A Ladder member can leave a Ladder (their Matches stay in history). An Admin removes a Ladder member, reinstates a Removed one, and appoints or demotes Admins from the Ladder members tab. The super admin can do all of this on any Ladder, and is the only one who can delete a Ladder. See the spec's **Super admin** decision and ADR-0007.

**Blocked by:** 04 Join a Ladder from its Share link

**Status:** claimed

- [ ] Leave function: any active Ladder member, including the last Admin (the super admin fixes a Ladder with no Admin)
- [ ] Remove, reinstate and set-Role functions use the shared Admin-or-super-admin check; reinstating returns a Removed Ladder member to active with their Rating kept
- [ ] Delete-Ladder function: super admin only; removes all the Ladder's data
- [ ] Left and Removed Ladder members drop off the Leaderboard but keep their Matches in history
- [ ] UI: a Ladder members tab (in the URL) listing active, Left and Removed Ladder members, with Admin actions shown only to Admins and the super admin; a leave action for everyone
- [ ] Integration tests: leaving, then rejoining by Share link keeps the Rating; an Admin removes a Player, who then can't rejoin by Share link until reinstated; a Player can't remove, reinstate or change Roles; an Admin appoints and demotes an Admin; the super admin, not a member of the Ladder, can do all of these; only the super admin can delete a Ladder
