import { useEffect, useState } from "react";
import { ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabase";
import { Screen, Card, H1, Lead, Eyebrow, Field, Button } from "../../lib/ui";

const REQUIRED = ["city", "age", "occupation", "education", "accomplishment", "readiness", "familyGoals", "values", "building"];

export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.intentional) setForm(profile.intentional);
  }, [profile?.intentional]);

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    const missing = REQUIRED.filter((k) => !form[k]?.trim());
    if (missing.length) {
      Alert.alert("A few required fields are missing", missing.join(", "));
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ intentional: form, ladies_message_free: profile?.identity === "Woman" })
      .eq("id", profile!.id);
    setSaving(false);
    if (error) return Alert.alert("Couldn't save", error.message);
    await refreshProfile();
    router.push("/(app)/self-promise");
  }

  return (
    <Screen>
      <ScrollView>
        <Card>
          <Eyebrow>Build Your Intentional Profile</Eyebrow>
          <H1>What you have accomplished — and what you are ready to build.</H1>
          <Lead>Accomplishment isn't measured by income alone: education, service, stability, growth and follow-through all matter.</Lead>

          <Field label="City · Required" value={form.city} onChangeText={set("city")} placeholder="Atlanta, GA" />
          <Field label="Age · Required" value={form.age} onChangeText={set("age")} keyboardType="numeric" placeholder="35" />
          <Field label="Occupation · Required" value={form.occupation} onChangeText={set("occupation")} placeholder="Nurse, entrepreneur, educator..." />
          <Field label="Education or training · Required" value={form.education} onChangeText={set("education")} placeholder="Bachelor's degree" />
          <Field label="Career stage" value={form.careerStage} onChangeText={set("careerStage")} placeholder="Established professional" />
          <Field label="Relationship readiness · Required" value={form.readiness} onChangeText={set("readiness")} placeholder="Ready for marriage" />
          <Field
            label="An accomplishment you're proud of · Required"
            value={form.accomplishment}
            onChangeText={set("accomplishment")}
            placeholder="Something you built, overcame, or sustained"
            multiline
          />
          <Field label="Children & family goals · Required" value={form.familyGoals} onChangeText={set("familyGoals")} placeholder="Wants children" />
          <Field label="Lifestyle" value={form.lifestyle} onChangeText={set("lifestyle")} placeholder="Family and home-centered" />
          <Field label="Core values · Required" value={form.values} onChangeText={set("values")} placeholder="Family, faith, honesty, growth" multiline />
          <Field
            label="What you're intentionally building now · Required"
            value={form.building}
            onChangeText={set("building")}
            placeholder="The life, home, career or legacy you're working toward"
            multiline
          />
          <Field label="Short introduction" value={form.intro} onChangeText={set("intro")} placeholder="What should an intentional match know about you?" multiline />

          <Button title="Save My Intentional Profile →" onPress={save} loading={saving} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
