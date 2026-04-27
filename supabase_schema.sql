-- ═══════════════════════════════════════════════════════════════
-- BigBoyPeps — Full Database Schema
-- Run this entire file in: Supabase → SQL Editor → New Query → Run
--
-- WHAT THIS CREATES:
--   users             — core user info, email, name, phone, membership date
--   shipping_addresses — one or more saved addresses per user
--   payment_methods   — Stripe token references only (no raw card data)
--   products          — product catalog
--   orders            — order line items, rolling 5 per user
--
-- NOTE ON PASSWORDS:
--   Passwords are managed entirely by Supabase Auth (bcrypt hashed).
--   There is no password column here. Never store plaintext passwords.
--
-- NOTE ON PAYMENT DATA:
--   Raw card numbers cannot legally be stored (PCI-DSS).
--   This schema stores Stripe customer/payment method IDs only.
--   Stripe holds the actual card data on their secure servers.
--   If you haven't set up Stripe yet, the payment_methods table
--   will just be empty — everything else still works fine.
-- ═══════════════════════════════════════════════════════════════


-- ── 0. CLEAN SLATE (safe to re-run) ─────────────────────────────
-- Drop triggers and functions first to avoid dependency errors
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();
drop trigger if exists lock_member_since on users;
drop function if exists prevent_member_since_update();


-- ── 1. USERS ──────────────────────────────────────────────────
-- One row per user. Linked to auth.users by UUID.
-- Email lives in auth.users — we mirror it here for convenience.
-- member_since is set ONCE by the trigger and locked forever after.

create table if not exists users (
  -- identity
  id              uuid          primary key references auth.users(id) on delete cascade,
  email           text          not null default '',     -- mirrored from auth.users
  first_name      text          not null default '',
  last_name       text          not null default '',

  -- contact
  phone           text          not null default '',

  -- membership (immutable after creation)
  member_since    timestamptz   not null default now(),

  -- metadata
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

-- Automatically update updated_at on every row change
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_updated_at on users;
create trigger users_updated_at
  before update on users
  for each row execute procedure touch_updated_at();

-- Hard-lock member_since at the DB level — no UPDATE can change it
create or replace function prevent_member_since_update()
returns trigger language plpgsql as $$
begin
  if new.member_since <> old.member_since then
    raise exception 'member_since is immutable and cannot be changed';
  end if;
  return new;
end;
$$;

create trigger lock_member_since
  before update on users
  for each row execute procedure prevent_member_since_update();


-- ── 2. SHIPPING ADDRESSES ─────────────────────────────────────────
-- Users can save multiple addresses. One is marked as default.

create table if not exists shipping_addresses (
  id              uuid          primary key default gen_random_uuid(),
  user_id         uuid          not null references auth.users(id) on delete cascade,

  label           text          not null default 'Home',  -- e.g. "Home", "Work"
  first_name      text          not null default '',
  last_name       text          not null default '',
  street_line1    text          not null default '',
  street_line2    text          not null default '',       -- apt, suite, etc.
  city            text          not null default '',
  state           text          not null default '',
  zip             text          not null default '',
  country         text          not null default 'US',
  is_default      boolean       not null default false,

  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

drop trigger if exists addresses_updated_at on shipping_addresses;
create trigger addresses_updated_at
  before update on shipping_addresses
  for each row execute procedure touch_updated_at();

-- Enforce only one default address per user at the DB level
create unique index if not exists one_default_address_per_user
  on shipping_addresses (user_id)
  where is_default = true;


-- ── 3. PAYMENT METHODS ───────────────────────────────────────────
-- Stores Stripe references ONLY. No raw card numbers are stored here.
-- When a user saves a card via Stripe, you store the IDs Stripe returns.
-- To charge them later: stripe.paymentIntents.create({ customer: stripe_customer_id, ... })

create table if not exists payment_methods (
  id                    uuid    primary key default gen_random_uuid(),
  user_id               uuid    not null references auth.users(id) on delete cascade,

  -- Stripe identifiers (the only payment data stored here)
  stripe_customer_id    text    not null,   -- cus_XXXXXXXXXXXXX
  stripe_payment_method text    not null,   -- pm_XXXXXXXXXXXXXX

  -- Display info (safe to store — this is what Stripe echoes back, not raw data)
  card_brand            text    not null default '',   -- "visa", "mastercard", etc.
  card_last4            text    not null default '',   -- "4242"
  card_exp_month        int,                           -- 12
  card_exp_year         int,                           -- 2027

  is_default            boolean not null default false,
  created_at            timestamptz not null default now()
);

-- One default payment method per user
create unique index if not exists one_default_payment_per_user
  on payment_methods (user_id)
  where is_default = true;


-- ── 4. PRODUCTS ──────────────────────────────────────────────────

create table if not exists products (
  id          serial        primary key,
  name        text          not null,
  category    text          not null,
  price       numeric(10,2) not null,
  heat_level  int           check (heat_level between 1 and 5),
  description text,
  badge       text,

  -- Visual appearance — sourced from DB so shop/cart/dashboard never diverge
  thumb_color text          not null default '#3a1a1a',
  shape_key   text          not null default 'tall',
  --   shape_key values: tall | curved | round | birds-eye | bundle

  active      boolean       not null default true,
  created_at  timestamptz   not null default now()
);

-- Add visual columns if running against an older version of the schema
alter table products add column if not exists thumb_color text not null default '#3a1a1a';
alter table products add column if not exists shape_key   text not null default 'tall';
alter table products add column if not exists created_at  timestamptz not null default now();


-- ── 5. ORDERS ────────────────────────────────────────────────────
-- One row per line item per purchase.
-- Rolling window of 5 unique products per user enforced in app layer.
-- Optionally references shipping_addresses and payment_methods for record-keeping.

create table if not exists orders (
  id                uuid          primary key default gen_random_uuid(),
  user_id           uuid          not null references auth.users(id) on delete cascade,
  product_id        int           references products(id),
  product_name      text          not null,    -- snapshot name at time of purchase
  qty               int           not null check (qty > 0),
  unit_price        numeric(10,2) not null,
  total             numeric(10,2) not null,
  status            text          not null default 'processing',
  -- optional: snapshot of which address/payment was used
  shipping_address_id uuid        references shipping_addresses(id) on delete set null,
  payment_method_id   uuid        references payment_methods(id)    on delete set null,
  ordered_at        timestamptz   not null default now()
);


-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- Every table is locked down. Users can only touch their own rows.
-- ═══════════════════════════════════════════════════════════════

alter table users             enable row level security;
alter table shipping_addresses enable row level security;
alter table payment_methods   enable row level security;
alter table products          enable row level security;
alter table orders            enable row level security;

-- ── Users ──
create policy "users: own row select"
  on users for select using (auth.uid() = id);

create policy "users: own row insert"
  on users for insert with check (auth.uid() = id);

create policy "users: own row update"
  on users for update using (auth.uid() = id);
  -- member_since immutability is enforced by the trigger above, not RLS

-- ── Shipping Addresses ──
create policy "addresses: own select"
  on shipping_addresses for select using (auth.uid() = user_id);

create policy "addresses: own insert"
  on shipping_addresses for insert with check (auth.uid() = user_id);

create policy "addresses: own update"
  on shipping_addresses for update using (auth.uid() = user_id);

create policy "addresses: own delete"
  on shipping_addresses for delete using (auth.uid() = user_id);

-- ── Payment Methods ──
create policy "payments: own select"
  on payment_methods for select using (auth.uid() = user_id);

create policy "payments: own insert"
  on payment_methods for insert with check (auth.uid() = user_id);

create policy "payments: own update"
  on payment_methods for update using (auth.uid() = user_id);

create policy "payments: own delete"
  on payment_methods for delete using (auth.uid() = user_id);

-- ── Products ── (public read-only)
create policy "products: public read"
  on products for select using (active = true);

-- ── Orders ──
create policy "orders: own select"
  on orders for select using (auth.uid() = user_id);

create policy "orders: own insert"
  on orders for insert with check (auth.uid() = user_id);

create policy "orders: own delete"
  on orders for delete using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════
-- TRIGGER: AUTO-CREATE PROFILE ON SIGNUP
-- Fires immediately when a new user registers via Supabase Auth.
-- Pulls first_name and last_name from signup metadata.
-- Sets member_since = now() — the trigger lock above ensures
-- this value can never be changed by any subsequent UPDATE.
-- ═══════════════════════════════════════════════════════════════

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into users (
    id,
    email,
    first_name,
    last_name,
    member_since,
    created_at,
    updated_at
  ) values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name',  ''),
    now(),   -- set once, locked forever by trigger
    now(),
    now()
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ═══════════════════════════════════════════════════════════════
-- SEED PRODUCTS
-- thumb_color = CSS hex for the thumbnail background
-- shape_key   = which pepper SVG to render (tall|curved|round|birds-eye|bundle)
-- ═══════════════════════════════════════════════════════════════

insert into products (name, category, price, heat_level, description, badge, thumb_color, shape_key, active) values
  ('Ghost Pepper Powder',    'Single Origin', 19.00, 5, 'One of the hottest on earth. Ground fine. Handle with care.',                        '🔥 Extreme',    '#3a1a1a', 'tall',      true),
  ('Smoked Jalapeño Blend',  'Blends',        26.00, 2, 'Cold-smoked jalapeños, cumin, and dried citrus. Versatile.',                         null,            '#1a2a1a', 'curved',    true),
  ('Carolina Reaper Flakes', 'Single Origin', 34.00, 5, 'World record holder. Whole dried flakes. Not for everyone.',                         '🔥 Extreme',    '#2a1a2a', 'tall',      true),
  ('Habanero Sea Salt',      'Blends',        19.00, 3, 'Atlantic sea salt meets dried habanero. Simple. Addictive.',                         null,            '#1a1a2a', 'round',     true),
  ('Bird''s Eye Whole',      'Single Origin', 16.00, 3, 'Classic Southeast Asian heat. Whole dried pods, full aroma.',                        null,            '#2a2a1a', 'birds-eye', true),
  ('Scorpion Pepper Oil',    'Oils & Sauces', 28.00, 5, 'Trinidad Moruga Scorpion in cold-pressed olive oil. Drop by drop.',                  '🔥 Extreme',    '#1a2a2a', 'tall',      true),
  ('Ancho Chili Powder',     'Single Origin', 14.00, 1, 'Mild, sweet, earthy. The foundation of every great mole.',                          null,            '#3a1a1a', 'round',     true),
  ('Chipotle Blend',         'Blends',        22.00, 2, 'Smoke-dried jalapeños with garlic and oregano. BBQ''s best friend.',                 null,            '#1a2a1a', 'curved',    true),
  ('Serrano Hot Sauce',      'Oils & Sauces', 18.00, 3, 'Vinegar-forward serrano sauce. Thin, hot, and meant to be poured.',                 null,            '#2a1a2a', 'birds-eye', true),
  ('Big Boy Starter Pack',   'Bundles',       64.00, 3, 'Six of our bestsellers, curated for the pepper curious. Start here.',                '🌶 Best Value', '#1a1a2a', 'bundle',    true),
  ('Extreme Heat Bundle',    'Bundles',       84.00, 5, 'Ghost, Reaper, and Scorpion — the holy trinity. Not responsible for consequences.',  '🔥 Extreme',    '#2a2a1a', 'bundle',    true),
  ('Szechuan Peppercorn',    'Single Origin', 17.00, 2, 'Numbing, floral, electric. Not quite heat — something wilder.',                     null,            '#1a2a2a', 'round',     true)
on conflict do nothing;

-- Update visual data on any rows seeded before thumb_color/shape_key existed
update products set thumb_color = '#3a1a1a', shape_key = 'tall'      where name = 'Ghost Pepper Powder'    and (thumb_color = '#3a1a1a' and shape_key = 'tall' or thumb_color is null);
update products set thumb_color = '#1a2a1a', shape_key = 'curved'    where name = 'Smoked Jalapeño Blend';
update products set thumb_color = '#2a1a2a', shape_key = 'tall'      where name = 'Carolina Reaper Flakes';
update products set thumb_color = '#1a1a2a', shape_key = 'round'     where name = 'Habanero Sea Salt';
update products set thumb_color = '#2a2a1a', shape_key = 'birds-eye' where name = 'Bird''s Eye Whole';
update products set thumb_color = '#1a2a2a', shape_key = 'tall'      where name = 'Scorpion Pepper Oil';
update products set thumb_color = '#3a1a1a', shape_key = 'round'     where name = 'Ancho Chili Powder';
update products set thumb_color = '#1a2a1a', shape_key = 'curved'    where name = 'Chipotle Blend';
update products set thumb_color = '#2a1a2a', shape_key = 'birds-eye' where name = 'Serrano Hot Sauce';
update products set thumb_color = '#1a1a2a', shape_key = 'bundle'    where name = 'Big Boy Starter Pack';
update products set thumb_color = '#2a2a1a', shape_key = 'bundle'    where name = 'Extreme Heat Bundle';
update products set thumb_color = '#1a2a2a', shape_key = 'round'     where name = 'Szechuan Peppercorn';


-- ── 6. REVIEWS ────────────────────────────────────────────────
-- One row per user per product. Upsert on the unique constraint
-- means changing a rating updates the row, never adds a new one.

create table if not exists reviews (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  product_id  int         not null references products(id)   on delete cascade,
  stars       int         not null check (stars between 1 and 5),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (user_id, product_id)
);

-- Auto-update updated_at whenever a rating is changed
create or replace function touch_reviews_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reviews_updated_at on reviews;
create trigger reviews_updated_at
  before update on reviews
  for each row execute procedure touch_reviews_updated_at();

-- RLS — anyone logged in can read, users only write their own rows
alter table reviews enable row level security;

create policy "reviews: logged-in read"
  on reviews for select
  using (auth.uid() is not null);

create policy "reviews: own insert"
  on reviews for insert
  with check (auth.uid() = user_id);

create policy "reviews: own update"
  on reviews for update
  using (auth.uid() = user_id);

create policy "reviews: own delete"
  on reviews for delete
  using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════
-- USEFUL ADMIN QUERIES (for reference — don't run these as part of setup)
-- ═══════════════════════════════════════════════════════════════

/*

-- View all users with their profile and order count:
select
  u.email,
  p.first_name,
  p.last_name,
  p.phone,
  p.member_since,
  count(o.id) as total_orders
from auth.users u
left join users p on p.id = u.id
left join orders o on o.user_id = u.id
group by u.email, p.first_name, p.last_name, p.phone, p.member_since
order by p.member_since desc;

-- View all orders with user info:
select
  o.ordered_at,
  p.first_name || ' ' || p.last_name as customer,
  u.email,
  o.product_name,
  o.qty,
  o.total,
  o.status
from orders o
join auth.users u on u.id = o.user_id
join users p on p.id = o.user_id
order by o.ordered_at desc;

-- View saved addresses for a user:
select * from shipping_addresses where user_id = '<user-uuid>';

-- View payment methods (Stripe refs only, no card numbers):
select * from payment_methods where user_id = '<user-uuid>';

*/
