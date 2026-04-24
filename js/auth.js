// ═══════════════════════════════════════════════════════════════
// BigBoyPeps — Auth & User Data (Supabase)
// ═══════════════════════════════════════════════════════════════

import { supabase } from './supabase.js';

window.Auth = {

  // ── Session ──────────────────────────────────────────────────

  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session || null;
  },

  async getUser() {
    const { data } = await supabase.auth.getUser();
    return data.user || null;
  },

  // ── Profile ───────────────────────────────────────────────────
  // Returns the profiles row for the current user.
  // Includes email mirrored from auth.users.

  async getProfile() {
    const user = await this.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    // Attach the live email from auth in case the mirror is stale
    if (data) data.email = user.email;
    return data || null;
  },

  // ── Route guard ───────────────────────────────────────────────

  async requireLogin() {
    const session = await this.getSession();
    if (!session) window.location.replace('index.html');
  },

  // ── Register ──────────────────────────────────────────────────
  // Creates auth user → trigger fires → profiles row created automatically.
  // member_since is set by the trigger and locked forever by a DB trigger.

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

    // If email confirmation is OFF the session is live immediately.
    // Also update the email mirror in profiles (trigger may beat us here,
    // but an upsert is safe thanks to on-conflict-do-nothing on the trigger).
    if (data.user) {
      await supabase.from('profiles')
        .update({ email })
        .eq('id', data.user.id);
    }

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
      // Route email changes through Auth so Supabase handles confirmation
      const { error } = await supabase.auth.updateUser({ email: value });
      if (error) return { ok: false, err: error.message };
      // Also mirror to profiles
      await supabase.from('profiles').update({ email: value }).eq('id', user.id);
      return { ok: true };
    }

    const { error } = await supabase
      .from('profiles')
      .update({ [key]: value })
      .eq('id', user.id);

    return error ? { ok: false, err: error.message } : { ok: true };
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
      .single();
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
    if (!user) return { ok: false, err: 'Not logged in.' };

    const { error } = await supabase.from('orders').insert({
      user_id:      user.id,
      product_id:   order.productId,
      product_name: order.name,
      qty:          order.qty,
      unit_price:   order.price,
      total:        order.total,
      status:       'processing',
    });

    if (error) {
      console.error('Error saving order:', error);
      return { ok: false, err: error.message };
    }

    return { ok: true };
  },

  async getRecentOrders() {
    const user = await this.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('ordered_at', { ascending: false })
      .limit(5);
    if (error) {
      console.error('Error fetching recent orders:', error);
      return [];
    }
    return data || [];
  },

  async getAllOrders() {
    const user = await this.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('ordered_at', { ascending: false });
    if (error) {
      console.error('Error fetching all orders:', error);
      return [];
    }
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
