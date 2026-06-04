// ═══════════════════════════════════════════════════════
// 956 Labs — Site Override
// Loaded as a module on every page AFTER ../js/cart.js.
// Overrides initPage to inject 956 Labs nav/footer/banner.
// All data goes to the same BBP Supabase project.
// ═══════════════════════════════════════════════════════

import { supabase } from '../js/supabase.js';

const LOGO =
  '<div style="display:flex;align-items:center;gap:9px">'
+ '<img src="../img/logo.png" alt="956 Labs" style="height:34px;width:34px;object-fit:contain;border-radius:3px;flex-shrink:0"/>'
+ '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:1.15rem;letter-spacing:.06em;color:#F0F4EF;line-height:1">'
+ '956 <span style="color:#00A86B">Labs</span></span>'
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
    { href: 'dashboard.html', label: 'Home',   page: 'dashboard' },
    { href: 'shop.html',      label: 'Shop',   page: 'shop'      },
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
    + '<button onclick="Auth.logout()" class="mobile-nav-tab" style="border:none;background:none;color:var(--text-3);font-family:var(--font-c);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;padding:0">Out</button>'
    + '</div>';
}

function buildFooter() {
  return '<footer><div class="footer-inner">'
    + '<a href="dashboard.html" style="text-decoration:none;display:flex;align-items:center;gap:8px">'
    + '<img src="../img/logo.png" alt="956 Labs" style="height:26px;object-fit:contain"/>'
    + '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:.95rem;letter-spacing:.04em;color:var(--white)">956 Labs</span>'
    + '</a>'
    + '<div class="footer-copy">© 2025 956 Labs · For research purposes only · Rio Grande Valley, TX</div>'
    + '</div></footer>';
}

// ── Override initPage ─────────────────────────────────
window.initPage = async function(activePage) {
  const navEl    = document.getElementById('nav-mount');
  const bannerEl = document.getElementById('banner-mount');
  const footerEl = document.getElementById('footer-mount');

  if (navEl)    navEl.innerHTML    = placeholderNav();
  if (bannerEl) bannerEl.innerHTML = buildBanner();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.replace('index.html'); return; }

  if (window.Cart) window.Cart._key = 'bbp_cart_' + session.user.id;
  if (navEl)    navEl.innerHTML    = buildNav(activePage);
  if (footerEl) footerEl.innerHTML = buildFooter();
  if (window.Cart) window.Cart.updateBadge();

  // Keep both badges in sync
  const _orig = window.Cart?.updateBadge?.bind(window.Cart);
  if (window.Cart && _orig) {
    window.Cart.updateBadge = function() {
      _orig();
      const n  = this.count();
      const bm = document.getElementById('cart-badge-m');
      if (bm) { bm.textContent = n; bm.style.display = n > 0 ? 'flex' : 'none'; }
    };
  }
};
