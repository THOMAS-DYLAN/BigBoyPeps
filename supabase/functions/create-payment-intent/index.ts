// ═══════════════════════════════════════════════════════════════
// BigBoyPeps — Stripe PaymentIntent Edge Function
// Supabase → Edge Functions → create-payment-intent/index.ts
//
// SETUP:
// 1. Add your Stripe secret key to Supabase secrets:
//    supabase secrets set STRIPE_SECRET_KEY=sk_test_...
// 2. Deploy this function:
//    supabase functions deploy create-payment-intent --project-ref utqviljholfvpfztfuvx
// ═══════════════════════════════════════════════════════════════

import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { amount, currency = 'usd', metadata = {} } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create PaymentIntent — amount must be in cents
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(amount * 100), // convert dollars to cents
      currency,
      metadata,
      automatic_payment_methods: { enabled: true },
    });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
