-- =============================================================================
-- Migration: Change cascade deletes to SET NULL so users can choose
-- whether to delete related records via UI checkboxes.
-- Run this script in the Supabase SQL Editor.
-- =============================================================================

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