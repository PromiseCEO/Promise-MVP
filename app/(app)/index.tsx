import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabase";
import { Screen, Card, H1, Lead, Eyebrow, Button } from "../../lib/ui";

export default function Home() {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();

  async function chooseJourney(journey: "singles" | "couples") {
    if (profile) {
      await supabase.from("profiles").update({ journey }).eq("id", profile.id);
      await refreshProfile();
    }
    router.push("/(app)/plan");
  }

  return (
    <Screen>
      <ScrollView>
        <Card>
          <Eyebrow>Welcome{profile?.first_name ? `, ${profile.first_name}` : ""}</Eyebrow>
          <H1>How are you coming to Promise?</H1>
          <Lead>
            {profile?.subscription_status === "active"
              ? `Your ${profile.journey === "couples" ? "Couples" : "Singles"} Journey membership is active.`
              : "Choose the path that fits your relationship today."}
          </Lead>

          <Button title="Continue as Single →" onPress={() => chooseJourney("singles")} />
          <Button title="Continue as a Couple →" variant="secondary" onPress={() => chooseJourney("couples")} />
          <Button
            title="Access Family Journey →"
            variant="clay"
            onPress={() => router.push("/(app)/family")}
          />
          <Button title="Build My Intentional Profile →" variant="ghost" onPress={() => router.push("/(app)/profile")} />
          <Button title="Create My Self Promise →" variant="ghost" onPress={() => router.push("/(app)/self-promise")} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
