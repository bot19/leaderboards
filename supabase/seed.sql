-- Local fixtures only. supabase db reset loads this after migrations.
-- Ratings are left at the starting Rating, then private.replay_ladder fills them.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
select
  '00000000-0000-0000-0000-000000000000',
  people.id,
  'authenticated',
  'authenticated',
  people.email,
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
from (
  values
    ('11111111-1111-4111-8111-111111111101'::uuid, 'sam@example.com'),
    ('11111111-1111-4111-8111-111111111102'::uuid, 'alex@example.com'),
    ('11111111-1111-4111-8111-111111111103'::uuid, 'jamie@example.com'),
    ('11111111-1111-4111-8111-111111111104'::uuid, 'jordan@example.com'),
    ('11111111-1111-4111-8111-111111111105'::uuid, 'taylor@example.com'),
    ('11111111-1111-4111-8111-111111111106'::uuid, 'morgan@example.com'),
    ('11111111-1111-4111-8111-111111111107'::uuid, 'riley@example.com'),
    ('11111111-1111-4111-8111-111111111108'::uuid, 'casey@example.com')
) as people (id, email);

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  people.id,
  people.id,
  jsonb_build_object(
    'sub', people.id::text,
    'email', people.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  people.id::text,
  now(),
  now(),
  now()
from (
  values
    ('11111111-1111-4111-8111-111111111101'::uuid, 'sam@example.com'),
    ('11111111-1111-4111-8111-111111111102'::uuid, 'alex@example.com'),
    ('11111111-1111-4111-8111-111111111103'::uuid, 'jamie@example.com'),
    ('11111111-1111-4111-8111-111111111104'::uuid, 'jordan@example.com'),
    ('11111111-1111-4111-8111-111111111105'::uuid, 'taylor@example.com'),
    ('11111111-1111-4111-8111-111111111106'::uuid, 'morgan@example.com'),
    ('11111111-1111-4111-8111-111111111107'::uuid, 'riley@example.com'),
    ('11111111-1111-4111-8111-111111111108'::uuid, 'casey@example.com')
) as people (id, email);

insert into public.profiles (id, display_name, is_super_admin)
select people.id, people.display_name, people.is_super_admin
from (
  values
    ('11111111-1111-4111-8111-111111111101'::uuid, 'Sam', true),
    ('11111111-1111-4111-8111-111111111102'::uuid, 'Alex', false),
    ('11111111-1111-4111-8111-111111111103'::uuid, 'Jamie', false),
    ('11111111-1111-4111-8111-111111111104'::uuid, 'Jordan', false),
    ('11111111-1111-4111-8111-111111111105'::uuid, 'Taylor', false),
    ('11111111-1111-4111-8111-111111111106'::uuid, 'Morgan', false),
    ('11111111-1111-4111-8111-111111111107'::uuid, 'Riley', false),
    ('11111111-1111-4111-8111-111111111108'::uuid, 'Casey', false)
) as people (id, display_name, is_super_admin);

insert into public.games (id, name, draws_allowed, largest_side)
values ('22222222-2222-4222-8222-222222222201', 'table tennis', false, 2);

insert into public.ladders (id, name, game_id, share_token, join_policy, created_at)
values
  (
    '33333333-3333-4333-8333-333333333301',
    'Friday pool',
    (select id from public.games where name = 'pool'),
    'FRIDAY',
    'open',
    now() - interval '60 days'
  ),
  (
    '33333333-3333-4333-8333-333333333302',
    'Lunch table tennis',
    '22222222-2222-4222-8222-222222222201',
    'LUNCH1',
    'open',
    now() - interval '1 day'
  );

insert into public.ladder_members (
  id,
  ladder_id,
  user_id,
  role,
  status,
  rating,
  rated_match_count,
  joined_at
)
select
  members.id,
  members.ladder_id,
  members.user_id,
  members.role::public.ladder_role,
  members.status::public.ladder_member_status,
  constants.starting_rating,
  0,
  members.joined_at
from (
  values
    -- Friday pool. joined_at is old so Inactive follows last Match, not the join.
    ('44444444-4444-4444-8444-444444444401'::uuid, '33333333-3333-4333-8333-333333333301'::uuid, '11111111-1111-4111-8111-111111111101'::uuid, 'admin', 'active', now() - interval '50 days'),
    ('44444444-4444-4444-8444-444444444402'::uuid, '33333333-3333-4333-8333-333333333301'::uuid, '11111111-1111-4111-8111-111111111102'::uuid, 'player', 'active', now() - interval '50 days'),
    ('44444444-4444-4444-8444-444444444403'::uuid, '33333333-3333-4333-8333-333333333301'::uuid, '11111111-1111-4111-8111-111111111104'::uuid, 'player', 'active', now() - interval '50 days'),
    ('44444444-4444-4444-8444-444444444404'::uuid, '33333333-3333-4333-8333-333333333301'::uuid, '11111111-1111-4111-8111-111111111105'::uuid, 'player', 'active', now() - interval '50 days'),
    ('44444444-4444-4444-8444-444444444405'::uuid, '33333333-3333-4333-8333-333333333301'::uuid, '11111111-1111-4111-8111-111111111106'::uuid, 'player', 'active', now() - interval '50 days'),
    ('44444444-4444-4444-8444-444444444406'::uuid, '33333333-3333-4333-8333-333333333301'::uuid, '11111111-1111-4111-8111-111111111107'::uuid, 'player', 'left', now() - interval '50 days'),
    ('44444444-4444-4444-8444-444444444407'::uuid, '33333333-3333-4333-8333-333333333301'::uuid, '11111111-1111-4111-8111-111111111108'::uuid, 'player', 'removed', now() - interval '50 days'),
    -- Lunch table tennis. No Matches, so a recent join keeps them on the Leaderboard.
    ('44444444-4444-4444-8444-444444444411'::uuid, '33333333-3333-4333-8333-333333333302'::uuid, '11111111-1111-4111-8111-111111111101'::uuid, 'admin', 'active', now()),
    ('44444444-4444-4444-8444-444444444412'::uuid, '33333333-3333-4333-8333-333333333302'::uuid, '11111111-1111-4111-8111-111111111102'::uuid, 'player', 'active', now())
) as members (id, ladder_id, user_id, role, status, joined_at)
cross join public.rating_constants() as constants;

create function pg_temp.seed_match(
  p_id uuid,
  p_ladder_id uuid,
  p_status public.match_status,
  p_result public.match_result,
  p_notes text,
  p_recorded_by uuid,
  p_side_a uuid[],
  p_side_b uuid[],
  p_recorded_at timestamptz,
  p_confirmed_at timestamptz,
  p_voided_by uuid,
  p_voided_at timestamptz,
  p_void_kind public.match_void_kind
)
returns void
language plpgsql
as $$
declare
  player_id uuid;
  member_id uuid;
begin
  insert into public.matches (
    id,
    ladder_id,
    status,
    result,
    notes,
    recorded_by,
    recorded_at,
    confirmed_at,
    voided_by,
    voided_at,
    void_kind
  )
  values (
    p_id,
    p_ladder_id,
    p_status,
    p_result,
    p_notes,
    p_recorded_by,
    p_recorded_at,
    p_confirmed_at,
    p_voided_by,
    p_voided_at,
    p_void_kind
  );

  foreach player_id in array p_side_a loop
    select ladder_members.id
      into member_id
    from public.ladder_members
    where ladder_members.ladder_id = p_ladder_id
      and ladder_members.user_id = player_id;

    insert into public.participants (match_id, ladder_member_id, side)
    values (p_id, member_id, 'a');
  end loop;

  foreach player_id in array p_side_b loop
    select ladder_members.id
      into member_id
    from public.ladder_members
    where ladder_members.ladder_id = p_ladder_id
      and ladder_members.user_id = player_id;

    insert into public.participants (match_id, ladder_member_id, side)
    values (p_id, member_id, 'b');
  end loop;
end;
$$;

do $$
declare
  friday uuid := '33333333-3333-4333-8333-333333333301';
  sam uuid := '11111111-1111-4111-8111-111111111101';
  alex uuid := '11111111-1111-4111-8111-111111111102';
  jordan uuid := '11111111-1111-4111-8111-111111111104';
  taylor uuid := '11111111-1111-4111-8111-111111111105';
  morgan uuid := '11111111-1111-4111-8111-111111111106';
  riley uuid := '11111111-1111-4111-8111-111111111107';
  casey uuid := '11111111-1111-4111-8111-111111111108';
begin
  -- Morgan's only Match is 45 days ago, so they are Inactive.
  perform pg_temp.seed_match(
    '55555555-5555-4555-8555-555555555501', friday, 'confirmed', 'side_a_won', null,
    morgan, array[morgan], array[jordan],
    now() - interval '45 days', now() - interval '45 days', null, null, null
  );

  -- Fifteen Confirmed Matches across the last 40 days. Taylor plays two, so they stay Provisional.
  perform pg_temp.seed_match(
    '55555555-5555-4555-8555-555555555502', friday, 'confirmed', 'side_a_won', 'Break and run',
    sam, array[sam], array[alex],
    now() - interval '39 days', now() - interval '39 days', null, null, null
  );
  perform pg_temp.seed_match(
    '55555555-5555-4555-8555-555555555503', friday, 'confirmed', 'side_a_won', null,
    alex, array[alex], array[jordan],
    now() - interval '37 days', now() - interval '37 days', null, null, null
  );
  perform pg_temp.seed_match(
    '55555555-5555-4555-8555-555555555504', friday, 'confirmed', 'side_a_won', null,
    jordan, array[jordan], array[sam],
    now() - interval '35 days', now() - interval '35 days', null, null, null
  );
  perform pg_temp.seed_match(
    '55555555-5555-4555-8555-555555555505', friday, 'confirmed', 'side_a_won', 'To the black',
    sam, array[sam], array[jordan],
    now() - interval '33 days', now() - interval '33 days', null, null, null
  );
  perform pg_temp.seed_match(
    '55555555-5555-4555-8555-555555555506', friday, 'confirmed', 'side_a_won', null,
    alex, array[alex], array[sam],
    now() - interval '31 days', now() - interval '31 days', null, null, null
  );
  perform pg_temp.seed_match(
    '55555555-5555-4555-8555-555555555507', friday, 'confirmed', 'side_a_won', null,
    jordan, array[jordan], array[alex],
    now() - interval '27 days', now() - interval '27 days', null, null, null
  );
  perform pg_temp.seed_match(
    '55555555-5555-4555-8555-555555555508', friday, 'confirmed', 'side_a_won', null,
    sam, array[sam], array[alex],
    now() - interval '24 days', now() - interval '24 days', null, null, null
  );
  perform pg_temp.seed_match(
    '55555555-5555-4555-8555-555555555509', friday, 'confirmed', 'side_a_won', null,
    sam, array[sam, alex], array[jordan, taylor],
    now() - interval '22 days', now() - interval '22 days', null, null, null
  );
  perform pg_temp.seed_match(
    '55555555-5555-4555-8555-555555555510', friday, 'confirmed', 'side_a_won', 'Last frame before leaving',
    riley, array[riley], array[sam],
    now() - interval '20 days', now() - interval '20 days', null, null, null
  );
  perform pg_temp.seed_match(
    '55555555-5555-4555-8555-555555555511', friday, 'confirmed', 'side_a_won', null,
    alex, array[alex], array[casey],
    now() - interval '18 days', now() - interval '18 days', null, null, null
  );
  perform pg_temp.seed_match(
    '55555555-5555-4555-8555-555555555512', friday, 'confirmed', 'side_a_won', null,
    jordan, array[jordan], array[sam],
    now() - interval '16 days', now() - interval '16 days', null, null, null
  );
  perform pg_temp.seed_match(
    '55555555-5555-4555-8555-555555555513', friday, 'confirmed', 'side_a_won', null,
    sam, array[sam], array[alex],
    now() - interval '14 days', now() - interval '14 days', null, null, null
  );
  perform pg_temp.seed_match(
    '55555555-5555-4555-8555-555555555514', friday, 'confirmed', 'side_a_won', null,
    jordan, array[jordan, sam], array[alex, taylor],
    now() - interval '12 days', now() - interval '12 days', null, null, null
  );
  perform pg_temp.seed_match(
    '55555555-5555-4555-8555-555555555515', friday, 'confirmed', 'draw', null,
    alex, array[alex], array[jordan],
    now() - interval '8 days', now() - interval '8 days', null, null, null
  );
  perform pg_temp.seed_match(
    '55555555-5555-4555-8555-555555555516', friday, 'confirmed', 'side_a_won', null,
    jordan, array[jordan], array[sam],
    now() - interval '2 days', now() - interval '2 days', null, null, null
  );

  -- Confirmed, then voided by Sam. Replay skips it.
  perform pg_temp.seed_match(
    '55555555-5555-4555-8555-555555555517', friday, 'voided', 'side_b_won', null,
    alex, array[alex], array[sam],
    now() - interval '6 days', now() - interval '6 days', sam, now() - interval '5 days', 'admin'
  );

  -- Rejected while Pending. The opposing Side voided it.
  perform pg_temp.seed_match(
    '55555555-5555-4555-8555-555555555518', friday, 'voided', 'side_a_won', null,
    sam, array[sam], array[jordan],
    now() - interval '4 days', null, jordan, now() - interval '3 days', 'rejected'
  );

  -- Pending within the Confirmation window. Alex and Sam each have one waiting.
  perform pg_temp.seed_match(
    '55555555-5555-4555-8555-555555555519', friday, 'pending', 'side_a_won', null,
    jordan, array[jordan], array[alex],
    now() - interval '10 minutes', null, null, null, null
  );
  perform pg_temp.seed_match(
    '55555555-5555-4555-8555-555555555520', friday, 'pending', 'side_a_won', null,
    alex, array[alex], array[sam],
    now() - interval '5 minutes', null, null, null, null
  );
end;
$$;

select private.replay_ladder('33333333-3333-4333-8333-333333333301');
select private.replay_ladder('33333333-3333-4333-8333-333333333302');

-- Seed rows are inserted after the migration backfill, so settle them here.
do $$
declare
  profile_id uuid;
begin
  for profile_id in select id from public.profiles loop
    perform private.settle_default_ladder(profile_id);
  end loop;
end;
$$;
