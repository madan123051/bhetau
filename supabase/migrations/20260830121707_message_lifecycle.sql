alter table public.conversations
  add column message_ttl_hours smallint
  check (message_ttl_hours in (6, 12));

alter table public.messages
  add column reply_to_id uuid references public.messages(id) on delete set null,
  add column expires_at timestamptz;

create table public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  emoji text not null check (emoji in ('❤️', '😂', '👍', '😮', '😢', '🔥')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.message_reactions enable row level security;
revoke all on table public.message_reactions from anon, authenticated;
grant select, insert, update, delete on table public.message_reactions to authenticated;
revoke update on public.message_reactions from authenticated;
grant update (emoji) on public.message_reactions to authenticated;

create or replace function private.can_access_conversation(target_conversation uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1
    from public.conversation_participants cp
    join public.conversations c on c.id = cp.conversation_id
    join public.matches m on m.id = c.match_id
    where cp.conversation_id = target_conversation
      and cp.user_id = (select auth.uid())
      and m.state = 'active'
      and private.users_not_blocked(m.user_low, m.user_high)
  );
$$;

revoke all on function private.can_access_conversation(uuid) from public, anon, authenticated;
grant execute on function private.can_access_conversation(uuid) to authenticated;

create policy reactions_participant_read
on public.message_reactions for select to authenticated
using (exists (
  select 1 from public.messages m
  where m.id = message_id and private.can_access_conversation(m.conversation_id)
    and m.deleted_at is null and (m.expires_at is null or m.expires_at > now())
));

create policy reactions_insert_self
on public.message_reactions for insert to authenticated
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.messages m
  where m.id = message_id and private.can_access_conversation(m.conversation_id)
    and m.deleted_at is null and (m.expires_at is null or m.expires_at > now())
));

create policy reactions_update_self
on public.message_reactions for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.messages m
  where m.id = message_id and private.can_access_conversation(m.conversation_id)
    and m.deleted_at is null and (m.expires_at is null or m.expires_at > now())
));

create policy reactions_delete_self
on public.message_reactions for delete to authenticated
using (user_id = (select auth.uid()));

create index reactions_user_idx on public.message_reactions (user_id, created_at desc);

create index messages_expiry_idx on public.messages (expires_at)
where expires_at is not null and deleted_at is null;
create index messages_reply_idx on public.messages (reply_to_id)
where reply_to_id is not null;

create or replace function private.has_active_match(other_user uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.matches m
    where m.state = 'active'
      and ((m.user_low = (select auth.uid()) and m.user_high = other_user)
        or (m.user_high = (select auth.uid()) and m.user_low = other_user))
      and private.users_not_blocked(m.user_low, m.user_high)
  );
$$;

revoke all on function private.has_active_match(uuid) from public, anon, authenticated;
grant execute on function private.has_active_match(uuid) to authenticated;

alter policy profiles_read_visible on public.profiles using (
  user_id = (select auth.uid()) or private.is_admin() or private.has_active_match(user_id) or (
    is_visible and not discovery_paused and not incognito and
    private.is_discoverable_user(user_id) and private.users_not_blocked((select auth.uid()), user_id)
  )
);

alter policy photos_read_authorized on public.profile_photos using (
  user_id = (select auth.uid()) or private.is_admin() or (
    moderation_state = 'approved' and (
      private.has_active_match(user_id) or exists(
      select 1 from public.profiles p
      where p.id = profile_id and p.is_visible and not p.discovery_paused and not p.incognito
        and private.users_not_blocked((select auth.uid()), p.user_id)
      )
    )
  )
);

alter policy user_interests_read on public.user_interests using (
  user_id = (select auth.uid()) or private.is_admin() or private.has_active_match(user_id) or exists(
    select 1 from public.profiles p
    where p.user_id = user_interests.user_id and p.is_visible and not p.discovery_paused and not p.incognito
      and private.users_not_blocked((select auth.uid()), p.user_id)
  )
);

alter policy conversations_participants on public.conversations using (
  private.can_access_conversation(id)
);

alter policy participants_read on public.conversation_participants using (
  private.can_access_conversation(conversation_id)
);

alter policy participants_update_self on public.conversation_participants
using (user_id = (select auth.uid()) and private.can_access_conversation(conversation_id))
with check (user_id = (select auth.uid()) and private.can_access_conversation(conversation_id));

create policy conversations_participants_update
on public.conversations for update to authenticated
using (private.can_access_conversation(id))
with check (private.can_access_conversation(id));

alter policy messages_participant_read on public.messages using (
  private.can_access_conversation(conversation_id)
  and (expires_at is null or expires_at > now())
);

alter policy messages_participant_insert on public.messages with check (
  sender_id = (select auth.uid())
  and type = 'text'
  and private.can_access_conversation(conversation_id)
);

alter policy messages_sender_update on public.messages
using (
  sender_id = (select auth.uid())
  and deleted_at is null
  and (expires_at is null or expires_at > now())
  and private.can_access_conversation(conversation_id)
)
with check (
  sender_id = (select auth.uid())
  and private.can_access_conversation(conversation_id)
);

revoke update on public.conversations from authenticated;
grant update (message_ttl_hours) on public.conversations to authenticated;
revoke update on public.conversation_participants from authenticated;
revoke update on public.messages from authenticated;

create or replace function public.archive_my_conversation(p_conversation_id uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  affected integer;
begin
  if (select auth.uid()) is null or not private.can_access_conversation(p_conversation_id) then
    return false;
  end if;

  update public.conversation_participants
  set archived_at = now()
  where conversation_id = p_conversation_id and user_id = (select auth.uid());
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

create or replace function public.mark_conversation_read(p_conversation_id uuid, p_message_id uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  read_through timestamptz;
  affected integer;
begin
  if (select auth.uid()) is null or not private.can_access_conversation(p_conversation_id) then
    return false;
  end if;

  select m.created_at into read_through
  from public.messages m
  where m.id = p_message_id
    and m.conversation_id = p_conversation_id
    and (m.expires_at is null or m.expires_at > now());

  if read_through is null then return false; end if;

  update public.conversation_participants
  set last_read_at = greatest(coalesce(last_read_at, read_through), read_through)
  where conversation_id = p_conversation_id and user_id = (select auth.uid());
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

create or replace function public.edit_message(p_message_id uuid, p_body text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  affected integer;
begin
  if (select auth.uid()) is null or char_length(trim(coalesce(p_body, ''))) not between 1 and 2000 then
    return false;
  end if;

  update public.messages m
  set body = p_body, edited_at = now()
  where m.id = p_message_id
    and m.sender_id = (select auth.uid())
    and m.deleted_at is null
    and (m.expires_at is null or m.expires_at > now())
    and private.can_access_conversation(m.conversation_id);
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

create or replace function public.unsend_message(p_message_id uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  affected integer;
begin
  if (select auth.uid()) is null then return false; end if;

  update public.messages m
  set body = 'Message unsent', edited_at = null, deleted_at = now()
  where m.id = p_message_id
    and m.sender_id = (select auth.uid())
    and m.deleted_at is null
    and (m.expires_at is null or m.expires_at > now())
    and private.can_access_conversation(m.conversation_id);
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.archive_my_conversation(uuid) from public, anon, authenticated;
revoke all on function public.mark_conversation_read(uuid, uuid) from public, anon, authenticated;
revoke all on function public.edit_message(uuid, text) from public, anon, authenticated;
revoke all on function public.unsend_message(uuid) from public, anon, authenticated;
grant execute on function public.archive_my_conversation(uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid, uuid) to authenticated;
grant execute on function public.edit_message(uuid, text) to authenticated;
grant execute on function public.unsend_message(uuid) to authenticated;

create or replace function private.prepare_message_lifecycle()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  ttl smallint;
begin
  new.created_at := now();
  new.edited_at := null;
  new.deleted_at := null;

  if new.reply_to_id is not null and not exists (
    select 1 from public.messages m
    where m.id = new.reply_to_id and m.conversation_id = new.conversation_id
      and m.deleted_at is null and (m.expires_at is null or m.expires_at > now())
  ) then
    raise exception 'reply target is unavailable';
  end if;

  select c.message_ttl_hours into ttl
  from public.conversations c
  where c.id = new.conversation_id;

  new.expires_at := case when ttl is null then null else new.created_at + make_interval(hours => ttl) end;
  return new;
end;
$$;

create or replace function private.after_message_insert()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations
  set last_message_at = greatest(coalesce(last_message_at, new.created_at), new.created_at),
      updated_at = greatest(coalesce(updated_at, new.created_at), new.created_at)
  where id = new.conversation_id;

  update public.conversation_participants
  set archived_at = null
  where conversation_id = new.conversation_id;

  delete from public.messages
  where id in (
    select m.id from public.messages m
    where m.expires_at is not null and m.expires_at <= now()
    order by m.expires_at
    limit 500
  );
  return new;
end;
$$;

revoke all on function private.prepare_message_lifecycle() from public, anon, authenticated;
revoke all on function private.after_message_insert() from public, anon, authenticated;

create trigger messages_prepare_lifecycle
before insert on public.messages
for each row execute function private.prepare_message_lifecycle();

create trigger messages_after_insert
after insert on public.messages
for each row execute function private.after_message_insert();

create or replace function public.get_my_chat_summaries(p_limit integer default 100)
returns table (
  conversation_id uuid,
  other_user_id uuid,
  first_name text,
  current_area text,
  verified boolean,
  matched_at timestamptz,
  last_message_body text,
  last_message_type public.message_type,
  last_message_sender_id uuid,
  last_message_created_at timestamptz,
  last_message_deleted_at timestamptz,
  unread_count bigint
)
language sql stable security definer set search_path = '' as $$
  select
    c.id,
    other_user.id,
    p.first_name,
    p.current_area,
    u.verification in ('phone_verified', 'verified'),
    c.created_at,
    latest.body,
    latest.type,
    latest.sender_id,
    latest.created_at,
    latest.deleted_at,
    coalesce(unread.total, 0)::bigint
  from public.conversation_participants mine
  join public.conversations c on c.id = mine.conversation_id
  join public.matches m on m.id = c.match_id and m.state = 'active'
  cross join lateral (
    select case when m.user_low = (select auth.uid()) then m.user_high else m.user_low end as id
  ) other_user
  join public.users u on u.id = other_user.id and u.account_status = 'active'
  join public.profiles p on p.user_id = other_user.id
  left join lateral (
    select msg.body, msg.type, msg.sender_id, msg.created_at, msg.deleted_at
    from public.messages msg
    where msg.conversation_id = c.id
      and (msg.expires_at is null or msg.expires_at > now())
    order by msg.created_at desc
    limit 1
  ) latest on true
  left join lateral (
    select count(*) as total
    from public.messages msg
    where msg.conversation_id = c.id
      and msg.sender_id <> (select auth.uid())
      and msg.deleted_at is null
      and (mine.last_read_at is null or msg.created_at > mine.last_read_at)
      and (msg.expires_at is null or msg.expires_at > now())
  ) unread on true
  where mine.user_id = (select auth.uid())
    and (select auth.uid()) in (m.user_low, m.user_high)
    and mine.archived_at is null
    and private.users_not_blocked(m.user_low, m.user_high)
  order by coalesce(latest.created_at, c.last_message_at, c.created_at) desc
  limit least(greatest(coalesce(p_limit, 100), 1), 100);
$$;

revoke all on function public.get_my_chat_summaries(integer) from public, anon, authenticated;
grant execute on function public.get_my_chat_summaries(integer) to authenticated;
