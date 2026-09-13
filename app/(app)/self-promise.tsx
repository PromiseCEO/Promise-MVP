import { useEffect, useState } from "react";
import { ScrollView, Text, Alert } from "react-native";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabase";
import { Screen, Card, H1, Lead, Eyebrow, Field, Button, Choice } from "../../lib/ui";
import { colors } from "../../lib/theme";

const SELF_OPTS = [
  "I will be honest with myself",
  "I will honor my boundaries",
  "I will communicate clearly",
  "I will choose relationships intentionally",
  "I will protect my peace",
  "I will remain accountable",
  "I will continue growing",
  "I will value consistency",
  "I will give and receive respect",
  "I will not abandon myself to keep a relationship",
];

export default function SelfPromise() {
  const { profile } = useAuth();
  const [dateYourself, setDateYourself] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!profile) return;
      const { data } = await supabase
        .from("self_promises")
        .select("*")
        .eq("user_id", profile.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setNarrative(data.html);
        setDateYourself(data.date_yourself ?? "");
        setChecked(data.commitments ?? []);
        setVersion(data.version ?? 1);
      }
    })();
  }, [profile?.id]);

  function toggle(opt: string) {
    setChecked((c) => (c.includes(opt) ? c.filter((x) => x !== opt) : [...c, opt]));
  }

  async function generate() {
    if (checked.length < 2) return Alert.alert("Choose at least two commitments.");
    if (!dateYourself.trim()) return Alert.alert("Complete the required Date Yourself First narrative.");

    const last = checked[checked.length - 1];
    const rest = checked.slice(0, -1).join(", ");
    const text = `I promise to move through life and relationships with intention. I will listen to my own needs, remain honest about what I value, and remember that a healthy partnership begins with the promises I keep to myself.

My Date Yourself First Promise: ${dateYourself.trim()}

I especially promise that ${rest}${checked.length > 1 ? ", and " : ""}${last}.

I give myself permission to grow, to learn, to change with wisdom, and to seek love without losing the person I am becoming. This is my Promise to myself — made with care, courage, and intention.`;

    setNarrative(text);
    setSaving(true);
    const nextVersion = version + 1;
    const { error } = await supabase.from("self_promises").insert({
      user_id: profile!.id,
      html: text,
      commitments: checked,
      date_yourself: dateYourself.trim(),
      promise_date: new Date().toISOString().slice(0, 10),
      version: nextVersion,
    });
    setSaving(false);
    if (error) Alert.alert("Couldn't save your Self Promise", error.message);
    else setVersion(nextVersion);
  }

  return (
    <Screen>
      <ScrollView>
        <Card>
          <Eyebrow>Date Yourself First + Self Promise</Eyebrow>
          <H1>Create Your Self Promise.</H1>
          <Lead>
            A required reflection about the relationship you promise to build with yourself and what a
            healthy partner should add to your life.
          </Lead>

          <Field
            label="Date Yourself First narrative · Required"
            value={dateYourself}
            onChangeText={setDateYourself}
            placeholder="I promise to know, value and care for myself by..."
            multiline
            style={{ minHeight: 100 }}
          />

          <Text style={{ fontWeight: "800", marginTop: 12, marginBottom: 4, color: colors.ink }}>
            My personal commitments
          </Text>
          {SELF_OPTS.map((opt) => (
            <Choice key={opt} label={opt} checked={checked.includes(opt)} onToggle={() => toggle(opt)} />
          ))}

          <Button title="Create My Self Promise →" onPress={generate} loading={saving} />
        </Card>

        {narrative && (
          <Card>
            <Eyebrow>My Self Promise</Eyebrow>
            <Text style={{ color: colors.ink, lineHeight: 22 }}>{narrative}</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
