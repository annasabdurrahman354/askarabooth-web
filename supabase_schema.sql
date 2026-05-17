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
  id            uuid        default uuid_generate_v4() primary key,
  name          text        not null,
  plan          text        not null default 'free',   -- 'free' | 'pro' | 'enterprise'
  status        text        not null default 'active', -- 'active' | 'suspended'
  referral_code text        unique,
  created_at    timestamptz default timezone('utc', now()) not null
);

alter table public.tenants enable row level security;

-- 2. PROFILES
create table public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  email      text        not null,
  role       text        not null default 'owner', -- 'superadmin' | 'owner' | 'admin'
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

create policy "Anonymous can update session final image"
  on public.sessions for update
  using (true)
  with check (true);

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

create policy "Anonymous upload renders"
  on storage.objects for insert
  with check (bucket_id = 'renders');

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

-- 1. Sessions: make booth_id nullable, change FK to ON DELETE SET NULL
ALTER TABLE public.sessions ALTER COLUMN booth_id DROP NOT NULL;

-- Drop and recreate the foreign key constraint
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_booth_id_fkey;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_booth_id_fkey
  FOREIGN KEY (booth_id) REFERENCES public.booths(id) ON DELETE SET NULL;

-- 2. Captures: make session_id nullable, change FK to ON DELETE SET NULL
ALTER TABLE public.captures ALTER COLUMN session_id DROP NOT NULL;

ALTER TABLE public.captures DROP CONSTRAINT IF EXISTS captures_session_id_fkey;
ALTER TABLE public.captures ADD CONSTRAINT captures_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;


-- =============================================================================
-- Migration: Add Multi-Tenant Support to Stickers
-- Run this script in the Supabase SQL Editor
-- =============================================================================

-- 1. Add the tenant_id column to the stickers table
ALTER TABLE public.stickers 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Note: Existing stickers will have tenant_id = NULL, making them "Global" stickers.

-- 2. Drop existing RLS policies for stickers
DROP POLICY IF EXISTS "Anyone can read stickers" ON public.stickers;
DROP POLICY IF EXISTS "Superadmins can manage stickers" ON public.stickers;
DROP POLICY IF EXISTS "Anyone can read global or their own tenant stickers" ON public.stickers;
DROP POLICY IF EXISTS "Tenant users can manage own stickers" ON public.stickers;
DROP POLICY IF EXISTS "Superadmins can manage all stickers" ON public.stickers;

-- 3. Create new RLS policies for stickers
CREATE POLICY "Anyone can read global or their own tenant stickers"
  ON public.stickers FOR SELECT
  USING (
    tenant_id IS NULL
    OR tenant_id = public.get_my_tenant_id()
    OR public.is_superadmin()
  );

CREATE POLICY "Tenant users can manage own stickers"
  ON public.stickers FOR ALL
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY "Superadmins can manage all stickers"
  ON public.stickers FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- 4. Create storage bucket for stickers
INSERT INTO storage.buckets (id, name, public) 
VALUES ('stickers', 'stickers', true)
ON CONFLICT DO NOTHING;

-- 5. RLS policies for stickers storage (drop first since they may already exist)
DROP POLICY IF EXISTS "Public read stickers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload stickers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete stickers" ON storage.objects;

CREATE POLICY "Public read stickers" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'stickers');

CREATE POLICY "Authenticated upload stickers"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'stickers' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete stickers"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'stickers' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Tenant users can manage own booths" ON public.booths;
DROP POLICY IF EXISTS "Superadmins can manage all booths" ON public.booths;

CREATE POLICY "Tenant users can manage own booths"
  ON public.booths FOR ALL
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY "Superadmins can manage all booths"
  ON public.booths FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- Templates
DROP POLICY IF EXISTS "Tenant users can manage own templates" ON public.templates;
DROP POLICY IF EXISTS "Superadmins can manage all templates" ON public.templates;

CREATE POLICY "Tenant users can manage own templates"
  ON public.templates FOR ALL
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY "Superadmins can manage all templates"
  ON public.templates FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- Sessions
DROP POLICY IF EXISTS "Tenant users can manage own sessions" ON public.sessions;

CREATE POLICY "Tenant users can manage own sessions"
  ON public.sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.booths
      WHERE id = booth_id AND tenant_id = public.get_my_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.booths
      WHERE id = booth_id AND tenant_id = public.get_my_tenant_id()
    )
  );

-- Captures
DROP POLICY IF EXISTS "Tenant users can manage own captures" ON public.captures;

CREATE POLICY "Tenant users can manage own captures"
  ON public.captures FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.booths b ON b.id = s.booth_id
      WHERE s.id = session_id AND b.tenant_id = public.get_my_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.booths b ON b.id = s.booth_id
      WHERE s.id = session_id AND b.tenant_id = public.get_my_tenant_id()
    )
  );

-- Make existing helper functions SECURITY DEFINER so they bypass RLS
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- These two were already created in fix-rls.sql, just ensure they're SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;