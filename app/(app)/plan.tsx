import { useState } from "react";
import { ScrollView, Alert } from "react-native";
import { useAuth } from "../../lib/AuthProvider";
import { startCheckout, refreshSubscriptionStatus } from "../../lib/stripe";
import { Screen, Card, H1, Lead, Eyebrow, Button, Choice } from "../../lib/ui";
import { colors } from "../../lib/theme";
import { Text } from "react-native";

export default function Plan() {
  const { profile, refreshProfile } = useAuth();
  const [plan, setPlan] = useState<"singles" | "couples">((profile?.journey as any) || "singles");
  const [familyAddon, setFamilyAddon] = useState(!!profile?.family_addon);
  const [loading, setLoading] = useState(false);

  const price = plan === "couples" ? 25 : 15;
  const total = price + (familyAddon ? 10 : 0);

  async function subscribe() {
    setLoading(true);
    try {
      const result = await startCheckout(plan, familyAddon);
      if (result.status === "success") {
        // Give Stripe's webhook a moment to land, then refresh.
        setTimeout(async () => {
          await refreshSubscriptionStatus(profile!.id);
          await refreshProfile();
          Alert.alert("Welcome!", "Your Promise membership is now active.");
        }, 1500);
      } else if (result.status === "cancel") {
        Alert.alert("Checkout canceled", "No charge was made.");
      }
    } catch (err: any) {
      Alert.alert("Checkout error", err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScrollView>
        <Card>
          <Eyebrow>Choose Your Membership</Eyebrow>
          <H1>Select your Promise subscription.</H1>
          <Lead>You can also add the Family Promise Journey to the same membership.</Lead>

          <Choice label={`Singles Journey — $15/month`} checked={plan === "singles"} onToggle={() => setPlan("singles")} />
          <Choice label={`Couples Journey — $25/month`} checked={plan === "couples"} onToggle={() => setPlan("couples")} />
          <Choice label={`+ Family Promise Journey — $10/month`} checked={familyAddon} onToggle={() => setFamilyAddon((v) => !v)} />

          <Text style={{ marginTop: 16, fontWeight: "800", color: colors.ink, fontSize: 18 }}>
            Total: ${total}/month
          </Text>

          <Button title="Continue to Stripe Checkout →" onPress={subscribe} loading={loading} variant="clay" />
          <Text style={{ marginTop: 10, fontSize: 12, color: colors.muted }}>
            Stripe's secure hosted checkout opens in your browser. You'll return to the app automatically
            when you're done.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
