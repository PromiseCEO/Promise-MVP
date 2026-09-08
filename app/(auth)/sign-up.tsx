import { useState } from "react";
import { ScrollView, Text, Alert } from "react-native";
import { Link, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Screen, Card, H1, Lead, Field, Button, Choice } from "../../lib/ui";
import { Logo } from "../../lib/Logo";
import { colors } from "../../lib/theme";

const IDENTITIES = ["Woman", "Man", "Nonbinary", "Prefer not to say"];

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [identity, setIdentity] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email || !password || !firstName || !identity) {
      Alert.alert("Almost there", "Fill in every field, including how you identify.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { first_name: firstName.trim(), identity } },
    });
    setLoading(false);
    if (error) {
      Alert.alert("Couldn't create account", error.message);
      return;
    }
    Alert.alert(
      "Check your email",
      "Confirm your address, then sign in to start your Promise Journey."
    );
    router.replace("/(auth)/sign-in");
  }

  return (
    <Screen>
      <ScrollView>
        <Card>
          <Logo size={56} showWordmark />
          <H1>Create your free Promise account.</H1>
          <Lead>Women can message mutual connections for free.</Lead>
          <Field label="First name" value={firstName} onChangeText={setFirstName} placeholder="First name" />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            secureTextEntry
          />
          <Text style={{ fontWeight: "800", marginTop: 10, marginBottom: 4, color: colors.ink }}>
            I identify as
          </Text>
          {IDENTITIES.map((opt) => (
            <Choice key={opt} label={opt} checked={identity === opt} onToggle={() => setIdentity(opt)} />
          ))}
          <Button title="Create My Free Account →" onPress={submit} loading={loading} />
          <Link href="/(auth)/sign-in" style={{ textAlign: "center", marginTop: 16, color: colors.forest }}>
            Already have an account? Sign in
          </Link>
        </Card>
      </ScrollView>
    </Screen>
  );
}
