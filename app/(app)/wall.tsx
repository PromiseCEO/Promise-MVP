import { useCallback, useState } from "react";
import { ScrollView, Text, View, Image, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabase";
import { Screen, Card, H1, Lead, Eyebrow, Field, Button, Choice } from "../../lib/ui";
import { colors, radius, spacing } from "../../lib/theme";

type WallItem = {
  id: string;
  type: "photo" | "promise";
  title: string;
  journey: string;
  caption: string | null;
  text: string | null;
  photo_path: string | null;
  visibility: string;
};

const JOURNEYS = ["Singles Journey", "Couples Journey", "Family Journey"];
const VISIBILITIES = [
  { key: "private", label: "Private" },
  { key: "community", label: "Promise Community" },
  { key: "public", label: "Public" },
];

export default function PromiseWall() {
  const { profile } = useAuth();
  const [items, setItems] = useState<WallItem[]>([]);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [journey, setJourney] = useState(JOURNEYS[0]);
  const [visibility, setVisibility] = useState("private");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("wall_items")
      .select("*")
      .or(`user_id.eq.${profile.id},visibility.in.(public,community)`)
      .order("created_at", { ascending: false });
    setItems((data as WallItem[]) ?? []);
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  async function frameMemory() {
    if (!imageUri || !title.trim()) {
      return Alert.alert("Choose a picture and add a memory title first.");
    }
    setUploading(true);
    try {
      const ext = imageUri.split(".").pop() || "jpg";
      const path = `${profile!.id}/${Date.now()}.${ext}`;
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage.from("wall-photos").upload(path, blob, {
        contentType: blob.type || "image/jpeg",
      });
      if (uploadError) throw uploadError;

      const { error } = await supabase.from("wall_items").insert({
        user_id: profile!.id,
        type: "photo",
        title: title.trim(),
        journey,
        caption: caption.trim(),
        photo_path: path,
        visibility,
      });
      if (error) throw error;

      setTitle("");
      setCaption("");
      setImageUri(null);
      load();
    } catch (err: any) {
      Alert.alert("Couldn't frame this memory", err.message ?? String(err));
    } finally {
      setUploading(false);
    }
  }

  function publicUrl(path: string) {
    return supabase.storage.from("wall-photos").getPublicUrl(path).data.publicUrl;
  }

  return (
    <Screen>
      <ScrollView>
        <Card>
          <Eyebrow>Promise Wall</Eyebrow>
          <H1>Frame the promises and memories that tell your story.</H1>
          <Lead>Private by default. Public or community memories should have every pictured participant's approval.</Lead>

          <Button title={imageUri ? "Change Picture" : "Choose Picture"} variant="secondary" onPress={pickImage} />
          {imageUri && <Image source={{ uri: imageUri }} style={{ width: "100%", height: 180, borderRadius: radius.md, marginTop: 8 }} />}

          <Field label="Memory title" value={title} onChangeText={setTitle} placeholder="Our first Promise ceremony" />
          <Field label="Caption" value={caption} onChangeText={setCaption} placeholder="Why this memory matters..." multiline />

          <Text style={{ fontWeight: "800", marginTop: 10, color: colors.ink }}>Journey</Text>
          {JOURNEYS.map((j) => (
            <Choice key={j} label={j} checked={journey === j} onToggle={() => setJourney(j)} />
          ))}

          <Text style={{ fontWeight: "800", marginTop: 10, color: colors.ink }}>Visibility</Text>
          {VISIBILITIES.map((v) => (
            <Choice key={v.key} label={v.label} checked={visibility === v.key} onToggle={() => setVisibility(v.key)} />
          ))}

          <Button title="Frame This Memory" onPress={frameMemory} loading={uploading} />
        </Card>

        <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
          {items.length === 0 && (
            <Text style={{ color: colors.muted, textAlign: "center", padding: 20 }}>
              Your Promise Wall is ready. Create a Promise or upload a memory to frame it here.
            </Text>
          )}
          {items.map((item) => (
            <Card key={item.id}>
              {item.type === "photo" && item.photo_path && (
                <Image source={{ uri: publicUrl(item.photo_path) }} style={{ width: "100%", height: 200, borderRadius: radius.md }} />
              )}
              <Text style={{ fontWeight: "800", color: colors.forest, marginTop: 8 }}>{item.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>
                {item.journey} · {item.visibility}
              </Text>
              {item.text && <Text style={{ color: colors.ink }}>{item.text.slice(0, 280)}</Text>}
              {item.caption && <Text style={{ color: colors.muted }}>{item.caption}</Text>}
            </Card>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
