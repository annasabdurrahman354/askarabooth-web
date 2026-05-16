-- =============================================================================
-- Migration: Fix RLS policies — add explicit WITH CHECK clauses
-- FOR ALL policies without WITH CHECK don't properly cover INSERT.
-- Run this script in the Supabase SQL Editor.
-- =============================================================================

-- Booths
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