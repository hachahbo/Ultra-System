-- ---------------------------------------------------------------------------
-- Supabase Realtime — add orders + reservations
--
-- Powers the dashboard header notification bell: new public orders and new
-- reservation requests push live to the owner's dashboard. RLS SELECT policies
-- ("orders tenant read" / "reservations tenant read", 0001_init.sql) already
-- scope every realtime row to the subscriber's own restaurant, so no extra
-- authorization is needed here.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.reservations;

notify pgrst, 'reload schema';
