// Supabase Edge Function: stripe-webhook
// Deploy with: supabase functions deploy stripe-webhook --no-verify-jwt
// (Stripe calls this directly, not with a Supabase user JWT, so JWT
// verification must be disabled for this function.)
//
// In the Stripe Dashboard: Developers > Webhooks > Add endpoint, pointing at
//   https://<project-ref>.functions.supabase.co/stripe-webhook
// Listen for: checkout.session.completed, customer.subscription.updated,
//             customer.subscription.deleted
//
// Secrets needed: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
//                  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan;
        const familyAddon = session.metadata?.family_addon === "true";
        if (userId) {
          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: "active",
              plan,
              family_addon: familyAddon,
              journey: plan,
            })
            .eq("id", userId);
          await supabaseAdmin.from("subscriptions").upsert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            plan,
            status: "active",
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          const status = sub.status; // active | past_due | canceled | trialing ...
          await supabaseAdmin
            .from("subscriptions")
            .upsert({
              user_id: userId,
              stripe_customer_id: sub.customer as string,
              stripe_subscription_id: sub.id,
              plan: sub.metadata?.plan,
              status,
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            });
          await supabaseAdmin
            .from("profiles")
            .update({ subscription_status: status === "active" ? "active" : status })
            .eq("id", userId);
        }
        break;
      }
      default:
        // ignore other event types
        break;
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error("Webhook handling error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
