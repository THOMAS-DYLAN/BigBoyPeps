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

    if (password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...cors },
      });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

    // ── Confirm order ────────────────────────────────────
    if (action === "confirm" && token) {
      const { data, error } = await sb
        .from("orders")
        .update({ status: "payment_processed", confirmed_at: new Date().toISOString() })
        .eq("confirm_token", token)
        .in("status", ["processing", "pending_cashapp"])
        .select("id");

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, updated: data?.length ?? 0 }), {
        status: 200, headers: { "Content-Type": "application/json", ...cors },
      });
    }

    // ── List orders ──────────────────────────────────────
    const { data: orders, error } = await sb
      .from("orders")
      .select("*")
      .order("ordered_at", { ascending: false })
      .limit(200);

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
