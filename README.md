# bhetau

**Meet someone worth meeting.** A premium, mobile-first Nepal-focused dating and connection PWA built around intent, personality, safety, and privacy.

The repository includes a polished local demo plus a working Supabase SSR login/profile path, PostgreSQL schema and RLS policies, trusted profile and like-to-match RPCs, the clearly disclosed Maya AI assistant, PWA shell, tests, and development-only moderation dashboard.

## What works in demo mode

- Short landing page with responsive product mockups
- Animated `भेटौँ → bhetau` splash and three-screen onboarding
- Phone/email OTP interface with a clear local demo path
- Nine-step, one-question-at-a-time profile setup with an 18+ gate
- Drag, keyboard, and button-based discovery actions
- Deterministic, explainable Vibe Match score
- Mutual match moment, Likes preview, persisted match conversation list, and optimistic chat
- Swipe-to-archive chats, replies, emoji reactions, sender-only edit/unsend, and optional 6/12-hour disappearing messages
- Editable icebreakers that never impersonate the user
- Hide, block, report, unmatch, privacy settings, Safety Center, and Share Date prototype
- Development-only moderation dashboard with metadata-only abuse review
- Dark mode, offline banner/fallback, loading/error states, English/Nepali dictionary structure
- Maya Profile Coach, Conversation Coach, Match Insight, translation, safety checks, and Bhetau knowledge help
- Contextual “Ask Maya” chat actions with editable suggestions that never auto-send

All names and portraits in the demo are fictional. The portrait atlas was generated for this project; no real person’s photo is used.

## Run locally

Requirements: Node.js 20+ and pnpm 10+.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`. If Supabase values are blank, Bhetau automatically uses local demo behavior. Enter a valid-looking Nepal number or email; the demo OTP screen accepts any six digits.

Quality commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Supabase setup

1. Create or select a Supabase project.
2. Copy `.env.example` to `.env.local`.
3. Add the project URL and public publishable key as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. A legacy anon key is supported as a fallback. Do not add a service-role key to any `NEXT_PUBLIC_*` variable.
4. Link the Supabase CLI, then apply the migration:

   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push --dry-run
   supabase db push
   ```

5. Email auth works with either a six-digit OTP template or a magic link. Add `http://localhost:3000/auth/confirm` and `https://bhetau.vercel.app/auth/confirm` to the Auth redirect allow-list and set the production Site URL to `https://bhetau.vercel.app`.
6. Enable phone auth and configure an SMS provider, then set `NEXT_PUBLIC_SUPABASE_PHONE_AUTH_ENABLED=true`. Until then, email is the active default and the phone tab honestly shows that setup is required.
7. To enable Google sign-in, enable Google under Supabase Auth → Providers, add the Google OAuth client ID/secret there, and add `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback` to the OAuth client's authorized redirect URIs. Keep `https://bhetau.vercel.app/auth/confirm` in Supabase's redirect allow-list. The Google button activates automatically once the public Supabase URL/key are configured.
8. Create private Storage buckets for original profile uploads. Serve authorized, appropriately sized derivatives or short-lived signed URLs.

The initial migration lives at `supabase/migrations/20260829111120_bhetau_initial_auth_profile.sql`; `20260829111329_bhetau_security_hardening.sql` moves RLS helpers into a private schema and applies policy/index improvements. `20260830070341_maya_assistant.sql` adds metadata-only Maya requests, feedback, preferences, indexes, grants, and owner/admin RLS. `20260830121707_message_lifecycle.sql` adds participant-scoped reactions, replies, archive/timer updates, sender-only message mutation grants, matched-profile visibility, message expiry enforcement, and conversation activity triggers. Together they create the requested constraints, policies, auth-user trigger, atomic `complete_profile(...)`, and `create_like(target_user_id)`.

Pushing the Next.js deployment does **not** apply PostgreSQL migrations. Before using real chat in staging or production, authenticate and link the Supabase CLI (or use an authenticated Supabase migration workflow), preview with `supabase db push --dry-run`, and then run `supabase db push`. Do not use `--include-seed` against production.

When configured, auth uses Supabase SSR cookies refreshed by Next.js `proxy.ts`. Product routes require a validated session and completed adult profile. `/setup` persists account, profile, preferences, and interests in one transaction; `/you` loads the signed-in profile, persists privacy toggles, and signs out the real session. The service worker never caches authenticated navigations or API responses.

The app calls Supabase only when both public environment values are present. The browser never receives a service-role secret.

## Real chat behavior

With Supabase configured and the migrations applied, a reciprocal like creates exactly one match and conversation. `/chats` loads the signed-in participant's active conversations, including brand-new matches with no messages, persisted previews, timestamps, and unread counts. Swiping/removing a row writes `archived_at` only for that participant; it does not delete either person's history. A new message clears the archive state so the conversation returns.

Messages support a same-conversation reply reference, one allowed emoji reaction per participant, sender-only edit, and sender-only unsend. Unsend retains a tombstone instead of exposing the original text. The conversation timer can be Off, 6 hours, or 12 hours. A timer is stamped onto messages sent after that setting is selected; changing it does not retroactively rewrite older messages. Expired rows become unreadable through RLS at their deadline and are purged in bounded batches when later messages are inserted. Add a scheduled database cleanup job in production if expiry cleanup must run even when a conversation has no new traffic.

## Maya AI assistant

Maya is always labeled as an AI assistant and never appears in discovery, matching, or user-to-user conversations as a person. Every Maya request goes through authenticated `/api/maya` server routes, strict Zod input/output schemas, adult/account checks, per-minute and configurable daily limits, conversation-participant checks when a conversation UUID is supplied, and a provider abstraction in `src/lib/maya`.

Without credentials, Maya uses deterministic server-side help, safety, translation samples, and coaching output so local development stays functional. Add the server-only `GEMINI_API_KEY` in Vercel to activate Google Gemini automatically. Production has no OpenAI or AI Gateway fallback. `GEMINI_MODEL=gemini-2.5-flash` is the default, with optional route-specific overrides:

```env
GEMINI_FAST_MODEL=gemini-2.5-flash
GEMINI_SMART_MODEL=gemini-2.5-flash
GEMINI_SAFETY_MODEL=gemini-2.5-flash
```

Do not prefix these or `GEMINI_API_KEY` with `NEXT_PUBLIC_`. Profile text and message content are treated as untrusted user data, kept separate from system policy, and never written to Maya analytics. At most 10 recent messages are accepted. `maya_requests` stores only user/match IDs, mode, provider/model, latency, token counts, status, and time; `maya_feedback` and `maya_preferences` are owner-scoped through RLS.

The Bhetau help mode is answered from a dedicated local knowledge base rather than generated product behavior. High-signal safety patterns such as money requests, crypto pitches, threats, sexual pressure, suspicious links, and underage signals receive cautious local warnings before model routing. Provider failures return a retryable Maya error without interrupting normal chat.

## Trusted server actions still required for production

- `create_like` RPC is the only match-creation path. The client must never insert a match or conversation.
- Image upload authorization, MIME sniffing, 15 MB size enforcement, moderation, derivative generation, and signed delivery should run in an Edge Function or trusted route.
- Report triage, verification decisions, bans, subscription webhooks, data export, and account deletion require trusted server authorization.
- Share Date is intentionally a non-delivering prototype until an encrypted, auditable delivery service is configured.
- Rate limits need a durable shared backend. The included in-memory limiter documents behavior and is only suitable for local/demo instances.

Suggested initial limits: 60 likes/minute with daily product limits; 90 messages/minute; 8 reports/hour; 6 photo uploads/hour; strict OTP/provider limits. Use account, IP, device, and risk signals without silently locking out legitimate users.

## Deployment

Vercel is the simplest path for this Next.js app:

1. Import `madan123051/bhetau` in Vercel.
2. Add the URL and publishable-key environment variables for Preview and Production.
3. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only if a future trusted route needs it.
4. Deploy, then update Supabase Auth Site URL and redirect allow-list to the production domain.
5. Verify PWA installation, OTP redirects, signed image URLs, and RLS using two non-admin test accounts.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the security and production design.
