-- Migration: Add last_active_week to programs table
-- Run in: Supabase Dashboard → SQL Editor
-- Purpose: When a program is archived (is_active = false), snapshot the
--          week the user was on so they can resume from the same point
--          rather than restarting from Week 1.

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS last_active_week integer;
