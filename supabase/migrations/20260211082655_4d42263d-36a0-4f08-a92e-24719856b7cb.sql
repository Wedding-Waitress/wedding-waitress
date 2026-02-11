-- Remove the overly permissive public SELECT policy on events table.
-- All public access goes through SECURITY DEFINER RPC functions 
-- (get_public_event_with_data_secure, get_public_live_view_settings, etc.)
-- which bypass RLS and already limit returned columns.
-- This prevents direct client queries from exposing sensitive fields
-- like venue_phone, venue_contact, event_planner_email, etc.

DROP POLICY IF EXISTS "Public can view live-view enabled events by slug" ON public.events;