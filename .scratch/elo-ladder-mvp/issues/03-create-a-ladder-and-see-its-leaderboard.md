# 03: Create a Ladder and see its Leaderboard

**What to build:** A User creates a pool Ladder and becomes its Admin. Their home screen lists the Ladders they belong to, and opening one shows its Leaderboard (just them, at the starting Rating). Outsiders can't see the Ladder. This ticket also adds the permission foundation every later ticket reuses: the super admin flag in use, and a single check for "the caller is an active Admin of this Ladder, or is the super admin". See the spec's **Data and rules** section and ADR-0007.

**Blocked by:** 01 Walking skeleton

**Status:** resolved

- [ ] Games table seeded with pool only (no Draws, largest Side 2)
- [ ] Ladders table (name, Game, Share link token, join policy defaulting to "open", creation time) and Ladder members table (Ladder, nullable User, Role Admin or Player, status, Rating, rated-Match count, last-Match time); at most one Ladder member per User per Ladder
- [ ] Create-a-Ladder function makes the caller its Admin at the starting Rating
- [ ] One shared permission check ("active Admin of this Ladder, or super admin") exists for Admin-only functions to reuse
- [ ] RLS: Ladder members read their own Ladder's Ladder members; the super admin reads every Ladder; outsiders read nothing
- [ ] Home screen lists the User's Ladders and has a way to create one; the Ladder page is its own route and opens on the Leaderboard tab, with the tab kept in a zod-validated search param
- [ ] Leaderboard shows active Ladder members ordered by Rating with display names
- [ ] Integration tests: creating a Ladder makes the caller its Admin; an outsider can't read the Ladder or its Ladder members; the super admin (set via a service-role fixture) can; the shared Admin check passes for an Admin and the super admin and refuses a Player and an outsider
