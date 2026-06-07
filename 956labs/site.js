window.CART_SOURCE = '956labs';

// ═══════════════════════════════════════════════════════
// 956 Labs — Site Override
// Loaded as a module on every page AFTER ../js/cart.js.
// Overrides initPage to inject 956 Labs nav/footer/banner.
// All data goes to the same BBP Supabase project.
// ═══════════════════════════════════════════════════════

import { supabase } from '../js/supabase.js';

// ── 956 Labs only allows DYLAN10 discount ─────────────
if (window.DISCOUNT_CODES !== undefined) {
  window.DISCOUNT_CODES = { 'DYLAN10': { pct: 10, label: 'DYLAN10' } };
}

const LOGO =
  '<div style="display:flex;align-items:center;gap:9px">'
+ '<img src="img/logo.png" alt="956 Labs" style="height:42px;width:42px;object-fit:cover;object-position:center;flex-shrink:0;background:#FFFFFF;border-radius:3px"/>'
+ '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:1.15rem;letter-spacing:.06em;color:#111111;line-height:1">956 <span style="color:#006847">Labs</span></span>'
+ '</div>';

function placeholderNav() {
  return '<nav><div class="nav-inner">'
    + '<a href="dashboard.html" class="nav-brand" style="text-decoration:none">' + LOGO + '</a>'
    + '<div class="nav-links" style="opacity:.2;pointer-events:none">'
    + '<span class="nav-link">Home</span><span class="nav-link">Shop</span><span class="nav-link">Orders</span>'
    + '</div><div class="nav-right" style="opacity:.2;pointer-events:none"><span style="font-size:13px">···</span></div>'
    + '</div></nav>';
}

function buildBanner() {
  return '<div class="research-banner">For Research Purposes Only '
    + '<span>— Not for human consumption. Handle with appropriate care.</span></div>';
}

function buildNav(activePage) {
  const count = window.Cart ? window.Cart.count() : 0;
  const tabs  = [
    { href: 'dashboard.html', label: 'Home',   page: 'home'      },
    { href: 'index.html',      label: 'Shop',   page: 'shop'      },
    { href: 'orders.html',    label: 'Orders', page: 'orders'    },
  ];
  const links = tabs.map(t =>
    '<a href="' + t.href + '" class="nav-link' + (activePage === t.page ? ' active' : '') + '">' + t.label + '</a>'
  ).join('');
  const badgeStyle = 'display:' + (count > 0 ? 'flex' : 'none');

  return '<nav><div class="nav-inner">'
    + '<a href="dashboard.html" class="nav-brand" style="text-decoration:none">' + LOGO + '</a>'
    + '<div class="nav-links">' + links + '</div>'
    + '<div class="nav-right">'
    + '<button onclick="Auth.logout()" class="nav-signout">Sign Out</button>'
    + '<a href="cart.html" class="cart-nav-btn">Cart<span id="cart-badge" class="cart-badge" style="' + badgeStyle + '">' + count + '</span></a>'
    + '</div></div></nav>'
    + '<div class="mobile-nav">'
    + tabs.map(t =>
        '<a href="' + t.href + '" class="mobile-nav-tab' + (activePage === t.page ? ' active' : '') + '">'
        + t.label + '</a>'
      ).join('')
    + '<a href="cart.html" class="mobile-nav-tab" style="position:relative">Cart'
    + '<span id="cart-badge-m" class="cart-badge" style="position:absolute;top:5px;right:6px;' + badgeStyle + '">' + count + '</span>'
    + '</a>'
    + '<button onclick="Auth.logout()" class="mobile-nav-tab" style="border:none;background:none;color:#888;font-family:var(--font-c);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;padding:0">Out</button>'
    + '</div>';
}

function buildFooter() {
  return '<footer><div class="footer-inner">'
    + '<a href="dashboard.html" style="text-decoration:none;display:flex;align-items:center;gap:8px">'
    + '<img src="img/logo.png" alt="956 Labs" style="height:26px;object-fit:contain"/>'
    + '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:.95rem;letter-spacing:.04em;color:#111111">956 Labs</span>'
    + '</a>'
    + '<div class="footer-copy">© 2025 956 Labs · For research purposes only · Rio Grande Valley, TX</div>'
    + '</div></footer>';
}

// ── Auth popup (shown at checkout if not logged in) ───
function buildAuthPopupHTML() {
  return `
  <div id="auth-popup-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(3px);z-index:500;align-items:center;justify-content:center;padding:20px">
    <div style="background:#fff;border:1px solid #D8D8D8;border-radius:4px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,.15);overflow:hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #E8E8E8;background:#F6F6F6">
        <span style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:.05em;color:#111">Sign in to continue</span>
        <button onclick="closeAuthPopup()" style="background:none;border:none;font-size:18px;color:#888;cursor:pointer;padding:0;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:3px">✕</button>
      </div>
      <div style="display:flex;border-bottom:1px solid #E8E8E8">
        <button id="auth-tab-login" onclick="authSwitchTab('login')" style="flex:1;padding:12px;font-family:var(--font-c);font-size:.7rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;background:#fff;border:none;border-bottom:2px solid #006847;color:#006847;cursor:pointer">Sign In</button>
        <button id="auth-tab-register" onclick="authSwitchTab('register')" style="flex:1;padding:12px;font-family:var(--font-c);font-size:.7rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;background:#fff;border:none;border-bottom:2px solid transparent;color:#888;cursor:pointer">Register</button>
      </div>
      <div style="padding:20px">
        <!-- LOGIN -->
        <div id="auth-form-login">
          <div style="margin-bottom:12px">
            <label style="display:block;font-family:var(--font-c);font-size:.62rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#666;margin-bottom:4px">Email</label>
            <input id="popup-login-email" type="email" placeholder="you@example.com" style="width:100%;background:#fff;border:1px solid #D8D8D8;color:#111;padding:10px 12px;font-size:14px;border-radius:3px;outline:none"/>
          </div>
          <div style="margin-bottom:16px">
            <label style="display:block;font-family:var(--font-c);font-size:.62rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#666;margin-bottom:4px">Password</label>
            <input id="popup-login-pass" type="password" placeholder="••••••••" style="width:100%;background:#fff;border:1px solid #D8D8D8;color:#111;padding:10px 12px;font-size:14px;border-radius:3px;outline:none"/>
          </div>
          <button onclick="popupDoLogin()" style="width:100%;padding:12px;background:#006847;color:#fff;font-family:var(--font-c);font-size:.75rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;border:none;border-radius:3px;cursor:pointer;transition:background .18s">Sign In & Continue</button>
          <div id="popup-login-err" style="font-family:var(--font-c);font-size:.65rem;color:#CE1126;margin-top:8px;min-height:16px"></div>
        </div>
        <!-- REGISTER -->
        <div id="auth-form-register" style="display:none">
          <div style="display:flex;gap:10px;margin-bottom:12px">
            <div style="flex:1">
              <label style="display:block;font-family:var(--font-c);font-size:.62rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#666;margin-bottom:4px">First Name</label>
              <input id="popup-reg-first" type="text" placeholder="Jane" style="width:100%;background:#fff;border:1px solid #D8D8D8;color:#111;padding:10px 12px;font-size:14px;border-radius:3px;outline:none"/>
            </div>
            <div style="flex:1">
              <label style="display:block;font-family:var(--font-c);font-size:.62rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#666;margin-bottom:4px">Last Name</label>
              <input id="popup-reg-last" type="text" placeholder="Smith" style="width:100%;background:#fff;border:1px solid #D8D8D8;color:#111;padding:10px 12px;font-size:14px;border-radius:3px;outline:none"/>
            </div>
          </div>
          <div style="margin-bottom:12px">
            <label style="display:block;font-family:var(--font-c);font-size:.62rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#666;margin-bottom:4px">Email</label>
            <input id="popup-reg-email" type="email" placeholder="you@example.com" style="width:100%;background:#fff;border:1px solid #D8D8D8;color:#111;padding:10px 12px;font-size:14px;border-radius:3px;outline:none"/>
          </div>
          <div style="margin-bottom:16px">
            <label style="display:block;font-family:var(--font-c);font-size:.62rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#666;margin-bottom:4px">Password</label>
            <input id="popup-reg-pass" type="password" placeholder="Min. 8 characters" style="width:100%;background:#fff;border:1px solid #D8D8D8;color:#111;padding:10px 12px;font-size:14px;border-radius:3px;outline:none"/>
          </div>
          <button onclick="popupDoRegister()" style="width:100%;padding:12px;background:#006847;color:#fff;font-family:var(--font-c);font-size:.75rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;border:none;border-radius:3px;cursor:pointer;transition:background .18s">Create Account & Continue</button>
          <div id="popup-reg-err" style="font-family:var(--font-c);font-size:.65rem;color:#CE1126;margin-top:8px;min-height:16px"></div>
        </div>
      </div>
    </div>
  </div>`;
}

function injectAuthPopup() {
  if (!document.getElementById('auth-popup-overlay')) {
    document.body.insertAdjacentHTML('beforeend', buildAuthPopupHTML());
  }
}

window.showAuthPopup = function() {
  injectAuthPopup();
  const el = document.getElementById('auth-popup-overlay');
  if (el) el.style.display = 'flex';
};

window.closeAuthPopup = function() {
  const el = document.getElementById('auth-popup-overlay');
  if (el) el.style.display = 'none';
};

window.authSwitchTab = function(tab) {
  const loginForm = document.getElementById('auth-form-login');
  const regForm   = document.getElementById('auth-form-register');
  const loginTab  = document.getElementById('auth-tab-login');
  const regTab    = document.getElementById('auth-tab-register');
  const isLogin   = tab === 'login';

  if (loginForm) loginForm.style.display = isLogin ? 'block' : 'none';
  if (regForm)   regForm.style.display   = isLogin ? 'none'  : 'block';
  if (loginTab) {
    loginTab.style.borderBottomColor = isLogin ? '#006847' : 'transparent';
    loginTab.style.color             = isLogin ? '#006847' : '#888';
  }
  if (regTab) {
    regTab.style.borderBottomColor = isLogin ? 'transparent' : '#006847';
    regTab.style.color             = isLogin ? '#888' : '#006847';
  }
};

window.popupDoLogin = async function() {
  const email = document.getElementById('popup-login-email')?.value.trim().toLowerCase();
  const pass  = document.getElementById('popup-login-pass')?.value;
  const err   = document.getElementById('popup-login-err');
  if (err) err.textContent = '';
  if (!email || !pass) { if (err) err.textContent = 'Please fill in both fields.'; return; }

  const result = await Auth.login(email, pass);
  if (!result.ok) {
    if (err) err.textContent = result.err === 'email_not_confirmed'
      ? 'Please confirm your email before signing in.'
      : result.err;
    return;
  }
  window.closeAuthPopup();
  // Merge guest cart into user cart
  try {
    var { data: { session: _ms } } = await supabase.auth.getSession();
    if (_ms && window.Cart) {
      var gKey = 'bbp_cart_guest';
      var uKey = 'bbp_cart_' + _ms.user.id;
      var gi   = JSON.parse(localStorage.getItem(gKey) || '[]');
      if (gi.length) {
        var ui = JSON.parse(localStorage.getItem(uKey) || '[]');
        gi.forEach(function(g) {
          var ex = ui.find(function(u) { return u.id===g.id && (!!u.isBundle===!!g.isBundle); });
          if (ex) ex.qty += g.qty; else ui.push(g);
        });
        localStorage.setItem(uKey, JSON.stringify(ui));
        localStorage.removeItem(gKey);
        window.Cart._key = uKey;
        window.Cart.updateBadge();
      }
    }
  } catch(e) { console.error('cart merge error:', e); }
  if (window._authSuccessCallback) { window._authSuccessCallback(); return; }
  if (window._origOpenCheckout) window._origOpenCheckout();
  else if (window.openCheckout) window.openCheckout();
};

window.popupDoRegister = async function() {
  const first = document.getElementById('popup-reg-first')?.value.trim();
  const last  = document.getElementById('popup-reg-last')?.value.trim();
  const email = document.getElementById('popup-reg-email')?.value.trim().toLowerCase();
  const pass  = document.getElementById('popup-reg-pass')?.value;
  const err   = document.getElementById('popup-reg-err');
  if (err) err.textContent = '';
  if (!first || !last || !email || !pass) { if (err) err.textContent = 'Please fill in all fields.'; return; }
  if (pass.length < 8) { if (err) err.textContent = 'Password must be at least 8 characters.'; return; }

  const result = await Auth.register(first, last, email, pass);
  if (!result.ok) { if (err) err.textContent = result.err; return; }

  if (result.needsConfirmation) {
    if (err) { err.style.color = '#006847'; err.textContent = 'Check your email to confirm your account, then sign in.'; }
    authSwitchTab('login');
  } else {
    window.closeAuthPopup();
    try {
      var { data: { session: _ms2 } } = await supabase.auth.getSession();
      if (_ms2 && window.Cart) {
        var gk = 'bbp_cart_guest', uk = 'bbp_cart_' + _ms2.user.id;
        var gi2 = JSON.parse(localStorage.getItem(gk) || '[]');
        if (gi2.length) {
          var ui2 = JSON.parse(localStorage.getItem(uk) || '[]');
          gi2.forEach(function(g) { var ex=ui2.find(function(u){return u.id===g.id&&(!!u.isBundle===!!g.isBundle);}); if(ex)ex.qty+=g.qty; else ui2.push(g); });
          localStorage.setItem(uk, JSON.stringify(ui2));
          localStorage.removeItem(gk);
          window.Cart._key = uk;
          window.Cart.updateBadge();
        }
      }
    } catch(e) {}
    if (window._authSuccessCallback) { window._authSuccessCallback(); return; }
    if (window._origOpenCheckout) window._origOpenCheckout();
    else if (window.openCheckout) window.openCheckout();
  }
};


// ── Public nav (unauthenticated) ─────────────────────────
function buildPublicNav956(activePage) {
  return '<nav><div class="nav-inner">'
    + '<a href="index.html" class="nav-brand" style="text-decoration:none">' + LOGO + '</a>'
    + '<div class="nav-links">'
    + '<a href="index.html" class="nav-link' + (activePage==='shop'?' active':'') + '">Shop</a>'
    + '</div>'
    + '<div class="nav-right">'
    + '<button onclick="window.showAuthPopup()" class="nav-signout" style="border-color:#006847;color:#006847">Sign In</button>'
    + '<button onclick="window.showAuthPopup(function(){ window.location.href=\'cart.html\'; })" class="cart-nav-btn" style="background:#006847;border:none;cursor:pointer">Cart<span id="cart-badge-pub" class="cart-badge" style="display:none">0</span></button>'
    + '</div></div></nav>'
    + '<div class="mobile-nav">'
    + '<a href="index.html" class="mobile-nav-tab' + (activePage==='shop'?' active':'') + '">Shop</a>'
    + '<button onclick="window.showAuthPopup()" class="mobile-nav-tab" style="border:none;background:none;color:#006847;font-family:var(--font-c);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;padding:0">Cart</button>'
    + '<button onclick="window.showAuthPopup()" class="mobile-nav-tab" style="border:none;background:none;color:#888;font-family:var(--font-c);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;padding:0">Sign In</button>'
    + '</div>';
}

// ── Override initPage ─────────────────────────────────
window.initPage = async function(activePage) {
  var navEl    = document.getElementById('nav-mount');
  var bannerEl = document.getElementById('banner-mount');
  var footerEl = document.getElementById('footer-mount');

  if (navEl)    navEl.innerHTML    = placeholderNav();
  if (bannerEl) bannerEl.innerHTML = buildBanner();

  // Dashboard + orders require auth — redirect to shop (index.html)
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    var authPages = ['home', 'orders'];
    if (authPages.indexOf(activePage) !== -1) {
      window.location.replace('index.html'); return;
    }
    if (navEl)    navEl.innerHTML    = buildPublicNav956(activePage);
    if (footerEl) footerEl.innerHTML = buildFooter();
    return;
  }

  if (window.Cart) window.Cart._key = 'bbp_cart_' + session.user.id;
  if (navEl)    navEl.innerHTML    = buildNav(activePage);
  if (footerEl) footerEl.innerHTML = buildFooter();

  if (window.Cart) {
    const _orig = window.Cart.updateBadge.bind(window.Cart);
    window.Cart.updateBadge = function() {
      _orig();
      const n  = this.count();
      const bm = document.getElementById('cart-badge-m');
      if (bm) { bm.textContent = n; bm.style.display = n > 0 ? 'flex' : 'none'; }
    };
    window.Cart.updateBadge();
  }

  // Intercept openCheckout — require auth on cart page only
  if (window.openCheckout && !window._origOpenCheckout) {
    window._origOpenCheckout = window.openCheckout;
    window.openCheckout = async function() {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) { window.showAuthPopup(function() { setTimeout(window._origOpenCheckout, 300); }); return; }
      window._origOpenCheckout();
    };
  }
};
