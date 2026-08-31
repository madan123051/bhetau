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

## Chat persistence and message lifecycle

The same `create_like` transaction that creates a mutual match also creates its unique conversation and two participant rows. The configured `/chats` route reads those participant-scoped records from Supabase, so a match appears even before either person sends a message; previews, timestamps, and unread counts come from persisted messages rather than mock profiles.

Chat removal is a per-user archive, not destructive deletion. A swipe or accessible Remove control updates only that participant's `conversation_participants.archived_at`. The conversation and the other participant's view remain intact, and the after-insert message trigger clears archive state when the conversation becomes active again.

Message lifecycle mutations cross authenticated Route Handlers with Zod validation, prototype rate limits, a caller-scoped Supabase client, column-level grants, and RLS:

- Replies store `reply_to_id`; the insert trigger rejects missing, expired, deleted, or cross-conversation reply targets.
- Each participant can set or remove one allow-listed emoji reaction per message. Participants can read reactions, while each user can mutate only their own reaction.
- Only the sender can edit or unsend an undeleted message. Edits retain `edited_at`; unsend replaces the body with a tombstone and records `deleted_at`.
- A participant can set the conversation timer to Off, 6 hours, or 12 hours. The insert trigger snapshots the current timer into each new message's `expires_at`, so later timer changes are intentionally non-retroactive.
- Message SELECT policy hides expired rows at the deadline. A bounded after-insert cleanup deletes expired rows independently of client behavior; a scheduled database cleanup should supplement it in production so quiet conversations are physically purged too.

These schema and policy changes live in `supabase/migrations/20260830121707_message_lifecycle.sql`. Application deployment alone does not execute them: every configured staging and production project must run an authenticated migration deploy (`supabase db push --dry-run`, followed by `supabase db push`) before enabling real chat.

## RLS and privacy

RLS is enabled on every application table. Important boundaries:

- Application `users.id` references `auth.users.id`; clients cannot update role, moderation, verification, or account-status fields.
- Profile discovery requires visible, unpaused, non-incognito, active accounts and a no-block relationship.
- Profile/photo writes are owner-only. Originals are private and image bytes live outside PostgreSQL.
- Likes and passes are visible only to the actor. Matches, conversations, messages, replies, and reactions require participation; reaction mutation is owner-scoped and message edit/unsend is sender-scoped.
- A block is checked symmetrically by discovery, match creation, and message insertion.
- Reporters see their own reports; moderation access comes from the server-controlled user role.
- Admin UI never provides arbitrary private-message reading. A future abuse-review process must be explicit, scoped, audited, and time-limited.

RLS is defense in depth, not a replacement for server validation. Next.js API routes validate shape/length with Zod and use the caller’s cookie or bearer session so Supabase still enforces RLS. Helper functions live in a non-exposed `private` schema. The two deliberately exposed `security definer` RPCs revoke anonymous execution, check `auth.uid()`, expose no authorization fields, and grant execution only to signed-in users.

## Location and Vibe Match

Only coarse area labels/codes are stored for matching and displayed. Exact GPS distance is not part of the product UI.

Vibe Match is deterministic and explainable: shared interests 30%, intent 25%, lifestyle 15%, approximate location 10%, language 10%, prompt affinity 10%. Age preference is a hard filter. The label is not represented as scientific compatibility and should move to a trusted server before it affects ranking in production.

## Moderation

Reports and verification requests form queues; `moderation_events` provides an append-style audit record for warnings, restrictions, suspensions, bans, restoration, and verification outcomes. Production access should use signed server roles/claims, step-up authentication, scoped permissions, and immutable audit delivery. Never trust a role supplied by the browser.

## Maya AI boundary

Maya is an assistant feature, never a dating identity. The global product-shell button opens a visually distinct AI-labeled bottom sheet. Chat messages expose contextual actions, but generated replies can only be copied into the local draft; the existing user-controlled send action remains the sole messaging path.

`/api/maya` is the server trust boundary. It validates the request with Zod, validates the Supabase claim, checks adult and account state, enforces Maya preferences and quotas, and verifies conversation participation/active match state whenever a conversation UUID is provided. The payload schema accepts at most 10 recent messages and only public/relevant profile fields. Passwords, tokens, precise GPS, payment data, moderation records, and cross-match conversation history are not accepted.

Provider logic is behind `AIProvider`. A server-only `GEMINI_API_KEY` selects the direct Google Gemini provider with optional Gemini model overrides; without that key, local development uses deterministic demo responses. There is no OpenAI or AI Gateway production fallback. System policy, application context, and untrusted profile/message data are separated. All provider output is schema-validated before it reaches the client. Bhetau product help uses a dedicated knowledge base, and deterministic high-signal safety rules run before model routing.

Maya analytics deliberately exclude prompts and message content. `maya_requests` records operational metadata and token usage, `maya_feedback` records user-owned ratings, and `maya_preferences` stores explicit controls. RLS isolates rows to their owner while the existing trusted moderator role can read aggregate source rows. Admin metrics are computed from metadata only.

## Upload pipeline

Production uploads require: authentication; file count ≤ 6; magic-byte MIME validation; image-only allow list; 15 MB input cap; pixel/dimension and decompression-bomb checks; metadata stripping; safety moderation; 4:5 WebP/AVIF derivatives; private originals; short-lived signed derivatives; and cleanup on profile/account deletion.

## Next production phase

1. Apply all pending migrations—including `20260830121707_message_lifecycle.sql`—to staging and run automated RLS tests with two users, one blocked pair, expired messages, and one moderator.
2. Implement private Storage upload/derivative Edge Functions and abuse-safe signed URLs.
3. Move Maya's per-minute burst limit to a distributed limiter; daily limits already use persisted request metadata.
4. Add transactional notification workers, subscription webhooks, and deletion/export jobs.
5. Add end-to-end tests for OTP redirects, RLS denial cases, blocked messaging, archive restoration, reply/reaction ownership, expiry, and race-simulated reciprocal likes.
