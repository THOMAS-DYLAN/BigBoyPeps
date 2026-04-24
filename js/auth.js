// ═══════════════════════════════════════════════════════
// BigBoyPeps — Auth (Supabase)
// ═══════════════════════════════════════════════════════

import { supabase } from './supabase.js';

window.Auth = {

  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session || null;
  },

  async getUser() {
    const { data } = await supabase.auth.getUser();
    return data.user || null;
  },

  async getProfile() {
    const user = await this.getUser();
    if (!user) return null;
    const meta = user.user_metadata || {};
    return {
      id: user.id,
      first_name: meta.first_name || '',
      last_name: meta.last_name || '',
      phone: meta.phone || '',
      address: meta.address || '',
      city: meta.city || '',
      state: meta.state || '',
      zip: meta.zip || '',
      country: meta.country || 'United States',
      email: user.email || '',
      member_since: user.created_at || null,
    };
  },

  // Blocks until session is confirmed. Redirects if not logged in.
  async requireLogin() {
    const session = await this.getSession();
    if (!session) window.location.replace('index.html');
  },

  async register(firstName, lastName, email, password) {
    if (password.length < 6)
      return { ok: false, err: 'Password must be 6+ characters.' };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } }
    });
    if (error) return { ok: false, err: error.message };
    return { ok: true, user: data.user };
  },

  async login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, err: 'Wrong email or password.' };
    return { ok: true };
  },

  async logout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  },

  async updateField(key, value) {
    if (key === 'member_since' || key === 'email') return; // immutable/locked fields
    const user = await this.getUser();
    if (!user) return;
    const meta = user.user_metadata || {};
    await supabase.auth.updateUser({
      data: { ...meta, [key]: value }
    });
  },

  async saveCheckoutInfo(info) {
    const user = await this.getUser();
    if (!user) return { ok: false, err: 'Not logged in' };
    const meta = user.user_metadata || {};
    const { error } = await supabase.auth.updateUser({
      data: {
        ...meta,
        first_name: info.first_name || '',
        last_name: info.last_name || '',
        phone: info.phone || '',
        address: info.address || '',
        city: info.city || '',
        state: info.state || '',
        zip: info.zip || '',
        country: info.country || 'United States',
      }
    });
    if (error) return { ok: false, err: error.message };
    return { ok: true };
  },

  async pushOrder(order) {
    return this.recordRecentPurchases([{
      id: order.productId,
      name: order.name,
      qty: order.qty,
      price: order.price,
    }]);
  },

  async recordRecentPurchases(cartItems) {
    const user = await this.getUser();
    if (!user || !Array.isArray(cartItems) || !cartItems.length) return { ok: true };

    const unique = [];
    const seen = new Set();
    for (const item of cartItems) {
      const pid = Number(item.id);
      if (!Number.isFinite(pid) || seen.has(pid)) continue;
      seen.add(pid);
      unique.push(item);
      if (unique.length === 5) break;
    }

    if (!unique.length) return { ok: true };

    const rows = unique.map(item => ({
      user_id: user.id,
      product_id: Number(item.id),
      product_name: item.name,
      qty: Number(item.qty || 1),
      unit_price: Number(item.price || 0),
      total: Number(item.price || 0) * Number(item.qty || 1),
      status: 'processing',
    }));

    const snapshot = rows.map(r => ({
      product_id: r.product_id,
      product_name: r.product_name,
      qty: r.qty,
      unit_price: r.unit_price,
      total: r.total,
      status: r.status,
      ordered_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('orders').insert(rows);
    if (error) {
      // Fallback: persist recent purchases in auth metadata.
      const meta = user.user_metadata || {};
      const { error: metaError } = await supabase.auth.updateUser({
        data: { ...meta, recent_purchases: snapshot }
      });
      if (metaError) return { ok: false, err: `${error.message}; metadata fallback failed: ${metaError.message}` };
      return { ok: true, fallback: 'auth_metadata' };
    }
    return { ok: true, fallback: null };
  },

  async getRecentOrders() {
    const user = await this.getUser();
    if (!user) return [];
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('ordered_at', { ascending: false })
      .limit(100);

    // Keep most recent row per product, then max 5 unique products.
    const uniqueByProduct = [];
    const seen = new Set();
    for (const row of data || []) {
      const key = String(row.product_id ?? row.product_name);
      if (seen.has(key)) continue;
      seen.add(key);
      uniqueByProduct.push(row);
      if (uniqueByProduct.length === 5) break;
    }
    if (uniqueByProduct.length) return uniqueByProduct;

    const metaRecent = user.user_metadata?.recent_purchases;
    if (Array.isArray(metaRecent)) return metaRecent.slice(0, 5);
    return [];
  },

  formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  },
};
