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