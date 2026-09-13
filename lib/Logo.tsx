import { Image, View, Text, StyleSheet } from "react-native";
import { colors } from "./theme";

const logo = require("../assets/icon.png");

export function Logo({
  size = 56,
  showWordmark = false,
  wordmarkColor = colors.ink,
}: {
  size?: number;
  showWordmark?: boolean;
  wordmarkColor?: string;
}) {
  return (
    <View style={styles.row}>
      <Image source={logo} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="contain" />
      {showWordmark && <Text style={[styles.wordmark, { color: wordmarkColor }]}>Promise</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  wordmark: { fontSize: 20, fontWeight: "800" },
});
