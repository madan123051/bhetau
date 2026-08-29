-- Bhetau initial schema. Apply with `supabase db push`.
-- auth.users remains the authentication source of truth; public.users is app metadata.

create extension if not exists pgcrypto;

create type public.verification_state as enum ('unverified', 'phone_verified', 'pending', 'verified', 'rejected');
create type public.report_state as enum ('open', 'triaged', 'investigating', 'resolved', 'dismissed');
create type public.moderation_action as enum ('warn', 'restrict', 'suspend', 'ban', 'restore', 'verify', 'reject_verification');
create type public.match_state as enum ('active', 'unmatched', 'blocked');
create type public.subscription_state as enum ('inactive', 'trialing', 'active', 'past_due', 'cancelled');
create type public.message_type as enum ('text', 'image', 'system');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  birth_date date,
  onboarding_completed_at timestamptz,
  locale text not null default 'en' check (locale in ('en', 'ne', 'roman-ne')),
  role text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  account_status text not null default 'active' check (account_status in ('active', 'restricted', 'suspended', 'banned', 'deletion_requested')),
  verification public.verification_state not null default 'unverified',
  deletion_requested_at timestamptz,
  check (birth_date is null or birth_date <= ((now() at time zone 'utc')::date - interval '18 years'))
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_name text not null check (char_length(first_name) between 2 and 40),
  gender text not null check (char_length(gender) between 1 and 40),
  relationship_intention text not null check (relationship_intention in ('Long-term relationship', 'Something casual', 'Meet & see', 'New friends', 'Still figuring it out')),
  from_place text check (char_length(from_place) <= 80),
  current_area text not null check (char_length(current_area) between 2 and 80),
  languages text[] not null default '{}' check (cardinality(languages) between 1 and 8),
  occupation text check (char_length(occupation) <= 100),
  height_cm smallint check (height_cm between 120 and 230),
  education text check (char_length(education) <= 120),
  drinking text check (drinking in ('Never', 'Socially', 'Often') or drinking is null),
  smoking text check (smoking in ('Never', 'Socially', 'Often', 'Quitting') or smoking is null),
  pets text check (char_length(pets) <= 80),
  religion text check (char_length(religion) <= 80),
  lifestyle text[] not null default '{}',
  bio text not null default '' check (char_length(bio) between 20 and 500),
  prompt_answers jsonb not null default '[]'::jsonb,
  is_visible boolean not null default true,
  discovery_paused boolean not null default false,
  show_age boolean not null default true,
  show_city boolean not null default true,
  show_active_status boolean not null default false,
  read_receipts boolean not null default true,
  incognito boolean not null default false,
  coarse_location_code text,
  last_active_at timestamptz
);

create table public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  storage_path text not null,
  derivative_path text,
  position smallint not null check (position between 1 and 6),
  width integer check (width > 0),
  height integer check (height > 0),
  bytes integer check (bytes > 0 and bytes <= 15728640),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
  blurhash text,
  moderation_state text not null default 'pending' check (moderation_state in ('pending', 'approved', 'rejected')),
  unique (profile_id, position),
  unique (storage_path)
);

create table public.preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  updated_at timestamptz not null default now(),
  interested_in text[] not null default '{}',
  intentions text[] not null default '{}',
  min_age smallint not null default 18 check (min_age >= 18),
  max_age smallint not null default 40 check (max_age >= min_age and max_age <= 100),
  coarse_areas text[] not null default '{}',
  verified_first boolean not null default false
);

create table public.interests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  label_en text not null,
  label_ne text
);

create table public.user_interests (
  user_id uuid not null references public.users(id) on delete cascade,
  interest_id uuid not null references public.interests(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, interest_id)
);

create table public.likes (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users(id) on delete cascade,
  target_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (actor_id, target_id),
  check (actor_id <> target_id)
);

create table public.passes (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users(id) on delete cascade,
  target_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (actor_id, target_id),
  check (actor_id <> target_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references public.users(id) on delete cascade,
  user_high uuid not null references public.users(id) on delete cascade,
  state public.match_state not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unmatched_by uuid references public.users(id),
  unmatched_at timestamptz,
  unique (user_low, user_high),
  check (user_low < user_high)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  archived_at timestamptz,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  type public.message_type not null default 'text',
  body text check (char_length(body) <= 2000),
  image_metadata jsonb,
  client_id uuid,
  unique (conversation_id, client_id),
  check ((type = 'text' and body is not null and char_length(trim(body)) > 0) or type <> 'text')
);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.users(id) on delete cascade,
  blocked_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id) on delete cascade,
  reported_user_id uuid not null references public.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reason text not null check (reason in ('Fake profile', 'Under 18', 'Harassment', 'Sexual content', 'Scam', 'Hate or abuse', 'Impersonation', 'Other')),
  details text check (char_length(details) <= 1000),
  state public.report_state not null default 'open',
  assigned_to uuid references public.users(id),
  resolved_at timestamptz,
  check (reporter_id <> reported_user_id)
);

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  state public.verification_state not null default 'pending',
  method text not null check (method in ('phone', 'moderation')),
  evidence_metadata jsonb not null default '{}'::jsonb,
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  push_token text not null unique,
  platform text not null check (platform in ('web', 'ios', 'android')),
  last_seen_at timestamptz
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  type text not null,
  title text not null check (char_length(title) <= 140),
  body text check (char_length(body) <= 500),
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  provider text,
  provider_customer_ref text unique,
  provider_subscription_ref text unique,
  state public.subscription_state not null default 'inactive',
  current_period_end timestamptz
);

create table public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid not null references public.users(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  report_id uuid references public.reports(id) on delete set null,
  created_at timestamptz not null default now(),
  action public.moderation_action not null,
  reason text not null check (char_length(reason) between 3 and 1000),
  metadata jsonb not null default '{}'::jsonb
);

create index profiles_discovery_idx on public.profiles (is_visible, discovery_paused, coarse_location_code) where is_visible and not discovery_paused;
create index photos_user_idx on public.profile_photos (user_id);
create index photos_profile_idx on public.profile_photos (profile_id, position) where moderation_state = 'approved';
create index user_interests_interest_idx on public.user_interests (interest_id, user_id);
create index likes_target_idx on public.likes (target_id, created_at desc);
create index passes_actor_idx on public.passes (actor_id, created_at desc);
create index passes_target_idx on public.passes (target_id, created_at desc);
create index matches_user_low_idx on public.matches (user_low, updated_at desc);
create index matches_user_high_idx on public.matches (user_high, updated_at desc);
create index matches_unmatched_by_idx on public.matches (unmatched_by) where unmatched_by is not null;
create index participants_user_idx on public.conversation_participants (user_id, conversation_id);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);
create index messages_sender_idx on public.messages (sender_id, created_at desc);
create index blocks_blocked_idx on public.blocks (blocked_id, blocker_id);
create index reports_state_idx on public.reports (state, created_at asc);
create index reports_reported_user_idx on public.reports (reported_user_id, created_at desc);
create index reports_conversation_idx on public.reports (conversation_id) where conversation_id is not null;
create index reports_assigned_idx on public.reports (assigned_to) where assigned_to is not null;
create index verification_state_idx on public.verification_requests (state, created_at asc);
create index verification_user_idx on public.verification_requests (user_id, created_at desc);
create index verification_reviewer_idx on public.verification_requests (reviewed_by) where reviewed_by is not null;
create index devices_user_idx on public.devices (user_id, updated_at desc);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index moderation_subject_idx on public.moderation_events (subject_user_id, created_at desc);
create index moderation_actor_idx on public.moderation_events (actor_user_id, created_at desc) where actor_user_id is not null;
create index moderation_report_idx on public.moderation_events (report_id) where report_id is not null;

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id, locale, verification)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'locale' in ('en', 'ne', 'roman-ne') then new.raw_user_meta_data ->> 'locale' else 'en' end,
    case when new.phone is not null and new.phone_confirmed_at is not null then 'phone_verified'::public.verification_state else 'unverified'::public.verification_state end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Backfill accounts that may have authenticated before this migration was installed.
insert into public.users (id, locale, verification)
select
  au.id,
  case when au.raw_user_meta_data ->> 'locale' in ('en', 'ne', 'roman-ne') then au.raw_user_meta_data ->> 'locale' else 'en' end,
  case when au.phone is not null and au.phone_confirmed_at is not null then 'phone_verified'::public.verification_state else 'unverified'::public.verification_state end
from auth.users au
on conflict (id) do nothing;

create trigger users_updated before update on public.users for each row execute function public.set_updated_at();
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger preferences_updated before update on public.preferences for each row execute function public.set_updated_at();
create trigger matches_updated before update on public.matches for each row execute function public.set_updated_at();
create trigger conversations_updated before update on public.conversations for each row execute function public.set_updated_at();
create trigger reports_updated before update on public.reports for each row execute function public.set_updated_at();
create trigger verification_updated before update on public.verification_requests for each row execute function public.set_updated_at();
create trigger devices_updated before update on public.devices for each row execute function public.set_updated_at();
create trigger subscriptions_updated before update on public.subscriptions for each row execute function public.set_updated_at();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.users u where u.id = auth.uid() and u.role in ('admin', 'moderator') and u.account_status = 'active');
$$;

create or replace function public.is_conversation_participant(conversation uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.conversation_participants cp where cp.conversation_id = conversation and cp.user_id = auth.uid());
$$;

create or replace function public.users_not_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists(select 1 from public.blocks x where (x.blocker_id = a and x.blocked_id = b) or (x.blocker_id = b and x.blocked_id = a));
$$;

create or replace function public.is_discoverable_user(candidate uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.users u
    where u.id = candidate
      and u.account_status = 'active'
      and u.onboarding_completed_at is not null
      and u.birth_date <= ((now() at time zone 'utc')::date - interval '18 years')
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_conversation_participant(uuid) from public;
revoke all on function public.users_not_blocked(uuid, uuid) from public;
revoke all on function public.is_discoverable_user(uuid) from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_conversation_participant(uuid) to authenticated;
grant execute on function public.users_not_blocked(uuid, uuid) to authenticated;
grant execute on function public.is_discoverable_user(uuid) to authenticated;

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_photos enable row level security;
alter table public.preferences enable row level security;
alter table public.interests enable row level security;
alter table public.user_interests enable row level security;
alter table public.likes enable row level security;
alter table public.passes enable row level security;
alter table public.matches enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.verification_requests enable row level security;
alter table public.devices enable row level security;
alter table public.notifications enable row level security;
alter table public.subscriptions enable row level security;
alter table public.moderation_events enable row level security;

create policy users_read_self on public.users for select to authenticated using (id = auth.uid() or public.is_admin());

create policy profiles_read_visible on public.profiles for select to authenticated using (
  user_id = auth.uid() or public.is_admin() or (
    is_visible and not discovery_paused and not incognito and
    public.is_discoverable_user(user_id) and
    public.users_not_blocked(auth.uid(), user_id)
  )
);
create policy profiles_insert_self on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy profiles_update_self on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy photos_read_authorized on public.profile_photos for select to authenticated using (
  user_id = auth.uid() or public.is_admin() or (
    moderation_state = 'approved' and exists(select 1 from public.profiles p where p.id = profile_id and p.is_visible and not p.discovery_paused and not p.incognito and public.users_not_blocked(auth.uid(), p.user_id))
  )
);
create policy photos_insert_self on public.profile_photos for insert to authenticated with check (user_id = auth.uid() and exists(select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));
create policy photos_update_self on public.profile_photos for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy photos_delete_self on public.profile_photos for delete to authenticated using (user_id = auth.uid());

create policy preferences_self on public.preferences for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy preferences_insert_self on public.preferences for insert to authenticated with check (user_id = auth.uid());
create policy preferences_update_self on public.preferences for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy interests_read on public.interests for select to authenticated using (true);
create policy user_interests_read on public.user_interests for select to authenticated using (user_id = auth.uid() or public.is_admin() or exists(select 1 from public.profiles p where p.user_id = user_interests.user_id and p.is_visible and not p.discovery_paused and public.users_not_blocked(auth.uid(), p.user_id)));
create policy user_interests_insert_self on public.user_interests for insert to authenticated with check (user_id = auth.uid());
create policy user_interests_delete_self on public.user_interests for delete to authenticated using (user_id = auth.uid());

create policy likes_self_read on public.likes for select to authenticated using (actor_id = auth.uid() or public.is_admin());
create policy likes_self_delete on public.likes for delete to authenticated using (actor_id = auth.uid());
create policy passes_self_read on public.passes for select to authenticated using (actor_id = auth.uid() or public.is_admin());
create policy passes_self_insert on public.passes for insert to authenticated with check (actor_id = auth.uid() and public.users_not_blocked(actor_id, target_id));
create policy passes_self_delete on public.passes for delete to authenticated using (actor_id = auth.uid());

create policy matches_participants on public.matches for select to authenticated using (auth.uid() in (user_low, user_high) or public.is_admin());
create policy conversations_participants on public.conversations for select to authenticated using (public.is_conversation_participant(id) or public.is_admin());
create policy participants_read on public.conversation_participants for select to authenticated using (public.is_conversation_participant(conversation_id) or public.is_admin());
create policy participants_update_self on public.conversation_participants for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy messages_participant_read on public.messages for select to authenticated using (public.is_conversation_participant(conversation_id) or public.is_admin());
create policy messages_participant_insert on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and public.is_conversation_participant(conversation_id) and
  exists(select 1 from public.conversations c join public.matches m on m.id = c.match_id where c.id = conversation_id and m.state = 'active' and public.users_not_blocked(m.user_low, m.user_high))
);
create policy messages_sender_update on public.messages for update to authenticated using (sender_id = auth.uid()) with check (sender_id = auth.uid());

create policy blocks_self_read on public.blocks for select to authenticated using (blocker_id = auth.uid() or public.is_admin());
create policy blocks_self_insert on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy blocks_self_delete on public.blocks for delete to authenticated using (blocker_id = auth.uid());

create policy reports_reporter_read on public.reports for select to authenticated using (reporter_id = auth.uid() or public.is_admin());
create policy reports_reporter_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_admin_update on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy verification_self_read on public.verification_requests for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy verification_self_insert on public.verification_requests for insert to authenticated with check (user_id = auth.uid() and state = 'pending');
create policy verification_admin_update on public.verification_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy devices_self_read on public.devices for select to authenticated using (user_id = auth.uid());
create policy devices_self_insert on public.devices for insert to authenticated with check (user_id = auth.uid());
create policy devices_self_update on public.devices for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy devices_self_delete on public.devices for delete to authenticated using (user_id = auth.uid());
create policy notifications_self_read on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_self_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy subscriptions_self_read on public.subscriptions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy moderation_admin_only on public.moderation_events for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Completes or edits the signed-in user's onboarding atomically. The function
-- deliberately exposes no role, verification, or moderation fields.
create or replace function public.complete_profile(
  p_first_name text,
  p_birth_date date,
  p_gender text,
  p_interested_in text[],
  p_relationship_intention text,
  p_current_area text,
  p_from_place text,
  p_languages text[],
  p_interest_labels text[],
  p_bio text,
  p_prompt text,
  p_prompt_answer text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  profile_record uuid;
  known_interests integer;
begin
  if actor is null then raise exception 'authentication required'; end if;
  if not exists(select 1 from public.users u where u.id = actor and u.account_status = 'active') then
    raise exception 'account unavailable';
  end if;
  if p_birth_date is null or p_birth_date > ((now() at time zone 'utc')::date - interval '18 years') then
    raise exception 'Bhetau is only available to adults aged 18 or older';
  end if;
  if char_length(trim(p_first_name)) not between 2 and 40 then raise exception 'invalid first name'; end if;
  if char_length(trim(p_gender)) not between 1 and 40 then raise exception 'invalid gender'; end if;
  if cardinality(p_interested_in) < 1 then raise exception 'choose who you would like to meet'; end if;
  if cardinality(p_languages) not between 1 and 8 then raise exception 'choose between one and eight languages'; end if;
  if cardinality(p_interest_labels) not between 3 and 12 then raise exception 'choose between three and twelve interests'; end if;
  if char_length(trim(p_bio)) not between 20 and 500 then raise exception 'bio must be between 20 and 500 characters'; end if;
  if char_length(trim(p_prompt)) not between 3 and 100 then raise exception 'invalid profile prompt'; end if;
  if char_length(trim(p_prompt_answer)) not between 8 and 300 then raise exception 'prompt answer must be between 8 and 300 characters'; end if;

  select count(*) into known_interests
  from public.interests i
  where i.label_en = any(p_interest_labels);
  if known_interests <> cardinality(p_interest_labels) then raise exception 'one or more interests are unavailable'; end if;

  update public.users
  set birth_date = p_birth_date, onboarding_completed_at = now()
  where id = actor;

  insert into public.profiles (
    user_id, first_name, gender, relationship_intention, from_place,
    current_area, languages, bio, prompt_answers, coarse_location_code
  ) values (
    actor, trim(p_first_name), trim(p_gender), p_relationship_intention, nullif(trim(p_from_place), ''),
    trim(p_current_area), p_languages, trim(p_bio),
    jsonb_build_array(jsonb_build_object('prompt', trim(p_prompt), 'answer', trim(p_prompt_answer))),
    lower(regexp_replace(trim(p_current_area), '[^[:alnum:]]+', '-', 'g'))
  )
  on conflict (user_id) do update set
    first_name = excluded.first_name,
    gender = excluded.gender,
    relationship_intention = excluded.relationship_intention,
    from_place = excluded.from_place,
    current_area = excluded.current_area,
    languages = excluded.languages,
    bio = excluded.bio,
    prompt_answers = excluded.prompt_answers,
    coarse_location_code = excluded.coarse_location_code
  returning id into profile_record;

  insert into public.preferences (user_id, interested_in, intentions)
  values (actor, p_interested_in, array[p_relationship_intention])
  on conflict (user_id) do update set
    interested_in = excluded.interested_in,
    intentions = excluded.intentions;

  delete from public.user_interests where user_id = actor;
  insert into public.user_interests (user_id, interest_id)
  select actor, i.id from public.interests i where i.label_en = any(p_interest_labels);

  return profile_record;
end;
$$;

revoke all on function public.complete_profile(text, date, text, text[], text, text, text, text[], text[], text, text, text) from public;
grant execute on function public.complete_profile(text, date, text, text[], text, text, text, text[], text[], text, text, text) to authenticated;

-- Trusted like path. The transaction surrounding the function call makes reciprocal
-- like detection, unique match creation, and conversation creation atomic.
create or replace function public.create_like(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  low_user uuid;
  high_user uuid;
  reciprocal boolean;
  match_record uuid;
  conversation_record uuid;
begin
  if actor is null then raise exception 'authentication required'; end if;
  if actor = target_user_id then raise exception 'cannot like self'; end if;
  if not public.is_discoverable_user(actor) then raise exception 'complete your profile before liking someone'; end if;
  if not public.users_not_blocked(actor, target_user_id) then raise exception 'profile unavailable'; end if;
  if not public.is_discoverable_user(target_user_id) or not exists(select 1 from public.profiles p where p.user_id = target_user_id and p.is_visible and not p.discovery_paused and not p.incognito) then
    raise exception 'profile unavailable';
  end if;

  insert into public.likes(actor_id, target_id) values(actor, target_user_id)
  on conflict(actor_id, target_id) do nothing;

  select exists(select 1 from public.likes l where l.actor_id = target_user_id and l.target_id = actor) into reciprocal;
  if not reciprocal then return jsonb_build_object('liked', true, 'matched', false); end if;

  low_user := least(actor, target_user_id);
  high_user := greatest(actor, target_user_id);
  insert into public.matches(user_low, user_high) values(low_user, high_user)
  on conflict(user_low, user_high) do update set updated_at = now()
  returning id into match_record;

  insert into public.conversations(match_id) values(match_record)
  on conflict(match_id) do update set updated_at = now()
  returning id into conversation_record;

  insert into public.conversation_participants(conversation_id, user_id)
  values(conversation_record, low_user), (conversation_record, high_user)
  on conflict(conversation_id, user_id) do nothing;

  return jsonb_build_object('liked', true, 'matched', true, 'match_id', match_record, 'conversation_id', conversation_record);
end;
$$;

revoke all on function public.create_like(uuid) from public;
grant execute on function public.create_like(uuid) to authenticated;

-- Seed a small shared interest vocabulary. Profiles remain fictional demo data in app code.
insert into public.interests(slug, label_en, label_ne) values
('photography', 'Photography', 'फोटोग्राफी'), ('coffee', 'Coffee', 'कफी'), ('trekking', 'Trekking', 'पदयात्रा'),
('momo', 'Momo', 'मम'), ('books', 'Books', 'किताब'), ('live-music', 'Live music', 'प्रत्यक्ष संगीत'),
('cycling', 'Cycling', 'साइकल'), ('cooking', 'Cooking', 'खाना पकाउने'), ('films', 'Films', 'चलचित्र'),
('pottery', 'Pottery', 'माटोको कला'), ('running', 'Running', 'दौड'), ('yoga', 'Yoga', 'योग')
on conflict(slug) do nothing;
