import { useState } from "react";
import { ScrollView, Text, View, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Screen, Card, Field, Button, Choice } from "../../lib/ui";
import { Logo } from "../../lib/Logo";
import { colors, spacing, radius } from "../../lib/theme";

const IDENTITIES = ["Woman", "Man", "Nonbinary", "Prefer not to say"];

export default function SignUp() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [identity, setIdentity] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email || !password || !firstName || !identity || !dateOfBirth) {
      Alert.alert("Almost there", "Fill in every field, including your date of birth and how you identify.");
      return;
    }
    const dob = new Date(dateOfBirth.trim());
    if (isNaN(dob.getTime())) {
      Alert.alert("Invalid date of birth", "Enter your date of birth as YYYY-MM-DD.");
      return;
    }
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
    if (dob > eighteenYearsAgo) {
      Alert.alert("Must be 18 or older", "Promise is only available to adults 18 and up.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { first_name: firstName.trim(), identity, date_of_birth: dateOfBirth.trim() } },
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
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            backgroundColor: colors.forest,
            paddingTop: insets.top + spacing.lg,
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.xl,
            borderBottomLeftRadius: radius.xl,
            borderBottomRightRadius: radius.xl,
          }}
        >
          <Logo size={48} showWordmark wordmarkColor={colors.white} />
          <Text style={{ color: colors.white, fontSize: 24, fontWeight: "800", lineHeight: 30, marginTop: spacing.sm }}>
            Create your free Promise account.
          </Text>
          <Text style={{ color: "#e3eee9", fontSize: 15, lineHeight: 21, marginTop: spacing.sm }}>
            Ladies can message mutual connections for free.
          </Text>
        </View>

        <Card>
          <Field label="First name" value={firstName} onChangeText={setFirstName} placeholder="First name" />
          <Field
            label="Date of birth"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
          />
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
            placeholder="Create password"
            secureTextEntry
          />
          <Text style={{ fontWeight: "800", marginTop: 10, marginBottom: 4, color: colors.ink }}>
            I identify as
          </Text>
          {IDENTITIES.map((opt) => (
            <Choice key={opt} label={opt} checked={identity === opt} onToggle={() => setIdentity(opt)} />
          ))}
          <Button title="Create My Free Promise Account →" onPress={submit} loading={loading} />
          <Link href="/(auth)/sign-in" style={{ textAlign: "center", marginTop: 16, color: colors.forest }}>
            Already have an account? Sign in
          </Link>
        </Card>
      </ScrollView>
    </Screen>
  );
}
