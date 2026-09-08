import { useCallback, useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabase";
import { Screen, Card, H1, Lead, Eyebrow, Field, Button, Choice } from "../../lib/ui";
import { colors, spacing } from "../../lib/theme";

const MILESTONES = [
  "Realignment Goal",
  "Dating Promise Goal",
  "Engagement Goal",
  "Wedding Planning Goal",
  "Marriage Promise Goal",
  "Shared Home Goal",
  "Family Goal",
  "Travel or Experience Goal",
  "Career and Financial Goal",
];

type Goal = {
  id: string;
  couple_name: string;
  avatar: string;
  milestone: string;
  goal: string;
  target: string;
  celebrations: number;
  visibility: string;
};

export default function CouplesGoalsWall() {
  const { profile } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestone, setMilestone] = useState(MILESTONES[0]);
  const [goalText, setGoalText] = useState("");
  const [target, setTarget] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [posting, setPosting] = useState(false);

  const isCouples = profile?.journey === "couples";

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("couples_goals")
      .select("*")
      .order("created_at", { ascending: false });
    setGoals((data as Goal[]) ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function post() {
    if (!goalText.trim() || !target.trim()) {
      return;
    }
    setPosting(true);
    const avatar = milestone.includes("Engagement") ? "💍" : milestone.includes("Wedding") ? "💐" : milestone.includes("Home") ? "🏡" : "🤝";
    const { error } = await supabase.from("couples_goals").insert({
      user_id: profile!.id,
      couple_name: "Our Couple",
      avatar,
      milestone,
      goal: goalText.trim(),
      target: target.trim(),
      visibility,
    });
    setPosting(false);
    if (!error) {
      setGoalText("");
      setTarget("");
      load();
    }
  }

  async function celebrate(goal: Goal) {
    await supabase.from("couples_goals").update({ celebrations: goal.celebrations + 1 }).eq("id", goal.id);
    load();
  }

  return (
    <Screen>
      <ScrollView>
        <Card>
          <Eyebrow>Couples Goals Wall</Eyebrow>
          <H1>See what intentional relationships are building toward.</H1>
          <Lead>Couples control whether each goal is public or private. Singles can browse public posts for inspiration.</Lead>
        </Card>

        {isCouples && (
          <Card>
            <Text style={{ fontWeight: "800", color: colors.ink, marginBottom: 8 }}>Post Our Milestone Goal</Text>
            <Text style={{ fontWeight: "800", marginBottom: 4, color: colors.ink }}>Milestone</Text>
            {MILESTONES.map((m) => (
              <Choice key={m} label={m} checked={milestone === m} onToggle={() => setMilestone(m)} />
            ))}
            <Field label="Target timing" value={target} onChangeText={setTarget} placeholder="Spring 2027 or next 90 days" />
            <Field
              label="What are we intentionally working toward?"
              value={goalText}
              onChangeText={setGoalText}
              multiline
              placeholder="Share the milestone you are building toward and why it matters."
            />
            <Choice label="Public — inspire the Promise community" checked={visibility === "public"} onToggle={() => setVisibility("public")} />
            <Choice label="Private — only our couple" checked={visibility === "private"} onToggle={() => setVisibility("private")} />
            <Button title="Post Our Goal →" onPress={post} loading={posting} />
          </Card>
        )}

        <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
          {goals
            .filter((g) => g.visibility === "public" || (isCouples && g.visibility === "private"))
            .map((g) => (
              <Card key={g.id}>
                <Text style={{ fontSize: 24 }}>{g.avatar}</Text>
                <Text style={{ fontWeight: "800", color: colors.ink }}>{g.couple_name}</Text>
                <Text style={{ color: colors.muted, marginBottom: 6 }}>
                  {g.milestone} · {g.target}
                </Text>
                <Text style={{ color: colors.ink, marginBottom: 10 }}>{g.goal}</Text>
                <Pressable onPress={() => celebrate(g)}>
                  <Text style={{ color: colors.forest, fontWeight: "800" }}>♡ Celebrate {g.celebrations}</Text>
                </Pressable>
              </Card>
            ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
