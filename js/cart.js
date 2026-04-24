// ═══════════════════════════════════════════════════════
// BigBoyPeps — Cart + Shared UI (Supabase version)
// Cart itself stays in localStorage (per-user key).
// Orders are written to Supabase on checkout.
// ═══════════════════════════════════════════════════════

import { supabase } from './supabase.js';

// ── Cart (localStorage, keyed per user) ─────────────────
window.Cart = {
  _key: 'bbp_cart_guest',

  async init() {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    this._key = uid ? `bbp_cart_${uid}` : 'bbp_cart_guest';
  },

  get()       { return JSON.parse(localStorage.getItem(this._key) || '[]'); },
  save(items) { localStorage.setItem(this._key, JSON.stringify(items)); },

  add(product) {
    const items    = this.get();
    const existing = items.find(i => i.id === product.id);
    if (existing) existing.qty += 1;
    else items.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
    this.save(items);
    this.updateBadge();
  },

  remove(id)      { this.save(this.get().filter(i => i.id !== id)); this.updateBadge(); },

  setQty(id, qty) {
    const items = this.get();
    const item  = items.find(i => i.id === id);
    if (item) { item.qty = Math.max(1, qty); this.save(items); }
    this.updateBadge();
  },

  clear()  { this.save([]); this.updateBadge(); },
  total()  { return this.get().reduce((s,i) => s + i.price * i.qty, 0); },
  count()  { return this.get().reduce((s,i) => s + i.qty, 0); },

  updateBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const n = this.count();
    badge.textContent    = n;
    badge.style.display  = n > 0 ? 'flex' : 'none';
  },
};

// ── Nav pepper SVG ───────────────────────────────────────
const NAV_PEPPER = `<svg width="26" height="26" viewBox="0 0 52 52" fill="none">
  <path d="M26 7C18 7 11 15 11 26C11 38 17 48 26 48C35 48 41 38 41 26C41 15 34 7 26 7Z" fill="#CC1F1F"/>
  <path d="M26 7C25 2 28 0 30 1C32 3 29 6 26 7Z" fill="#555"/>
  <path d="M11 26C7 28 5 36 8 41C10 44 15 41 14 35" fill="#A01010"/>
  <ellipse cx="21" cy="24" rx="3" ry="3.5" fill="rgba(0,0,0,.4)"/>
  <ellipse cx="31" cy="24" rx="3" ry="3.5" fill="rgba(0,0,0,.4)"/>
</svg>`;

// ── Build Nav (async — checks session live) ──────────────
window.buildNav = async function(activePage) {
  const { data } = await supabase.auth.getSession();
  const loggedIn  = !!data.session;
  const count     = Cart.count();
  const homeHref  = loggedIn ? 'dashboard.html' : 'index.html';

  const centerLinks = loggedIn ? `
    <a href="dashboard.html" class="nav-link${activePage==='dashboard'?' active':''}">Dashboard</a>
    <a href="shop.html"      class="nav-link${activePage==='shop'     ?' active':''}">Shop</a>
    <a href="orders.html"    class="nav-link${activePage==='orders'   ?' active':''}">Orders</a>` : '';

  const rightSide = loggedIn ? `
    <button onclick="Auth.logout()" class="nav-signout">Sign Out</button>
    <a href="cart.html" class="cart-nav-btn">
      Cart
      <span id="cart-badge" class="cart-badge" style="display:${count>0?'flex':'none'}">${count}</span>
    </a>` : `<a href="index.html" class="nav-signin">Sign In</a>`;

  return `
  <nav>
    <div class="nav-inner">
      <a href="${homeHref}" class="nav-brand">${NAV_PEPPER}Big<span>Boy</span>Peps</a>
      <div class="nav-links">${centerLinks}</div>
      <div class="nav-right">${rightSide}</div>
    </div>
  </nav>`;
};

window.buildBanner = () => `
  <div class="research-banner">
    <p>For Research Purposes Only <span>— Not for human consumption. Handle with appropriate care.</span></p>
  </div>`;

window.buildFooter = async function() {
  const { data } = await supabase.auth.getSession();
  const href = data.session ? 'dashboard.html' : 'index.html';
  return `<footer>
    <div class="footer-inner">
      <a href="${href}" class="footer-brand" style="text-decoration:none">Big<span>Boy</span>Peps</a>
      <div class="footer-copy">© 2025 BigBoyPeps · For research purposes only</div>
    </div>
  </footer>`;
};

// ── Page init helper — call at top of every protected page ─
window.initPage = async function(activePage) {
  await Auth.requireLogin();
  await Cart.init();
  document.getElementById('nav-mount').innerHTML    = await buildNav(activePage);
  document.getElementById('banner-mount').innerHTML = buildBanner();
  document.getElementById('footer-mount').innerHTML = await buildFooter();
  Cart.updateBadge();
};

// ── States list ──────────────────────────────────────────
const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

// ── Checkout modal ───────────────────────────────────────
window.openCheckout = async function() {
  const items = Cart.get();
  if (!items.length) return;
  const overlay = document.getElementById('checkout-overlay');
  if (!overlay) return;
  const profile = await Auth.getProfile() || {};
  renderCheckoutModal(items, profile);
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.closeCheckout = function() {
  const overlay = document.getElementById('checkout-overlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
};

function renderCheckoutModal(items, profile) {
  const total = items.reduce((s,i) => s + i.price * i.qty, 0);

  document.getElementById('checkout-modal').innerHTML = `
    <div class="modal-head">
      <div class="modal-title">Checkout</div>
      <button class="modal-close" onclick="closeCheckout()">&#x2715;</button>
    </div>
    <div class="modal-body">

      <div class="modal-section">
        <div class="modal-section-title">Shipping Address <span class="req-note">* required</span></div>
        <div class="form-row">
          <div class="form-field">
            <label>First Name *</label>
            <input id="co-first"   type="text"  placeholder="Jane"    value="${profile.first_name||''}" oninput="validateCheckout()"/>
            <div class="field-err" id="err-first"></div>
          </div>
          <div class="form-field">
            <label>Last Name *</label>
            <input id="co-last"    type="text"  placeholder="Smith"   value="${profile.last_name||''}"  oninput="validateCheckout()"/>
            <div class="field-err" id="err-last"></div>
          </div>
        </div>
        <div class="form-field">
          <label>Street Address *</label>
          <input id="co-address" type="text"  placeholder="123 Main St" value="${profile.address||''}" oninput="validateCheckout()"/>
          <div class="field-err" id="err-address"></div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>City *</label>
            <input id="co-city"  type="text"  placeholder="Austin"   value="${profile.city||''}"  oninput="validateCheckout()"/>
            <div class="field-err" id="err-city"></div>
          </div>
          <div class="form-field">
            <label>ZIP *</label>
            <input id="co-zip"   type="text"  placeholder="78701"    maxlength="10" oninput="validateCheckout()"/>
            <div class="field-err" id="err-zip"></div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>State *</label>
            <select id="co-state" onchange="validateCheckout()">
              <option value="">— Select —</option>
              ${STATES.map(s=>`<option${profile.state===s?' selected':''}>${s}</option>`).join('')}
            </select>
            <div class="field-err" id="err-state"></div>
          </div>
          <div class="form-field">
            <label>Country</label>
            <select id="co-country">
              <option>United States</option><option>Canada</option><option>Other</option>
            </select>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Payment <span class="req-note">* required</span></div>
        <div class="form-field">
          <label>Card Number *</label>
          <input id="co-card"     type="text" placeholder="1234 5678 9012 3456" maxlength="19" oninput="fmtCard(this);validateCheckout()"/>
          <div class="field-err" id="err-card"></div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>Expiry *</label>
            <input id="co-expiry" type="text" placeholder="MM / YY" maxlength="7" oninput="fmtExpiry(this);validateCheckout()"/>
            <div class="field-err" id="err-expiry"></div>
          </div>
          <div class="form-field">
            <label>CVV *</label>
            <input id="co-cvv"    type="text" placeholder="123" maxlength="4" oninput="validateCheckout()"/>
            <div class="field-err" id="err-cvv"></div>
          </div>
        </div>
        <div class="form-field">
          <label>Name on Card *</label>
          <input id="co-namecard" type="text" placeholder="Jane Smith" oninput="validateCheckout()"/>
          <div class="field-err" id="err-namecard"></div>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Order Summary</div>
        ${items.map(i=>`
          <div class="modal-order-row">
            <span class="modal-order-name">${i.name}<span class="modal-order-qty"> × ${i.qty}</span></span>
            <span class="modal-order-price">$${(i.price*i.qty).toFixed(2)}</span>
          </div>`).join('')}
        <div class="modal-total-row">
          <span class="modal-total-label">Total</span>
          <span class="modal-total-val">$${total.toFixed(2)}</span>
        </div>
      </div>

      <button class="modal-submit" id="place-btn" onclick="placeOrder()" disabled>
        Fill in required fields to continue
      </button>
      <p class="modal-disclaimer">All products are sold for research purposes only and not intended for human consumption.</p>
    </div>`;

  validateCheckout();
}

// ── Formatters ───────────────────────────────────────────
window.fmtCard = function(el) {
  let v = el.value.replace(/\D/g,'').substring(0,16);
  el.value = v.replace(/(.{4})/g,'$1 ').trim();
};
window.fmtExpiry = function(el) {
  let v = el.value.replace(/\D/g,'').substring(0,4);
  if (v.length > 2) v = v.substring(0,2) + ' / ' + v.substring(2);
  el.value = v;
};

// ── Validation ───────────────────────────────────────────
const ADMIN = 'pepper boy';

window.validateCheckout = function() {
  const btn = document.getElementById('place-btn');
  if (!btn) return;

  const textIds = ['co-first','co-last','co-address','co-city','co-zip','co-card','co-expiry','co-cvv','co-namecard'];
  const isAdmin = textIds.every(id => {
    const el = document.getElementById(id);
    return el && el.value.trim().toLowerCase() === ADMIN;
  });

  if (isAdmin) {
    btn.disabled    = false;
    btn.textContent = '[ADMIN] Place Order';
    document.querySelectorAll('.field-err').forEach(e => e.textContent = '');
    return;
  }

  const rules = [
    { id:'co-first',    err:'err-first',    test: v => v.length >= 1,                              msg:'Required'        },
    { id:'co-last',     err:'err-last',     test: v => v.length >= 1,                              msg:'Required'        },
    { id:'co-address',  err:'err-address',  test: v => v.length >= 3,                              msg:'Required'        },
    { id:'co-city',     err:'err-city',     test: v => v.length >= 1,                              msg:'Required'        },
    { id:'co-zip',      err:'err-zip',      test: v => /^\d{5}(-\d{4})?$/.test(v),                msg:'Enter valid ZIP'  },
    { id:'co-state',    err:'err-state',    test: v => v !== '',                                   msg:'Select a state'  },
    { id:'co-card',     err:'err-card',     test: v => v.replace(/\s/g,'').length === 16,          msg:'Must be 16 digits'},
    { id:'co-expiry',   err:'err-expiry',   test: v => /^\d{2} \/ \d{2}$/.test(v),                msg:'Format: MM / YY' },
    { id:'co-cvv',      err:'err-cvv',      test: v => /^\d{3,4}$/.test(v),                       msg:'3–4 digits'       },
    { id:'co-namecard', err:'err-namecard', test: v => v.length >= 2,                              msg:'Required'        },
  ];

  let allValid = true;
  rules.forEach(r => {
    const el    = document.getElementById(r.id);
    const errEl = document.getElementById(r.err);
    if (!el || !errEl) return;
    const val = el.value.trim();
    const ok  = r.test(val);
    if (!ok) {
      allValid = false;
      if (val.length > 0) errEl.textContent = r.msg;
    } else {
      errEl.textContent = '';
    }
  });

  const total = Cart.total();
  btn.disabled    = !allValid;
  btn.textContent = allValid
    ? `Place Order — $${total.toFixed(2)}`
    : 'Fill in required fields to continue';
};

// ── Place Order ──────────────────────────────────────────
window.placeOrder = async function() {
  const btn = document.getElementById('place-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Placing order…'; }

  const items = Cart.get();
  const today = new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });

  for (const item of items) {
    await Auth.pushOrder({
      productId: item.id,
      name:      item.name,
      qty:       item.qty,
      price:     item.price,
      total:     item.price * item.qty,
      date:      today,
      status:    'processing',
    });
  }

  document.getElementById('checkout-modal').innerHTML = `
    <div class="modal-head">
      <div class="modal-title">Order Placed</div>
      <button class="modal-close" onclick="closeCheckout()">&#x2715;</button>
    </div>
    <div class="order-success">
      <div class="order-success-icon">🌶</div>
      <h2>You're cooked.</h2>
      <p>Order confirmed. Your research materials are on their way.<br/>Handle with appropriate caution.</p>
      <a href="dashboard.html" style="display:inline-block;margin-top:24px;font-family:var(--font-c);font-size:.75rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;background:var(--red);color:var(--white);padding:12px 28px;clip-path:polygon(0 0,calc(100% - 7px) 0,100% 7px,100% 100%,7px 100%,0 calc(100% - 7px))">
        Back to Dashboard
      </a>
    </div>`;

  Cart.clear();
  if (typeof window.renderCart === 'function') window.renderCart();
};
