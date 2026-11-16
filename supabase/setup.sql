-- The Liora List (Lite) – one-off database setup
-- Paste this whole file into Supabase: SQL Editor -> New query -> Run.
-- Safe to run more than once.

-- ---------------------------------------------------------------
-- People (one row per single)
-- ---------------------------------------------------------------
create table if not exists public.people (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  first_name       text not null,
  surname          text not null,
  gender           text not null check (gender in ('male', 'female')),
  date_of_birth    date,
  birth_year       smallint check (birth_year between 1900 and 2100),
  approx_age       smallint check (approx_age between 15 and 120),
  country          text,
  city             text,
  area             text,
  height_cm        smallint check (height_cm between 100 and 230),
  religious_level  smallint,
  kosher_level     smallint,
  community        text[],
  status           text not null default 'Available'
                   check (status in ('Available','Redt','Researching','Dating','On hold','Engaged','Married','Withdrawn')),
  phone            text,
  email            text,
  contact_who      text check (contact_who in ('single','mother','father','other')),
  contact_name     text,
  contact_phone    text,
  contact_email    text,
  description      text,
  looking_for      text,
  private_notes    text,
  photo_path       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists people_owner_idx on public.people (owner_id);

-- Religious level (1 Not religious … 4 Fully religious), kosher level (1 … 4)
-- and community "type" tick boxes. Written so re-running upgrades an older copy.
alter table public.people add column if not exists kosher_level smallint;
alter table public.people add column if not exists community text[];
alter table public.people add column if not exists instagram text;
alter table public.people add column if not exists linkedin text;
-- What they're looking for (used for Possible matches)
alter table public.people add column if not exists pref_age_min smallint;
alter table public.people add column if not exists pref_age_max smallint;
alter table public.people add column if not exists pref_religious smallint[];
alter table public.people add column if not exists pref_kosher smallint[];
alter table public.people add column if not exists pref_community text[];
alter table public.people add column if not exists pref_countries text[];
alter table public.people add column if not exists pref_anywhere boolean not null default false;
alter table public.people drop constraint if exists people_religious_level_check;
update public.people set religious_level = 4 where religious_level > 4;
alter table public.people add constraint people_religious_level_check check (religious_level between 1 and 4);
alter table public.people drop constraint if exists people_kosher_level_check;
alter table public.people add constraint people_kosher_level_check check (kosher_level between 1 and 4);
alter table public.people drop constraint if exists people_community_check;
alter table public.people add constraint people_community_check check (
  community <@ array['sephardi','ashkenazi','mizrachi','yemeni','gruzini','chareidi','chabad','other']::text[]
);

-- ---------------------------------------------------------------
-- Ideas ("maybe X for Y")
-- ---------------------------------------------------------------
create table if not exists public.ideas (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  person_a    uuid references public.people(id) on delete set null,
  person_b    uuid references public.people(id) on delete set null,
  note        text,
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists ideas_owner_idx on public.ideas (owner_id);

-- Keep "last updated" accurate
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists people_touch on public.people;
create trigger people_touch before update on public.people
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------
-- Security: every row is visible only to the account that owns it
-- ---------------------------------------------------------------
alter table public.people enable row level security;
alter table public.ideas  enable row level security;

drop policy if exists "owner only" on public.people;
create policy "owner only" on public.people
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "owner only" on public.ideas;
create policy "owner only" on public.ideas
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

revoke all on public.people from anon;
revoke all on public.ideas  from anon;

-- ---------------------------------------------------------------
-- Photos: private bucket, each file stored under the owner's own folder
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg'];

drop policy if exists "photos owner only" on storage.objects;
create policy "photos owner only" on storage.objects
  for all to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------
-- Keep-alive: a twice-weekly GitHub job calls this so the free
-- project never pauses. It returns 1 and reads no data.
-- ---------------------------------------------------------------
create or replace function public.keepalive()
returns integer language sql stable as $$ select 1 $$;

revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
