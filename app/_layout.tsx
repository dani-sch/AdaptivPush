import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, router, useRootNavigationState, useSegments } from "expo-router";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/utils/supabase";
import { AppThemeProvider, useTheme } from "@/contexts/ThemeContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function RootLayoutInner() {
  const colorScheme = useColorScheme();
  const navigationState = useRootNavigationState();
  const segments = useSegments();
  const { isDark } = useTheme();

  useEffect(() => {
    if (!navigationState?.key) return;

    let cancelled = false;

    const syncRoute = async () => {
      const rootSegment = segments[0];
      const isAuthRoute = rootSegment === "(auth)";
      const isSetupRoute = rootSegment === "(qsetup)";
      const isRootRoute = rootSegment == null;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session?.user) {
        if (!isAuthRoute && !isRootRoute) {
          router.replace("/");
        }
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("user_profile")
        .select("onboarded")
        .eq("user_id", session.user.id)
        .maybeSingle<{ onboarded: boolean | null }>();

      if (cancelled || profileError) return;

      if (profile?.onboarded !== true) {
        if (!isSetupRoute) {
          router.replace("/quick-setup");
        }
        return;
      }

      if (isAuthRoute || isSetupRoute || isRootRoute) {
        router.replace("/(tabs)/home");
      }
    };

    syncRoute().catch(() => {
      // Network unavailable or credentials not yet configured — stay on current screen
    });

    return () => {
      cancelled = true;
    };
  }, [navigationState?.key, segments]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(qsetup)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="workout-history" options={{ headerShown: false }} />
        <Stack.Screen name="next-workout" options={{ headerShown: false }} />
        <Stack.Screen name="create-program" options={{ headerShown: false }} />
        <Stack.Screen name="faq" options={{ headerShown: false }} />
        <Stack.Screen name="archived-programs" options={{ headerShown: false }} />
        <Stack.Screen
          name="recovery-library"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="program-overview"
          options={{ headerShown: false }}
        />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootLayoutInner />
    </AppThemeProvider>
  );
}
