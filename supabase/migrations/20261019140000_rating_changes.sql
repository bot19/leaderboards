-- Tunable rating constants. Later tickets read this function; it touches no tables.
create or replace function public.rating_constants()
returns table (
  starting_rating integer,
  k_factor integer,
  provisional_k_factor integer,
  provisional_threshold integer
)
language sql
immutable
set search_path = ''
as $$
  select 1000, 32, 64, 5;
$$;

revoke all on function public.rating_constants() from public, anon, authenticated;

-- Rating changes for one Result. Reads and writes no tables.
create or replace function public.rating_changes(
  p_side_a jsonb,
  p_side_b jsonb,
  p_result text
)
returns table (
  participant_key text,
  rating_change numeric
)
language plpgsql
immutable
set search_path = ''
as $$
declare
  side_a_rating numeric;
  side_b_rating numeric;
  expected_a numeric;
  actual_a numeric;
  k_factor integer;
  provisional_k integer;
  provisional_threshold integer;
  participant record;
  k integer;
  actual numeric;
  expected numeric;
begin
  select
    constants.k_factor,
    constants.provisional_k_factor,
    constants.provisional_threshold
    into k_factor, provisional_k, provisional_threshold
  from public.rating_constants() as constants;

  select avg((elem->>'rating')::numeric)
    into side_a_rating
  from jsonb_array_elements(p_side_a) as elem;

  select avg((elem->>'rating')::numeric)
    into side_b_rating
  from jsonb_array_elements(p_side_b) as elem;

  expected_a := 1 / (1 + power(10::numeric, (side_b_rating - side_a_rating) / 400));

  actual_a := case p_result
    when 'side_a_won' then 1
    when 'side_b_won' then 0
    when 'draw' then 0.5
    else null
  end;

  if actual_a is null then
    raise exception 'Result must be side_a_won, side_b_won, or draw'
      using errcode = '22023';
  end if;

  for participant in
    select elem, side, ord
    from (
      select elem, 'a' as side, ord
      from jsonb_array_elements(p_side_a) with ordinality as side_a(elem, ord)
      union all
      select elem, 'b' as side, ord
      from jsonb_array_elements(p_side_b) with ordinality as side_b(elem, ord)
    ) as participants
    order by side, ord
  loop
    k := case
      when (participant.elem->>'rated_match_count')::integer < provisional_threshold
        then provisional_k
      else k_factor
    end;
    actual := case when participant.side = 'a' then actual_a else 1 - actual_a end;
    expected := case when participant.side = 'a' then expected_a else 1 - expected_a end;
    participant_key := participant.elem->>'key';
    rating_change := k * (actual - expected);
    return next;
  end loop;
end;
$$;

revoke all on function public.rating_changes(jsonb, jsonb, text) from public, anon, authenticated;
