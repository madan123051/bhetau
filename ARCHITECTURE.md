# Bhetau architecture

## Product boundary

The UI is a Next.js App Router PWA. It can run entirely with fictional mock data, while configured environments use Supabase SSR cookie sessions for authentication and current-user profile persistence. `src/data` owns seed profiles, `src/features` owns product workflows, and `src/lib` owns matching, validation, i18n, rate limiting, and Supabase clients.

## Authentication and profile lifecycle

Next.js `proxy.ts` refreshes Supabase cookies and Server Components validate claims before rendering account data. Product routes redirect anonymous users to `/auth` and incomplete users to `/setup`; authorization is repeated at each Route Handler/RPC boundary. An `auth.users` trigger creates minimal app metadata without trusting user-supplied roles. The `complete_profile` RPC derives the actor from `auth.uid()`, enforces 18+, and atomically writes the account date, profile, preferences, and interest links. `/you` reads only the current user through RLS, and privacy updates remain owner-scoped.

## Like → match transaction

The browser submits a target UUID to a trusted route, which validates with Zod and calls `create_like(target_user_id)` under the user’s bearer token. The `security definer` PostgreSQL function:

1. resolves the actor from `auth.uid()`;
2. rejects self-likes, blocks, hidden profiles, and inactive accounts;
3. inserts the like idempotently;
4. checks the reciprocal like in the same database transaction;
5. writes a canonically ordered `(user_low, user_high)` match with a unique constraint;
6. creates one unique conversation and two unique participants;
7. returns the match/conversation IDs.

This design is race-safe because the database—not client state—owns uniqueness and the transaction. The mock service follows the same invariant and has an integration test.

## RLS and privacy

RLS is enabled on every application table. Important boundaries:

- Application `users.id` references `auth.users.id`; clients cannot update role, moderation, verification, or account-status fields.
- Profile discovery requires visible, unpaused, non-incognito, active accounts and a no-block relationship.
- Profile/photo writes are owner-only. Originals are private and image bytes live outside PostgreSQL.
- Likes and passes are visible only to the actor. Matches, conversations, and messages require participation.
- A block is checked symmetrically by discovery, match creation, and message insertion.
- Reporters see their own reports; moderation access comes from the server-controlled user role.
- Admin UI never provides arbitrary private-message reading. A future abuse-review process must be explicit, scoped, audited, and time-limited.

RLS is defense in depth, not a replacement for server validation. Next.js API routes validate shape/length with Zod and use the caller’s cookie or bearer session so Supabase still enforces RLS. Helper functions live in a non-exposed `private` schema. The two deliberately exposed `security definer` RPCs revoke anonymous execution, check `auth.uid()`, expose no authorization fields, and grant execution only to signed-in users.

## Location and Vibe Match

Only coarse area labels/codes are stored for matching and displayed. Exact GPS distance is not part of the product UI.

Vibe Match is deterministic and explainable: shared interests 30%, intent 25%, lifestyle 15%, approximate location 10%, language 10%, prompt affinity 10%. Age preference is a hard filter. The label is not represented as scientific compatibility and should move to a trusted server before it affects ranking in production.

## Moderation

Reports and verification requests form queues; `moderation_events` provides an append-style audit record for warnings, restrictions, suspensions, bans, restoration, and verification outcomes. Production access should use signed server roles/claims, step-up authentication, scoped permissions, and immutable audit delivery. Never trust a role supplied by the browser.

## Upload pipeline

Production uploads require: authentication; file count ≤ 6; magic-byte MIME validation; image-only allow list; 15 MB input cap; pixel/dimension and decompression-bomb checks; metadata stripping; safety moderation; 4:5 WebP/AVIF derivatives; private originals; short-lived signed derivatives; and cleanup on profile/account deletion.

## Next production phase

1. Apply the migration to staging and run automated RLS tests with two users, one blocked pair, and one moderator.
2. Implement private Storage upload/derivative Edge Functions and abuse-safe signed URLs.
3. Replace in-memory rate limits with a shared durable limiter and add risk-aware auth limits.
4. Add transactional notification workers, subscription webhooks, and deletion/export jobs.
5. Add end-to-end tests for OTP redirects, RLS denial cases, blocked messaging, and race-simulated reciprocal likes.
