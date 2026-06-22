// ═══════════════════════════════════════════════════════════
// Unified Admin Orders Edge Function — BigBoyPeps + 956 Labs
// Both sites call this SAME function (same Supabase project).
// The "site" field in the request body determines which
// store's orders are returned — this prevents one site's
// admin panel from showing the other site's orders.
//
// Deploy ONCE: supabase functions deploy admin-orders --no-verify-jwt
// (Deploying from either repo works — keep both copies identical.)
// ═══════════════════════════════════════════════════════════
import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") || "bbpadmin2025";

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json();
    const { password, action, token } = body;
    const site = body.site === "956labs" ? "956labs" : "bbp"; // defaults to bbp if unspecified

    if (password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...cors },
      });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

    // ── Confirm order — scoped to the same site to avoid cross-site confirms ──
    if (action === "confirm" && token) {
      let query = sb
        .from("orders")
        .update({ status: "payment_processed", confirmed_at: new Date().toISOString() })
        .eq("confirm_token", token)
        .in("status", ["processing", "pending_cashapp", "pending_zelle", "pending_bitcoin"]);

      if (site === "956labs") {
        query = query.eq("source_site", "956labs");
      } else {
        query = query.or("source_site.eq.bbp,source_site.is.null");
      }

      const { data, error } = await query.select("id");
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, updated: data?.length ?? 0 }), {
        status: 200, headers: { "Content-Type": "application/json", ...cors },
      });
    }

    // ── List orders — filtered to the requesting site ──────
    let listQuery = sb.from("orders").select("*").order("ordered_at", { ascending: false }).limit(200);

    if (site === "956labs") {
      listQuery = listQuery.eq("source_site", "956labs");
    } else {
      // bbp orders: explicit 'bbp' OR legacy rows from before source_site existed (null)
      listQuery = listQuery.or("source_site.eq.bbp,source_site.is.null");
    }

    const { data: orders, error } = await listQuery;
    if (error) throw error;

    return new Response(JSON.stringify({ orders: orders || [] }), {
      status: 200, headers: { "Content-Type": "application/json", ...cors },
    });

  } catch (err) {
    console.error("admin-orders error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { "Content-Type": "application/json", ...cors },
    });
  }
});
