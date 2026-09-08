import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "./supabase";

/**
 * Starts a Stripe Checkout subscription flow for the given plan.
 * Opens Stripe's hosted checkout page in an in-app browser and waits
 * for the redirect back into the app (promiseapp://checkout-return).
 *
 * Returns { status: 'success' | 'cancel' | 'dismiss' }
 */
export async function startCheckout(plan: "singles" | "couples", familyAddon: boolean) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in.");

  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: { plan, familyAddon },
  });
  if (error) throw error;
  const checkoutUrl = data?.url;
  if (!checkoutUrl) throw new Error("Stripe did not return a checkout URL.");

  const redirectUrl = Linking.createURL("checkout-return");
  const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, redirectUrl);

  if (result.type === "success" && result.url) {
    const parsed = Linking.parse(result.url);
    const status = (parsed.queryParams?.status as string) || "success";
    return { status };
  }
  return { status: result.type === "cancel" ? "cancel" : "dismiss" };
}

/** Re-reads the current subscription status from the profiles table. */
export async function refreshSubscriptionStatus(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("subscription_status, plan, family_addon, journey")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}
