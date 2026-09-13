import { useCallback, useState } from "react";
import { ScrollView, Text, Alert, RefreshControl } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabase";
import { getMyCouple, partnerIdOf, signDatingPromise, engagementUnlocked } from "../../lib/relationship";
import { Screen, Card, H1, Lead, Eyebrow, Button } from "../../lib/ui";
import { colors } from "../../lib/theme";

export default function DatingPromise() {
  const { profile } = useAuth();
  const router = useRouter();
  const [couple, setCouple] = useState<any>(null);
  const [promise, setPromise] = useState<any>(null);
  const [partnerName, setPartnerName] = useState("");
  const [canAdvance, setCanAdvance] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const c = await getMyCouple(profile.id);
    setCouple(c);
    if (c) {
      const { data: p } = await supabase.from("dating_promises").select("*").eq("couple_id", c.id).maybeSingle();
      setPromise(p);
      const { data: partner } = await supabase.from("profiles").select("first_name").eq("id", partnerIdOf(c, profile.id)).maybeSingle();
      setPartnerName(partner?.first_name || "Your partner");
      if (p?.signed_a && p?.signed_b) setCanAdvance(await engagementUnlocked(c.id, c));
    }
    setLoading(false);
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function sign() {
    if (!couple) return;
    try {
      await signDatingPromise(couple.id);
      Alert.alert("Signed", "Your Dating Promise is now recorded.");
      load();
    } catch (err: any) {
      Alert.alert("Couldn't sign", err.message ?? String(err));
    }
  }

  const myField = couple && profile && couple.user_a === profile.id ? "signed_a" : "signed_b";
  const iSigned = promise?.[myField];
  const bothSigned = promise?.signed_a && promise?.signed_b;

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <Card>
          <Eyebrow>Dating Promise</Eyebrow>
          <H1>{partnerName ? `You and ${partnerName}` : "Your Dating Promise"}</H1>
          {!couple && !loading && <Lead>You don't have an active Dating Promise yet. Go to Matches to propose one.</Lead>}
          {!!promise?.html && <Text style={{ color: colors.ink, lineHeight: 22, marginTop: 8 }}>{promise.html}</Text>}
        </Card>

        {promise && !iSigned && (
          <Card>
            <Text style={{ color: colors.ink, marginBottom: 8 }}>Ready to sign this Dating Promise?</Text>
            <Button title="Sign My Dating Promise →" onPress={sign} />
          </Card>
        )}

        {promise && iSigned && !bothSigned && (
          <Card>
            <Text style={{ color: colors.muted }}>You've signed. Waiting on {partnerName} to sign too.</Text>
          </Card>
        )}

        {bothSigned && (
          <Card>
            <Text style={{ color: colors.ink, fontWeight: "800", marginBottom: 4 }}>You're both in.</Text>
            <Text style={{ color: colors.muted, marginBottom: 8 }}>
              Complete periodic progress check-ins together. After you've each done a few, the Engagement Promise unlocks.
            </Text>
            <Button title="Do a Progress Check-in →" variant="secondary" onPress={() => router.push("/(app)/progress-checkin")} />
            {canAdvance && (
              <Button title="Create Our Engagement Promise →" variant="clay" onPress={() => router.push("/(app)/engagement-promise")} />
            )}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
