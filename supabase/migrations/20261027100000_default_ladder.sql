-- A User's Default Ladder: the Ladder they open on when they sign in.
-- It is always a Ladder they are Joined to. Their only Ladder becomes it.

alter table public.profiles
  add column default_ladder_id uuid null references public.ladders (id) on delete set null;

create or replace function private.settle_default_ladder(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_default uuid;
  joined_count integer;
  only_ladder uuid;
begin
  select default_ladder_id
  into current_default
  from public.profiles
  where id = p_user_id;

  if current_default is not null and not exists (
    select 1
    from public.ladder_members lm
    where lm.ladder_id = current_default
      and lm.user_id = p_user_id
      and lm.status = 'active'
  ) then
    update public.profiles
    set default_ladder_id = null
    where id = p_user_id;
    current_default := null;
  end if;

  if current_default is null then
    select count(*)::integer
    into joined_count
    from public.ladder_members lm
    where lm.user_id = p_user_id
      and lm.status = 'active';

    if joined_count = 1 then
      select lm.ladder_id
      into only_ladder
      from public.ladder_members lm
      where lm.user_id = p_user_id
        and lm.status = 'active';

      update public.profiles
      set default_ladder_id = only_ladder
      where id = p_user_id;
    end if;
  end if;
end;
$$;

revoke all on function private.settle_default_ladder(uuid) from public, anon, authenticated;

create or replace function public.set_default_ladder(p_ladder_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Sign in before choosing a Default Ladder'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.ladder_members lm
    where lm.ladder_id = p_ladder_id
      and lm.user_id = caller
      and lm.status = 'active'
  ) then
    raise exception 'You need to be Joined to that Ladder'
      using errcode = '42501';
  end if;

  update public.profiles
  set default_ladder_id = p_ladder_id
  where id = caller;
end;
$$;

revoke all on function public.set_default_ladder(uuid) from public, anon;
grant execute on function public.set_default_ladder(uuid) to authenticated;

drop function public.create_ladder(text);

create function public.create_ladder(p_name text, p_make_default boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  cleaned text := btrim(p_name);
  pool_id uuid;
  ladder_id uuid;
  starting integer;
  attempts integer := 0;
begin
  if caller is null then
    raise exception 'Sign in before creating a Ladder'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = caller) then
    raise exception 'Create a profile before creating a Ladder'
      using errcode = 'P0002';
  end if;

  if cleaned is null or char_length(cleaned) = 0 then
    raise exception 'Ladder name is required'
      using errcode = '22023';
  end if;

  if char_length(cleaned) > 80 then
    raise exception 'Keep the Ladder name under 80 characters'
      using errcode = '22023';
  end if;

  select id into pool_id
  from public.games
  where name = 'pool';

  if pool_id is null then
    raise exception 'Pool is not available'
      using errcode = 'P0002';
  end if;

  select constants.starting_rating into starting
  from public.rating_constants() as constants;

  loop
    attempts := attempts + 1;
    begin
      insert into public.ladders (name, game_id, share_token)
      values (cleaned, pool_id, private.gen_join_code())
      returning id into ladder_id;
      exit;
    exception
      when unique_violation then
        if attempts >= 8 then
          raise exception 'Could not create a Ladder'
            using errcode = '23505';
        end if;
    end;
  end loop;

  insert into public.ladder_members (
    ladder_id,
    user_id,
    role,
    status,
    rating,
    rated_match_count
  )
  values (ladder_id, caller, 'admin', 'active', starting, 0);

  if p_make_default then
    update public.profiles
    set default_ladder_id = ladder_id
    where id = caller;
  end if;

  perform private.settle_default_ladder(caller);

  return ladder_id;
end;
$$;

revoke all on function public.create_ladder(text, boolean) from public, anon;
grant execute on function public.create_ladder(text, boolean) to authenticated;

drop function public.join_ladder(text);

create function public.join_ladder(p_share_token text, p_make_default boolean default false)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  target_ladder uuid;
  policy public.join_policy;
  starting integer;
  existing_status public.ladder_member_status;
begin
  if caller is null then
    raise exception 'Sign in before joining a Ladder'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = caller) then
    raise exception 'Create a profile before joining a Ladder'
      using errcode = 'P0002';
  end if;

  select l.id, l.join_policy
  into target_ladder, policy
  from public.ladders l
  where l.share_token = upper(btrim(p_share_token));

  if target_ladder is null then
    raise exception 'No Ladder matches this Share link'
      using errcode = 'P0002';
  end if;

  if policy is distinct from 'open' then
    raise exception 'This Ladder is not open to join'
      using errcode = '42501';
  end if;

  select lm.status
  into existing_status
  from public.ladder_members lm
  where lm.ladder_id = target_ladder
    and lm.user_id = caller;

  if existing_status = 'removed' then
    raise exception 'A Removed Ladder member cannot rejoin from the Share link'
      using errcode = '42501';
  elsif existing_status = 'left' then
    update public.ladder_members
    set
      status = 'active',
      joined_at = now()
    where ladder_id = target_ladder
      and user_id = caller;
  elsif existing_status is null then
    select constants.starting_rating into starting
    from public.rating_constants() as constants;

    insert into public.ladder_members (
      ladder_id,
      user_id,
      role,
      status,
      rating,
      rated_match_count
    )
    values (target_ladder, caller, 'player', 'active', starting, 0);
  end if;

  if p_make_default then
    update public.profiles
    set default_ladder_id = target_ladder
    where id = caller;
  end if;

  perform private.settle_default_ladder(caller);

  return 'joined';
end;
$$;

revoke all on function public.join_ladder(text, boolean) from public, anon;
grant execute on function public.join_ladder(text, boolean) to authenticated;

create or replace function public.leave_ladder(p_ladder_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  updated integer;
begin
  if caller is null then
    raise exception 'Sign in before leaving a Ladder'
      using errcode = '42501';
  end if;

  update public.ladder_members
  set status = 'left'
  where ladder_id = p_ladder_id
    and user_id = caller
    and status = 'active';

  get diagnostics updated = row_count;
  if updated = 0 then
    raise exception 'You need to be an active Ladder member to leave'
      using errcode = '42501';
  end if;

  perform private.settle_default_ladder(caller);
end;
$$;

create or replace function public.remove_ladder_member(p_ladder_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_ladder uuid;
  target_status public.ladder_member_status;
  target_user uuid;
begin
  select ladder_id, status, user_id
  into target_ladder, target_status, target_user
  from public.ladder_members
  where id = p_ladder_member_id;

  if target_ladder is null then
    raise exception 'No Ladder member matches that id'
      using errcode = 'P0002';
  end if;

  if not private.caller_is_active_ladder_admin(target_ladder) then
    raise exception 'You need to be an active Admin of this Ladder'
      using errcode = '42501';
  end if;

  if target_status is distinct from 'active' then
    raise exception 'Only an active Ladder member can be Removed'
      using errcode = '22023';
  end if;

  update public.ladder_members
  set status = 'removed'
  where id = p_ladder_member_id;

  if target_user is not null then
    perform private.settle_default_ladder(target_user);
  end if;
end;
$$;

create or replace function public.reinstate_ladder_member(p_ladder_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_ladder uuid;
  target_status public.ladder_member_status;
  target_user uuid;
begin
  select ladder_id, status, user_id
  into target_ladder, target_status, target_user
  from public.ladder_members
  where id = p_ladder_member_id;

  if target_ladder is null then
    raise exception 'No Ladder member matches that id'
      using errcode = 'P0002';
  end if;

  if not private.caller_is_active_ladder_admin(target_ladder) then
    raise exception 'You need to be an active Admin of this Ladder'
      using errcode = '42501';
  end if;

  if target_status is distinct from 'removed' then
    raise exception 'Only a Removed Ladder member can be reinstated'
      using errcode = '22023';
  end if;

  update public.ladder_members
  set status = 'active'
  where id = p_ladder_member_id;

  if target_user is not null then
    perform private.settle_default_ladder(target_user);
  end if;
end;
$$;

create or replace function public.delete_ladder(p_ladder_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  deleted integer;
  member_users uuid[];
  member_user uuid;
begin
  if caller is null then
    raise exception 'Sign in before deleting a Ladder'
      using errcode = '42501';
  end if;

  if not private.caller_is_super_admin() then
    raise exception 'Only the super admin can delete a Ladder'
      using errcode = '42501';
  end if;

  select coalesce(array_agg(distinct lm.user_id), '{}')
  into member_users
  from public.ladder_members lm
  where lm.ladder_id = p_ladder_id
    and lm.user_id is not null;

  delete from public.ladders
  where id = p_ladder_id;

  get diagnostics deleted = row_count;
  if deleted = 0 then
    raise exception 'No Ladder matches that id'
      using errcode = 'P0002';
  end if;

  foreach member_user in array member_users loop
    perform private.settle_default_ladder(member_user);
  end loop;
end;
$$;

do $$
declare
  profile_id uuid;
begin
  for profile_id in select id from public.profiles loop
    perform private.settle_default_ladder(profile_id);
  end loop;
end;
$$;
