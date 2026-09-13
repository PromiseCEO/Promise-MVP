import { useState } from "react";
import { Alert, Text, View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Screen, Card, Field, Button } from "../../lib/ui";
import { Logo } from "../../lib/Logo";
import { colors, spacing, radius } from "../../lib/theme";

const HOW_IT_WORKS = [
  "Create your Promise account",
  "Make your required Self Promise",
  "Choose the Singles or Couples Journey, with the optional Family Journey",
  "Meet your person or bring your person",
  "Make Dating or Realignment, Engagement and Marriage Keepsake Promises",
  "Revisit and realign with your Promises as your relationship grows",
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
          <Logo size={56} showWordmark wordmarkColor={colors.white} />
          <Text style={{ color: colors.white, fontSize: 26, fontWeight: "800", lineHeight: 32, marginTop: spacing.sm }}>
            Meet or Bring Your Person.{"\n"}Make Your Promise.
          </Text>
          <Text style={{ color: "#e3eee9", fontSize: 15, lineHeight: 21, marginTop: spacing.sm }}>
            An intentional dating and relationship platform that helps you meet or bring your person, make
            meaningful Promises, and build a relationship designed to last.
          </Text>

          <Text style={{ color: colors.white, fontWeight: "800", fontSize: 16, marginTop: spacing.lg, marginBottom: spacing.sm }}>
            How Promise Works
          </Text>
          {HOW_IT_WORKS.map((step, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: "rgba(255,255,255,0.14)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 1,
                }}
              >
                <Text style={{ fontWeight: "800", fontSize: 12, color: colors.white }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, color: "#e3eee9", lineHeight: 20 }}>{step}</Text>
            </View>
          ))}
        </View>

        <Card>
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
