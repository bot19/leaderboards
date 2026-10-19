-- Leave, remove, reinstate, set Role, and delete Ladder.
-- Admin actions reuse private.caller_is_active_ladder_admin (Admin or super admin).
-- Delete is super admin only. Left and Removed stay on the Ladder for history
-- but drop off the Leaderboard (status filter) and my_ladders (active only).

create or replace view public.my_ladders
with (security_invoker = true) as
select
  l.id,
  l.name,
  g.name as game_name,
  l.created_at
from public.ladder_members lm
join public.ladders l on l.id = lm.ladder_id
join public.games g on g.id = l.game_id
where lm.user_id = (select auth.uid())
  and lm.status = 'active';

revoke all on table public.my_ladders from public, anon, authenticated;
grant select on table public.my_ladders to authenticated;

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
end;
$$;

revoke all on function public.leave_ladder(uuid) from public, anon;
grant execute on function public.leave_ladder(uuid) to authenticated;

create or replace function public.remove_ladder_member(p_ladder_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_ladder uuid;
  target_status public.ladder_member_status;
begin
  select ladder_id, status
  into target_ladder, target_status
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
end;
$$;

revoke all on function public.remove_ladder_member(uuid) from public, anon;
grant execute on function public.remove_ladder_member(uuid) to authenticated;

create or replace function public.reinstate_ladder_member(p_ladder_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_ladder uuid;
  target_status public.ladder_member_status;
begin
  select ladder_id, status
  into target_ladder, target_status
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
end;
$$;

revoke all on function public.reinstate_ladder_member(uuid) from public, anon;
grant execute on function public.reinstate_ladder_member(uuid) to authenticated;

create or replace function public.set_ladder_member_role(
  p_ladder_member_id uuid,
  p_role public.ladder_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_ladder uuid;
  target_status public.ladder_member_status;
begin
  select ladder_id, status
  into target_ladder, target_status
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
    raise exception 'Only an active Ladder member can change Role'
      using errcode = '22023';
  end if;

  update public.ladder_members
  set role = p_role
  where id = p_ladder_member_id;
end;
$$;

revoke all on function public.set_ladder_member_role(uuid, public.ladder_role) from public, anon;
grant execute on function public.set_ladder_member_role(uuid, public.ladder_role) to authenticated;

create or replace function public.delete_ladder(p_ladder_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  deleted integer;
begin
  if caller is null then
    raise exception 'Sign in before deleting a Ladder'
      using errcode = '42501';
  end if;

  if not private.caller_is_super_admin() then
    raise exception 'Only the super admin can delete a Ladder'
      using errcode = '42501';
  end if;

  delete from public.ladders
  where id = p_ladder_id;

  get diagnostics deleted = row_count;
  if deleted = 0 then
    raise exception 'No Ladder matches that id'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_ladder(uuid) from public, anon;
grant execute on function public.delete_ladder(uuid) to authenticated;
