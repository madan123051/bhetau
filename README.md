# bhetau

**Meet someone worth meeting.** A premium, mobile-first Nepal-focused dating and connection PWA built around intent, personality, safety, and privacy.

The repository includes a polished local demo, a Supabase-ready domain boundary, PostgreSQL schema and RLS policies, trusted like-to-match RPC, PWA shell, tests, and development-only moderation dashboard.

## What works in demo mode

- Short landing page with responsive product mockups
- Animated `भेटौँ → bhetau` splash and three-screen onboarding
- Phone/email OTP interface with a clear local demo path
- Nine-step, one-question-at-a-time profile setup with an 18+ gate
- Drag, keyboard, and button-based discovery actions
- Deterministic, explainable Vibe Match score
- Mutual match moment, Likes preview, conversation list, and optimistic chat
- Editable icebreakers that never impersonate the user
- Hide, block, report, unmatch, privacy settings, Safety Center, and Share Date prototype
- Development-only moderation dashboard with metadata-only abuse review
- Dark mode, offline banner/fallback, loading/error states, English/Nepali dictionary structure

All names and portraits in the demo are fictional. The portrait atlas was generated for this project; no real person’s photo is used.

## Run locally

Requirements: Node.js 20+ and pnpm 10+.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`. If Supabase values are blank, Bhetau automatically uses local demo behavior. The OTP screen accepts any contact and any six digits.

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
3. Add the project URL and public anon key. Do not add a service-role key to any `NEXT_PUBLIC_*` variable.
4. Link the Supabase CLI, then apply the migration:

   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

5. Enable phone and/or email OTP under Authentication providers. Configure provider credentials and redirect URLs for Google/Apple only when those placeholders are activated.
6. Create private Storage buckets for original profile uploads. Serve authorized, appropriately sized derivatives or short-lived signed URLs.

The initial migration lives at `supabase/migrations/202608290001_bhetau_initial.sql`. It creates every requested table, UUID/foreign-key/check/unique constraints, supporting indexes, RLS policies, and `create_like(target_user_id)`.

The app calls Supabase only when both public environment values are present. The browser never receives a service-role secret.

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
2. Add the two public Supabase environment variables for Preview and Production.
3. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only if a future trusted route needs it.
4. Deploy, then update Supabase Auth Site URL and redirect allow-list to the production domain.
5. Verify PWA installation, OTP redirects, signed image URLs, and RLS using two non-admin test accounts.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the security and production design.
