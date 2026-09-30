import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";

import { useAuth } from "../lib/auth";
import { COLORS } from "../constants/theme";

const CLIENT_NAV = [
  { label: "Home", href: "/", exact: true },
  { label: "Services", href: "/services" },
  { label: "Repairs", href: "/repairs" },
  { label: "Assistant", href: "/assistant" },
  { label: "Chats", href: "/chat" },
];

const BUSINESS_NAV = [
  { label: "Dashboard", href: "/business/dashboard", exact: true },
  { label: "Repairs", href: "/business/repairs" },
  { label: "Disputes", href: "/business/disputes" },
  { label: "Employees", href: "/business/employees" },
  { label: "Services", href: "/business/services" },
  { label: "Reviews", href: "/business/reviews" },
];

function isActive(pathname, href, exact) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export default function WebHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { isBusiness, logout } = useAuth();
  const navigation = isBusiness ? BUSINESS_NAV : CLIENT_NAV;
  const profileHref = isBusiness ? "/business/profile" : "/profile";

  return (
    <View className="h-16 w-full border-b border-gray-200 bg-white">
      <View className="mx-auto h-full w-full max-w-7xl flex-row items-center px-6">
        <Pressable
          onPress={() => router.push(isBusiness ? "/business/dashboard" : "/")}
          accessibilityRole="link"
          className="mr-10"
        >
          <Text className="text-2xl font-extrabold text-blue-600">PixelPatch</Text>
        </Pressable>

        <View className="flex-1 flex-row items-center">
          {navigation.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            return (
              <Pressable
                key={item.href}
                onPress={() => router.push(item.href)}
                accessibilityRole="link"
                accessibilityState={{ selected: active }}
                className={`mr-1 rounded-md px-3 py-2 ${active ? "bg-blue-50" : ""}`}
              >
                <Text
                  className={`text-sm font-semibold ${active ? "text-blue-700" : "text-gray-600"}`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => router.push(profileHref)}
          accessibilityRole="link"
          className="mr-3 flex-row items-center rounded-md px-3 py-2"
        >
          <Ionicons name="person-circle-outline" size={22} color={COLORS.textMuted} />
          <Text className="ml-2 text-sm font-semibold text-gray-700">Profile</Text>
        </Pressable>

        <Pressable
          onPress={logout}
          accessibilityRole="button"
          className="rounded-md border border-gray-300 px-3 py-2"
        >
          <Text className="text-sm font-semibold text-gray-700">Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}
