// ═══════════════════════════════════════════════════════════════
// BigBoyPeps — Products Module
//
// One import, one fetch. Products are loaded from Supabase once
// and cached in window.ProductCache so shop, cart, and dashboard
// all use identical data and rendering without duplicating logic.
//
// Usage:
//   import { loadProducts, getProduct, pepperSVG, miniPepperSVG, heatPips } from './products.js';
//   await loadProducts();              // fetches once, safe to call multiple times
//   const p = getProduct(id);          // lookup by numeric id
//   pepperSVG(p)                       // full-size SVG for shop grid
//   miniPepperSVG(p)                   // small SVG for cart / dashboard thumbnails
//   heatPips(p.heat_level)             // 5-pip heat meter HTML
// ═══════════════════════════════════════════════════════════════

import { supabase } from './supabase.js';

// ── Cache ─────────────────────────────────────────────────────
// Stored on window so any module can access without re-importing.
window.ProductCache = window.ProductCache || {};

let _loaded = false;

export async function loadProducts() {
  if (_loaded) return;
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, price, heat_level, description, badge, thumb_color, shape_key, active')
    .eq('active', true)
    .order('id');

  if (error) {
    console.error('loadProducts failed:', error.message, error);
    // Don't set _loaded — allows retry on next call
    return;
  }

  if (!data || data.length === 0) {
    console.warn('loadProducts: query succeeded but returned 0 rows. Check RLS and that products exist.');
  }

  (data || []).forEach(p => { window.ProductCache[p.id] = p; });
  _loaded = true;
}

export function getProduct(id) {
  return window.ProductCache[id] || null;
}

export function allProducts() {
  return Object.values(window.ProductCache);
}

// ── Heat pip row ──────────────────────────────────────────────
export function heatPips(level) {
  return Array.from({ length: 5 }, (_, i) =>
    `<div class="pip${i < level ? ' on' : ''}"></div>`
  ).join('');
}

// ═══════════════════════════════════════════════════════════════
// SVG Pepper Shapes
// shape_key comes from the products table.
// hue is derived from heat_level so all hot peppers are red,
// medium are orange, mild are green — consistent everywhere.
// ═══════════════════════════════════════════════════════════════

function hueFromHeat(level) {
  if (level >= 5) return '#CC1F1F';
  if (level >= 3) return '#c05010';
  return '#4a7a20';
}

// Full-size SVG — used in shop grid (200px tall thumbnail)
export function pepperSVG(product) {
  const hue   = hueFromHeat(product.heat_level);
  const shape = product.shape_key || 'tall';
  return SHAPES_FULL[shape]?.(hue) ?? SHAPES_FULL.tall(hue);
}

// Mini SVG — used in cart thumbnails (72×72) and dashboard order rows (46×46)
export function miniPepperSVG(product) {
  const hue   = hueFromHeat(product.heat_level);
  const shape = product.shape_key || 'tall';
  return SHAPES_MINI[shape]?.(hue) ?? SHAPES_MINI.tall(hue);
}

// ── Full-size shape library ───────────────────────────────────
const SHAPES_FULL = {
  tall: (c) => `
    <svg width="70" height="110" viewBox="0 0 70 110" fill="none">
      <path d="M35 10C25 10 18 25 18 50C18 78 25 100 35 102C45 100 52 78 52 50C52 25 45 10 35 10Z" fill="${c}" opacity=".8"/>
      <path d="M35 10C34 4 37 1 39 3C41 5 38 8 35 10Z" fill="#555"/>
      <path d="M18 50C12 53 10 64 13 70" fill="${c}" opacity=".5"/>
      <ellipse cx="29" cy="38" rx="3" ry="4" fill="rgba(0,0,0,.3)"/>
      <ellipse cx="41" cy="38" rx="3" ry="4" fill="rgba(0,0,0,.3)"/>
    </svg>`,

  curved: (c) => `
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
      <path d="M55 12C68 18 74 36 70 56C66 72 54 82 44 80C34 78 26 64 30 48C34 30 44 10 55 12Z" fill="${c}" opacity=".8"/>
      <path d="M55 12C53 5 57 1 60 4C63 7 58 10 55 12Z" fill="#555"/>
      <path d="M30 48C22 50 18 62 22 68" fill="${c}" opacity=".5"/>
      <ellipse cx="44" cy="40" rx="4" ry="5" fill="rgba(0,0,0,.25)"/>
    </svg>`,

  round: (c) => `
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
      <ellipse cx="45" cy="52" rx="26" ry="30" fill="${c}" opacity=".8"/>
      <path d="M45 22C43 16 47 11 50 14C53 17 48 20 45 22Z" fill="#555"/>
      <ellipse cx="37" cy="46" rx="4" ry="5" fill="rgba(0,0,0,.25)"/>
      <ellipse cx="53" cy="46" rx="4" ry="5" fill="rgba(0,0,0,.25)"/>
    </svg>`,

  'birds-eye': (c) => `
    <svg width="100" height="70" viewBox="0 0 100 70" fill="none">
      <path d="M20 52C22 38 32 22 50 14C64 8 76 10 78 18C80 26 68 34 54 36C38 40 28 50 26 62" fill="${c}" opacity=".8"/>
      <path d="M26 62C22 68 18 72 22 70C26 68 28 64 26 62Z" fill="${c}" opacity=".6"/>
      <path d="M78 18C82 14 86 12 84 16C82 20 80 18 78 18Z" fill="#555"/>
    </svg>`,

  bundle: (c) => `
    <svg width="100" height="90" viewBox="0 0 100 90" fill="none">
      <path d="M60 10C70 14 74 28 70 46C66 60 58 70 52 70C46 68 42 58 46 44C50 28 52 12 60 10Z" fill="#2a7a2a" opacity=".75"/>
      <path d="M42 18C34 24 30 40 34 54C36 64 44 72 50 70C46 66 44 56 42 46C40 34 40 22 42 18Z" fill="${c}" opacity=".75"/>
      <path d="M26 28C20 36 20 52 24 62C27 70 34 76 40 74C36 70 34 60 32 50C30 38 28 34 26 28Z" fill="#c07010" opacity=".65"/>
      <path d="M60 10C58 4 62 1 64 4Z" fill="#555"/>
      <path d="M42 18C40 12 43 8 45 11Z" fill="#555"/>
      <path d="M26 28C23 22 26 18 28 21Z" fill="#555"/>
    </svg>`,
};

// ── Mini shape library ────────────────────────────────────────
const SHAPES_MINI = {
  tall: (c) => `
    <svg width="22" height="36" viewBox="0 0 70 110" fill="none">
      <path d="M35 10C25 10 18 25 18 50C18 78 25 100 35 102C45 100 52 78 52 50C52 25 45 10 35 10Z" fill="${c}" opacity=".85"/>
      <path d="M35 10C34 4 37 1 39 3Z" fill="#555"/>
    </svg>`,

  curved: (c) => `
    <svg width="34" height="34" viewBox="0 0 90 90" fill="none">
      <path d="M55 12C68 18 74 36 70 56C66 72 54 82 44 80C34 78 26 64 30 48C34 30 44 10 55 12Z" fill="${c}" opacity=".8"/>
      <path d="M55 12C53 5 57 1 60 4Z" fill="#555"/>
    </svg>`,

  round: (c) => `
    <svg width="32" height="34" viewBox="0 0 90 90" fill="none">
      <ellipse cx="45" cy="52" rx="26" ry="30" fill="${c}" opacity=".8"/>
      <path d="M45 22C43 16 47 11 50 14Z" fill="#555"/>
    </svg>`,

  'birds-eye': (c) => `
    <svg width="38" height="26" viewBox="0 0 100 70" fill="none">
      <path d="M20 52C22 38 32 22 50 14C64 8 76 10 78 18C80 26 68 34 54 36C38 40 28 50 26 62" fill="${c}" opacity=".85"/>
    </svg>`,

  bundle: (c) => `
    <svg width="36" height="32" viewBox="0 0 100 90" fill="none">
      <path d="M60 10C70 14 74 28 70 46C66 60 58 70 52 70Z" fill="#2a7a2a" opacity=".7"/>
      <path d="M42 18C34 24 30 40 34 54C36 64 44 72 50 70Z" fill="${c}" opacity=".8"/>
      <path d="M26 28C20 36 20 52 24 62Z" fill="#c07010" opacity=".6"/>
    </svg>`,
};
