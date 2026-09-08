import { useEffect, useState } from "react";
import { ScrollView, Text, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../lib/AuthProvider";
import { supabase } from "../../../lib/supabase";
import { Screen, Card, H1, Lead, Eyebrow, Field, Button, Choice } from "../../../lib/ui";
import { colors } from "../../../lib/theme";

const EXPECTATIONS = [
  "Speak to each other with respect",
  "Tell the truth even when it is difficult",
  "Listen before reacting",
  "Follow through on responsibilities",
  "Help with household responsibilities",
  "Respect privacy and personal space",
  "Spend meaningful time together",
  "Support school and education goals",
  "Support career and personal goals",
  "Practice healthy habits and self-care",
  "Handle money and belongings responsibly",
  "Resolve disagreements without yelling or threats",
  "Apologize and repair when we hurt each other",
  "Celebrate one another's progress",
  "Ask for help when we need it",
];

export default function FamilyMemberScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const { id, mode } = useLocalSearchParams<{ id?: string; mode?: string }>();
  const isPromiseMode = mode === "promise";

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [relationship, setRelationship] = useState("Child");
  const [grade, setGrade] = useState("");
  const [narrative, setNarrative] = useState("");
  const [expectations, setExpectations] = useState<string[]>([]);
  const [promiseText, setPromiseText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id || !profile) return;
    (async () => {
      const { data } = await supabase.from("family_members").select("*").eq("id", id).single();
      if (data) {
        setName(data.name);
        setAge(data.age ?? "");
        setRelationship(data.relationship ?? "Child");
        setGrade(data.grade ?? "");
        setNarrative(data.narrative ?? "");
        setExpectations(data.expectations ?? []);
        setPromiseText(data.promise_text ?? null);
      }
    })();
  }, [id, profile?.id]);

  function toggle(opt: string) {
    setExpectations((e) => (e.includes(opt) ? e.filter((x) => x !== opt) : [...e, opt]));
  }

  async function saveMember() {
    if (!name.trim()) return Alert.alert("Please enter the family member's name.");
    setSaving(true);
    const payload = {
      user_id: profile!.id,
      name: name.trim(),
      age,
      relationship,
      grade: grade.trim() || "N/A",
      expectations,
      narrative: narrative.trim(),
    };
    const { error } = id
      ? await supabase.from("family_members").update(payload).eq("id", id)
      : await supabase.from("family_members").insert(payload);
    setSaving(false);
    if (error) return Alert.alert("Couldn't save", error.message);
    router.replace("/(app)/family");
  }

  async function generatePromise() {
    const items = expectations.length ? expectations : ["communicate honestly", "support each other"];
    const body = `With love and intention, we make this Promise to strengthen the relationship we share.

We promise to ${items.map((x) => x.charAt(0).toLowerCase() + x.slice(1)).join("; to ")}.
${narrative ? `\nWe also want to remember this intention: ${narrative}\n` : ""}
This Promise is not about being perfect. It is our commitment to keep showing up, communicating, growing and returning to what matters when life becomes difficult.`;
    setPromiseText(body);
    if (id) {
      setSaving(true);
      const { error } = await supabase.from("family_members").update({ promise_text: body, expectations }).eq("id", id);
      setSaving(false);
      if (error) Alert.alert("Couldn't save the promise", error.message);
    }
  }

  return (
    <Screen>
      <ScrollView>
        <Card>
          <Eyebrow>Family Journey</Eyebrow>
          <H1>{isPromiseMode ? `Individual Promise with ${name}` : id ? "Update family member" : "Add a family member"}</H1>
          <Lead>Tell Promise who this person is and what healthy expectations matter in this relationship.</Lead>

          {!isPromiseMode && (
            <>
              <Field label="Name" value={name} onChangeText={setName} placeholder="Jordan" />
              <Field label="Age" value={age} onChangeText={setAge} keyboardType="numeric" placeholder="14" />
              <Field label="Relationship" value={relationship} onChangeText={setRelationship} placeholder="Child" />
              <Field label="Grade / School level" value={grade} onChangeText={setGrade} placeholder="8th Grade / College / N/A" />
            </>
          )}

          <Text style={{ fontWeight: "800", marginTop: 12, marginBottom: 4, color: colors.ink }}>
            What expectations matter in this relationship?
          </Text>
          {EXPECTATIONS.map((opt) => (
            <Choice key={opt} label={opt} checked={expectations.includes(opt)} onToggle={() => toggle(opt)} />
          ))}

          <Field
            label="Anything else you want this relationship to grow in?"
            value={narrative}
            onChangeText={setNarrative}
            multiline
            placeholder="Example: communicate calmly, spend more quality time together..."
          />

          {isPromiseMode ? (
            <Button title="Create Our Individual Promise →" onPress={generatePromise} loading={saving} variant="clay" />
          ) : (
            <Button title="Save Family Member →" onPress={saveMember} loading={saving} />
          )}
        </Card>

        {promiseText && (
          <Card>
            <Eyebrow>Our Individual Promise</Eyebrow>
            <Text style={{ color: colors.ink, lineHeight: 22 }}>{promiseText}</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
