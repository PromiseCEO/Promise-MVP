import { useState } from "react";
import { Alert, Text, View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Screen, Card, H1, Lead, Field, Button } from "../../lib/ui";
import { Logo } from "../../lib/Logo";
import { colors, spacing } from "../../lib/theme";

const HOW_IT_WORKS = [
  "Create your Promise account",
  "Create your required Self Promise",
  "Choose the Singles Journey or Couples Journey with the optional Family Journey",
  "Meet Your Person or Bring Your Person",
  "Create Dating or Realignment, Engagement and Marriage Keepsake Promises",
  "Save your Promises and Journey memories on your Promise Wall",
];

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) Alert.alert("Couldn't sign in", error.message);
    // On success, the root AuthGate redirects to /(app) automatically.
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <Logo size={64} showWordmark />
          <H1>Find Yourself. Meet or Bring Your Person. Keep Your Promise.</H1>
          <Lead>
            An intentional dating and relationship platform where you find yourself, meet your person or
            bring your person, and build relationships one Promise at a time.
          </Lead>

          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ fontWeight: "800", color: colors.ink, marginBottom: 8 }}>How Promise Works</Text>
            {HOW_IT_WORKS.map((step, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: colors.sage,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 1,
                  }}
                >
                  <Text style={{ fontWeight: "800", fontSize: 12, color: colors.forest }}>{i + 1}</Text>
                </View>
                <Text style={{ flex: 1, color: colors.ink, lineHeight: 20 }}>{step}</Text>
              </View>
            ))}
          </View>
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
            placeholder="Your password"
            secureTextEntry
          />
          <Button title="Sign In →" onPress={submit} loading={loading} />
          <Link href="/(auth)/sign-up" style={{ textAlign: "center", marginTop: 16, color: colors.forest }}>
            New here? Create your free Promise account
          </Link>
        </Card>
      </ScrollView>
    </Screen>
  );
}
