-- Darna v28 — orders.customer_phone for QR "sur place" checkout.
--
-- Until now a phone number only reached the DB through `customers` (upserted
-- on delivery orders, keyed by restaurant_id+phone). Dine-in QR orders can't
-- use that path: `customers.name` is NOT NULL, and a customer who fills in a
-- phone but no name would otherwise force us to invent one — polluting the
-- CRM with rows whose name is a phone number.
--
-- So the order carries its own snapshot of what the customer typed. This is
-- deliberately denormalized: `customers.phone` is the CRM record of a person
-- and can be corrected later, while `orders.customer_phone` is what was given
-- at the counter for *this* ticket. Nullable — anonymous dine-in is allowed.

alter table public.orders add column customer_phone text;

notify pgrst, 'reload schema';
