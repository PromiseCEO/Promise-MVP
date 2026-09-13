import { useCallback, useState } from "react";
import { ScrollView, Text, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabase";
import { getMyCouple, partnerIdOf, generatePromiseText } from "../../lib/relationship";
import { Screen, Card, H1, Lead, Eyebrow, Field, Button } from "../../lib/ui";
import { colors } from "../../lib/theme";

export default function MarriagePromise() {
  const { profile } = useAuth();
  const [couple, setCouple] = useState<any>(null);
  const [engagement, setEngagement] = useState<any>(null);
  const [dating, setDating] = useState<any>(null);
  const [partnerName, setPartnerName] = useState("");
  const [existing, setExisting] = useState<any>(null);
  const [goal1, setGoal1] = useState("");
  const [goal2, setGoal2] = useState("");
  const [goal3, setGoal3] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const c = await getMyCouple(profile.id);
    setCouple(c);
    if (!c) return;

    const { data: eng } = await supabase.from("engagement_promises").select("*").eq("couple_id", c.id).maybeSingle();
    setEngagement(eng);
    const { data: dat } = await supabase.from("dating_promises").select("*").eq("couple_id", c.id).maybeSingle();
    setDating(dat);
    const { data: mar } = await supabase.from("marriage_promises").select("*").eq("couple_id", c.id).maybeSingle();
    setExisting(mar);
    const { data: partner } = await supabase.from("profiles").select("first_name").eq("id", partnerIdOf(c, profile.id)).maybeSingle();
    setPartnerName(partner?.first_name || "your partner");
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function generate() {
    if (!couple || !profile) return;
    if (!engagement?.signed_a || !engagement?.signed_b) {
      return Alert.alert("Complete and sign your Engagement Promise first.");
    }
    setSaving(true);
    try {
      const { data: mySelf } = await supabase
        .from("self_promises")
        .select("html")
        .eq("user_id", profile.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      const partnerId = partnerIdOf(couple, profile.id);
      const { data: partnerSelf } = await supabase
        .from("self_promises")
        .select("html")
        .eq("user_id", partnerId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      const longTermGoals = [goal1, goal2, goal3].filter((g) => g.trim());

      const html = await generatePromiseText("marriage", {
        selfPromiseA: mySelf?.html || "",
        selfPromiseB: partnerSelf?.html || "",
        datingOrRealignmentHtml: dating?.html || "",
        engagementHtml: engagement?.html || "",
        longTermGoals,
        nameA: profile.first_name,
        nameB: partnerName,
      });

      const { error } = await supabase.from("marriage_promises").upsert({
        couple_id: couple.id,
        html,
        long_term_goals: longTermGoals,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      await supabase.from("couples").update({ stage: "married" }).eq("id", couple.id);
      setExisting({ html, long_term_goals: longTermGoals });
      Alert.alert("Marriage Promise created", "Your keepsake combined promise is ready to sign.");
    } catch (err: any) {
      Alert.alert("Couldn't generate your Marriage Promise", err.message ?? String(err));
    } finally {
      setSaving(false);
    }
  }

  async function signMine() {
    if (!couple || !profile) return;
    const field = couple.user_a === profile.id ? "signed_a" : "signed_b";
    const { error } = await supabase.from("marriage_promises").update({ [field]: true }).eq("couple_id", couple.id);
    if (error) return Alert.alert("Couldn't sign", error.message);
    load();
  }

  if (!couple) {
    return (
      <Screen>
        <Card>
          <Eyebrow>Marriage Promise</Eyebrow>
          <H1>You need an active couple first.</H1>
        </Card>
      </Screen>
    );
  }

  const myField = couple.user_a === profile!.id ? "signed_a" : "signed_b";
  const iSigned = existing?.[myField];
  const bothSigned = existing?.signed_a && existing?.signed_b;

  return (
    <Screen>
      <ScrollView>
        <Card>
          <Eyebrow>Marriage Promise</Eyebrow>
          <H1>The final keepsake, together.</H1>
          <Lead>
            This combines your Self Promises, your Dating/Realignment Promise, and your Engagement Promise into one
            document — plus a few new long-term commitments for the marriage itself.
          </Lead>

          <Field label="Long-term goal 1" value={goal1} onChangeText={setGoal1} placeholder="e.g. Build a home together in..." />
          <Field label="Long-term goal 2" value={goal2} onChangeText={setGoal2} placeholder="e.g. Raise our family with..." />
          <Field label="Long-term goal 3" value={goal3} onChangeText={setGoal3} placeholder="e.g. Grow old while continuing to..." />

          <Button title="Create Our Marriage Promise →" onPress={generate} loading={saving} />
        </Card>

        {existing?.html && (
          <Card>
            <Eyebrow>Our Marriage Promise</Eyebrow>
            <Text style={{ color: colors.ink, lineHeight: 22 }}>{existing.html}</Text>
            {!iSigned && <Button title="Sign My Marriage Promise →" onPress={signMine} />}
            {iSigned && !bothSigned && <Text style={{ color: colors.muted, marginTop: 8 }}>Waiting on {partnerName} to sign.</Text>}
            {bothSigned && <Text style={{ color: colors.ink, fontWeight: "800", marginTop: 8 }}>Complete. Congratulations. 💍</Text>}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
