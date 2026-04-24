# BigBoyPeps 🌶️

Graffiti-themed pepper & spice e-commerce store.  
Age gated · Auth required · Supabase backend.

---

## File Structure

```
bigboypeps/
├── index.html          ← Age gate + Sign In / Register
├── dashboard.html      ← Home for logged-in users (orders + account)
├── shop.html           ← Product grid (auth required)
├── product.html        ← Individual product page (?id=N, auth required)
├── cart.html           ← Cart + Checkout popup (auth required)
├── supabase_schema.sql ← Run once in Supabase SQL Editor
├── css/
│   ├── global.css      ← Design tokens + reset
│   └── shared.css      ← Nav, banner, footer, modal styles
└── js/
    ├── supabase.js     ← ⚠️ Paste your anon key here
    ├── auth.js         ← Login, register, session, profile, orders
    ├── cart.js         ← Cart storage, nav builder, checkout modal
    └── products.js     ← Product cache, SVG shapes, shared renderers
```

---

## Setup

### 1. Supabase

1. Open your project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor → New Query** and run the entire `supabase_schema.sql` file
   - Creates `profiles`, `products`, `orders`, `shipping_addresses`, `payment_methods` tables
   - Sets Row Level Security on all tables
   - Seeds all 12 products with `thumb_color` and `shape_key`
   - Creates a trigger that auto-creates a profile row on signup
   - Locks `member_since` at both trigger and DB level
3. Go to **Authentication → Settings** → turn **Email confirmations OFF** for dev/testing
4. Go to **Project Settings → API** → copy your **anon / public** key

### 2. Add your anon key

Open `js/supabase.js` and replace `YOUR_ANON_KEY_HERE`:

```js
export const supabase = createClient(
  'https://utqviljholfvpfztfuvx.supabase.co',
  'YOUR_ANON_KEY_HERE'
);
```

**Never commit the real key to a public GitHub repo.**

### 3. Deploy to GitHub Pages

1. Create a new repo (e.g. `bigboypeps`)
2. Push all files maintaining the folder structure above
3. Go to **Settings → Pages → Deploy from branch → main → / (root)**
4. Live at: `https://yourusername.github.io/bigboypeps/`

---

## How it works

| Feature | Detail |
|---|---|
| Age gate | `index.html` — blocks under-18s permanently |
| Auth | Supabase Auth — JWT session, no localStorage |
| Route guard | `shop.html`, `product.html`, `cart.html` redirect to `index.html` if not logged in |
| Member since | Set once on signup by DB trigger, locked by a second trigger that raises an exception on any UPDATE |
| Products | `products` table → loaded once into `window.ProductCache` via `products.js` |
| Product page | `product.html?id=N` — reads DB row, renders full page + related products |
| Shop cards | Click card → `product.html`. Click `+` → adds to cart only |
| Cart | `localStorage` per user ID, clears on checkout |
| Order thumbnails | Cart + dashboard both use `miniPepperSVG()` from `products.js` — no hardcoded SVGs |
| Orders | `orders` table — rolling 5 per user, newest first, link to product page |
| Checkout | Full form validation — all fields required before Place Order enables |
| Admin bypass | Type `pepper boy` in every checkout field |
| Payments | Not wired yet — success screen shown immediately |

---

## Supabase tables

| Table | Key columns |
|---|---|
| `profiles` | `id`, `email`, `first_name`, `last_name`, `phone`, `member_since` (immutable) |
| `shipping_addresses` | `user_id`, `street_line1`, `city`, `state`, `zip`, `is_default` |
| `payment_methods` | `user_id`, `stripe_customer_id`, `stripe_payment_method`, `card_last4`, `is_default` |
| `products` | `id`, `name`, `category`, `price`, `heat_level`, `description`, `badge`, `thumb_color`, `shape_key`, `active` |
| `orders` | `id`, `user_id`, `product_id`, `product_name`, `qty`, `unit_price`, `total`, `status`, `ordered_at` |
