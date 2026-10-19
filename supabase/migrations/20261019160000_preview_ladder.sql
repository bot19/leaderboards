-- Preview by Share link token. The only read a non-member can make.

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
  where l.share_token = p_share_token;

  if result is null then
    raise exception 'No Ladder matches this Share link'
      using errcode = 'P0002';
  end if;

  return result;
end;
$$;

revoke all on function public.preview_ladder(text) from public, anon;
grant execute on function public.preview_ladder(text) to anon, authenticated;
