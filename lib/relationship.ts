import { supabase } from "./supabase";

export const MIN_CHECKINS_PER_PARTNER_FOR_ENGAGEMENT = 3;

export type Couple = {
  id: string;
  user_a: string;
  user_b: string;
  source: "dating" | "couples_journey";
  stage: "dating" | "engaged" | "married";
};

/** Calls the shared AI edge function. Never call Anthropic directly from the client. */
export async function generatePromiseText(
  kind: "self" | "dating" | "engagement" | "marriage",
  payload: Record<string, any>
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("generate-promise-text", {
    body: { kind, payload },
  });
  if (error) throw error;
  if (!data?.text) throw new Error("No text returned from the model.");
  return data.text as string;
}

/** The couple record the current user belongs to, if any. */
export async function getMyCouple(userId: string): Promise<Couple | null> {
  const { data, error } = await supabase
    .from("couples")
    .select("*")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .maybeSingle();
  if (error) throw error;
  return (data as Couple) ?? null;
}

export function partnerIdOf(couple: Couple, myId: string): string {
  return couple.user_a === myId ? couple.user_b : couple.user_a;
}

export async function likeUser(targetUserId: string) {
  const { error } = await supabase.from("likes").insert({ target_user_id: targetUserId, user_id: (await supabase.auth.getUser()).data.user!.id });
  if (error) throw error;
}

export async function unlikeUser(targetUserId: string) {
  const uid = (await supabase.auth.getUser()).data.user!.id;
  const { error } = await supabase.from("likes").delete().eq("user_id", uid).eq("target_user_id", targetUserId);
  if (error) throw error;
}

/** Users who mutually liked me back (my matches, not yet a couple). */
export async function getMutualMatches(myId: string) {
  const { data: myLikes, error: e1 } = await supabase.from("likes").select("target_user_id").eq("user_id", myId);
  if (e1) throw e1;
  const targetIds = (myLikes ?? []).map((r) => r.target_user_id);
  if (!targetIds.length) return [];

  const { data: theirLikes, error: e2 } = await supabase
    .from("likes")
    .select("user_id")
    .eq("target_user_id", myId)
    .in("user_id", targetIds);
  if (e2) throw e2;
  const mutualIds = (theirLikes ?? []).map((r) => r.user_id);
  if (!mutualIds.length) return [];

  const { data: profiles, error: e3 } = await supabase.from("profiles").select("*").in("id", mutualIds);
  if (e3) throw e3;
  return profiles ?? [];
}

export async function proposeDatingPromise(targetId: string, html: string, commitments: string[]) {
  const { data, error } = await supabase.rpc("propose_dating_promise", {
    target_id: targetId,
    promise_html: html,
    promise_commitments: commitments,
  });
  if (error) throw error;
  return data as string; // couple id
}

export async function signDatingPromise(coupleId: string) {
  const { error } = await supabase.rpc("sign_dating_promise", { cid: coupleId });
  if (error) throw error;
}

export async function submitProgressCheckin(coupleId: string, userId: string, answers: Record<string, string>) {
  const { error } = await supabase.from("progress_checkins").insert({
    couple_id: coupleId,
    user_id: userId,
    answers,
  });
  if (error) throw error;
}

/** How many check-ins has each partner completed for this couple? */
export async function getCheckinCounts(coupleId: string, couple: Couple) {
  const { data, error } = await supabase.from("progress_checkins").select("user_id").eq("couple_id", coupleId);
  if (error) throw error;
  const rows = data ?? [];
  const a = rows.filter((r) => r.user_id === couple.user_a).length;
  const b = rows.filter((r) => r.user_id === couple.user_b).length;
  return { a, b };
}

export async function engagementUnlocked(coupleId: string, couple: Couple) {
  const { a, b } = await getCheckinCounts(coupleId, couple);
  return a >= MIN_CHECKINS_PER_PARTNER_FOR_ENGAGEMENT && b >= MIN_CHECKINS_PER_PARTNER_FOR_ENGAGEMENT;
}

export async function createCoupleInvite(myId: string): Promise<string> {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const { error } = await supabase.from("couple_invites").insert({ code, created_by: myId });
  if (error) throw error;
  return code;
}

export async function redeemCoupleInvite(code: string): Promise<string> {
  const { data, error } = await supabase.rpc("redeem_couple_invite", { invite_code: code });
  if (error) throw error;
  return data as string; // couple id
}
