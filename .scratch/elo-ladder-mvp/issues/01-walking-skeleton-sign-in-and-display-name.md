# 01: Walking skeleton: passcode sign-in and display name

**What to build:** A colleague opens the app, signs up or signs in with a passcode emailed to them, sets a display name on first sign-in, and lands on an (empty) home screen. They can change their display name later. This ticket also stands up everything later tickets build on: the app scaffold, the local Supabase stack, the copied bao-ui look, and the test harness for signing in as test Users. See the spec's **Stack** section, and follow the food-friends repo's auth pattern.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Vite + React + TypeScript app with TanStack Router (file-based routes) and TanStack Query, zod, react-hook-form, sonner, Tailwind v4 and Tabler icons, using pnpm
- [ ] bao-ui CSS tokens and the general-purpose components listed in the spec are copied in, each noting its bao-ui source; no map, review or place components
- [ ] Local Supabase stack runs through the Supabase CLI (a dev dependency); migrations live in the repo
- [ ] Sign-in sends an emailed passcode and verifies the typed code; login can't create a new account from a mistyped email
- [ ] Magic-link callback route works as a fallback; a password login exists for local development only, behind a flag
- [ ] Profiles table (display name, super admin flag defaulting to false) with RLS; profile creation and display-name update are database functions, never direct table writes (ADR-0003); no function can set the super admin flag
- [ ] A signed-in User with no profile is sent to onboarding; a single function decides where a signed-in User goes (sign-in, onboarding or home)
- [ ] Vitest harness can create test Users, sign in as each one, and use the service role for fixtures; documented for later tickets
- [ ] Integration tests through the RPC surface: creating a profile, updating the display name, refusing a second profile, refusing writes from a signed-out caller, and a User being unable to set their own super admin flag
- [ ] Typecheck, lint and the test suite pass from one command each
