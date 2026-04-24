# BigBoyPeps 🌶️

Graffiti-themed pepper & spice e-commerce store.  
Age gated · Auth required · Supabase backend.

---

## File Structure

```
bigboypeps/
├── index.html          ← Age gate + Sign In / Register
├── dashboard.html      ← Home for logged-in users
├── shop.html           ← Product grid (auth required)
├── cart.html           ← Cart + Checkout popup (auth required)
├── supabase_schema.sql ← Run once in Supabase SQL Editor
├── css/
│   ├── global.css      ← Design tokens + reset
│   └── shared.css      ← Nav, banner, footer, modal styles
└── js/
    ├── supabase.js     ← ⚠️ Paste your anon key here
    ├── auth.js         ← Login, register, session, orders
    └── cart.js         ← Cart storage, nav builder, checkout
```

---

## Setup

### 1. Supabase

1. Go to [supabase.com](https://supabase.com) and open your project
2. Go to **SQL Editor** and run the entire contents of `supabase_schema.sql`
   - This creates `profiles`, `products`, `orders` tables
   - Sets Row Level Security policies
   - Seeds all 12 products
   - Creates a trigger that auto-creates a profile on signup
3. Go to **Authentication → Settings** and turn **Email confirmations OFF** (for dev/testing)
4. Go to **Project Settings → API** and copy your **anon / public** key

### 2. Add your anon key

Open `js/supabase.js` and replace `YOUR_ANON_KEY_HERE`:

```js
export const supabase = createClient(
  'https://utqviljholfvpfztfuvx.supabase.co',
  'YOUR_ANON_KEY_HERE'   // ← paste here
);
```

**Never commit the real key to a public GitHub repo.**  
Add `js/supabase.js` to your `.gitignore` or use an environment variable loader.

### 3. Deploy to GitHub Pages

1. Create a new GitHub repo (e.g. `bigboypeps`)
2. Push all files keeping the folder structure above
3. Go to **Settings → Pages → Deploy from branch → main → / (root)**
4. Live at: `https://yourusername.github.io/bigboypeps/`

> **Note:** GitHub Pages is static. The Supabase JS client talks directly to  
> Supabase over HTTPS — no server needed.

---

## How it works

| Feature | Where |
|---|---|
| Age gate | `index.html` |
| Sign in / Register | `index.html` (tabs) |
| Session management | Supabase Auth (JWT in localStorage automatically) |
| Profile + member since | `profiles` table — `member_since` is set once on signup and RLS prevents updates |
| Products | `products` table — loaded fresh on every shop visit |
| Cart | `localStorage` (single app key, clears on checkout) |
| Orders | `orders` table — rolling 5 per user, newest first |
| Checkout validation | All required fields + card format before Place Order enables |
| Admin bypass | Type `pepper boy` in every checkout field |

---

## Supabase tables

| Table | Key columns |
|---|---|
| `profiles` | `id` (= auth user id), `first_name`, `last_name`, `email`, `phone`, `address`, `city`, `state`, `member_since` |
| `products` | `id`, `name`, `category`, `price`, `heat_level`, `description`, `badge`, `active` |
| `orders` | `id`, `user_id`, `product_id`, `product_name`, `qty`, `unit_price`, `total`, `status`, `ordered_at` |
