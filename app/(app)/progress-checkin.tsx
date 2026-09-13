import { useCallback, useState } from "react";
import { ScrollView, Text, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "../../lib/AuthProvider";
import { getMyCouple, submitProgressCheckin, getCheckinCounts, MIN_CHECKINS_PER_PARTNER_FOR_ENGAGEMENT } from "../../lib/relationship";
import { Screen, Card, H1, Lead, Eyebrow, Field, Button } from "../../lib/ui";
import { colors } from "../../lib/theme";

const QUESTIONS = [
  { key: "aligned", label: "How aligned do you feel on where this is going?" },
  { key: "communication", label: "How is communication between you two lately?" },
  { key: "concerns", label: "Anything you're unsure about or want to revisit?" },
];

export default function ProgressCheckin() {
  const { profile } = useAuth();
  const router = useRouter();
  const [couple, setCouple] = useState<any>(null);
  const [myCount, setMyCount] = useState(0);
  const [partnerCount, setPartnerCount] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const c = await getMyCouple(profile.id);
    setCouple(c);
    if (c) {
      const counts = await getCheckinCounts(c.id, c);
      const isA = c.user_a === profile.id;
      setMyCount(isA ? counts.a : counts.b);
      setPartnerCount(isA ? counts.b : counts.a);
    }
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function submit() {
    if (!couple || !profile) return;
    if (QUESTIONS.some((q) => !answers[q.key]?.trim())) {
      return Alert.alert("Please answer all three questions.");
    }
    setSaving(true);
    try {
      await submitProgressCheckin(couple.id, profile.id, answers);
      Alert.alert("Check-in saved", "Thanks for reflecting honestly.");
      setAnswers({});
      load();
    } catch (err: any) {
      Alert.alert("Couldn't save", err.message ?? String(err));
    } finally {
      setSaving(false);
    }
  }

  if (!couple) {
    return (
      <Screen>
        <Card>
          <Eyebrow>Progress Check-in</Eyebrow>
          <H1>You need an active couple first.</H1>
          <Lead>Sign a Dating Promise or link with your partner in the Couples Journey to start check-ins.</Lead>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView>
        <Card>
          <Eyebrow>Progress Check-in</Eyebrow>
          <H1>How are things going?</H1>
          <Lead>Answer independently and honestly — your partner won't see your individual answers, only that a check-in happened.</Lead>
          <Text style={{ color: colors.muted, marginBottom: 8 }}>
            You: {myCount} completed · Partner: {partnerCount} completed · Engagement Promise unlocks at {MIN_CHECKINS_PER_PARTNER_FOR_ENGAGEMENT} each
          </Text>

          {QUESTIONS.map((q) => (
            <Field
              key={q.key}
              label={q.label}
              value={answers[q.key] || ""}
              onChangeText={(v) => setAnswers((a) => ({ ...a, [q.key]: v }))}
              multiline
              style={{ minHeight: 70 }}
            />
          ))}

          <Button title="Save Check-in →" onPress={submit} loading={saving} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
