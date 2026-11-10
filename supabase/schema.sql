-- Thiru Senthil Andavan Guest House: initial database and access policies
-- Run this entire file in Supabase Dashboard > SQL Editor.
-- Then create the owner account in Authentication > Users and add its UUID below.

create extension if not exists pgcrypto;

create table if not exists public.owner_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.owner_admins where user_id = auth.uid());
$$;

revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;

create table if not exists public.site_settings (
  id integer primary key check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  room_type text not null default 'Double',
  ac_type text not null default 'Non-AC',
  price numeric(10,2),
  description text not null default '',
  image_url text not null default '',
  is_available boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.attractions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text not null default '',
  image_url text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  phone text not null,
  check_in date,
  check_out date,
  guests text not null default '1',
  room_type text not null default 'Any available room',
  message text not null default '',
  status text not null default 'New' check (status in ('New','Contacted','Confirmed','Closed')),
  created_at timestamptz not null default now()
);

alter table public.owner_admins enable row level security;
alter table public.site_settings enable row level security;
alter table public.rooms enable row level security;
alter table public.facilities enable row level security;
alter table public.attractions enable row level security;
alter table public.enquiries enable row level security;

-- Public visitors may read only published website content.
drop policy if exists "Public can read settings" on public.site_settings;
create policy "Public can read settings" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "Owners manage settings" on public.site_settings;
create policy "Owners manage settings" on public.site_settings for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists "Public read active rooms" on public.rooms;
create policy "Public read active rooms" on public.rooms for select to anon, authenticated using (is_active = true);
drop policy if exists "Owners manage rooms" on public.rooms;
create policy "Owners manage rooms" on public.rooms for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists "Public read active facilities" on public.facilities;
create policy "Public read active facilities" on public.facilities for select to anon, authenticated using (is_active = true);
drop policy if exists "Owners manage facilities" on public.facilities;
create policy "Owners manage facilities" on public.facilities for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists "Public read active attractions" on public.attractions;
create policy "Public read active attractions" on public.attractions for select to anon, authenticated using (is_active = true);
drop policy if exists "Owners manage attractions" on public.attractions;
create policy "Owners manage attractions" on public.attractions for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists "Visitors can submit enquiries" on public.enquiries;
create policy "Visitors can submit enquiries" on public.enquiries for insert to anon, authenticated with check (
  length(trim(guest_name)) between 1 and 100 and
  length(trim(phone)) between 8 and 20 and
  length(coalesce(message,'')) <= 2000
);
drop policy if exists "Owners can read enquiries" on public.enquiries;
create policy "Owners can read enquiries" on public.enquiries for select to authenticated using (public.is_owner());
drop policy if exists "Owners can update enquiries" on public.enquiries;
create policy "Owners can update enquiries" on public.enquiries for update to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists "Owners can delete enquiries" on public.enquiries;
create policy "Owners can delete enquiries" on public.enquiries for delete to authenticated using (public.is_owner());

-- Private owner list: only a signed-in owner can read their own membership row.
drop policy if exists "Owner can read own admin row" on public.owner_admins;
create policy "Owner can read own admin row" on public.owner_admins for select to authenticated using (user_id = auth.uid());

grant select on public.site_settings, public.rooms, public.facilities, public.attractions to anon, authenticated;
grant insert on public.enquiries to anon, authenticated;
grant select, insert, update, delete on public.rooms, public.facilities, public.attractions to authenticated;
grant select, insert, update, delete on public.site_settings to authenticated;
grant select, update, delete on public.enquiries to authenticated;
grant select on public.owner_admins to authenticated;

-- Public read / owner-only upload and delete for lodge photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lodge-photos', 'lodge-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public can view lodge photos" on storage.objects;
create policy "Public can view lodge photos" on storage.objects for select to anon, authenticated using (bucket_id = 'lodge-photos');
drop policy if exists "Owners upload lodge photos" on storage.objects;
create policy "Owners upload lodge photos" on storage.objects for insert to authenticated with check (bucket_id = 'lodge-photos' and public.is_owner());
drop policy if exists "Owners update lodge photos" on storage.objects;
create policy "Owners update lodge photos" on storage.objects for update to authenticated using (bucket_id = 'lodge-photos' and public.is_owner()) with check (bucket_id = 'lodge-photos' and public.is_owner());
drop policy if exists "Owners delete lodge photos" on storage.objects;
create policy "Owners delete lodge photos" on storage.objects for delete to authenticated using (bucket_id = 'lodge-photos' and public.is_owner());

-- Seed the initial settings, verified contact details, and real uploaded room photos.
insert into public.site_settings (id, data) values (1, '{
  "business_name":"Thiru Senthil Andavan Guest House",
  "business_subtitle":"GUEST HOUSE & LODGE SERVICE",
  "tagline":"Comfortable Stay, Warm Hospitality, Affordable Prices.",
  "hero_title":"A comfortable stay in the heart of Srivaikundam",
  "hero_text":"A welcoming place to rest, refresh and feel at ease. Contact us directly for room details and availability.",
  "phone":"9443002130",
  "whatsapp":"9443002130",
  "email":"sethuraman894@gmail.com",
  "address":"10, South Maasi Street, Tuticorin Road, Near Canara Bank, Srivaikundam - 628601",
  "map_url":"https://maps.app.goo.gl/T3eUQ3oikxemLH9X9?g_st=aw",
  "owner_intro":"Contact our owner-managed guest house team for room information and booking enquiries.",
  "hero_image":"/images/lord-murugan-banner.png"
}'::jsonb) on conflict (id) do nothing;

insert into public.rooms (name, room_type, ac_type, description, image_url, is_available, is_active)
select 'Double Bedroom', 'Double', 'Confirm with owner', 'A simple, comfortable room. Contact us for current rates and availability.', '/images/lodge-room-2.png', true, true
where not exists (select 1 from public.rooms);
insert into public.rooms (name, room_type, ac_type, description, image_url, is_available, is_active)
select 'Twin Bed Room', 'Twin', 'Confirm with owner', 'Room shown in the guest house photo gallery. Please enquire about the room configuration.', '/images/lodge-room-1.png', true, true
where (select count(*) from public.rooms) < 2;

insert into public.facilities (name) select v from (values
 ('Comfortable furnished rooms'),
 ('Direct phone and WhatsApp enquiries')
) as x(v) where not exists (select 1 from public.facilities f where f.name=x.v);

insert into public.attractions (title, caption) select 'Srivaikuntam Temple', 'A well-known local place of worship. Confirm visiting details before travelling.'
where not exists (select 1 from public.attractions);
insert into public.attractions (title, caption) select 'Explore Srivaikundam', 'Ask the guest house team for information about nearby places and local travel.'
where (select count(*) from public.attractions) < 2;

-- AFTER creating the owner user in Authentication > Users, replace the UUID below:
-- insert into public.owner_admins (user_id) values ('PASTE-AUTH-USER-UUID-HERE');
