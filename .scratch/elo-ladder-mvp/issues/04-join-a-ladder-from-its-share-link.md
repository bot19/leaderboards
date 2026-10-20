# 04: Join a Ladder from its Share link

**What to build:** A Ladder member copies the Ladder's Share link and sends it to a colleague. The colleague opens it, sees a preview of the Ladder, and joins with one tap, landing on the Leaderboard at the starting Rating. If they weren't signed in, they're brought back to the preview after signing in. Joining is built so that release 2 can add Join requests without changing the client's join call. See the spec's **Joining, built for Join requests later** decision.

**Blocked by:** 03 Create a Ladder and see its Leaderboard

**Status:** resolved

- [x] Any Ladder member can copy the Ladder's Share link
- [x] Preview function (by Share link token) returns only the Ladder's name, Game and Ladder member count; it's the only thing a non-member can read
- [x] Join function takes the token, reads the Ladder's join policy, and returns an outcome ("joined" in release 1)
- [x] Outcomes: a new User becomes an active Player at the starting Rating; a Left Ladder member becomes active again with their Rating and history kept; a Removed Ladder member is refused; an already-active Ladder member is unchanged
- [x] Preview is a route path; a signed-out visitor is sent through sign-in (and onboarding if needed) and back to the preview
- [x] Integration tests: preview by token as an outsider; an unknown token is refused; joining as a new User; rejoining after Left keeps the Rating (set up via a service-role fixture); a Removed Ladder member (fixture) is refused; joining twice changes nothing; the joined User can now read the Ladder
