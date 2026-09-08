import { useEffect, useState } from "react";
import { ScrollView, Text, Alert } from "react-native";
import { useAuth } from "../../../lib/AuthProvider";
import { supabase } from "../../../lib/supabase";
import { Screen, Card, H1, Lead, Eyebrow, Field, Button, Choice } from "../../../lib/ui";
import { colors } from "../../../lib/theme";

const HOUSEHOLD_OPTS = [
  "Respect one another",
  "Communicate honestly",
  "Keep our home emotionally safe",
  "Share household responsibilities",
  "Support education and personal growth",
  "Spend intentional family time together",
  "Handle disagreements calmly",
  "Practice forgiveness and accountability",
  "Celebrate milestones and kept promises",
  "Support healthy financial habits",
  "Protect family privacy",
  "Create traditions and memories together",
];

export default function HouseholdPromise() {
  const { profile } = useAuth();
  const [checked, setChecked] = useState<string[]>([]);
  const [narrative, setNarrative] = useState("");
  const [body, setBody] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from("household_promises")
        .select("*")
        .eq("user_id", profile.id)
        .maybeSingle();
      if (data) {
        setBody(data.body);
        setNarrative(data.narrative ?? "");
      }
    })();
  }, [profile?.id]);

  function toggle(opt: string) {
    setChecked((c) => (c.includes(opt) ? c.filter((x) => x !== opt) : [...c, opt]));
  }

  async function generate() {
    if (!checked.length) return Alert.alert("Choose at least one household expectation.");
    const { data: members } = await supabase.from("family_members").select("name").eq("user_id", profile!.id);
    const names = (members ?? []).map((m) => m.name);
    const text = `We are a family connected by love, responsibility and the choice to grow together.

In our home, we promise to ${checked.map((x) => x.charAt(0).toLowerCase() + x.slice(1)).join("; to ")}.
${narrative ? `\nOur shared family intention is: ${narrative}\n` : ""}
When we fall short, we will return to this Promise with honesty, grace and accountability. We will celebrate the promises we keep and realign together when our family needs a new beginning.`;

    setBody(text);
    setSaving(true);
    const { error } = await supabase.from("household_promises").upsert({
      user_id: profile!.id,
      body: text,
      names,
      narrative: narrative.trim(),
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) Alert.alert("Couldn't save", error.message);
  }

  return (
    <Screen>
      <ScrollView>
        <Card>
          <Eyebrow>Family Journey · Household Promise</Eyebrow>
          <H1>Create one Promise for the entire family.</H1>
          <Lead>Choose the expectations and values your household wants to live by together.</Lead>

          {HOUSEHOLD_OPTS.map((opt) => (
            <Choice key={opt} label={opt} checked={checked.includes(opt)} onToggle={() => toggle(opt)} />
          ))}

          <Field
            label="Our family narrative"
            value={narrative}
            onChangeText={setNarrative}
            multiline
            placeholder="What kind of home and family culture are you intentionally building together?"
          />

          <Button title="Create Our Household Promise →" onPress={generate} loading={saving} variant="clay" />
        </Card>

        {body && (
          <Card>
            <Eyebrow>Our Household Promise</Eyebrow>
            <Text style={{ color: colors.ink, lineHeight: 22 }}>{body}</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
