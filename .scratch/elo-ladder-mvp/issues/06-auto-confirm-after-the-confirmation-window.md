# 06: Auto-confirm after the Confirmation window

**What to build:** A Pending Match that nobody on the opposing Side responds to becomes Confirmed on its own 48 hours after it was recorded, and Ratings move at that moment, so Matches against slow colleagues still count. See the spec's **Internal functions** and **Match lifecycle** decisions and ADR-0002.

**Blocked by:** 05 Record and confirm a Match (1v1 and 2v2)

**Status:** ready-for-agent

- [ ] Internal "confirm expired Pending Matches as of a given time" function, not callable by clients
- [ ] It confirms each expired Pending Match through the same rating path as a manual confirmation, in the order they expired, setting confirmed-at to that moment
- [ ] pg_cron runs it on a schedule against the current time
- [ ] The Confirmation window (48 hours) is read from the tunable constants
- [ ] Integration tests (calling the function with chosen times via the service role): a Match inside the window stays Pending; an expired one is Confirmed and rated; several expired Matches are rated in expiry order; a client can't call the function
