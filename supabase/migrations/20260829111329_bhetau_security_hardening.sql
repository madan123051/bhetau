-- Keep RLS helper functions out of the exposed API schema and cache auth.uid()
-- once per statement inside policies for predictable security and performance.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;

create or replace function private.handle_new_auth_user() returns trigger
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

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.users u where u.id = (select auth.uid()) and u.role in ('admin', 'moderator') and u.account_status = 'active');
$$;

create or replace function private.is_conversation_participant(conversation uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.conversation_participants cp where cp.conversation_id = conversation and cp.user_id = (select auth.uid()));
$$;

create or replace function private.users_not_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists(select 1 from public.blocks x where (x.blocker_id = a and x.blocked_id = b) or (x.blocker_id = b and x.blocked_id = a));
$$;

create or replace function private.is_discoverable_user(candidate uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.users u
    where u.id = candidate
      and u.account_status = 'active'
      and u.onboarding_completed_at is not null
      and u.birth_date <= ((now() at time zone 'utc')::date - interval '18 years')
  );
$$;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_conversation_participant(uuid) to authenticated;
grant execute on function private.users_not_blocked(uuid, uuid) to authenticated;
grant execute on function private.is_discoverable_user(uuid) to authenticated;

drop trigger on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_auth_user();

alter policy users_read_self on public.users using (id = (select auth.uid()) or private.is_admin());
alter policy profiles_read_visible on public.profiles using (
  user_id = (select auth.uid()) or private.is_admin() or (
    is_visible and not discovery_paused and not incognito and
    private.is_discoverable_user(user_id) and private.users_not_blocked((select auth.uid()), user_id)
  )
);
alter policy profiles_insert_self on public.profiles with check (user_id = (select auth.uid()));
alter policy profiles_update_self on public.profiles using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter policy photos_read_authorized on public.profile_photos using (
  user_id = (select auth.uid()) or private.is_admin() or (
    moderation_state = 'approved' and exists(
      select 1 from public.profiles p
      where p.id = profile_id and p.is_visible and not p.discovery_paused and not p.incognito
        and private.users_not_blocked((select auth.uid()), p.user_id)
    )
  )
);
alter policy photos_insert_self on public.profile_photos with check (
  user_id = (select auth.uid()) and exists(select 1 from public.profiles p where p.id = profile_id and p.user_id = (select auth.uid()))
);
alter policy photos_update_self on public.profile_photos using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy photos_delete_self on public.profile_photos using (user_id = (select auth.uid()));

alter policy preferences_self on public.preferences using (user_id = (select auth.uid()) or private.is_admin());
alter policy preferences_insert_self on public.preferences with check (user_id = (select auth.uid()));
alter policy preferences_update_self on public.preferences using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy user_interests_read on public.user_interests using (
  user_id = (select auth.uid()) or private.is_admin() or exists(
    select 1 from public.profiles p
    where p.user_id = user_interests.user_id and p.is_visible and not p.discovery_paused
      and private.users_not_blocked((select auth.uid()), p.user_id)
  )
);
alter policy user_interests_insert_self on public.user_interests with check (user_id = (select auth.uid()));
alter policy user_interests_delete_self on public.user_interests using (user_id = (select auth.uid()));

alter policy likes_self_read on public.likes using (actor_id = (select auth.uid()) or private.is_admin());
alter policy likes_self_delete on public.likes using (actor_id = (select auth.uid()));
alter policy passes_self_read on public.passes using (actor_id = (select auth.uid()) or private.is_admin());
alter policy passes_self_insert on public.passes with check (actor_id = (select auth.uid()) and private.users_not_blocked(actor_id, target_id));
alter policy passes_self_delete on public.passes using (actor_id = (select auth.uid()));
alter policy matches_participants on public.matches using ((select auth.uid()) in (user_low, user_high) or private.is_admin());
alter policy conversations_participants on public.conversations using (private.is_conversation_participant(id) or private.is_admin());
alter policy participants_read on public.conversation_participants using (private.is_conversation_participant(conversation_id) or private.is_admin());
alter policy participants_update_self on public.conversation_participants using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy messages_participant_read on public.messages using (private.is_conversation_participant(conversation_id) or private.is_admin());
alter policy messages_participant_insert on public.messages with check (
  sender_id = (select auth.uid()) and private.is_conversation_participant(conversation_id) and exists(
    select 1 from public.conversations c join public.matches m on m.id = c.match_id
    where c.id = conversation_id and m.state = 'active' and private.users_not_blocked(m.user_low, m.user_high)
  )
);
alter policy messages_sender_update on public.messages using (sender_id = (select auth.uid())) with check (sender_id = (select auth.uid()));

alter policy blocks_self_read on public.blocks using (blocker_id = (select auth.uid()) or private.is_admin());
alter policy blocks_self_insert on public.blocks with check (blocker_id = (select auth.uid()));
alter policy blocks_self_delete on public.blocks using (blocker_id = (select auth.uid()));
alter policy reports_reporter_read on public.reports using (reporter_id = (select auth.uid()) or private.is_admin());
alter policy reports_reporter_insert on public.reports with check (reporter_id = (select auth.uid()));
alter policy reports_admin_update on public.reports using (private.is_admin()) with check (private.is_admin());
alter policy verification_self_read on public.verification_requests using (user_id = (select auth.uid()) or private.is_admin());
alter policy verification_self_insert on public.verification_requests with check (user_id = (select auth.uid()) and state = 'pending');
alter policy verification_admin_update on public.verification_requests using (private.is_admin()) with check (private.is_admin());
alter policy devices_self_read on public.devices using (user_id = (select auth.uid()));
alter policy devices_self_insert on public.devices with check (user_id = (select auth.uid()));
alter policy devices_self_update on public.devices using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy devices_self_delete on public.devices using (user_id = (select auth.uid()));
alter policy notifications_self_read on public.notifications using (user_id = (select auth.uid()));
alter policy notifications_self_update on public.notifications using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy subscriptions_self_read on public.subscriptions using (user_id = (select auth.uid()) or private.is_admin());
alter policy moderation_admin_only on public.moderation_events using (private.is_admin()) with check (private.is_admin());

create index reports_reporter_idx on public.reports (reporter_id, created_at desc);

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
  if not private.is_discoverable_user(actor) then raise exception 'complete your profile before liking someone'; end if;
  if not private.users_not_blocked(actor, target_user_id) then raise exception 'profile unavailable'; end if;
  if not private.is_discoverable_user(target_user_id) or not exists(select 1 from public.profiles p where p.user_id = target_user_id and p.is_visible and not p.discovery_paused and not p.incognito) then
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

revoke all on function public.complete_profile(text, date, text, text[], text, text, text, text[], text[], text, text, text) from public, anon;
revoke all on function public.create_like(uuid) from public, anon;
grant execute on function public.complete_profile(text, date, text, text[], text, text, text, text[], text[], text, text, text) to authenticated;
grant execute on function public.create_like(uuid) to authenticated;

drop function public.handle_new_auth_user();
drop function public.is_admin();
drop function public.is_conversation_participant(uuid);
drop function public.is_discoverable_user(uuid);
drop function public.users_not_blocked(uuid, uuid);
