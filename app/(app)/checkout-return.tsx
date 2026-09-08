import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../lib/AuthProvider";
import { Screen, Card, H1, Lead, Button } from "../../lib/ui";

export default function CheckoutReturn() {
  const { status } = useLocalSearchParams<{ status?: string }>();
  const { refreshProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    refreshProfile();
  }, []);

  return (
    <Screen>
      <Card>
        <H1>{status === "success" ? "Payment approved!" : "Checkout closed"}</H1>
        <Lead>
          {status === "success"
            ? "Your Promise membership is activating. This can take a few seconds."
            : "No changes were made to your membership."}
        </Lead>
        <Button title="Back to Promise →" onPress={() => router.replace("/(app)")} />
      </Card>
    </Screen>
  );
}
