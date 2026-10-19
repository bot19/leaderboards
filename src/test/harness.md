# Test Users

Integration tests talk to the local Supabase stack (`pnpm exec supabase start` from the repo root). Docker must already be running.

`src/test/harness.ts` is the only place that uses the service role.

- `createTestUser()` creates a confirmed auth User.
- `signInAs(user)` returns a client signed in as that User. Read assertions go through this client so row-level security applies.
- `signedOutClient()` is the anon key with no session. Use it to prove a signed-out caller cannot write.
- `serviceRole()` and `setSuperAdmin()` are fixtures. `setSuperAdmin` writes the super-admin flag directly. No database function is allowed to set that flag, and tests must not pretend otherwise.
- `deleteTestUser(id)` removes the auth User (and the profile, via the foreign key) after a test.

`pnpm test` expects the stack to be up. Keys come from `supabase status -o env`, not from a committed secret.
