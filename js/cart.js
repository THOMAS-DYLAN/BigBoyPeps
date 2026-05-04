// ═══════════════════════════════════════════════════════
// BigBoyPeps — Cart + Shared UI
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
    if (product.inventory <= 0) return { ok: false, err: 'out_of_stock' };
    const items    = this.get();
    const existing = items.find(i => i.id === product.id);
    const currentQty = existing ? existing.qty : 0;
    if (currentQty + 1 > product.inventory) return { ok: false, err: 'insufficient_stock', available: product.inventory };
    if (existing) existing.qty += 1;
    else items.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
    this.save(items);
    this.updateBadge();
    return { ok: true };
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
  return '<nav><div class="nav-inner">'
    + '<a href="dashboard.html" class="nav-brand">' + NAV_LOGO + '</a>'
    + '<div class="nav-links">'
    + '<a href="dashboard.html" class="nav-link' + (activePage==='dashboard'?' active':'') + '">Dashboard</a>'
    + '<a href="shop.html" class="nav-link' + (activePage==='shop'?' active':'') + '">Shop</a>'
    + '<a href="orders.html" class="nav-link' + (activePage==='orders'?' active':'') + '">Orders</a>'
    + '</div>'
    + '<div class="nav-right">'
    + '<button onclick="Auth.logout()" class="nav-signout">Sign Out</button>'
    + '<a href="cart.html" class="cart-nav-btn">Cart<span id="cart-badge" class="cart-badge" style="display:' + (count>0?'flex':'none') + '">' + count + '</span></a>'
    + '</div></div></nav>';
}

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

// ── Page init ─────────────────────────────────────────────
window.initPage = async function(activePage) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.replace('index.html'); return; }
  Cart._key = 'bbp_cart_' + session.user.id;
  document.getElementById('nav-mount').innerHTML    = buildNavFromSession(activePage, session);
  document.getElementById('banner-mount').innerHTML = window.buildBanner();
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
  { id: 'usps', label: 'USPS Standard Shipping', carrier: 'USPS', days: '5–7 business days', price: 30.00 },
  { id: 'ups2', label: 'UPS 2-Day Air',           carrier: 'UPS',  days: '2 business days',  price: 40.00 },
];

function getSelectedShipping() {
  const el = document.getElementById('co-shipping-method');
  const id = el ? el.value : 'usps';
  return SHIPPING_OPTIONS.find(s => s.id === id) || SHIPPING_OPTIONS[0];
}

window.updateShippingTotal = function() {
  const items    = Cart.get();
  const subtotal = items.reduce((s,i) => s + i.price * i.qty, 0);
  const ship     = getSelectedShipping();
  const el       = document.getElementById('modal-total-val');
  if (el) el.textContent = '$' + (subtotal + ship.price).toFixed(2);
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
  await Promise.all([mountPayPal(), mountCashApp()]);
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
    saveAddr:        document.getElementById('co-save-addr')?.checked    ?? true,
    shipping_method: method.label,
    shipping_carrier:method.carrier,
    shipping_price:  method.price,
  };
}

// ── Render checkout modal ─────────────────────────────────
function renderCheckoutModal(items, profile, addr) {
  const subtotal   = items.reduce((s,i) => s + i.price * i.qty, 0);
  const defaultShip = SHIPPING_OPTIONS[0];
  const orderTotal = subtotal + defaultShip.price;

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

    // SHIPPING
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
    + '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-family:var(--font-c);font-size:.65rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--smoke);cursor:pointer"><input type="checkbox" id="co-save-addr" checked style="width:14px;height:14px;accent-color:var(--red)"/> Save address to my account</label>'
    + '</div>'

    // ORDER SUMMARY
    + '<div class="modal-section">'
    + '<div class="modal-section-title">Order Summary</div>'
    + orderRows
    + '<div class="modal-order-row" style="color:var(--smoke);border-top:1px solid var(--border);margin-top:4px;padding-top:10px"><span>Subtotal</span><span>$' + subtotal.toFixed(2) + '</span></div>'
    + '<div class="modal-order-row" style="color:var(--smoke);padding-top:6px">'
    + '<span style="font-family:var(--font-c);font-size:.63rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase">Shipping</span>'
    + '<select id="co-shipping-method" onchange="updateShippingTotal()" style="background:var(--card);color:var(--light);border:1px solid var(--border);padding:6px 10px;font-size:.8rem;outline:none;cursor:pointer;max-width:220px">'
    + SHIPPING_OPTIONS.map(function(s) { return '<option value="' + s.id + '">$' + s.price.toFixed(2) + ' — ' + s.label + ' (' + s.days + ')</option>'; }).join('')
    + '</select>'
    + '</div>'
    + '<div class="modal-total-row"><span class="modal-total-label">Total</span><span class="modal-total-val" id="modal-total-val">$' + orderTotal.toFixed(2) + '</span></div>'
    + '</div>'

    // PAYMENT
    + '<div class="modal-section">'
    + '<div class="modal-section-title">Payment Method</div>'
    + '<div id="paypal-button-container"></div>'
    + '<div id="cashapp-container" style="margin-top:10px"></div>'
    + '</div>'

    + '<p class="modal-disclaimer">All products are sold for research purposes only and not intended for human consumption.</p>'
    + '</div>';
}



// ── Mount PayPal buttons ──────────────────────────────────
async function mountPayPal() {
  var container = document.getElementById('paypal-button-container');
  if (!container) return;

  if (!PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID === 'YOUR_PAYPAL_CLIENT_ID_HERE') {
    container.innerHTML = '<div style="padding:14px 18px;border:1px solid var(--border);background:var(--card);text-align:center"><p style="font-family:var(--font-c);font-size:.68rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--smoke)">PayPal available at launch</p></div>';
    return;
  }

  try {
    container.innerHTML = '<p style="font-family:var(--font-c);font-size:.68rem;text-align:center;color:var(--smoke);padding:12px 0">Loading PayPal…</p>';

    if (!window.paypal) {
      await new Promise(function(resolve, reject) {
        var existing = document.querySelector('script[src*="paypal.com/sdk"]');
        if (existing) existing.remove();
        var script = document.createElement('script');
        script.src = 'https://www.paypal.com/sdk/js?client-id=' + PAYPAL_CLIENT_ID + '&currency=USD&intent=capture&components=buttons&enable-funding=card,venmo,paylater&disable-funding=credit';
        script.onload  = resolve;
        script.onerror = function() { reject(new Error('PayPal SDK failed to load')); };
        document.head.appendChild(script);
      });
    }

    container.innerHTML = '';

    var items    = Cart.get();
    var subtotal = items.reduce(function(s,i) { return s + i.price * i.qty; }, 0);
    var ship     = getSelectedShipping().price;
    var total    = (subtotal + ship).toFixed(2);

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

      createOrder: function(data, actions) {
        return actions.order.create({
          intent: 'CAPTURE',
          purchase_units: [{ amount: { value: total, currency_code: 'USD' } }],
        });
      },

      onApprove: async function(data, actions) {
        var shippingData = captureShipping();
        container.innerHTML = '<p style="font-family:var(--font-c);font-size:.68rem;text-align:center;color:var(--smoke);padding:12px 0">Processing payment…</p>';
        await actions.order.capture();
        await finishOrder(shippingData);
      },

      onError: function(err) {
        console.error('PayPal error:', err);
        container.innerHTML = '<p style="color:#FF3030;font-size:.72rem;text-align:center;font-family:var(--font-c);padding:12px 0">Payment failed — please try again.</p>';
      },

      onCancel: function() {},
    });

    if (buttons.isEligible()) {
      await buttons.render('#paypal-button-container');
    } else {
      container.innerHTML = '<p style="color:var(--smoke);font-size:.72rem;text-align:center;font-style:italic;padding:12px 0">PayPal unavailable — please use card.</p>';
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

  window.open('https://cash.app/' + CASHAPP_USERNAME + '/' + total, '_blank');
  await finishOrder(shippingData);
};

// ── TEST PAYMENT (remove before launch) ──────────────────
window.testOrder = async function() {
  if (!shippingValid()) {
    SHIP_RULES.forEach(function(r) {
      var el    = document.getElementById(r.id);
      var errEl = document.getElementById(r.err);
      if (el && errEl && !r.test(el.value.trim())) errEl.textContent = r.msg;
    });
    return;
  }
  await finishOrder(captureShipping());
};

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

  var subtotal = items.reduce(function(s,i) { return s + i.price * i.qty; }, 0);
  var shipPrice = shipping.shipping_price || 30;
  var orderTotal = subtotal + shipPrice;

  for (var i = 0; i < items.length; i++) {
    await Auth.pushOrder({
      productId:        items[i].id,
      name:             items[i].name,
      qty:              items[i].qty,
      price:            items[i].price,
      total:            items[i].price * items[i].qty,
      shipping_method:  shipping.shipping_method,
      shipping_carrier: shipping.shipping_carrier,
      shipping_price:   shipping.shipping_price,
    });
  }

  // ── Send order notification to Brandon via Web3Forms ──────
  try {
    var profile = await Auth.getProfile();
    var itemList = items.map(function(i) {
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
          'Name: ' + (shipping.first_name || '') + ' ' + (shipping.last_name || '') + '\n' +
          'Email: ' + (profile?.email || 'unknown') + '\n\n' +
          'SHIPPING ADDRESS\n' +
          (shipping.street_line1 || '') + '\n' +
          (shipping.city || '') + ', ' + (shipping.state || '') + ' ' + (shipping.zip || '') + '\n' +
          (shipping.country || 'United States') + '\n\n' +
          'SHIPPING METHOD\n' +
          (shipping.shipping_method || 'USPS Standard') + '\n' +
          'Shipping Cost: $' + Number(shipPrice).toFixed(2) + '\n\n' +
          'ITEMS ORDERED\n' + itemList + '\n\n' +
          'Subtotal: $' + subtotal.toFixed(2) + '\n' +
          'Shipping: $' + Number(shipPrice).toFixed(2) + '\n' +
          'TOTAL: $' + orderTotal.toFixed(2),
      }),
    });
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
