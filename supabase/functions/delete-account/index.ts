// Supabase Edge Function: delete-account
// Deploy with: supabase functions deploy delete-account
//
// Permanently deletes the authenticated user's auth.users row.
// Every other table (profiles, self_promises, likes, couples,
// dating_promises, progress_checkins, engagement_promises,
// marriage_promises, family data, subscriptions, etc.) cascades
// automatically via "on delete cascade" foreign keys already in schema.sql.

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }

    // Optional: if the user has an active Stripe subscription, cancel it first
    // so they aren't charged after deleting their account. Uncomment and adapt
    // if you store a stripe_customer_id / stripe_subscription_id on profiles.
    //
    // const { data: profile } = await supabaseAdmin
    //   .from("profiles")
    //   .select("stripe_subscription_id")
    //   .eq("id", user.id)
    //   .maybeSingle();
    // if (profile?.stripe_subscription_id) {
    //   const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
    //   await fetch(`https://api.stripe.com/v1/subscriptions/${profile.stripe_subscription_id}`, {
    //     method: "DELETE",
    //     headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
    //   });
    // }

    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteErr) throw deleteErr;

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
