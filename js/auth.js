// ═══════════════════════════════════════════════════════════════
// BigBoyPeps — Auth & User Data (Supabase)
// ═══════════════════════════════════════════════════════════════

import { supabase } from './supabase.js';

// Module-level session cache — one fetch per page load
let _session = null;
let _sessionFetched = false;

async function getSessionCached() {
  if (_sessionFetched) return _session;
  const { data } = await supabase.auth.getSession();
  _session = data.session || null;
  _sessionFetched = true;
  supabase.auth.onAuthStateChange((_event, session) => { _session = session; });
  return _session;
}

window.Auth = {

  // ── Session ──────────────────────────────────────────────────

  async getSession() {
    return getSessionCached();
  },

  async getUser() {
    const session = await getSessionCached();
    return session?.user || null;
  },

  // ── Profile ───────────────────────────────────────────────────
  // All user info lives in Supabase Auth — no separate profiles table.
  // member_since = user.created_at (set at signup, never changes).

  async getProfile() {
    const user = await this.getUser();
    if (!user) return null;
    const meta = user.user_metadata || {};
    return {
      id:           user.id,
      email:        user.email        || '',
      first_name:   meta.first_name   || '',
      last_name:    meta.last_name    || '',
      phone:        meta.phone        || '',
      address:      meta.address      || '',
      city:         meta.city         || '',
      state:        meta.state        || '',
      member_since: user.created_at   || null,
    };
  },

  // ── Route guard ───────────────────────────────────────────────

  async requireLogin() {
    const session = await this.getSession();
    if (!session) window.location.replace('index.html');
  },

  // ── Register ─────────────────────────────────────────────────
  // All user info stored in Supabase Auth user_metadata.
  // member_since = user.created_at, set by Supabase on signup, never changes.

  async register(firstName, lastName, email, password) {
    if (password.length < 6)
      return { ok: false, err: 'Password must be 6+ characters.' };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName }
      }
    });

    if (error) return { ok: false, err: error.message };
    return { ok: true, user: data.user };
  },

  // ── Login ─────────────────────────────────────────────────────

  async login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, err: 'Wrong email or password.' };
    return { ok: true };
  },

  // ── Logout ───────────────────────────────────────────────────

  async logout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  },

  // ── Update profile field ──────────────────────────────────────
  // member_since is blocked here AND by a DB-level trigger.
  // email changes go through Supabase Auth (which sends a confirmation).

  async updateField(key, value) {
    if (key === 'member_since' || key === 'created_at') return;
    const user = await this.getUser();
    if (!user) return;

    if (key === 'email') {
      await supabase.auth.updateUser({ email: value });
      return;
    }

    // All other fields saved to user metadata
    const meta = user.user_metadata || {};
    await supabase.auth.updateUser({ data: { ...meta, [key]: value } });
  },

  // ── Shipping Addresses ────────────────────────────────────────

  async getAddresses() {
    const user = await this.getUser();
    if (!user) return [];
    const { data } = await supabase
      .from('shipping_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });
    return data || [];
  },

  async getDefaultAddress() {
    const user = await this.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('shipping_addresses')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .maybeSingle();  // returns null instead of error when no row exists
    return data || null;
  },

  async saveAddress(address) {
    const user = await this.getUser();
    if (!user) return { ok: false, err: 'Not logged in.' };

    // If this is being set as default, clear any existing default first
    if (address.is_default) {
      await supabase
        .from('shipping_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    const payload = { ...address, user_id: user.id };

    if (address.id) {
      // Update existing
      const { error } = await supabase
        .from('shipping_addresses')
        .update(payload)
        .eq('id', address.id)
        .eq('user_id', user.id);
      return error ? { ok: false, err: error.message } : { ok: true };
    } else {
      // Insert new
      const { error } = await supabase
        .from('shipping_addresses')
        .insert(payload);
      return error ? { ok: false, err: error.message } : { ok: true };
    }
  },

  async deleteAddress(id) {
    const user = await this.getUser();
    if (!user) return;
    await supabase
      .from('shipping_addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
  },

  // ── Payment Methods (Stripe refs only) ───────────────────────
  // These are stored AFTER Stripe confirms the card.
  // The frontend calls Stripe's JS SDK to tokenize the card,
  // then passes the returned IDs here for storage.

  async getPaymentMethods() {
    const user = await this.getUser();
    if (!user) return [];
    const { data } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });
    return data || [];
  },

  async getDefaultPaymentMethod() {
    const user = await this.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .single();
    return data || null;
  },

  // Call this after Stripe confirms a card and returns stripe_customer_id + stripe_payment_method
  async savePaymentMethod({ stripe_customer_id, stripe_payment_method, card_brand, card_last4, card_exp_month, card_exp_year, is_default = false }) {
    const user = await this.getUser();
    if (!user) return { ok: false, err: 'Not logged in.' };

    if (is_default) {
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    const { error } = await supabase.from('payment_methods').insert({
      user_id: user.id,
      stripe_customer_id,
      stripe_payment_method,
      card_brand,
      card_last4,
      card_exp_month,
      card_exp_year,
      is_default,
    });

    return error ? { ok: false, err: error.message } : { ok: true };
  },

  async deletePaymentMethod(id) {
    const user = await this.getUser();
    if (!user) return;
    await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
  },

  // ── Orders ────────────────────────────────────────────────────

  async pushOrder(order) {
    const user = await this.getUser();
    if (!user) return;

    await supabase.from('orders').insert({
      user_id:      user.id,
      product_id:   order.productId,
      product_name: order.name,
      qty:          order.qty,
      unit_price:   order.price,
      total:        order.total,
      status:       'processing',
    });

    // All orders kept forever — dashboard limits via .limit(5) in getRecentOrders()
  },

  async getRecentOrders() {
    const user = await this.getUser();
    if (!user) return [];
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('ordered_at', { ascending: false })
      .limit(5);
    return data || [];
  },

  async getAllOrders() {
    const user = await this.getUser();
    if (!user) return [];
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('ordered_at', { ascending: false });
    return data || [];
  },

  // ── Reviews ───────────────────────────────────────────────────
  // One review per user per product. Upsert on conflict so updating
  // a rating replaces the existing row without adding a new one.

  async submitReview(productId, stars) {
    const user = await this.getUser();
    if (!user) return { ok: false, err: 'Not logged in.' };
    if (stars < 1 || stars > 5) return { ok: false, err: 'Stars must be 1–5.' };

    const { error } = await supabase.from('reviews').upsert({
      user_id:    user.id,
      product_id: productId,
      stars,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,product_id' });

    return error ? { ok: false, err: error.message } : { ok: true };
  },

  // Returns { average, count, userStars } for a product.
  // userStars is the current user's rating (0 if not rated).
  async getProductRating(productId) {
    const user = await this.getUser();

    const { data } = await supabase
      .from('reviews')
      .select('stars, user_id')
      .eq('product_id', productId);

    const rows = data || [];
    const count   = rows.length;
    const average = count > 0
      ? Math.round((rows.reduce((s, r) => s + r.stars, 0) / count) * 10) / 10
      : 0;
    const userRow   = user ? rows.find(r => r.user_id === user.id) : null;
    const userStars = userRow ? userRow.stars : 0;

    return { average, count, userStars };
  },

  // ── Utility ───────────────────────────────────────────────────

  formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  },
};
