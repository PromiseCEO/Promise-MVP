import { useCallback, useState } from "react";
import { ScrollView, Text, Alert, RefreshControl } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabase";
import { getMutualMatches, getMyCouple, generatePromiseText, proposeDatingPromise } from "../../lib/relationship";
import { Screen, Card, H1, Lead, Eyebrow, Button } from "../../lib/ui";
import { colors } from "../../lib/theme";

const DATING_COMMITMENTS = [
  "We will be honest with each other",
  "We will communicate openly about where this is going",
  "We will check in on how we're really doing",
  "We will keep dating others until we agree otherwise",
  "We will take our time and not rush the relationship",
];

export default function Matches() {
  const { profile } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<any[]>([]);
  const [existingCoupleId, setExistingCoupleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [proposingTo, setProposingTo] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const couple = await getMyCouple(profile.id);
    setExistingCoupleId(couple?.id ?? null);
    if (!couple) {
      const m = await getMutualMatches(profile.id);
      setMatches(m);
    }
    setLoading(false);
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function proposeTo(person: any) {
    if (!profile) return;
    setProposingTo(person.id);
    try {
      const html = await generatePromiseText("dating", {
        commitments: DATING_COMMITMENTS,
        nameA: profile.first_name || "Partner A",
        nameB: person.first_name || "Partner B",
      });
      const coupleId = await proposeDatingPromise(person.id, html, DATING_COMMITMENTS);
      setExistingCoupleId(coupleId);
      Alert.alert(
        "Dating Promise proposed",
        `${person.first_name || "They"} will see it and can sign to make it official.`
      );
      router.push("/(app)/dating-promise");
    } catch (err: any) {
      Alert.alert("Couldn't propose a Dating Promise", err.message ?? String(err));
    } finally {
      setProposingTo(null);
    }
  }

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <Card>
          <Eyebrow>Mutual Matches</Eyebrow>
          <H1>People who are interested back.</H1>
          <Lead>When you're both ready, either of you can propose a Dating Promise.</Lead>
        </Card>

        {existingCoupleId ? (
          <Card>
            <Text style={{ color: colors.ink }}>You already have an active Dating Promise / couple.</Text>
            <Button title="View My Dating Promise →" onPress={() => router.push("/(app)/dating-promise")} />
          </Card>
        ) : matches.length === 0 && !loading ? (
          <Card>
            <Text style={{ color: colors.muted }}>No mutual matches yet — keep browsing.</Text>
            <Button title="Browse Singles →" variant="secondary" onPress={() => router.push("/(app)/browse")} />
          </Card>
        ) : (
          matches.map((m) => (
            <Card key={m.id}>
              <Text style={{ fontWeight: "800", fontSize: 17, color: colors.ink }}>{m.first_name || "Someone new"}</Text>
              {!!m.intentional?.city && <Text style={{ color: colors.muted }}>{m.intentional.city}</Text>}
              <Button
                title="Propose a Dating Promise →"
                loading={proposingTo === m.id}
                onPress={() => proposeTo(m)}
              />
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
