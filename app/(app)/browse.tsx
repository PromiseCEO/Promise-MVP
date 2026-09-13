import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View, RefreshControl, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabase";
import { likeUser, unlikeUser } from "../../lib/relationship";
import { Screen, Card, H1, Lead, Eyebrow, Button } from "../../lib/ui";
import { colors } from "../../lib/theme";

type OtherProfile = {
  id: string;
  first_name: string;
  identity: string;
  intentional: Record<string, any>;
};

export default function Browse() {
  const { profile } = useAuth();
  const router = useRouter();
  const [people, setPeople] = useState<OtherProfile[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data: others } = await supabase
      .from("profiles")
      .select("id, first_name, identity, intentional")
      .eq("journey", "singles")
      .neq("id", profile.id)
      .limit(50);

    const { data: mine } = await supabase.from("likes").select("target_user_id").eq("user_id", profile.id);

    setPeople((others as OtherProfile[]) ?? []);
    setLikedIds(new Set((mine ?? []).map((r) => r.target_user_id)));
    setLoading(false);
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!profile?.journey || profile.journey !== "singles") {
    return (
      <Screen>
        <Card>
          <Eyebrow>Singles Journey</Eyebrow>
          <H1>This is for the Singles Journey.</H1>
          <Lead>Switch to the Singles Journey from Home to browse and match with other Intentional Singles.</Lead>
        </Card>
      </Screen>
    );
  }

  async function toggleLike(person: OtherProfile) {
    try {
      if (likedIds.has(person.id)) {
        await unlikeUser(person.id);
        setLikedIds((s) => {
          const next = new Set(s);
          next.delete(person.id);
          return next;
        });
      } else {
        await likeUser(person.id);
        setLikedIds((s) => new Set(s).add(person.id));
        Alert.alert("Interest sent", `${person.first_name || "This person"} will only know if it's mutual — check your Matches.`);
      }
    } catch (err: any) {
      Alert.alert("Couldn't do that", err.message ?? String(err));
    }
  }

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <Card>
          <Eyebrow>Intentional Singles</Eyebrow>
          <H1>Browse people building the same kind of relationship.</H1>
          <Lead>Express interest. If it's mutual, you'll see each other in Matches and can propose a Dating Promise.</Lead>
          <Button title="View My Matches →" variant="secondary" onPress={() => router.push("/(app)/matches")} />
        </Card>

        {people.length === 0 && !loading && (
          <Card>
            <Text style={{ color: colors.muted }}>No other Intentional Singles yet. Check back soon.</Text>
          </Card>
        )}

        {people.map((p) => (
          <Card key={p.id}>
            <Text style={{ fontWeight: "800", fontSize: 17, color: colors.ink }}>
              {p.first_name || "Someone new"}
              {p.intentional?.age ? `, ${p.intentional.age}` : ""}
            </Text>
            {!!p.intentional?.city && <Text style={{ color: colors.muted, marginTop: 2 }}>{p.intentional.city}</Text>}
            {!!p.intentional?.occupation && <Text style={{ color: colors.muted }}>{p.intentional.occupation}</Text>}
            {!!p.intentional?.intro && (
              <Text style={{ color: colors.ink, marginTop: 8, lineHeight: 20 }}>{p.intentional.intro}</Text>
            )}
            <Button
              title={likedIds.has(p.id) ? "Interested ✓ (tap to undo)" : "Express Interest"}
              variant={likedIds.has(p.id) ? "secondary" : "primary"}
              onPress={() => toggleLike(p)}
            />
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
