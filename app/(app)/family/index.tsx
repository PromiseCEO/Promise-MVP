import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../../../lib/AuthProvider";
import { supabase } from "../../../lib/supabase";
import { Screen, Card, H1, Lead, Eyebrow, Button } from "../../../lib/ui";
import { colors, spacing, radius } from "../../../lib/theme";

type FamilyMember = {
  id: string;
  name: string;
  age: string;
  relationship: string;
  grade: string;
  expectations: string[];
  promise_text: string | null;
};

export default function FamilyHome() {
  const { profile } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<FamilyMember[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("family_members")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: true });
    setMembers((data as FamilyMember[]) ?? []);
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <ScrollView>
        <Card>
          <Eyebrow>Family Journey</Eyebrow>
          <H1>Who is part of your household?</H1>
          <Lead>
            Create a basic profile for each participating family member, then build an Individual Promise
            with each person before creating one Household Promise.
          </Lead>

          {members.length === 0 && (
            <Text style={{ color: colors.muted, marginBottom: spacing.sm }}>
              No family members added yet.
            </Text>
          )}

          {members.map((m) => (
            <View
              key={m.id}
              style={{
                borderWidth: 1,
                borderColor: colors.line,
                borderRadius: radius.md,
                padding: spacing.sm,
                marginBottom: spacing.xs,
                backgroundColor: "#fff",
              }}
            >
              <Text style={{ fontWeight: "800", color: colors.ink, fontSize: 16 }}>{m.name}</Text>
              <Text style={{ color: colors.muted, marginBottom: 8 }}>
                {m.age ? `${m.age} years old · ` : ""}
                {m.relationship} · {m.grade || "N/A"}
              </Text>
              <Button
                title={m.promise_text ? "View / Update Promise" : "Create Individual Promise"}
                variant="secondary"
                onPress={() => router.push({ pathname: "/(app)/family/add", params: { id: m.id, mode: "promise" } })}
              />
            </View>
          ))}

          <Button title="+ Add Family Member" onPress={() => router.push("/(app)/family/add")} />
          <Button
            title="Create Household Promise →"
            variant="clay"
            onPress={() => router.push("/(app)/family/household")}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}
