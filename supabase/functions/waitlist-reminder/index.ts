// ═══════════════════════════════════════════════════════════
// Waitlist Reminder Edge Function
// Runs daily — sends follow-up to waitlist users who were
// notified of a restock but haven't ordered yet.
//
// Schedule:
//   Reminder 1: 7 days after restock notification
//   Reminder 2+: every 30 days after that
//
// Deploy: supabase functions deploy waitlist-reminder
//
// Add to pg_cron (run in SQL Editor):
//   SELECT cron.schedule(
//     'waitlist-reminder-daily',
//     '0 15 * * *',
//     $$SELECT net.http_post(
//       url := 'https://utqviljholfvpfztfuvx.supabase.co/functions/v1/waitlist-reminder',
//       headers := '{"Authorization":"Bearer YOUR_SERVICE_ROLE_KEY","Content-Type":"application/json"}'::jsonb,
//       body := '{}'::jsonb) AS request_id$$);
// ═══════════════════════════════════════════════════════════

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL     = "noreply@ctxlabz.com";
const STORE_NAME     = "CTXLabz";
const SHOP_URL       = "https://ctxlabz.com/index.html";

const FIRST_DELAY_DAYS    = 7;
const FOLLOWUP_DELAY_DAYS = 30;

serve(async (req) => {
  try {
    const sb  = createClient(SUPABASE_URL, SUPABASE_KEY);
    const now = new Date();
    const url = new URL(req.url);
    const testEmail = url.searchParams.get("test");

    // Test mode
    if (testEmail) {
      await sendWaitlistReminder(sb, {
        email:          testEmail,
        product_name:   "BPC-157 10mg",
        product_id:     "1",
        reminder_count: 0,
        id:             "test",
      });
      return new Response(JSON.stringify({ sent: 1, test: true }), { status: 200 });
    }

    // Get all notified waitlist entries where product is still in stock
    const { data: entries, error } = await sb
      .from("waitlist")
      .select("*, products(name, inventory, price)")
      .eq("notified", true)
      .gt("products.inventory", 0);

    if (error) throw error;
    if (!entries?.length) {
      return new Response(JSON.stringify({ sent: 0, msg: "No eligible waitlist entries" }), { status: 200 });
    }

    let sent = 0, skipped = 0;

    for (const entry of entries) {
      const product = entry.products;
      if (!product || product.inventory <= 0) { skipped++; continue; }

      // Determine delay
      const count      = entry.reminder_count ?? 0;
      const delayDays  = count === 0 ? FIRST_DELAY_DAYS : FOLLOWUP_DELAY_DAYS;
      const delayMs    = delayDays * 24 * 60 * 60 * 1000;
      const lastAction = new Date(entry.last_reminder ?? entry.notified_at ?? entry.updated_at);
      const elapsed    = now.getTime() - lastAction.getTime();

      if (elapsed < delayMs) { skipped++; continue; }

      // Check if they've already ordered this product
      const { data: orders } = await sb
        .from("orders")
        .select("id")
        .eq("user_email", entry.email)
        .ilike("items", `%${product.name}%`)
        .limit(1);

      if (orders?.length) {
        // They ordered — remove from waitlist follow-up
        await sb.from("waitlist").update({ reminder_count: -1 }).eq("id", entry.id);
        skipped++;
        continue;
      }

      // Send reminder
      const ok = await sendWaitlistReminder(sb, {
        email:          entry.email,
        product_name:   product.name,
        product_price:  product.price,
        product_id:     entry.product_id,
        reminder_count: count,
        id:             entry.id,
      });

      if (ok) {
        await sb.from("waitlist").update({
          last_reminder:  now.toISOString(),
          reminder_count: count + 1,
        }).eq("id", entry.id);
        sent++;
      }
    }

    return new Response(JSON.stringify({ sent, skipped }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("waitlist-reminder error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

async function sendWaitlistReminder(sb: any, entry: {
  email: string;
  product_name: string;
  product_price?: number;
  product_id?: string;
  reminder_count: number;
  id: string;
}): Promise<boolean> {
  const isFirst   = entry.reminder_count === 0;
  const price     = entry.product_price ?? 0;
  const discounted = (price * 0.90).toFixed(2);
  const productUrl = `https://ctxlabz.com/product.html?id=${entry.product_id ?? ""}`;

  const subject = isFirst
    ? `Still available: ${entry.product_name} — ${STORE_NAME}`
    : `${entry.product_name} is still in stock — ${STORE_NAME}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#fff">

  <div style="background:#111;padding:24px 32px">
    <span style="font-family:'Bebas Neue',Arial,sans-serif;font-size:1.8rem;letter-spacing:.08em;color:#fff">Big<span style="color:#B8892A">Boy</span>Peps</span>
  </div>

  <div style="padding:32px">
    <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#B8892A;margin:0 0 8px">
      ${isFirst ? 'Back In Stock Reminder' : 'Still Available'}
    </p>
    <h2 style="font-family:Arial,sans-serif;font-size:22px;font-weight:900;color:#111;margin:0 0 12px">
      ${isFirst ? `${entry.product_name} is still available.` : `${entry.product_name} — still in stock.`}
    </h2>
    <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 24px">
      ${isFirst
        ? `You joined the waitlist for ${entry.product_name} and it came back in stock. It's still available — grab it before it sells out again.`
        : `Just a follow-up — ${entry.product_name} is still in stock. Use the code below for 10% off your order.`
      }
    </p>

    <!-- Product -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #eee;margin-bottom:24px">
      <tbody>
        <tr>
          <td style="padding:16px;font-size:14px;font-weight:700;color:#111">${entry.product_name}</td>
          <td style="padding:16px;text-align:right">
            ${price ? `<span style="font-size:12px;color:#999;text-decoration:line-through;margin-right:6px">$${price.toFixed(2)}</span>` : ''}
            <span style="font-size:16px;font-weight:900;color:#B8892A">${price ? `$${discounted}` : 'View Price'}</span>
          </td>
        </tr>
        <tr style="background:#FBF6EE">
          <td colspan="2" style="padding:10px 16px;font-size:13px;color:#555">
            Use code <strong style="background:#B8892A;color:#fff;padding:2px 8px;border-radius:2px;letter-spacing:.06em">DYLAN10</strong> for 10% off
          </td>
        </tr>
      </tbody>
    </table>

  </div>

  <!-- CTA -->
  <div style="background:#111111;padding:28px 32px;text-align:center">
    <a href="${productUrl}" style="display:inline-block;background:#B8892A;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:14px 36px;text-decoration:none;border-radius:3px">
      Order Now →
    </a>
  </div>

  <div style="background:#f6f6f6;padding:16px 32px;text-align:center;border-top:1px solid #eeeeee">
    <p style="margin:0;font-size:11px;color:#999999;line-height:1.6">
      For research purposes only &middot; Not for human consumption<br>
      You're receiving this because you joined the waitlist for ${entry.product_name}.
    </p>
  </div>

</div>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:    `${STORE_NAME} <${FROM_EMAIL}>`,
      to:      [entry.email],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error("Resend failed:", await res.text());
    return false;
  }
  return true;
}
