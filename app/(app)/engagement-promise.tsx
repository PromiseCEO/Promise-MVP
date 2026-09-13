import { useCallback, useState } from "react";
import { ScrollView, Text, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabase";
import { getMyCouple, partnerIdOf, engagementUnlocked, generatePromiseText } from "../../lib/relationship";
import { Screen, Card, H1, Lead, Eyebrow, Field, Button, Choice } from "../../lib/ui";
import { colors } from "../../lib/theme";

const ENGAGEMENT_COMMITMENTS = [
  "We will plan this wedding as a team",
  "We will keep our families informed and involved appropriately",
  "We will protect our relationship while planning, not just the event",
  "We will revisit our Self and Dating Promises as we prepare for marriage",
];

export default function EngagementPromise() {
  const { profile } = useAuth();
  const router = useRouter();
  const [couple, setCouple] = useState<any>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [existing, setExisting] = useState<any>(null);
  const [partnerName, setPartnerName] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [weddingTargetDate, setWeddingTargetDate] = useState("");
  const [venueType, setVenueType] = useState("");
  const [budgetNotes, setBudgetNotes] = useState("");
  const [familyInvolvement, setFamilyInvolvement] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const c = await getMyCouple(profile.id);
    setCouple(c);
    if (c) {
      setUnlocked(await engagementUnlocked(c.id, c));
      const { data: p } = await supabase.from("engagement_promises").select("*").eq("couple_id", c.id).maybeSingle();
      setExisting(p);
      if (p) {
        setChecked(p.commitments ?? []);
        setWeddingTargetDate(p.wedding_target_date ?? "");
        setVenueType(p.venue_type ?? "");
        setBudgetNotes(p.budget_notes ?? "");
        setFamilyInvolvement(p.family_involvement ?? "");
      }
      const { data: partner } = await supabase.from("profiles").select("first_name").eq("id", partnerIdOf(c, profile.id)).maybeSingle();
      setPartnerName(partner?.first_name || "your partner");
    }
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function toggle(opt: string) {
    setChecked((c) => (c.includes(opt) ? c.filter((x) => x !== opt) : [...c, opt]));
  }

  async function generate() {
    if (!couple || !profile) return;
    if (checked.length < 2) return Alert.alert("Choose at least two shared commitments.");
    setSaving(true);
    try {
      const html = await generatePromiseText("engagement", {
        commitments: checked,
        nameA: profile.first_name,
        nameB: partnerName,
        weddingTargetDate,
        venueType,
        budgetNotes,
        familyInvolvement,
      });
      const { error } = await supabase.from("engagement_promises").upsert({
        couple_id: couple.id,
        html,
        commitments: checked,
        wedding_target_date: weddingTargetDate,
        venue_type: venueType,
        budget_notes: budgetNotes,
        family_involvement: familyInvolvement,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      await supabase.from("couples").update({ stage: "engaged" }).eq("id", couple.id);
      setExisting({ html, commitments: checked });
      Alert.alert("Engagement Promise created", "Both of you should review and sign it.");
    } catch (err: any) {
      Alert.alert("Couldn't generate your Engagement Promise", err.message ?? String(err));
    } finally {
      setSaving(false);
    }
  }

  async function signMine() {
    if (!couple || !profile) return;
    const field = couple.user_a === profile.id ? "signed_a" : "signed_b";
    const { error } = await supabase.from("engagement_promises").update({ [field]: true }).eq("couple_id", couple.id);
    if (error) return Alert.alert("Couldn't sign", error.message);
    load();
  }

  if (!couple) {
    return (
      <Screen>
        <Card>
          <Eyebrow>Engagement Promise</Eyebrow>
          <H1>You need an active couple first.</H1>
        </Card>
      </Screen>
    );
  }

  if (!unlocked && !existing) {
    return (
      <Screen>
        <Card>
          <Eyebrow>Engagement Promise</Eyebrow>
          <H1>Not unlocked yet.</H1>
          <Lead>Complete more Progress Check-ins together before creating your Engagement Promise.</Lead>
          <Button title="Do a Progress Check-in →" variant="secondary" onPress={() => router.push("/(app)/progress-checkin")} />
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
          <Eyebrow>Engagement Promise</Eyebrow>
          <H1>You and {partnerName}, engaged.</H1>
          <Lead>A more detailed promise, including how you'll approach planning the wedding together.</Lead>

          <Text style={{ fontWeight: "800", marginTop: 8, marginBottom: 4, color: colors.ink }}>Shared commitments</Text>
          {ENGAGEMENT_COMMITMENTS.map((opt) => (
            <Choice key={opt} label={opt} checked={checked.includes(opt)} onToggle={() => toggle(opt)} />
          ))}

          <Field label="Wedding target date / timing" value={weddingTargetDate} onChangeText={setWeddingTargetDate} placeholder="Spring 2027" />
          <Field label="Venue type" value={venueType} onChangeText={setVenueType} placeholder="Backyard, church, destination..." />
          <Field label="Budget approach" value={budgetNotes} onChangeText={setBudgetNotes} placeholder="What you've discussed about budget" multiline />
          <Field label="Family involvement" value={familyInvolvement} onChangeText={setFamilyInvolvement} placeholder="How involved each family will be" multiline />

          <Button title="Create Our Engagement Promise →" onPress={generate} loading={saving} />
        </Card>

        {existing?.html && (
          <Card>
            <Eyebrow>Our Engagement Promise</Eyebrow>
            <Text style={{ color: colors.ink, lineHeight: 22 }}>{existing.html}</Text>
            {!iSigned && <Button title="Sign My Engagement Promise →" onPress={signMine} />}
            {iSigned && !bothSigned && <Text style={{ color: colors.muted, marginTop: 8 }}>Waiting on {partnerName} to sign.</Text>}
            {bothSigned && (
              <>
                <Text style={{ color: colors.ink, fontWeight: "800", marginTop: 8 }}>You're both signed. On to marriage.</Text>
                <Button title="Create Our Marriage Promise →" variant="clay" onPress={() => router.push("/(app)/marriage-promise")} />
              </>
            )}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
