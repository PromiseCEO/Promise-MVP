import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../lib/theme";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.forest,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="family/index"
        options={{ title: "Family", tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="wall"
        options={{ title: "Wall", tabBarIcon: ({ color, size }) => <Ionicons name="images" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="goals"
        options={{ title: "Goals", tabBarIcon: ({ color, size }) => <Ionicons name="heart" color={color} size={size} /> }}
      />
      {/* Screens reachable by navigation but not shown as tabs */}
      <Tabs.Screen name="self-promise" options={{ href: null }} />
      <Tabs.Screen name="plan" options={{ href: null }} />
      <Tabs.Screen name="checkout-return" options={{ href: null }} />
      <Tabs.Screen name="family/add" options={{ href: null }} />
      <Tabs.Screen name="family/household" options={{ href: null }} />
      <Tabs.Screen name="browse" options={{ href: null }} />
      <Tabs.Screen name="matches" options={{ href: null }} />
      <Tabs.Screen name="dating-promise" options={{ href: null }} />
      <Tabs.Screen name="progress-checkin" options={{ href: null }} />
      <Tabs.Screen name="engagement-promise" options={{ href: null }} />
      <Tabs.Screen name="marriage-promise" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
