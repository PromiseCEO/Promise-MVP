import React from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { colors, radius, spacing } from "./theme";

export function Screen({ children }: { children: React.ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}
export function Lead({ children }: { children: React.ReactNode }) {
  return <Text style={styles.lead}>{children}</Text>;
}
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginVertical: spacing.xs }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={colors.muted} {...props} />
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "clay" | "ghost";
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        variantStyles[variant],
        (disabled || loading) && { opacity: 0.6 },
        pressed && { transform: [{ translateY: 1 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" || variant === "ghost" ? colors.forest : "#fff"} />
      ) : (
        <Text style={[styles.btnText, variantTextStyles[variant]]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Choice({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle} style={styles.choice}>
      <View style={[styles.checkbox, checked && { backgroundColor: colors.forest, borderColor: colors.forest }]}>
        {checked && <Text style={{ color: "#fff", fontSize: 12 }}>✓</Text>}
      </View>
      <Text style={{ flex: 1, color: colors.ink }}>{label}</Text>
    </Pressable>
  );
}

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.forest },
  secondary: { backgroundColor: colors.sage },
  clay: { backgroundColor: colors.clay },
  ghost: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.line },
});
const variantTextStyles = StyleSheet.create({
  primary: { color: "#fff" },
  secondary: { color: colors.forest },
  clay: { color: "#fff" },
  ghost: { color: colors.ink },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  card: {
    backgroundColor: colors.paper,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    margin: spacing.md,
  },
  h1: { fontSize: 26, fontWeight: "800", color: colors.ink, marginBottom: spacing.xs },
  lead: { fontSize: 15, color: colors.muted, lineHeight: 21, marginBottom: spacing.md },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.clay,
    marginBottom: spacing.xs,
  },
  label: { fontSize: 13, fontWeight: "800", color: colors.ink, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
  },
  btn: {
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  btnText: { fontWeight: "800", fontSize: 15 },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 12,
    marginVertical: 4,
    backgroundColor: "#fff",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
});
