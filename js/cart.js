// ═══════════════════════════════════════════════════════
// BigBoyPeps — Cart + Shared UI
// ═══════════════════════════════════════════════════════

import { supabase } from './supabase.js';

// ── Discount Codes ───────────────────────────────────────
const DISCOUNT_CODES = {
  'DEZI10': { pct: 10, label: 'Dezi10' },
};

let _appliedDiscount = null; // { code, pct, label } or null

window.applyDiscount = function(code) {
  const key    = (code || '').trim().toUpperCase();
  const match  = DISCOUNT_CODES[key];
  const errEl  = document.getElementById('discount-err');
  const okEl   = document.getElementById('discount-ok');
  if (errEl) errEl.textContent = '';
  if (okEl)  okEl.textContent  = '';

  if (!key)   { if (errEl) errEl.textContent = 'Enter a code first.'; return; }
  if (!match) { if (errEl) errEl.textContent = 'Invalid discount code.'; return; }

  _appliedDiscount = { code: match.label, pct: match.pct };
  if (okEl) okEl.textContent = match.pct + '% discount applied!';
  if (typeof window.renderCart === 'function') window.renderCart();
};

window.removeDiscount = function() {
  _appliedDiscount = null;
  const okEl = document.getElementById('discount-ok');
  if (okEl) okEl.textContent = '';
  if (typeof window.renderCart === 'function') window.renderCart();
};

window.getDiscount = function() { return _appliedDiscount; };

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
    const cached  = window.ProductCache?.[product.id];
    const liveInv = cached?.inventory ?? product.inventory ?? 0;
    if (liveInv <= 0) return { ok: false, err: 'out_of_stock' };

    const items      = this.get();
    const existing   = items.find(i => i.id === product.id && !i.isBundle);
    const currentQty = existing ? existing.qty : 0;
    if (currentQty + 1 > liveInv) return { ok: false, err: 'insufficient_stock', available: liveInv };

    if (existing) existing.qty += 1;
    else items.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
    this.save(items);
    this.updateBadge();
    return { ok: true };
  },

  addBundle(bundle) {
    // bundle = { id, name, price (bundle_price), bundleQty (10) }
    const cached  = window.ProductCache?.[bundle.id];
    const liveInv = cached?.inventory ?? 0;
    if (liveInv < bundle.bundleQty) return { ok: false, err: 'insufficient_stock' };

    const items    = this.get();
    const existing = items.find(i => i.id === bundle.id && i.isBundle);
    if (existing) {
      // Already have this bundle — check stock for another bundle of 10
      if ((existing.qty + 1) * bundle.bundleQty > liveInv) return { ok: false, err: 'insufficient_stock' };
      existing.qty += 1;
    } else {
      items.push({
        id:        bundle.id,
        name:      bundle.name + ' (Bundle ×10)',
        price:     bundle.price,
        qty:       1,
        isBundle:  true,
        bundleQty: bundle.bundleQty,
      });
    }
    this.save(items);
    this.updateBadge();
    return { ok: true };
  },

  remove(id) {
    this.save(this.get().filter(i => i.id !== id));
    this.updateBadge();
  },

  setQty(id, qty) {
    const items = this.get();
    const item  = items.find(i => i.id === id);
    if (item) { item.qty = Math.max(1, qty); this.save(items); }
    this.updateBadge();
  },

  clear() { this.save([]); this.updateBadge(); },
  total()  { return this.get().reduce((s,i) => s + i.price * i.qty, 0); },
  count()  { return this.get().reduce((s,i) => s + i.qty, 0); },

  updateBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const n = this.count();
    badge.textContent   = n;
    badge.style.display = n > 0 ? 'flex' : 'none';
  },
};

// ── Nav logo ─────────────────────────────────────────────
const NAV_LOGO = '<img src="img/logo.png" alt="BigBoyPeps" style="height:38px;width:38px;object-fit:contain;border-radius:2px" />';

// ── Build Nav ────────────────────────────────────────────
window.buildNav = async function(activePage) {
  const { data } = await supabase.auth.getSession();
  const loggedIn = !!data.session;
  const count    = Cart.count();
  const homeHref = loggedIn ? 'dashboard.html' : 'index.html';

  const centerLinks = loggedIn
    ? '<a href="dashboard.html" class="nav-link' + (activePage==='dashboard'?' active':'') + '">Dashboard</a>'
    + '<a href="shop.html" class="nav-link' + (activePage==='shop'?' active':'') + '">Shop</a>'
    + '<a href="orders.html" class="nav-link' + (activePage==='orders'?' active':'') + '">Orders</a>'
    : '';

  const rightSide = loggedIn
    ? '<button onclick="Auth.logout()" class="nav-signout">Sign Out</button>'
    + '<a href="cart.html" class="cart-nav-btn">Cart<span id="cart-badge" class="cart-badge" style="display:' + (count>0?'flex':'none') + '">' + count + '</span></a>'
    : '<a href="index.html" class="nav-signin">Sign In</a>';

  return '<nav><div class="nav-inner"><a href="' + homeHref + '" class="nav-brand">' + NAV_LOGO + '</a><div class="nav-links">' + centerLinks + '</div><div class="nav-right">' + rightSide + '</div></div></nav>';
};

function buildNavFromSession(activePage, session) {
  const count = Cart.count();

  const tabs = [
    { href: 'dashboard.html', label: 'Home',   icon: '⌂', page: 'dashboard' },
    { href: 'shop.html',      label: 'Shop',   icon: '◈', page: 'shop'      },
    { href: 'orders.html',    label: 'Orders', icon: '☰', page: 'orders'    },
  ];

  const navLinks = tabs.map(t =>
    '<a href="' + t.href + '" class="nav-link' + (activePage===t.page?' active':'') + '">'
    + '<span class="nav-icon">' + t.icon + '</span>'
    + '<span class="nav-label">' + t.label + '</span>'
    + '</a>'
  ).join('');

  const cartBadgeHtml = '<span id="cart-badge" class="cart-badge" style="display:' + (count>0?'flex':'none') + '">' + count + '</span>';

  // Mobile-only sign out tab (hidden on desktop via CSS)
  const mobileSignOut = '<button onclick="Auth.logout()" class="nav-signout-tab">'
    + '<span class="nav-icon">⏻</span>'
    + '<span class="nav-label">Sign Out</span>'
    + '</button>';

  return '<nav>'
    + '<div class="nav-inner">'
    + '<a href="dashboard.html" class="nav-brand">' + NAV_LOGO + '</a>'
    + '<div class="nav-links">' + navLinks + '</div>'
    + '<div class="nav-right">'
    + '<button onclick="Auth.logout()" class="nav-signout">Sign Out</button>'
    + '<a href="cart.html" class="cart-nav-btn">'
    + '<span class="nav-icon">⊕</span>'
    + '<span class="nav-label">Cart</span>'
    + cartBadgeHtml
    + '</a>'
    + mobileSignOut
    + '</div>'
    + '</div>'
    + '</nav>';
}

window.toggleMobileNav = function() {};
window.closeMobileNav  = function() {};

window.buildBanner = function() {
  return '<div class="research-banner"><p>For Research Purposes Only <span>— Not for human consumption. Handle with appropriate care.</span></p></div>';
};

window.buildFooter = async function() {
  const { data } = await supabase.auth.getSession();
  const href = data.session ? 'dashboard.html' : 'index.html';
  return '<footer><div class="footer-inner"><a href="' + href + '" class="footer-brand" style="text-decoration:none;display:flex;align-items:center"><img src="img/logo.png" alt="BigBoyPeps" style="height:32px;object-fit:contain"></a><div class="footer-copy">© 2025 BigBoyPeps · For research purposes only</div></div></footer>';
};

function buildFooterFromSession() {
  return '<footer><div class="footer-inner"><a href="dashboard.html" class="footer-brand" style="text-decoration:none;display:flex;align-items:center"><img src="img/logo.png" alt="BigBoyPeps" style="height:32px;object-fit:contain"></a><div class="footer-copy">© 2025 BigBoyPeps · For research purposes only</div></div></footer>';
}

// ── Placeholder nav — renders instantly before auth ───────
function buildPlaceholderNav() {
  return '<nav>'
    + '<div class="nav-inner">'
    + '<a href="dashboard.html" class="nav-brand">' + NAV_LOGO + '</a>'
    + '<div class="nav-links" style="opacity:.25;pointer-events:none">'
    + '<span class="nav-link">Home</span>'
    + '<span class="nav-link">Shop</span>'
    + '<span class="nav-link">Orders</span>'
    + '</div>'
    + '<div class="nav-right" style="opacity:.25;pointer-events:none">'
    + '<span class="nav-signout">···</span>'
    + '</div>'
    + '</div>'
    + '</nav>';
}

// ── Page init ─────────────────────────────────────────────
window.initPage = async function(activePage) {
  // 1. Render nav + banner IMMEDIATELY — zero network wait
  //    User sees the nav bar right away while auth check runs
  document.getElementById('nav-mount').innerHTML    = buildPlaceholderNav();
  document.getElementById('banner-mount').innerHTML = window.buildBanner();

  // 2. Auth check — runs in parallel with page data loading
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.replace('index.html'); return; }

  // 3. Swap placeholder for real nav (instant — no extra network call)
  Cart._key = 'bbp_cart_' + session.user.id;
  document.getElementById('nav-mount').innerHTML    = buildNavFromSession(activePage, session);
  document.getElementById('footer-mount').innerHTML = buildFooterFromSession();
  Cart.updateBadge();
};

// ── States ────────────────────────────────────────────────
const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

// ── Keys ──────────────────────────────────────────────────
// Replace with live Client ID from developer.paypal.com → Apps & Credentials → Live
const PAYPAL_CLIENT_ID  = 'AZSLv66rtWR7MDNObiUvYST-XeQEl4-aDzwxsV42ocY3EGXLLUscQ1l_zmmB4FPOOAkMLU5wlMpsGYUa';
const CASHAPP_USERNAME  = '$BigBoyPeps';

// ── Shipping options ──────────────────────────────────────────
const SHIPPING_OPTIONS = [
  { id: 'usps', label: 'USPS Standard Shipping', carrier: 'USPS', days: '5–7 business days', price: 15.00 },
  { id: 'ups2', label: 'UPS 2-Day Air',           carrier: 'UPS',  days: '2 business days',  price: 40.00 },
];

function getSelectedShipping() {
  const el = document.getElementById('co-shipping-method');
  const id = el ? el.value : 'usps';
  return SHIPPING_OPTIONS.find(s => s.id === id) || SHIPPING_OPTIONS[0];
}

window.updateShippingTotal = function() {
  const items       = Cart.get();
  const subtotal    = items.reduce((s,i) => s + i.price * i.qty, 0);
  const discount    = _appliedDiscount;
  const discountAmt = discount ? Math.round(subtotal * discount.pct) / 100 : 0;
  const ship        = getSelectedShipping();
  const el          = document.getElementById('modal-total-val');
  if (el) el.textContent = '$' + (subtotal - discountAmt + ship.price).toFixed(2);
};

// ── Checkout state ────────────────────────────────────────
// ── Open / Close ──────────────────────────────────────────
window.openCheckout = async function() {
  const items = Cart.get();
  if (!items.length) return;
  const overlay = document.getElementById('checkout-overlay');
  if (!overlay) return;
  const [profile, addr] = await Promise.all([Auth.getProfile(), Auth.getDefaultAddress()]);
  renderCheckoutModal(items, profile || {}, addr || {});
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  await Promise.all([mountPayPal(), mountCashApp(), mountZelle(), mountBitcoin()]);
};

window.closeCheckout = function() {
  const overlay = document.getElementById('checkout-overlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
};

// ── Shipping rules ────────────────────────────────────────
// ── Shipping validation ───────────────────────────────────
const SHIP_RULES = [
  { id:'co-first',   err:'err-first',   test: v => v.length >= 1,               msg:'Required'        },
  { id:'co-last',    err:'err-last',    test: v => v.length >= 1,               msg:'Required'        },
  { id:'co-address', err:'err-address', test: v => v.length >= 3,               msg:'Required'        },
  { id:'co-city',    err:'err-city',    test: v => v.length >= 1,               msg:'Required'        },
  { id:'co-zip',     err:'err-zip',     test: v => /^\d{5}(-\d{4})?$/.test(v),  msg:'Enter valid ZIP' },
  { id:'co-state',   err:'err-state',   test: v => v !== '',                    msg:'Select a state'  },
];

function shippingValid() {
  return SHIP_RULES.every(r => {
    const el = document.getElementById(r.id);
    return el && r.test(el.value.trim());
  });
}

window.validateShipping = function() {
  SHIP_RULES.forEach(r => {
    const el    = document.getElementById(r.id);
    const errEl = document.getElementById(r.err);
    if (!el || !errEl) return;
    const val = el.value.trim();
    errEl.textContent = !r.test(val) && val.length > 0 ? r.msg : '';
  });
  // PayPal SDK handles payment UI — no card button to update
};

// ── Capture shipping from form ────────────────────────────
function captureShipping() {
  var method = getSelectedShipping();
  return {
    first_name:      document.getElementById('co-first')?.value.trim()   || '',
    last_name:       document.getElementById('co-last')?.value.trim()    || '',
    street_line1:    document.getElementById('co-address')?.value.trim() || '',
    city:            document.getElementById('co-city')?.value.trim()    || '',
    state:           document.getElementById('co-state')?.value          || '',
    zip:             document.getElementById('co-zip')?.value.trim()     || '',
    country:         document.getElementById('co-country')?.value        || 'United States',
    phone:           document.getElementById('co-phone')?.value.trim()   || '',
    saveAddr:        document.getElementById('co-save-addr')?.checked    ?? true,
    shipping_method: method.label,
    shipping_carrier:method.carrier,
    shipping_price:  method.price,
  };
}

// ── Render checkout modal ─────────────────────────────────
function renderCheckoutModal(items, profile, addr) {
  const subtotal    = items.reduce((s,i) => s + i.price * i.qty, 0);
  const discount    = _appliedDiscount;
  const discountAmt = discount ? Math.round(subtotal * discount.pct) / 100 : 0;
  const discounted  = subtotal - discountAmt;
  const defaultShip = SHIPPING_OPTIONS[0];
  const orderTotal  = discounted + defaultShip.price;

  var stateOptions = STATES.map(function(s) {
    return '<option' + ((addr.state || profile.state) === s ? ' selected' : '') + '>' + s + '</option>';
  }).join('');

  var orderRows = items.map(function(i) {
    return '<div class="modal-order-row"><span class="modal-order-name">' + i.name + '<span class="modal-order-qty"> &times; ' + i.qty + '</span></span><span class="modal-order-price">$' + (i.price*i.qty).toFixed(2) + '</span></div>';
  }).join('');

  document.getElementById('checkout-modal').innerHTML =
    '<div class="modal-head">'
    + '<div class="modal-title">Checkout</div>'
    + '<button class="modal-close" onclick="closeCheckout()">&#x2715;</button>'
    + '</div>'
    + '<div class="modal-body">'

    // ── SHIPPING ──────────────────────────────────────────
    + '<div class="modal-section">'
    + '<div class="modal-section-title">Shipping Address <span class="req-note">* required</span></div>'
    + '<div class="form-row">'
    + '<div class="form-field"><label>First Name *</label><input id="co-first" type="text" placeholder="Jane" value="' + (profile.first_name||'') + '" oninput="validateShipping()"/><div class="field-err" id="err-first"></div></div>'
    + '<div class="form-field"><label>Last Name *</label><input id="co-last" type="text" placeholder="Smith" value="' + (profile.last_name||'') + '" oninput="validateShipping()"/><div class="field-err" id="err-last"></div></div>'
    + '</div>'
    + '<div class="form-field"><label>Street Address *</label><input id="co-address" type="text" placeholder="123 Main St" value="' + (addr.street_line1||'') + '" oninput="validateShipping()"/><div class="field-err" id="err-address"></div></div>'
    + '<div class="form-row">'
    + '<div class="form-field"><label>City *</label><input id="co-city" type="text" placeholder="Austin" value="' + (addr.city||'') + '" oninput="validateShipping()"/><div class="field-err" id="err-city"></div></div>'
    + '<div class="form-field"><label>ZIP *</label><input id="co-zip" type="text" placeholder="78701" maxlength="10" value="' + (addr.zip||'') + '" oninput="validateShipping()"/><div class="field-err" id="err-zip"></div></div>'
    + '</div>'
    + '<div class="form-row">'
    + '<div class="form-field"><label>State *</label><select id="co-state" onchange="validateShipping()"><option value="">— Select —</option>' + stateOptions + '</select><div class="field-err" id="err-state"></div></div>'
    + '<div class="form-field"><label>Country</label><select id="co-country"><option>United States</option><option>Canada</option><option>Other</option></select></div>'
    + '</div>'
    + '<div class="form-field" style="margin-top:8px"><label>Phone Number <span style="font-weight:400;color:var(--smoke);font-size:.6rem;letter-spacing:.06em;text-transform:none">(optional)</span></label><input id="co-phone" type="tel" placeholder="(555) 000-0000" value="' + (profile.phone||'') + '" style="width:100%" /></div>'
    + '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-family:var(--font-c);font-size:.65rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--smoke);cursor:pointer"><input type="checkbox" id="co-save-addr" checked style="width:14px;height:14px;accent-color:var(--red)"/> Save address to my account</label>'
    + '</div>'

    // ── ORDER SUMMARY ─────────────────────────────────────
    + '<div class="modal-section">'
    + '<div class="modal-section-title">Order Summary</div>'
    + orderRows
    + '<div class="modal-order-row" style="color:var(--smoke);border-top:1px solid var(--border);margin-top:4px;padding-top:10px"><span>Subtotal</span><span>$' + subtotal.toFixed(2) + '</span></div>'
    + (discount ? '<div class="modal-order-row" style="color:#5BC75B;padding-top:4px"><span>' + discount.code + ' (' + discount.pct + '% off)</span><span>-$' + discountAmt.toFixed(2) + '</span></div>' : '')
    + '<div class="modal-order-row" style="color:var(--smoke);padding-top:6px">'
    + '<span style="font-family:var(--font-c);font-size:.63rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase">Shipping</span>'
    + '<select id="co-shipping-method" onchange="updateShippingTotal()" style="background:var(--card);color:var(--white);border:1px solid var(--border);padding:6px 10px;font-size:.8rem;outline:none;cursor:pointer;max-width:220px">'
    + SHIPPING_OPTIONS.map(function(s) { return '<option value="' + s.id + '">$' + s.price.toFixed(2) + ' — ' + s.label + ' (' + s.days + ')</option>'; }).join('')
    + '</select>'
    + '</div>'
    + '<div class="modal-total-row"><span class="modal-total-label">Total</span><span class="modal-total-val" id="modal-total-val">$' + orderTotal.toFixed(2) + '</span></div>'
    + '</div>'

    // ── DISCOUNT CODE ─────────────────────────────────────
    + '<div class="modal-section" style="padding-top:16px;padding-bottom:16px">'
    + '<div class="modal-section-title" style="margin-bottom:10px">Discount Code</div>'
    + '<div style="display:flex;gap:8px">'
    + '<input id="modal-discount-input" type="text" placeholder="Enter code" style="flex:1;background:var(--card);border:1px solid var(--border);color:var(--white);padding:10px 12px;font-family:var(--font-c);font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;outline:none;transition:border-color .18s" onfocus="this.style.borderColor=\'var(--red)\'" onblur="this.style.borderColor=\'var(--border)\'" />'
    + '<button onclick="applyDiscountInModal()" style="padding:10px 16px;font-family:var(--font-c);font-size:.68rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;background:var(--red);color:var(--white);white-space:nowrap;transition:background .18s;flex-shrink:0" onmouseover="this.style.background=\'var(--red-hot)\'" onmouseout="this.style.background=\'var(--red)\'">Apply</button>'
    + '</div>'
    + '<div id="modal-discount-err" style="font-family:var(--font-c);font-size:.65rem;font-weight:700;letter-spacing:.08em;color:var(--red);margin-top:6px;min-height:18px"></div>'
    + '<div id="modal-discount-ok"  style="font-family:var(--font-c);font-size:.65rem;font-weight:700;letter-spacing:.08em;color:#5BC75B;margin-top:2px;display:none"></div>'
    + '</div>'

    // ── PAYMENT ───────────────────────────────────────────
    + '<div class="modal-section" style="padding:0">'
    + '<div style="'
    +   'background:#060f1c;'
    +   'border-top:2px solid var(--red);'
    +   'border-left:1px solid rgba(184,137,42,.25);'
    +   'border-right:1px solid rgba(184,137,42,.25);'
    +   'border-bottom:1px solid rgba(184,137,42,.25);'
    +   'border-radius:0 0 3px 3px;'
    +   'padding:20px 20px 16px;'
    +   'box-shadow:0 4px 24px rgba(0,0,0,.5);'
    + '">'

    // Header row
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
    + '<div style="display:flex;align-items:center;gap:8px">'
    + '<svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">'
    +   '<rect x="1" y="7" width="12" height="9" rx="1.5" fill="none" stroke="#B8892A" stroke-width="1.3"/>'
    +   '<path d="M4 7V4.5a3 3 0 1 1 6 0V7" stroke="#B8892A" stroke-width="1.3" stroke-linecap="round"/>'
    + '</svg>'
    + '<span style="font-family:var(--font-c);font-size:.7rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--white)">Secure Payment</span>'
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:5px">'
    + '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.3" stroke="#3A5F8A" stroke-width="1"/><path d="M6 3v3.5l2 1.5" stroke="#3A5F8A" stroke-width="1" stroke-linecap="round"/></svg>'
    + '<span style="font-size:.6rem;color:var(--smoke);font-family:var(--font-c);letter-spacing:.06em">256-bit encrypted</span>'
    + '</div>'
    + '</div>'

    // Divider
    + '<div style="height:1px;background:linear-gradient(90deg,transparent,rgba(184,137,42,.3),transparent);margin-bottom:16px"></div>'

    // PayPal buttons
    + '<div id="paypal-button-container"></div>'

    // OR separator
    + '<div style="display:flex;align-items:center;gap:10px;margin:12px 0">'
    + '<div style="flex:1;height:1px;background:var(--border)"></div>'
    + '<span style="font-family:var(--font-c);font-size:.6rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--smoke)">or</span>'
    + '<div style="flex:1;height:1px;background:var(--border)"></div>'
    + '</div>'

    // Cash App button
    + '<div id="cashapp-container"></div>'

    // OR separator
    + '<div style="display:flex;align-items:center;gap:10px;margin:12px 0">'
    + '<div style="flex:1;height:1px;background:var(--border)"></div>'
    + '<span style="font-family:var(--font-c);font-size:.6rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--smoke)">or</span>'
    + '<div style="flex:1;height:1px;background:var(--border)"></div>'
    + '</div>'

    // Zelle button
    + '<div id="zelle-container"></div>'

    // OR separator
    + '<div style="display:flex;align-items:center;gap:10px;margin:12px 0">'
    + '<div style="flex:1;height:1px;background:var(--border)"></div>'
    + '<span style="font-family:var(--font-c);font-size:.6rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--smoke)">or</span>'
    + '<div style="flex:1;height:1px;background:var(--border)"></div>'
    + '</div>'

    // Bitcoin button
    + '<div id="bitcoin-container"></div>'

    + '</div>'
    + '</div>'

    + '<p class="modal-disclaimer">All products are sold for research purposes only and not intended for human consumption.</p>'
    + '</div>';
}



// ── Apply discount from within the checkout modal ────────────
window.applyDiscountInModal = function() {
  var input  = document.getElementById('modal-discount-input');
  var errEl  = document.getElementById('modal-discount-err');
  var okEl   = document.getElementById('modal-discount-ok');
  if (!input) return;
  var code = input.value.trim().toUpperCase();
  errEl.textContent = '';
  okEl.style.display = 'none';

  if (!code) { errEl.textContent = 'Please enter a code.'; return; }

  var found = DISCOUNT_CODES[code];
  if (!found) { errEl.textContent = 'Invalid discount code.'; return; }

  _appliedDiscount = { code: code, pct: found.pct, label: found.label };

  // Update the order summary rows + total in the modal live
  var items     = Cart.get();
  var subtotal  = items.reduce(function(s,i) { return s + i.price * i.qty; }, 0);
  var discAmt   = Math.round(subtotal * found.pct) / 100;
  var ship      = getSelectedShipping().price;
  var newTotal  = subtotal - discAmt + ship;

  var totalEl = document.getElementById('modal-total-val');
  if (totalEl) totalEl.textContent = '$' + newTotal.toFixed(2);

  // Inject/update discount row in Order Summary
  var existingRow = document.getElementById('modal-discount-row');
  if (existingRow) {
    existingRow.querySelector('span:last-child').textContent = '-$' + discAmt.toFixed(2);
  } else {
    var subtotalRow = document.querySelector('.modal-order-row');
    if (subtotalRow && subtotalRow.parentNode) {
      var discRow = document.createElement('div');
      discRow.id = 'modal-discount-row';
      discRow.className = 'modal-order-row';
      discRow.style.cssText = 'color:#5BC75B;padding-top:4px';
      discRow.innerHTML = '<span>' + code + ' (' + found.pct + '% off)</span><span>-$' + discAmt.toFixed(2) + '</span>';
      subtotalRow.parentNode.insertBefore(discRow, subtotalRow.nextSibling);
    }
  }
  okEl.textContent  = found.label + ' — ' + found.pct + '% off applied';
  okEl.style.display = 'block';
  input.value = '';
  input.disabled = true;
  input.style.opacity = '.5';
};

// ── PayPal SDK loader ─────────────────────────────────────
// Loads the SDK once with both buttons + hosted-card-fields components.
// Re-uses the existing script tag on subsequent modal opens.
function loadPayPalSDK() {
  return new Promise(function(resolve, reject) {
    if (window.paypal) { resolve(); return; }
    var existing = document.querySelector('script[src*="paypal.com/sdk"]');
    if (existing) existing.remove();
    var script = document.createElement('script');
    script.src = 'https://www.paypal.com/sdk/js?client-id=' + PAYPAL_CLIENT_ID
      + '&currency=USD&intent=capture'
      + '&components=buttons,hosted-fields'
      + '&enable-funding=venmo,paylater'
      + '&disable-funding=credit';
    script.onload  = resolve;
    script.onerror = function() { reject(new Error('PayPal SDK failed to load')); };
    document.head.appendChild(script);
  });
}

// ── Shared createOrder factory ────────────────────────────
function makeCreateOrder() {
  var items    = Cart.get();
  var subtotal = items.reduce(function(s,i) { return s + i.price * i.qty; }, 0);
  var discount = _appliedDiscount;
  var discAmt  = discount ? Math.round(subtotal * discount.pct) / 100 : 0;
  var ship     = getSelectedShipping().price;
  var total    = (subtotal - discAmt + ship).toFixed(2);
  return function(data, actions) {
    return actions.order.create({
      intent: 'CAPTURE',
      purchase_units: [{ amount: { value: total, currency_code: 'USD' } }],
    });
  };
}

// ── Card field styles (injected into PayPal iframes) ──────
var CARD_FIELD_STYLES = {
  'input': {
    'font-size':       '14px',
    'font-family':     'Barlow, system-ui, sans-serif',
    'color':           '#C2DAFF',
    'background':      'transparent',
    'padding':         '0',
    '-webkit-font-smoothing': 'antialiased',
  },
  ':focus': { 'color': '#EEF4FF' },
  '::placeholder': { 'color': '#3A5F8A' },
  '.invalid': { 'color': '#f88' },
};

// ── Hosted card fields ────────────────────────────────────
async function mountHostedCardFields(container) {
  // Inject the card form HTML into the container
  container.innerHTML =
    // Card number
    '<div style="margin-bottom:12px">'
    + '<label style="display:block;font-size:11px;color:var(--ash);margin-bottom:5px;font-family:var(--font-c);letter-spacing:.08em;text-transform:uppercase">Card Number</label>'
    + '<div id="ppcard-number" style="'
    +   'background:var(--card);border:1px solid var(--border);'
    +   'height:40px;padding:0 12px;display:flex;align-items:center;'
    +   'transition:border-color .18s;border-radius:2px'
    + '"></div>'
    + '</div>'
    // Expiry + CVV row
    + '<div style="display:flex;gap:10px;margin-bottom:16px">'
    +   '<div style="flex:1">'
    +     '<label style="display:block;font-size:11px;color:var(--ash);margin-bottom:5px;font-family:var(--font-c);letter-spacing:.08em;text-transform:uppercase">Expiry</label>'
    +     '<div id="ppcard-expiry" style="'
    +       'background:var(--card);border:1px solid var(--border);'
    +       'height:40px;padding:0 12px;display:flex;align-items:center;'
    +       'transition:border-color .18s;border-radius:2px'
    +     '"></div>'
    +   '</div>'
    +   '<div style="flex:1">'
    +     '<label style="display:block;font-size:11px;color:var(--ash);margin-bottom:5px;font-family:var(--font-c);letter-spacing:.08em;text-transform:uppercase">CVV</label>'
    +     '<div id="ppcard-cvv" style="'
    +       'background:var(--card);border:1px solid var(--border);'
    +       'height:40px;padding:0 12px;display:flex;align-items:center;'
    +       'transition:border-color .18s;border-radius:2px'
    +     '"></div>'
    +   '</div>'
    + '</div>'
    // Submit button
    + '<button id="ppcard-submit" style="'
    +   'width:100%;height:46px;background:var(--red);color:var(--white);'
    +   'border:none;border-radius:2px;cursor:pointer;'
    +   'font-family:var(--font-c);font-size:.8rem;font-weight:700;'
    +   'letter-spacing:.14em;text-transform:uppercase;'
    +   'transition:background .18s;display:flex;align-items:center;justify-content:center;gap:8px'
    + '" onmouseover="this.style.background=\'var(--red-hot)\'" onmouseout="this.style.background=\'var(--red)\'">'
    +   '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x=".7" y="5.7" width="14.6" height="10" rx="1.3" stroke="#fff" stroke-width="1.3"/><path d="M1 9h14" stroke="#fff" stroke-width="1.3"/><path d="M4.5 3.5V3a3.5 3.5 0 0 1 7 0v.5" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/></svg>'
    +   'Pay with Card'
    + '</button>'
    + '<div id="ppcard-err" style="min-height:18px;margin-top:8px;font-size:12px;color:#f88;font-family:var(--font-c);letter-spacing:.04em"></div>';

  // Focus ring on hosted field wrappers
  ['ppcard-number','ppcard-expiry','ppcard-cvv'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('focus',    function() { el.style.borderColor = 'var(--red)'; }, true);
    el.addEventListener('blur',     function() { el.style.borderColor = 'var(--border)'; }, true);
    el.addEventListener('mouseover',function() { el.style.borderColor = 'var(--smoke)'; });
    el.addEventListener('mouseout', function() { el.style.borderColor = 'var(--border)'; });
  });

  var cardFields = window.paypal.HostedFields.render({
    createOrder: makeCreateOrder(),
    styles: CARD_FIELD_STYLES,
    fields: {
      number: { selector: '#ppcard-number', placeholder: '•••• •••• •••• ••••' },
      expirationDate: { selector: '#ppcard-expiry', placeholder: 'MM / YY' },
      cvv:    { selector: '#ppcard-cvv',    placeholder: '•••' },
    },
  });

  document.getElementById('ppcard-submit').addEventListener('click', async function() {
    var btn   = document.getElementById('ppcard-submit');
    var errEl = document.getElementById('ppcard-err');
    errEl.textContent = '';

    if (!shippingValid()) {
      SHIP_RULES.forEach(function(r) {
        var el    = document.getElementById(r.id);
        var errEl = document.getElementById(r.err);
        if (el && errEl && !r.test(el.value.trim())) errEl.textContent = r.msg;
      });
      errEl.textContent = 'Please complete your shipping details above.';
      return;
    }

    btn.disabled     = true;
    btn.textContent  = 'Processing…';

    try {
      var hf       = await cardFields;
      var shippingData = captureShipping();
      var result   = await hf.submit({
        cardholderName: shippingData.first_name + ' ' + shippingData.last_name,
        billingAddress: {
          streetAddress: shippingData.street_line1,
          locality:      shippingData.city,
          region:        shippingData.state,
          postalCode:    shippingData.zip,
          countryCodeAlpha2: 'US',
        },
      });
      // Capture the order
      var response = await fetch('https://api.paypal.com/v2/checkout/orders/' + result.orderId + '/capture', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      await finishOrder(shippingData);
    } catch(e) {
      console.error('Card payment failed:', e);
      errEl.textContent = e.message || 'Payment failed — check your card details and try again.';
      btn.disabled    = false;
      btn.textContent = 'Pay with Card';
    }
  });
}

// ── Mount PayPal (card fields → button fallback) ──────────
async function mountPayPal() {
  var container = document.getElementById('paypal-button-container');
  if (!container) return;

  if (!PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID === 'YOUR_PAYPAL_CLIENT_ID_HERE') {
    container.innerHTML = '<div style="padding:14px;border:1px solid var(--border);background:var(--card);text-align:center"><p style="font-family:var(--font-c);font-size:.68rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--smoke)">PayPal available at launch</p></div>';
    return;
  }

  try {
    container.innerHTML = '<p style="font-family:var(--font-c);font-size:.68rem;text-align:center;color:var(--smoke);padding:12px 0">Loading…</p>';
    await loadPayPalSDK();
    container.innerHTML = '';

    // ── Try hosted card fields first ──────────────────────
    if (window.paypal.HostedFields && window.paypal.HostedFields.isEligible()) {
      await mountHostedCardFields(container);
      return;
    }

    // ── Fallback: standard PayPal buttons ─────────────────
    var buttons = window.paypal.Buttons({
      style: { layout:'vertical', color:'blue', shape:'rect', label:'pay', height:48 },

      onClick: function(data, actions) {
        if (!shippingValid()) {
          SHIP_RULES.forEach(function(r) {
            var el    = document.getElementById(r.id);
            var errEl = document.getElementById(r.err);
            if (el && errEl && !r.test(el.value.trim())) errEl.textContent = r.msg;
          });
          return actions.reject();
        }
        return actions.resolve();
      },

      createOrder: makeCreateOrder(),

      onApprove: async function(data, actions) {
        var shippingData = captureShipping();
        container.innerHTML = '<p style="font-family:var(--font-c);font-size:.68rem;text-align:center;color:var(--smoke);padding:12px 0">Processing payment…</p>';
        await actions.order.capture();
        await finishOrder(shippingData);
      },

      onError: function(err) {
        console.error('PayPal error:', err);
        container.innerHTML = '<p style="color:#D4A843;font-size:.72rem;text-align:center;font-family:var(--font-c);padding:12px 0">Payment failed — please try again.</p>';
      },

      onCancel: function() {},
    });

    if (buttons.isEligible()) {
      await buttons.render('#paypal-button-container');
    } else {
      container.innerHTML = '<p style="color:var(--smoke);font-size:.72rem;text-align:center;font-style:italic;padding:12px 0">PayPal unavailable in this browser.</p>';
    }

  } catch(err) {
    console.error('mountPayPal failed:', err);
    container.innerHTML = '<div style="padding:14px;border:1px solid var(--border);background:var(--card);text-align:center"><p style="font-family:var(--font-c);font-size:.68rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--smoke)">PayPal available at launch</p></div>';
  }
}

// ── Cash App ──────────────────────────────────────────────
function mountCashApp() {
  var container = document.getElementById('cashapp-container');
  if (!container) return;

  var items    = Cart.get();
  var subtotal = items.reduce(function(s,i) { return s + i.price * i.qty; }, 0);
  var ship     = getSelectedShipping().price;
  var total    = (subtotal + ship).toFixed(2);

  container.innerHTML =
    '<button id="cashapp-btn" onclick="payCashApp()" style="width:100%;height:48px;background:#00D632;color:#000;border:none;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;font-family:var(--font-c);font-size:.78rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;transition:opacity .18s" onmouseover="this.style.opacity=\'.85\'" onmouseout="this.style.opacity=\'1\'">'
    + '<svg width="20" height="20" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#00D632"/><path d="M22.5 9.5L16 16m0 0L9.5 9.5M16 16l6.5 6.5M16 16l-6.5 6.5" stroke="#000" stroke-width="2.5" stroke-linecap="round"/></svg>'
    + 'Pay $' + total + ' with Cash App'
    + '</button>'
    + '<p style="font-size:.62rem;color:var(--smoke);text-align:center;margin-top:6px;font-style:italic;font-family:var(--font-c);letter-spacing:.06em">Opens Cash App &middot; Send to ' + CASHAPP_USERNAME + ' &middot; Order saves automatically</p>';
}

window.payCashApp = async function() {
  if (!shippingValid()) {
    SHIP_RULES.forEach(function(r) {
      var el    = document.getElementById(r.id);
      var errEl = document.getElementById(r.err);
      if (el && errEl && !r.test(el.value.trim())) errEl.textContent = r.msg;
    });
    return;
  }

  var items    = Cart.get();
  var subtotal = items.reduce(function(s,i) { return s + i.price * i.qty; }, 0);
  var ship     = getSelectedShipping().price;
  var total    = (subtotal + ship).toFixed(2);
  var shippingData = captureShipping();

  if (!shippingValid()) {
    SHIP_RULES.forEach(function(r) {
      var el    = document.getElementById(r.id);
      var errEl = document.getElementById(r.err);
      if (el && errEl && !r.test(el.value.trim())) errEl.textContent = r.msg;
    });
    return;
  }
  window.open('https://cash.app/' + CASHAPP_USERNAME + '/' + total, '_blank');
  await finishOrder(shippingData);
};

// ── Zelle ─────────────────────────────────────────────────
const ZELLE_PHONE = '2542893596';

function mountZelle() {
  var container = document.getElementById('zelle-container');
  if (!container) return;

  var items    = Cart.get();
  var subtotal = items.reduce(function(s,i) { return s + i.price * i.qty; }, 0);
  var discount = _appliedDiscount;
  var discAmt  = discount ? Math.round(subtotal * discount.pct) / 100 : 0;
  var ship     = getSelectedShipping().price;
  var total    = (subtotal - discAmt + ship).toFixed(2);

  container.innerHTML =
    '<button id="zelle-btn" onclick="payZelle()" style="width:100%;height:48px;background:#6D1ED4;color:#fff;border:none;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;font-family:var(--font-c);font-size:.78rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;transition:opacity .18s" onmouseover="this.style.opacity=\'.85\'" onmouseout="this.style.opacity=\'1\'">'
    + '<svg width="20" height="20" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#6D1ED4"/><path d="M8 10h11l-9 12h10" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    + 'Pay $' + total + ' with Zelle'
    + '</button>'
    + '<p style="font-size:.62rem;color:var(--smoke);text-align:center;margin-top:6px;font-style:italic;font-family:var(--font-c);letter-spacing:.06em">Send to <strong style="color:var(--white)">' + ZELLE_PHONE + '</strong> in Zelle &middot; Order saves automatically</p>';
}

window.payZelle = async function() {
  if (!shippingValid()) {
    SHIP_RULES.forEach(function(r) {
      var el    = document.getElementById(r.id);
      var errEl = document.getElementById(r.err);
      if (el && errEl && !r.test(el.value.trim())) errEl.textContent = r.msg;
    });
    return;
  }

  var shippingData = captureShipping();
  var btn = document.getElementById('zelle-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving order…'; }

  // Show the Zelle number prominently before saving
  var container = document.getElementById('zelle-container');
  if (container) {
    var items    = Cart.get();
    var subtotal = items.reduce(function(s,i) { return s + i.price * i.qty; }, 0);
    var discount = _appliedDiscount;
    var discAmt  = discount ? Math.round(subtotal * discount.pct) / 100 : 0;
    var ship     = getSelectedShipping().price;
    var total    = (subtotal - discAmt + ship).toFixed(2);
    container.innerHTML =
      '<div style="background:rgba(109,30,212,.12);border:1px solid rgba(109,30,212,.35);border-radius:4px;padding:14px 16px;text-align:center">'
      + '<p style="font-family:var(--font-c);font-size:.65rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#a87de8;margin-bottom:6px">Send via Zelle</p>'
      + '<p style="font-family:var(--font-d);font-size:1.6rem;letter-spacing:.06em;color:#fff;margin-bottom:2px">' + ZELLE_PHONE + '</p>'
      + '<p style="font-size:.72rem;color:var(--smoke)">Amount: <strong style="color:#fff">$' + total + '</strong></p>'
      + '</div>';
  }

  await finishOrder(shippingData);
};

// ── Bitcoin ────────────────────────────────────────────────
// PayPal supports crypto checkout natively via their SDK (pay with crypto button).
// Cash App also supports BTC sending via cash.app/$tag/btc.
// We use Cash App BTC as the primary since it requires no additional API setup,
// with PayPal crypto as a fallback note.
const BITCOIN_CASHAPP = '$BigBoyPeps'; // Cash App tag — BTC send link

function mountBitcoin() {
  var container = document.getElementById('bitcoin-container');
  if (!container) return;

  var items    = Cart.get();
  var subtotal = items.reduce(function(s,i) { return s + i.price * i.qty; }, 0);
  var discount = _appliedDiscount;
  var discAmt  = discount ? Math.round(subtotal * discount.pct) / 100 : 0;
  var ship     = getSelectedShipping().price;
  var total    = (subtotal - discAmt + ship).toFixed(2);

  container.innerHTML =
    '<button id="bitcoin-btn" onclick="payBitcoin()" style="width:100%;height:48px;background:#F7931A;color:#000;border:none;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;font-family:var(--font-c);font-size:.78rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;transition:opacity .18s" onmouseover="this.style.opacity=\'.85\'" onmouseout="this.style.opacity=\'1\'">'
    + '<svg width="20" height="20" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#F7931A"/><text x="16" y="22" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="16" font-weight="900" fill="#000">₿</text></svg>'
    + 'Pay $' + total + ' with Bitcoin'
    + '</button>'
    + '<p style="font-size:.62rem;color:var(--smoke);text-align:center;margin-top:6px;font-style:italic;font-family:var(--font-c);letter-spacing:.06em">Via Cash App BTC &middot; Send to ' + BITCOIN_CASHAPP + ' &middot; Order saves automatically</p>';
}

window.payBitcoin = async function() {
  if (!shippingValid()) {
    SHIP_RULES.forEach(function(r) {
      var el    = document.getElementById(r.id);
      var errEl = document.getElementById(r.err);
      if (el && errEl && !r.test(el.value.trim())) errEl.textContent = r.msg;
    });
    return;
  }

  var items    = Cart.get();
  var subtotal = items.reduce(function(s,i) { return s + i.price * i.qty; }, 0);
  var discount = _appliedDiscount;
  var discAmt  = discount ? Math.round(subtotal * discount.pct) / 100 : 0;
  var ship     = getSelectedShipping().price;
  var total    = (subtotal - discAmt + ship).toFixed(2);
  var shippingData = captureShipping();

  // Open Cash App BTC send — cash.app/$tag sends USD equivalent in BTC
  window.open('https://cash.app/' + BITCOIN_CASHAPP + '/' + total, '_blank');
  await finishOrder(shippingData);
};

// ── Order notification (shared by finishOrder + test button) ──
async function sendOrderNotification(items, shipping, profile) {
  var discount   = _appliedDiscount;
  var subtotal   = items.reduce(function(s,i) { return s + i.price * i.qty; }, 0);
  var discountAmt = discount ? Math.round(subtotal * discount.pct) / 100 : 0;
  var discounted = subtotal - discountAmt;
  var shipPrice  = shipping.shipping_price || 15;
  var orderTotal = discounted + shipPrice;
  var itemList   = items.map(function(i) {
    return i.qty + 'x ' + i.name + ' @ $' + Number(i.price).toFixed(2);
  }).join('\n');

  await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      access_key:  '8eec27a9-6e50-4206-a71a-a2c6f0c4c8bb',
      subject:     'New Order — BigBoyPeps',
      from_name:   'BigBoyPeps Store',
      name:        (shipping.first_name || '') + ' ' + (shipping.last_name || ''),
      email:       profile?.email || 'unknown',
      message:
        '=== NEW ORDER ===\n\n' +
        'CUSTOMER\n' +
        'Name: '  + (shipping.first_name || '') + ' ' + (shipping.last_name || '') + '\n' +
        'Email: ' + (profile?.email || 'unknown') + '\n' +
        (shipping.phone ? 'Phone: ' + shipping.phone + '\n' : '') + '\n' +
        'SHIPPING ADDRESS\n' +
        (shipping.street_line1 || '') + '\n' +
        (shipping.city || '') + ', ' + (shipping.state || '') + ' ' + (shipping.zip || '') + '\n' +
        (shipping.country || 'United States') + '\n\n' +
        'SHIPPING METHOD\n' +
        (shipping.shipping_method || 'USPS Standard') + '\n' +
        'Shipping Cost: $' + Number(shipPrice).toFixed(2) + '\n\n' +
        'ITEMS ORDERED\n' + itemList + '\n\n' +
        'Subtotal: $' + subtotal.toFixed(2) + '\n' +
        (discount ? 'Discount (' + discount.code + ' ' + discount.pct + '%): -$' + discountAmt.toFixed(2) + '\n' : '') +
        'Shipping: $' + Number(shipPrice).toFixed(2) + '\n' +
        'TOTAL: $'    + orderTotal.toFixed(2),
    }),
  });
}

// ── Finish order ──────────────────────────────────────────
async function finishOrder(shipping) {
  if (!shipping) shipping = {};
  var items = Cart.get();

  if (shipping.saveAddr && shipping.street_line1) {
    await Auth.saveAddress({
      label:        'Default',
      first_name:   shipping.first_name,
      last_name:    shipping.last_name,
      street_line1: shipping.street_line1,
      city:         shipping.city,
      state:        shipping.state,
      zip:          shipping.zip,
      country:      shipping.country || 'United States',
      is_default:   true,
    });
  }

  var subtotal    = items.reduce(function(s,i) { return s + i.price * i.qty; }, 0);
  var discount    = _appliedDiscount;
  var discountAmt = discount ? Math.round(subtotal * discount.pct) / 100 : 0;
  var shipPrice   = shipping.shipping_price || 15;
  var orderTotal  = subtotal - discountAmt + shipPrice;

  // ── Save orders + decrement inventory ─────────────────────
  try {
    for (var i = 0; i < items.length; i++) {
      var item         = items[i];
      var isBundle     = !!item.isBundle;
      var actualQty    = isBundle ? item.qty * (item.bundleQty || 10) : item.qty;
      var unitPrice    = isBundle ? item.price / (item.bundleQty || 10) : item.price;
      await Auth.createOrder({
        productId:        item.id,
        name:             item.name,
        qty:              actualQty,
        price:            unitPrice,
        total:            item.price * item.qty,
        shipping_method:  shipping.shipping_method,
        shipping_carrier: shipping.shipping_carrier,
        shipping_price:   shipping.shipping_price,
      });
      await Auth.decrementInventory(item.id, actualQty);
    }
  } catch(e) {
    console.error('Order save failed:', e);
  }

  // ── Send notification via shared function ──────────────────
  try {
    var profile = await Auth.getProfile();
    await sendOrderNotification(items, shipping, profile);
  } catch(e) {
    console.error('Order notification failed:', e);
  }

  document.getElementById('checkout-modal').innerHTML =
    '<div class="modal-head"><div class="modal-title">Order Placed</div><button class="modal-close" onclick="closeCheckout()">&#x2715;</button></div>'
    + '<div class="order-success">'
    + '<div class="order-success-icon">✓</div>'
    + '<h2>Order Confirmed.</h2>'
    + '<p>Your order is confirmed and on its way.<br/>Handle with appropriate care and caution.</p>'
    + '<a href="dashboard.html" style="display:inline-block;margin-top:24px;font-family:var(--font-c);font-size:.75rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;background:var(--red);color:var(--white);padding:12px 28px;clip-path:polygon(0 0,calc(100% - 7px) 0,100% 7px,100% 100%,7px 100%,0 calc(100% - 7px))">Back to Dashboard</a>'
    + '</div>';

  Cart.clear();
  if (typeof window.renderCart === 'function') window.renderCart();
}
