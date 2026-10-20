-- A Left Ladder member becomes active again and keeps their Rating.

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
  where l.share_token = p_share_token;

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

  if existing_status = 'left' then
    update public.ladder_members
    set status = 'active'
    where ladder_id = target_ladder
      and user_id = caller;
  else
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
