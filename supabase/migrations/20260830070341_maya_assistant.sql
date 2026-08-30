-- Maya stores operational metadata only. Raw prompts, profile text, and private
-- conversation content are deliberately excluded from these analytics tables.

create type public.maya_request_status as enum ('pending', 'succeeded', 'failed', 'blocked');

create table public.maya_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  mode text not null check (mode in ('profile_coach', 'conversation_coach', 'match_insight', 'translation', 'safety_check', 'bhetau_help')),
  provider text not null check (char_length(provider) between 2 and 80),
  model text not null check (char_length(model) between 2 and 120),
  latency_ms integer not null default 0 check (latency_ms >= 0),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  status public.maya_request_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.maya_feedback (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.maya_requests(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  rating smallint not null check (rating between -1 and 1),
  feedback_type text not null check (feedback_type in ('helpful', 'not_helpful', 'unsafe', 'bad_translation')),
  created_at timestamptz not null default now(),
  unique (request_id, user_id)
);

create table public.maya_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  enabled boolean not null default true,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'ne', 'roman-ne', 'hi')),
  preferred_tone text not null default 'friendly' check (preferred_tone in ('friendly', 'playful', 'confident', 'casual', 'direct', 'respectful')),
  translation_suggestions boolean not null default true,
  conversation_suggestions boolean not null default true,
  safety_alerts boolean not null default true,
  ai_personalization boolean not null default false,
  updated_at timestamptz not null default now()
);

create index maya_requests_user_created_idx on public.maya_requests (user_id, created_at desc);
create index maya_requests_match_idx on public.maya_requests (match_id) where match_id is not null;
create index maya_requests_created_mode_idx on public.maya_requests (created_at desc, mode);
create index maya_feedback_user_created_idx on public.maya_feedback (user_id, created_at desc);

create trigger maya_preferences_updated before update on public.maya_preferences
for each row execute function public.set_updated_at();

alter table public.maya_requests enable row level security;
alter table public.maya_feedback enable row level security;
alter table public.maya_preferences enable row level security;

revoke all on public.maya_requests, public.maya_feedback, public.maya_preferences from anon;
revoke all on public.maya_requests, public.maya_feedback, public.maya_preferences from public;
grant select, insert, update, delete on public.maya_requests to authenticated;
grant select, insert, update, delete on public.maya_feedback to authenticated;
grant select, insert, update, delete on public.maya_preferences to authenticated;
grant all on public.maya_requests, public.maya_feedback, public.maya_preferences to service_role;

create policy maya_requests_select_self on public.maya_requests for select to authenticated
using (user_id = (select auth.uid()) or private.is_admin());
create policy maya_requests_insert_self on public.maya_requests for insert to authenticated
with check (user_id = (select auth.uid()));
create policy maya_requests_update_self on public.maya_requests for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy maya_requests_delete_self on public.maya_requests for delete to authenticated
using (user_id = (select auth.uid()));

create policy maya_feedback_select_self on public.maya_feedback for select to authenticated
using (user_id = (select auth.uid()) or private.is_admin());
create policy maya_feedback_insert_self on public.maya_feedback for insert to authenticated
with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.maya_requests request
    where request.id = request_id and request.user_id = (select auth.uid())
  )
);
create policy maya_feedback_update_self on public.maya_feedback for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy maya_feedback_delete_self on public.maya_feedback for delete to authenticated
using (user_id = (select auth.uid()));

create policy maya_preferences_select_self on public.maya_preferences for select to authenticated
using (user_id = (select auth.uid()) or private.is_admin());
create policy maya_preferences_insert_self on public.maya_preferences for insert to authenticated
with check (user_id = (select auth.uid()));
create policy maya_preferences_update_self on public.maya_preferences for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy maya_preferences_delete_self on public.maya_preferences for delete to authenticated
using (user_id = (select auth.uid()));
