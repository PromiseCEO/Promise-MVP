import { useState } from "react";
import { ScrollView, Text, View, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabase";
import { Screen, Card, H1, Lead, Eyebrow, Button } from "../../lib/ui";
import { colors } from "../../lib/theme";

export default function Settings() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount() {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account", { body: {} });
      if (error) throw error;
      // The account is gone server-side; sign out locally to clear the session.
      await signOut();
      router.replace("/(auth)/sign-in");
    } catch (err: any) {
      setDeleting(false);
      Alert.alert("Couldn't delete your account", err.message ?? String(err));
    }
  }

  return (
    <Screen>
      <ScrollView>
        <Card>
          <Eyebrow>Settings</Eyebrow>
          <H1>{profile?.first_name ? `Hi, ${profile.first_name}` : "Account"}</H1>
        </Card>

        <Card>
          <Text style={{ color: colors.ink, fontWeight: "700", marginBottom: 8 }}>Session</Text>
          <Button title="Sign Out" variant="secondary" onPress={() => signOut()} />
        </Card>

        <Card>
          <Text style={{ color: colors.ink, fontWeight: "700", marginBottom: 4 }}>Delete Account</Text>
          <Lead>
            This permanently deletes your profile, Self Promise, matches, and every promise document
            (Dating, Engagement, Marriage) tied to your account. This cannot be undone.
          </Lead>

          {!confirming ? (
            <Button
              title="Delete My Account"
              variant="ghost"
              onPress={() => setConfirming(true)}
            />
          ) : (
            <View>
              <Text style={{ color: colors.ink, marginTop: 8, marginBottom: 8 }}>
                Type DELETE below to confirm. This is permanent.
              </Text>
              <ConfirmField value={confirmText} onChangeText={setConfirmText} />
              <Button
                title={deleting ? "Deleting..." : "Permanently Delete My Account"}
                variant="ghost"
                onPress={() => {
                  if (confirmText.trim().toUpperCase() !== "DELETE") {
                    return Alert.alert("Type DELETE exactly to confirm.");
                  }
                  Alert.alert(
                    "Are you absolutely sure?",
                    "Your account and all promise data will be permanently deleted.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete Forever", style: "destructive", onPress: deleteAccount },
                    ]
                  );
                }}
              />
              <Button title="Cancel" variant="ghost" onPress={() => setConfirming(false)} />
            </View>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

// Small inline TextInput wrapper so we don't need to touch lib/ui.tsx's Field
// component (which is styled for labeled form fields with different spacing).
import { TextInput } from "react-native";
function ConfirmField({ value, onChangeText }: { value: string; onChangeText: (v: string) => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="Type DELETE"
      autoCapitalize="characters"
      style={{
        borderWidth: 1,
        borderColor: "#d9dfd9",
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        fontSize: 16,
      }}
    />
  );
}
