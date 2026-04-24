-- ═══════════════════════════════════════════════════════
-- BigBoyPeps — Supabase Schema
-- Run this entire file in: Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════

-- ── PROFILES ─────────────────────────────────────────────
-- Extends Supabase Auth users with profile info.
-- member_since is set once on insert and locked via RLS.
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  first_name   text not null default '',
  last_name    text not null default '',
  email        text not null default '',
  phone        text not null default '',
  address      text not null default '',
  city         text not null default '',
  state        text not null default '',
  member_since timestamptz not null default now()
);

-- ── PRODUCTS ──────────────────────────────────────────────
create table if not exists products (
  id          serial primary key,
  name        text           not null,
  category    text           not null,
  price       numeric(10,2)  not null,
  heat_level  int            check (heat_level between 1 and 5),
  description text,
  badge       text,
  active      boolean        not null default true
);

-- ── ORDERS ────────────────────────────────────────────────
-- One row per line item. Rolling 5 per user enforced in app layer.
create table if not exists orders (
  id           uuid          primary key default gen_random_uuid(),
  user_id      uuid          not null references auth.users(id) on delete cascade,
  product_id   int           references products(id),
  product_name text          not null,   -- snapshot so renames don't break history
  qty          int           not null check (qty > 0),
  unit_price   numeric(10,2) not null,
  total        numeric(10,2) not null,
  status       text          not null default 'processing',
  ordered_at   timestamptz   not null default now()
);

-- ── CART ITEMS ─────────────────────────────────────────────
-- Current in-progress cart state per user/product.
create table if not exists cart_items (
  user_id      uuid          not null references auth.users(id) on delete cascade,
  product_id   int           not null references products(id) on delete cascade,
  product_name text          not null,
  unit_price   numeric(10,2) not null,
  qty          int           not null check (qty > 0),
  added_at     timestamptz   not null default now(),
  primary key (user_id, product_id)
);

-- ═══════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════

alter table profiles enable row level security;
alter table products  enable row level security;
alter table orders    enable row level security;
alter table cart_items enable row level security;

-- Profiles: each user can read and update only their own row
create policy "profiles: own row read"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles: own row insert"
  on profiles for insert
  with check (auth.uid() = id);

create policy "profiles: own row update"
  on profiles for update
  using (auth.uid() = id)
  -- member_since must never change — enforce at DB level too
  with check (
    auth.uid() = id
    and email = (select email from profiles where id = auth.uid())
    and member_since = (select member_since from profiles where id = auth.uid())
  );

-- Products: public read, no writes from client
create policy "products: public read"
  on products for select
  using (active = true);

-- Orders: users see only their own orders, can insert their own
create policy "orders: own read"
  on orders for select
  using (auth.uid() = user_id);

create policy "orders: own insert"
  on orders for insert
  with check (auth.uid() = user_id);

-- Cart: users manage only their own cart rows
create policy "cart_items: own read"
  on cart_items for select
  using (auth.uid() = user_id);

create policy "cart_items: own insert"
  on cart_items for insert
  with check (auth.uid() = user_id);

create policy "cart_items: own update"
  on cart_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "cart_items: own delete"
  on cart_items for delete
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════
-- SEED PRODUCTS
-- ═══════════════════════════════════════════════════════

insert into products (name, category, price, heat_level, description, badge, active) values
  ('Ghost Pepper Powder',    'Single Origin', 19.00, 5, 'One of the hottest on earth. Ground fine. Handle with care.',                        '🔥 Extreme',   true),
  ('Smoked Jalapeño Blend',  'Blends',        26.00, 2, 'Cold-smoked jalapeños, cumin, and dried citrus. Versatile.',                         null,           true),
  ('Carolina Reaper Flakes', 'Single Origin', 34.00, 5, 'World record holder. Whole dried flakes. Not for everyone.',                         '🔥 Extreme',   true),
  ('Habanero Sea Salt',       'Blends',        19.00, 3, 'Atlantic sea salt meets dried habanero. Simple. Addictive.',                         null,           true),
  ('Bird''s Eye Whole',       'Single Origin', 16.00, 3, 'Classic Southeast Asian heat. Whole dried pods, full aroma.',                       null,           true),
  ('Scorpion Pepper Oil',    'Oils & Sauces', 28.00, 5, 'Trinidad Moruga Scorpion in cold-pressed olive oil. Drop by drop.',                  '🔥 Extreme',   true),
  ('Ancho Chili Powder',     'Single Origin', 14.00, 1, 'Mild, sweet, earthy. The foundation of every great mole.',                          null,           true),
  ('Chipotle Blend',         'Blends',        22.00, 2, 'Smoke-dried jalapeños with garlic and oregano. BBQ''s best friend.',                 null,           true),
  ('Serrano Hot Sauce',      'Oils & Sauces', 18.00, 3, 'Vinegar-forward serrano sauce. Thin, hot, and meant to be poured.',                 null,           true),
  ('Big Boy Starter Pack',   'Bundles',       64.00, 3, 'Six of our bestsellers, curated for the pepper curious. Start here.',               '🌶 Best Value', true),
  ('Extreme Heat Bundle',    'Bundles',       84.00, 5, 'Ghost, Reaper, and Scorpion — the holy trinity. Not responsible for consequences.',  '🔥 Extreme',   true),
  ('Szechuan Peppercorn',    'Single Origin', 17.00, 2, 'Numbing, floral, electric. Not quite heat — something wilder.',                     null,           true)
on conflict do nothing;

-- ═══════════════════════════════════════════════════════
-- AUTO-CREATE PROFILE ON SIGNUP
-- Trigger so every new auth user gets a profiles row immediately.
-- ═══════════════════════════════════════════════════════

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, first_name, last_name, email, member_since)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name',  ''),
    coalesce(new.email, ''),
    now()
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
