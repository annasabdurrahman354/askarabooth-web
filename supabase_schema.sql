-- =============================================================================
-- Photobooth OS — Complete Supabase Migration
-- Run this entire file in the Supabase SQL Editor (Database > SQL Editor)
-- =============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


-- =============================================================================
-- DROP EXISTING TABLES & FUNCTIONS (clean slate)
-- =============================================================================
drop table if exists public.captures  cascade;
drop table if exists public.sessions  cascade;
drop table if exists public.stickers  cascade;
drop table if exists public.templates cascade;
drop table if exists public.booths    cascade;
drop table if exists public.profiles  cascade;
drop table if exists public.tenants   cascade;

drop function if exists public.is_superadmin() cascade;
drop function if exists public.get_my_tenant_id() cascade;


-- =============================================================================
-- PHASE 1: CREATE ALL TABLES
-- =============================================================================

-- 1. TENANTS
create table public.tenants (
  id         uuid        default uuid_generate_v4() primary key,
  name       text        not null,
  plan       text        not null default 'free',   -- 'free' | 'pro' | 'enterprise'
  status     text        not null default 'active', -- 'active' | 'suspended'
  created_at timestamptz default timezone('utc', now()) not null
);

alter table public.tenants enable row level security;

-- 2. PROFILES
create table public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  email      text        not null,
  role       text        not null default 'owner', -- 'superadmin' | 'owner'
  tenant_id  uuid        references public.tenants(id) on delete set null,
  created_at timestamptz default timezone('utc', now()) not null
);

alter table public.profiles enable row level security;

-- 3. BOOTHS
create table public.booths (
  id                 uuid        default uuid_generate_v4() primary key,
  tenant_id          uuid        not null references public.tenants(id) on delete cascade,
  name               text        not null,
  status             text        not null default 'offline',
  current_session_id uuid,
  created_at         timestamptz default timezone('utc', now()) not null
);

alter table public.booths enable row level security;

-- 4. TEMPLATES
create table public.templates (
  id            uuid        default uuid_generate_v4() primary key,
  tenant_id     uuid        not null references public.tenants(id) on delete cascade,
  name          text        not null,
  html_content  text,
  css_content   text,
  layout_json   text,
  thumbnail_url text,
  created_at    timestamptz default timezone('utc', now()) not null
);

alter table public.templates enable row level security;

-- 5. SESSIONS
create table public.sessions (
  id              uuid        default uuid_generate_v4() primary key,
  booth_id        uuid        not null references public.booths(id) on delete cascade,
  template_id     uuid        not null references public.templates(id) on delete restrict,
  status          text        not null default 'idle',
  share_token     text        not null unique,
  final_image_url text,
  created_at      timestamptz default timezone('utc', now()) not null
);

alter table public.sessions enable row level security;

-- 6. CAPTURES
create table public.captures (
  id             uuid        default uuid_generate_v4() primary key,
  session_id     uuid        not null references public.sessions(id) on delete cascade,
  photo_url      text        not null,
  capture_index  integer     not null,
  created_at     timestamptz default timezone('utc', now()) not null
);

alter table public.captures enable row level security;

-- 7. STICKERS
create table public.stickers (
  id         uuid        default uuid_generate_v4() primary key,
  tenant_id  uuid        references public.tenants(id) on delete cascade,
  name       text        not null,
  url        text        not null,
  created_at timestamptz default timezone('utc', now()) not null
);

alter table public.stickers enable row level security;


-- =============================================================================
-- PHASE 2: SECURITY HELPER FUNCTIONS
-- Using SECURITY DEFINER to bypass RLS recursion.
-- =============================================================================

-- Check if current user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT tenant_id FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- PHASE 3: RLS POLICIES
-- =============================================================================

-- Tenants
create policy "Superadmins full access to tenants"
  on public.tenants for all
  using (public.is_superadmin());

create policy "Owners can view their own tenant"
  on public.tenants for select
  using (id = public.get_my_tenant_id());

-- Profiles (Fixed Recursion)
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Superadmins can read all profiles"
  on public.profiles for select
  using (public.is_superadmin());

create policy "Allow profile insert on signup"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Superadmins can update all profiles"
  on public.profiles for update
  using (public.is_superadmin());

-- Booths
create policy "Tenant users can view own booths"
  on public.booths for select
  using (
    tenant_id = public.get_my_tenant_id()
    or public.is_superadmin()
  );

create policy "Tenant users can manage own booths"
  on public.booths for all
  using (tenant_id = public.get_my_tenant_id());

create policy "Superadmins can manage all booths"
  on public.booths for all
  using (public.is_superadmin());

-- Templates
create policy "Tenant users can view own templates"
  on public.templates for select
  using (
    tenant_id = public.get_my_tenant_id()
    or public.is_superadmin()
  );

create policy "Tenant users can manage own templates"
  on public.templates for all
  using (tenant_id = public.get_my_tenant_id());

create policy "Superadmins can manage all templates"
  on public.templates for all
  using (public.is_superadmin());

-- Sessions
create policy "Tenant users can view own sessions"
  on public.sessions for select
  using (
    exists (
      select 1 from public.booths
      where id = booth_id and tenant_id = public.get_my_tenant_id()
    )
    or public.is_superadmin()
  );

create policy "Tenant users can manage own sessions"
  on public.sessions for all
  using (
    exists (
      select 1 from public.booths
      where id = booth_id and tenant_id = public.get_my_tenant_id()
    )
  );

create policy "Public can read any session"
  on public.sessions for select
  using (true);

-- Captures
create policy "Tenant users can view own captures"
  on public.captures for select
  using (
    exists (
      select 1 from public.sessions s
      join public.booths b on b.id = s.booth_id
      where s.id = session_id and b.tenant_id = public.get_my_tenant_id()
    )
    or public.is_superadmin()
  );

create policy "Tenant users can manage own captures"
  on public.captures for all
  using (
    exists (
      select 1 from public.sessions s
      join public.booths b on b.id = s.booth_id
      where s.id = session_id and b.tenant_id = public.get_my_tenant_id()
    )
  );

create policy "Public can read any capture"
  on public.captures for select
  using (true);

-- Stickers
create policy "Anyone can read global or their own tenant stickers"
  on public.stickers for select
  using (
    tenant_id is null
    or tenant_id = public.get_my_tenant_id()
    or public.is_superadmin()
  );

create policy "Tenant users can manage own stickers"
  on public.stickers for all
  using (tenant_id = public.get_my_tenant_id());

create policy "Superadmins can manage all stickers"
  on public.stickers for all
  using (public.is_superadmin());


-- =============================================================================
-- PHASE 4: SEED DATA & STORAGE
-- =============================================================================

insert into public.stickers (name, url) values
  ('Shape 1',  'https://api.dicebear.com/7.x/shapes/svg?seed=Felix'),
  ('Shape 2',  'https://api.dicebear.com/7.x/shapes/svg?seed=Zoe'),
  ('Shape 3',  'https://api.dicebear.com/7.x/shapes/svg?seed=Luna'),
  ('Heart',    'https://api.dicebear.com/7.x/icons/svg?seed=Heart&icon=heart'),
  ('Star',     'https://api.dicebear.com/7.x/icons/svg?seed=Star&icon=star'),
  ('Smile',    'https://api.dicebear.com/7.x/icons/svg?seed=Smile&icon=emoji-smile'),
  ('Camera',   'https://api.dicebear.com/7.x/icons/svg?seed=Camera&icon=camera'),
  ('Balloon',  'https://api.dicebear.com/7.x/shapes/svg?seed=balloon'),
  ('Confetti', 'https://api.dicebear.com/7.x/shapes/svg?seed=confetti');

insert into storage.buckets (id, name, public) values
  ('captures',  'captures',  true),
  ('renders',   'renders',   true),
  ('templates', 'templates', true),
  ('stickers',  'stickers',  true)
on conflict do nothing;

create policy "Public read captures"  on storage.objects for select using (bucket_id = 'captures');
create policy "Public read renders"   on storage.objects for select using (bucket_id = 'renders');
create policy "Public read templates" on storage.objects for select using (bucket_id = 'templates');
create policy "Public read stickers"  on storage.objects for select using (bucket_id = 'stickers');

create policy "Authenticated upload captures"
  on storage.objects for insert
  with check (bucket_id = 'captures' and auth.role() = 'authenticated');

create policy "Authenticated upload renders"
  on storage.objects for insert
  with check (bucket_id = 'renders' and auth.role() = 'authenticated');

create policy "Authenticated upload templates"
  on storage.objects for insert
  with check (bucket_id = 'templates' and auth.role() = 'authenticated');

create policy "Authenticated upload stickers"
  on storage.objects for insert
  with check (bucket_id = 'stickers' and auth.role() = 'authenticated');

create policy "Authenticated delete stickers"
  on storage.objects for delete
  using (bucket_id = 'stickers' and auth.role() = 'authenticated');


-- =============================================================================
-- PHASE 5: SUPERADMIN SEED
-- =============================================================================

do $$
declare
  v_user_id uuid := '00000000-0000-0000-0000-000000000001';
  v_email   text := 'superadmin@photobooth.app';
begin
  insert into auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    recovery_sent_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change,
    email_change_token_new, recovery_token
  )
  values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', v_email,
    crypt('SuperAdmin123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}', now(), now(), '', '', '', ''
  )
  on conflict (id) do nothing;

  insert into auth.identities (
    id, user_id, provider_id, identity_data,
    provider, last_sign_in_at, created_at, updated_at
  )
  values (
    gen_random_uuid(), v_user_id, v_email,
    json_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  )
  on conflict do nothing;

  insert into public.profiles (id, email, role, tenant_id, created_at)
  values (v_user_id, v_email, 'superadmin', null, now())
  on conflict (id) do nothing;
end $$;
