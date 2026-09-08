// Supabase Edge Function: create-checkout-session
// Deploy with: supabase functions deploy create-checkout-session
// Secrets needed (supabase secrets set ...):
//   STRIPE_SECRET_KEY
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-available in Edge Functions)
//   APP_SCHEME (e.g. "promiseapp") used to build the Stripe return URLs

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const APP_SCHEME = Deno.env.get("APP_SCHEME") ?? "promiseapp";

// Map your app's plan names to real Stripe Price IDs (create these in the
// Stripe Dashboard > Product catalog first, then paste the price ids here
// or, better, set them as Edge Function secrets and read them below).
const PRICE_IDS: Record<string, string> = {
  singles: Deno.env.get("STRIPE_PRICE_SINGLES") ?? "",
  couples: Deno.env.get("STRIPE_PRICE_COUPLES") ?? "",
  family_addon: Deno.env.get("STRIPE_PRICE_FAMILY_ADDON") ?? "",
};

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userErr,
    } = await supabaseAdmin.auth.getUser(jwt);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
      });
    }

    const { plan, familyAddon } = await req.json();
    const line_items = [];
    if (PRICE_IDS[plan]) line_items.push({ price: PRICE_IDS[plan], quantity: 1 });
    if (familyAddon && PRICE_IDS.family_addon) {
      line_items.push({ price: PRICE_IDS.family_addon, quantity: 1 });
    }
    if (!line_items.length) {
      return new Response(JSON.stringify({ error: "Unknown plan" }), { status: 400 });
    }

    // Reuse or create a Stripe customer, and remember it on the profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email ?? user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items,
      success_url: `${APP_SCHEME}://checkout-return?status=success`,
      cancel_url: `${APP_SCHEME}://checkout-return?status=cancel`,
      metadata: { supabase_user_id: user.id, plan, family_addon: String(!!familyAddon) },
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
