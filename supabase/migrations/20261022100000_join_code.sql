-- Join code: the Share link token becomes a 6-character code.
-- Existing tokens are replaced. Share links sent before this migration stop working.

create or replace function private.gen_join_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(
    substr(
      '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      (floor(random() * 35) + 1)::int,
      1
    ),
    ''
  )
  from generate_series(1, 6);
$$;

revoke all on function private.gen_join_code() from public, anon, authenticated;

create or replace function private.backfill_join_codes()
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  ladder_row record;
  attempts integer;
  new_code text;
begin
  for ladder_row in
    select id
    from public.ladders
    where share_token !~ '^[1-9A-Z]{6}$'
  loop
    attempts := 0;
    loop
      attempts := attempts + 1;
      new_code := private.gen_join_code();
      begin
        update public.ladders
        set share_token = new_code
        where id = ladder_row.id;
        exit;
      exception
        when unique_violation then
          if attempts >= 8 then
            raise;
          end if;
      end;
    end loop;
  end loop;
end;
$$;

revoke all on function private.backfill_join_codes() from public, anon, authenticated;

create or replace function public.create_ladder(p_name text)
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

  return ladder_id;
end;
$$;

select private.backfill_join_codes();

alter table public.ladders
  add constraint ladders_share_token_format
  check (share_token ~ '^[1-9A-Z]{6}$');

create or replace function public.preview_ladder(p_share_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'name', l.name,
    'game_name', g.name,
    'member_count', (
      select count(*)::int
      from public.ladder_members lm
      where lm.ladder_id = l.id
    )
  )
  into result
  from public.ladders l
  join public.games g on g.id = l.game_id
  where l.share_token = upper(btrim(p_share_token));

  if result is null then
    raise exception 'No Ladder matches this Share link'
      using errcode = 'P0002';
  end if;

  return result;
end;
$$;

revoke all on function public.preview_ladder(text) from public, anon;
grant execute on function public.preview_ladder(text) to authenticated;

create or replace function public.join_ladder(p_share_token text)
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

  return 'joined';
end;
$$;
