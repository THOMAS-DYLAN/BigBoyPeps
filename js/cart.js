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

// Sync version — used by initPage which already has the session
function buildNavFromSession(activePage, session) {
  const count    = Cart.count();
  const homeHref = 'dashboard.html';
  return `
  <nav>
    <div class="nav-inner">
      <a href="${homeHref}" class="nav-brand">${NAV_PEPPER}Big<span>Boy</span>Peps</a>
      <div class="nav-links">
        <a href="dashboard.html" class="nav-link${activePage==='dashboard'?' active':''}">Dashboard</a>
        <a href="shop.html"      class="nav-link${activePage==='shop'     ?' active':''}">Shop</a>
        <a href="orders.html"    class="nav-link${activePage==='orders'   ?' active':''}">Orders</a>
      </div>
      <div class="nav-right">
        <button onclick="Auth.logout()" class="nav-signout">Sign Out</button>
        <a href="cart.html" class="cart-nav-btn">
          Cart
          <span id="cart-badge" class="cart-badge" style="display:${count>0?'flex':'none'}">${count}</span>
        </a>
      </div>
    </div>
  </nav>`;
}

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

function buildFooterFromSession() {
  return `<footer>
    <div class="footer-inner">
      <a href="dashboard.html" class="footer-brand" style="text-decoration:none">Big<span>Boy</span>Peps</a>
      <div class="footer-copy">© 2025 BigBoyPeps · For research purposes only</div>
    </div>
  </footer>`;
}

// ── Page init helper — call at top of every protected page ─
window.initPage = async function(activePage) {
  // Fetch session ONCE — reuse everywhere, no repeated round trips
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.replace('index.html');
    return;
  }

  // Cache session on Cart so init() doesn't need its own fetch
  Cart._key = `bbp_cart_${session.user.id}`;

  // Build nav, banner, footer all from the already-fetched session
  document.getElementById('nav-mount').innerHTML    = buildNavFromSession(activePage, session);
  document.getElementById('banner-mount').innerHTML = buildBanner();
  document.getElementById('footer-mount').innerHTML = buildFooterFromSession();
  Cart.updateBadge();
};

// ── States list ──────────────────────────────────────────
const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

// ── Stripe publishable key ────────────────────────────────
// Replace with your pk_test_... or pk_live_... from Stripe → Developers → API Keys
const STRIPE_PK = 'pk_test_51TQH7bK6Egh6nYfi5WymWgeGxTBiETK7RHnBK5TSHX8b6pYzrZibmRvrIgGuRYDHmL1TGzLOPn7XYKZqdXZbpthP00M522YWsd';

// ── Checkout state ────────────────────────────────────────
let _stripe      = null;
let _cardElement = null;
let _payMethod   = null; // 'card' | 'paypal'

// ── Open ─────────────────────────────────────────────────
window.openCheckout = async function() {
  const items = Cart.get();
  if (!items.length) return;
  const overlay = document.getElementById('checkout-overlay');
  if (!overlay) return;
  const [profile, addr] = await Promise.all([Auth.getProfile(), Auth.getDefaultAddress()]);
  renderCheckoutModal(items, profile || {}, addr || {});
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.closeCheckout = function() {
  const overlay = document.getElementById('checkout-overlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
  _stripe = null; _cardElement = null; _payMethod = null;
};

// ── Render ────────────────────────────────────────────────
function renderCheckoutModal(items, profile, addr) {
  const subtotal   = items.reduce((s,i) => s + i.price * i.qty, 0);
  const shipping   = subtotal >= 50 ? 0 : 6.99;
  const orderTotal = subtotal + shipping;

  document.getElementById('checkout-modal').innerHTML = `
    <div class="modal-head">
      <div class="modal-title">Checkout</div>
      <button class="modal-close" onclick="closeCheckout()">&#x2715;</button>
    </div>
    <div class="modal-body">

      <!-- SHIPPING -->
      <div class="modal-section">
        <div class="modal-section-title">Shipping Address <span class="req-note">* required</span></div>
        <div class="form-row">
          <div class="form-field">
            <label>First Name *</label>
            <input id="co-first" type="text" placeholder="Jane" value="${profile.first_name||''}" oninput="validateShipping()"/>
            <div class="field-err" id="err-first"></div>
          </div>
          <div class="form-field">
            <label>Last Name *</label>
            <input id="co-last" type="text" placeholder="Smith" value="${profile.last_name||''}" oninput="validateShipping()"/>
            <div class="field-err" id="err-last"></div>
          </div>
        </div>
        <div class="form-field">
          <label>Street Address *</label>
          <input id="co-address" type="text" placeholder="123 Main St" value="${addr.street_line1||''}" oninput="validateShipping()"/>
          <div class="field-err" id="err-address"></div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>City *</label>
            <input id="co-city" type="text" placeholder="Austin" value="${addr.city||''}" oninput="validateShipping()"/>
            <div class="field-err" id="err-city"></div>
          </div>
          <div class="form-field">
            <label>ZIP *</label>
            <input id="co-zip" type="text" placeholder="78701" maxlength="10" value="${addr.zip||''}" oninput="validateShipping()"/>
            <div class="field-err" id="err-zip"></div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>State *</label>
            <select id="co-state" onchange="validateShipping()">
              <option value="">— Select —</option>
              ${STATES.map(s=>`<option${(addr.state||profile.state)===s?' selected':''}>${s}</option>`).join('')}
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
        <label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-family:var(--font-c);font-size:.65rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--smoke);cursor:pointer">
          <input type="checkbox" id="co-save-addr" checked style="width:14px;height:14px;accent-color:var(--red)"/>
          Save address to my account
        </label>
      </div>

      <!-- ORDER SUMMARY -->
      <div class="modal-section">
        <div class="modal-section-title">Order Summary</div>
        ${items.map(i=>`
          <div class="modal-order-row">
            <span class="modal-order-name">${i.name}<span class="modal-order-qty"> × ${i.qty}</span></span>
            <span class="modal-order-price">$${(i.price*i.qty).toFixed(2)}</span>
          </div>`).join('')}
        <div class="modal-order-row" style="color:var(--smoke);border-top:1px solid var(--border);margin-top:4px;padding-top:10px">
          <span>Shipping</span>
          <span>${shipping===0?'<span style="color:#5BC75B">Free</span>':'$'+shipping.toFixed(2)}</span>
        </div>
        <div class="modal-total-row">
          <span class="modal-total-label">Total</span>
          <span class="modal-total-val">$${orderTotal.toFixed(2)}</span>
        </div>
      </div>

      <!-- PAYMENT METHOD -->
      <div class="modal-section">
        <div class="modal-section-title">Payment Method</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:4px">
          <button id="btn-card" onclick="selectPayMethod('card')" style="display:flex;align-items:center;justify-content:center;gap:10px;padding:16px;border:1px solid var(--border);background:var(--card);color:var(--smoke);font-family:var(--font-c);font-size:.75rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:all .18s">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Pay by Card
          </button>
          <button id="btn-paypal" onclick="selectPayMethod('paypal')" style="display:flex;align-items:center;justify-content:center;gap:10px;padding:16px;border:1px solid var(--border);background:var(--card);color:var(--smoke);font-family:var(--font-c);font-size:.75rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:all .18s">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="opacity:.7"><path d="M7.144 19.532l1.049-5.751c.11-.606.691-1.042 1.304-.975 2.158.235 6.879.12 8.737-4.353 1.515-3.645-.54-6.893-5.014-6.893H6.163a1.318 1.318 0 0 0-1.301 1.112L2.473 19.385a.785.785 0 0 0 .776.907h3.568a.785.785 0 0 0 .327-.76z"/></svg>
            Pay with PayPal
          </button>
        </div>

        <!-- STRIPE CARD SECTION -->
        <div id="stripe-section" style="display:none;margin-top:20px">
          <div class="form-field">
            <label>Card Details *</label>
            <div id="stripe-card-element" style="padding:12px 14px;background:var(--card);border:1px solid var(--border);transition:border-color .2s;border-radius:0"></div>
            <div class="field-err" id="err-stripe"></div>
          </div>
          <div class="form-field" style="margin-top:14px">
            <label>Name on Card *</label>
            <input id="co-namecard" type="text" placeholder="Jane Smith" oninput="validateShipping()"/>
            <div class="field-err" id="err-namecard"></div>
          </div>
          <button class="modal-submit" id="place-btn" onclick="placeOrder()" disabled style="margin-top:16px">
            Fill in required fields to continue
          </button>
        </div>

        <!-- PAYPAL SECTION -->
        <div id="paypal-section" style="display:none;margin-top:20px">
          <div style="padding:24px;border:1px solid var(--border);background:var(--card);text-align:center">
            <div style="font-family:var(--font-c);font-size:.68rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--smoke);margin-bottom:10px">PayPal</div>
            <p style="font-size:.78rem;color:var(--smoke);font-style:italic;margin-bottom:16px">PayPal connects when your business account is set up.</p>
            <button onclick="simulatePayPal()" style="background:#0070ba;color:#fff;padding:13px 32px;font-family:var(--font-c);font-size:.78rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;border:none;cursor:pointer;width:100%;max-width:280px">
              Continue with PayPal
            </button>
          </div>
        </div>
      </div>

      <p class="modal-disclaimer">All products are sold for research purposes only and not intended for human consumption.</p>
    </div>`;
}

// ── Payment method selection ──────────────────────────────
window.selectPayMethod = async function(method) {
  _payMethod = method;

  // Style the selected button
  const cardBtn   = document.getElementById('btn-card');
  const paypalBtn = document.getElementById('btn-paypal');
  if (cardBtn)   { cardBtn.style.borderColor   = method==='card'   ? 'var(--red)' : 'var(--border)'; cardBtn.style.color   = method==='card'   ? 'var(--white)' : 'var(--smoke)'; }
  if (paypalBtn) { paypalBtn.style.borderColor = method==='paypal' ? 'var(--red)' : 'var(--border)'; paypalBtn.style.color = method==='paypal' ? 'var(--white)' : 'var(--smoke)'; }

  document.getElementById('stripe-section').style.display = method==='card'   ? 'block' : 'none';
  document.getElementById('paypal-section').style.display = method==='paypal' ? 'block' : 'none';

  if (method === 'card') {
    await mountStripe();
    validateShipping();
  }
};

// ── Mount Stripe Elements ─────────────────────────────────
async function mountStripe() {
  if (_cardElement) return;
  try {
    if (!window.Stripe) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://js.stripe.com/v3/';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    _stripe = window.Stripe(STRIPE_PK);
    const elements = _stripe.elements();
    _cardElement = elements.create('card', {
      style: {
        base: {
          color: '#EEEBE6',
          fontFamily: '"Barlow", sans-serif',
          fontSize: '15px',
          '::placeholder': { color: '#444' },
        },
        invalid: { color: '#FF3030' },
      }
    });
    _cardElement.mount('#stripe-card-element');
    _cardElement.on('change', validateShipping);
    _cardElement.on('focus', () => { document.getElementById('stripe-card-element').style.borderColor = 'var(--red)'; });
    _cardElement.on('blur',  () => { document.getElementById('stripe-card-element').style.borderColor = 'var(--border)'; });
  } catch(e) {
    const err = document.getElementById('err-stripe');
    if (err) err.textContent = 'Could not load Stripe. Check your publishable key.';
  }
}

// ── Shipping validation ───────────────────────────────────
const SHIP_RULES = [
  { id:'co-first',   err:'err-first',   test: v => v.length >= 1,              msg:'Required'        },
  { id:'co-last',    err:'err-last',    test: v => v.length >= 1,              msg:'Required'        },
  { id:'co-address', err:'err-address', test: v => v.length >= 3,              msg:'Required'        },
  { id:'co-city',    err:'err-city',    test: v => v.length >= 1,              msg:'Required'        },
  { id:'co-zip',     err:'err-zip',     test: v => /^\d{5}(-\d{4})?$/.test(v), msg:'Enter valid ZIP' },
  { id:'co-state',   err:'err-state',   test: v => v !== '',                   msg:'Select a state'  },
];

function shippingValid() {
  return SHIP_RULES.every(r => {
    const el = document.getElementById(r.id);
    return el && r.test(el.value.trim());
  });
}

window.validateShipping = function() {
  SHIP_RULES.forEach(r => {
    const el = document.getElementById(r.id);
    const errEl = document.getElementById(r.err);
    if (!el || !errEl) return;
    const val = el.value.trim();
    errEl.textContent = !r.test(val) && val.length > 0 ? r.msg : '';
  });

  const btn = document.getElementById('place-btn');
  if (!btn) return;
  const namecard = document.getElementById('co-namecard');
  const cardOk   = !!_cardElement && !!namecard && namecard.value.trim().length >= 2;
  const allOk    = shippingValid() && cardOk;
  const total    = Cart.total() + (Cart.total() >= 50 ? 0 : 6.99);
  btn.disabled    = !allOk;
  btn.textContent = allOk ? `Pay $${total.toFixed(2)}` : 'Fill in required fields to continue';
};

// ── Place Order via Stripe ────────────────────────────────
window.placeOrder = async function() {
  const btn = document.getElementById('place-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Processing…'; }

  try {
    const items    = Cart.get();
    const subtotal = items.reduce((s,i) => s + i.price * i.qty, 0);
    const total    = subtotal + (subtotal >= 50 ? 0 : 6.99);
    const { data: { session } } = await supabase.auth.getSession();

    // Call Edge Function to create PaymentIntent
    const res = await fetch(
      'https://utqviljholfvpfztfuvx.supabase.co/functions/v1/create-payment-intent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ amount: total, currency: 'usd' }),
      }
    );
    const { clientSecret, error: fnErr } = await res.json();
    if (fnErr) throw new Error(fnErr);

    // Confirm payment with Stripe
    const first = document.getElementById('co-first')?.value.trim() || '';
    const last  = document.getElementById('co-last')?.value.trim()  || '';
    const { error: stripeErr } = await _stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: _cardElement,
        billing_details: { name: `${first} ${last}` },
      }
    });
    if (stripeErr) throw new Error(stripeErr.message);

    await finishOrder();

  } catch(err) {
    const errEl = document.getElementById('err-stripe');
    if (errEl) errEl.textContent = err.message;
    if (btn) { btn.disabled = false; btn.textContent = 'Try Again'; }
  }
};

// PayPal simulate (replace with real PayPal SDK when ready)
window.simulatePayPal = async function() {
  if (!shippingValid()) {
    alert('Please fill in your shipping address first.');
    return;
  }
  await finishOrder();
};

// ── Save shipping + orders + show success ─────────────────
async function finishOrder() {
  const items = Cart.get();

  // Save shipping address if checked
  if (document.getElementById('co-save-addr')?.checked) {
    await Auth.saveAddress({
      label:        'Default',
      first_name:   document.getElementById('co-first')?.value.trim()   || '',
      last_name:    document.getElementById('co-last')?.value.trim()    || '',
      street_line1: document.getElementById('co-address')?.value.trim() || '',
      city:         document.getElementById('co-city')?.value.trim()    || '',
      state:        document.getElementById('co-state')?.value          || '',
      zip:          document.getElementById('co-zip')?.value.trim()     || '',
      country:      document.getElementById('co-country')?.value        || 'United States',
      is_default:   true,
    });
  }

  // Push orders to Supabase
  for (const item of items) {
    await Auth.pushOrder({
      productId: item.id,
      name:      item.name,
      qty:       item.qty,
      price:     item.price,
      total:     item.price * item.qty,
    });
  }

  // Success screen
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
}
