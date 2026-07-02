// ═══════════════════════════════════════════════════════════
// Order Notification Edge Function
// Called from cart.js after checkout — sends HTML email to Brandon
// with item list, totals, and a one-click Confirm Payment button.
// Deploy: supabase functions deploy order-notification
// ═══════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const RESEND_KEY   = Deno.env.get("RESEND_API_KEY")!;
const BRANDON_EMAIL = "txmade76543@gmail.com";
const FROM_EMAIL   = "noreply@ctxlabz.com";
const CONFIRM_BASE = "https://utqviljholfvpfztfuvx.supabase.co/functions/v1/confirm-order";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const body = await req.json();
    const { items, shipping, profile, paymentStatus, confirmToken, isPending } = body;

    const subtotal    = items.reduce((s: number, i: any) => s + i.price * i.qty, 0);
    const discAmt     = body.discountAmt || 0;
    const shipPrice   = shipping.shipping_price || 15;
    const orderTotal  = subtotal - discAmt + shipPrice;
    const confirmUrl  = `${CONFIRM_BASE}?token=${confirmToken || ""}`;

    const itemRows = items.map((i: any) =>
      `<tr>
        <td style="padding:8px 16px;border-bottom:1px solid #eee;font-size:13px;color:#222">${i.name}${i.isBundle ? ' <span style="background:#B8892A;color:#fff;font-size:10px;padding:1px 5px;border-radius:2px">BUNDLE</span>' : ''}</td>
        <td style="padding:8px 16px;border-bottom:1px solid #eee;font-size:13px;color:#444;text-align:center">×${i.qty}</td>
        <td style="padding:8px 16px;border-bottom:1px solid #eee;font-size:13px;color:#111;text-align:right;font-weight:700">$${(i.price * i.qty).toFixed(2)}</td>
      </tr>`
    ).join("");

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#fff">

  <!-- Header -->
  <div style="background:#111;padding:20px 28px;display:flex;align-items:center;gap:12px">
    <span style="font-family:'Bebas Neue',Arial,sans-serif;font-size:1.6rem;letter-spacing:.08em;color:#fff">Big<span style="color:#B8892A">Boy</span>Peps</span>
    ${isPending ? '<span style="background:#CE1126;color:#fff;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:4px 10px;border-radius:2px;margin-left:auto">⚠ Unverified</span>' : '<span style="background:#2a7a2a;color:#fff;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:4px 10px;border-radius:2px;margin-left:auto">New Order</span>'}
  </div>

  <div style="padding:24px 28px">
    ${isPending ? `<div style="background:#fff5f5;border:1px solid #ffcccc;border-left:3px solid #CE1126;padding:12px 16px;margin-bottom:20px;border-radius:2px"><p style="margin:0;font-size:13px;color:#CE1126;font-weight:700">⚠ Cash App — Verify $${orderTotal.toFixed(2)} received at $CTXLabs before shipping</p></div>` : ""}

    <!-- Customer -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
      <tr><td style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#888;padding-bottom:8px">Customer</td></tr>
      <tr><td style="font-size:13px;color:#222;padding-bottom:3px">${shipping.first_name || ""} ${shipping.last_name || ""}</td></tr>
      <tr><td style="font-size:13px;color:#444;padding-bottom:3px">${profile?.email || ""}</td></tr>
      <tr><td style="font-size:13px;color:#444;padding-bottom:3px">${shipping.phone || ""}</td></tr>
      ${shipping.paypal_email ? `<tr><td style="font-size:13px;color:#444">PayPal: ${shipping.paypal_name || ""} &lt;${shipping.paypal_email}&gt;</td></tr>` : ""}
      ${shipping.cashapp_cashtag ? `<tr><td style="font-size:13px;color:#444">CashApp: ${shipping.cashapp_cashtag}</td></tr>` : ""}
    </table>

    <!-- Shipping -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
      <tr><td style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#888;padding-bottom:8px">Ship To</td></tr>
      <tr><td style="font-size:13px;color:#222;padding-bottom:3px">${shipping.street_line1 || ""}</td></tr>
      <tr><td style="font-size:13px;color:#444">${shipping.city || ""}, ${shipping.state || ""} ${shipping.zip || ""}</td></tr>
    </table>

    <!-- Items -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #eee;margin-bottom:20px">
      <thead>
        <tr style="background:#f9f9f9">
          <th style="padding:8px 16px;text-align:left;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#888">Item</th>
          <th style="padding:8px 16px;text-align:center;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#888">Qty</th>
          <th style="padding:8px 16px;text-align:right;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#888">Price</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        ${discAmt > 0 ? `<tr><td colspan="2" style="padding:7px 16px;font-size:12px;color:#888">Discount</td><td style="padding:7px 16px;font-size:13px;color:#2a7a2a;text-align:right">-$${discAmt.toFixed(2)}</td></tr>` : ""}
        <tr><td colspan="2" style="padding:7px 16px;font-size:12px;color:#888">Shipping (${shipping.shipping_method || "USPS"})</td><td style="padding:7px 16px;font-size:13px;color:#444;text-align:right">$${Number(shipPrice).toFixed(2)}</td></tr>
        <tr style="background:#f9f9f9"><td colspan="2" style="padding:10px 16px;font-size:13px;font-weight:700;color:#111;border-top:1px solid #eee">Total</td><td style="padding:10px 16px;font-size:16px;font-weight:900;color:#B8892A;text-align:right;border-top:1px solid #eee">$${orderTotal.toFixed(2)}</td></tr>
      </tfoot>
    </table>
  </div>

  <!-- Confirm button -->
  <div style="background:#111;padding:24px 28px;text-align:center">
    <p style="margin:0 0 14px;font-size:13px;color:#aaa">Tap below once you've confirmed the payment was received.</p>
    <a href="${confirmUrl}" style="display:inline-block;background:#B8892A;color:#fff;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:14px 36px;text-decoration:none;border-radius:3px">
      ✓ Confirm Payment Received
    </a>
  </div>

  <div style="background:#f6f6f6;padding:14px 28px;text-align:center;border-top:1px solid #eee">
    <p style="margin:0;font-size:11px;color:#999">CTXLabz · For research purposes only</p>
  </div>

</div>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    "CTXLabz Orders <noreply@ctxlabz.com>",
        to:      [BRANDON_EMAIL],
        subject: isPending ? `⚠ CASH APP ORDER — $${orderTotal.toFixed(2)} — Verify Before Shipping` : `✅ New Order — $${orderTotal.toFixed(2)} — CTXLabz`,
        html,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify({ ok: res.ok, data }), {
      status: res.ok ? 200 : 500,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });

  } catch (err) {
    console.error("order-notification error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  }
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}
