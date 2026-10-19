-- A User's display name and super-admin flag.
-- The super-admin flag is granted only by editing the database directly.
-- No function in this migration accepts or writes that flag.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  is_super_admin boolean not null default false,
  constraint profiles_display_name_not_blank check (char_length(btrim(display_name)) > 0)
);

alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant select, insert, update, delete on table public.profiles to service_role;

create or replace function public.create_profile(p_display_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  cleaned text := btrim(p_display_name);
begin
  if caller is null then
    raise exception 'Sign in before creating a profile'
      using errcode = '42501';
  end if;

  if cleaned is null or char_length(cleaned) = 0 then
    raise exception 'Display name is required'
      using errcode = '22023';
  end if;

  if exists (select 1 from public.profiles where id = caller) then
    raise exception 'You already have a profile'
      using errcode = '23505';
  end if;

  insert into public.profiles (id, display_name)
  values (caller, cleaned);
end;
$$;

revoke all on function public.create_profile(text) from public, anon;
grant execute on function public.create_profile(text) to authenticated;

create or replace function public.update_display_name(p_display_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  cleaned text := btrim(p_display_name);
  updated int;
begin
  if caller is null then
    raise exception 'Sign in before changing your display name'
      using errcode = '42501';
  end if;

  if cleaned is null or char_length(cleaned) = 0 then
    raise exception 'Display name is required'
      using errcode = '22023';
  end if;

  update public.profiles
  set display_name = cleaned
  where id = caller;

  get diagnostics updated = row_count;
  if updated = 0 then
    raise exception 'Create a profile before changing your display name'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.update_display_name(text) from public, anon;
grant execute on function public.update_display_name(text) to authenticated;
