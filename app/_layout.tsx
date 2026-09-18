import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppDialogHost } from '@/components/ui/AppDialog';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { Stack, router, useRootNavigationState, useSegments } from "expo-router";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import Constants from 'expo-constants';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { rollout } from '@/features/kernel/rollout';
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/utils/supabase";
import { AppThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { CurrentProgramProvider } from "@/hooks/useCurrentProgram";
import {
  classifySupabaseError,
  reportSupabaseFailure,
  runSupabaseOperation,
} from "@/utils/supabaseResilience";

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
  useEffect(() => {
    if (!__DEV__ || !process.env.EXPO_PUBLIC_AP_QA_BUILD) return;
    // Opt-in local QA evidence only: never log credentials, sessions or user data.
    console.info('[AP iOS QA runtime]', {
      build: process.env.EXPO_PUBLIC_AP_QA_BUILD,
      platform: Platform.OS,
      osVersion: Platform.Version,
      expoGoVersion: Constants.expoVersion,
      nativeVersion: Constants.nativeAppVersion,
      nativeBuild: Constants.nativeBuildVersion,
      sdk: Constants.expoConfig?.sdkVersion,
      backend: new URL(process.env.EXPO_PUBLIC_SUPABASE_URL!).host,
      ...rollout,
    });
  }, []);
  const colorScheme = useColorScheme();
  const navigationState = useRootNavigationState();
  const segments = useSegments();
  const { theme, isDark } = useTheme();
  const auth = useAuth();
  const [routeIssue, setRouteIssue] = useState<string | null>(null);

  useEffect(() => {
    if (!navigationState?.key || auth.phase === 'hydrating' || auth.phase === 'recovering') return;

    const controller = new AbortController();

    const syncRoute = async () => {
      const rootSegment = segments[0];
      const isAuthRoute = rootSegment === "(auth)";
      const isSetupRoute = rootSegment === "(qsetup)";
      const isRootRoute = rootSegment == null;

      if (auth.phase === 'signed_out' || !auth.ownerId) {
        if (!isAuthRoute && !isRootRoute) router.replace('/');
        return;
      }

      const { data: profile, error: profileError } = await runSupabaseOperation(
        (signal) =>
          supabase
            .from("user_profile")
            .select("onboarded")
            .eq("user_id", auth.ownerId)
            .abortSignal(signal)
            .maybeSingle<{ onboarded: boolean | null }>(),
        {
          kind: "read",
          operation: "navigation.profile_route",
          signal: controller.signal,
        },
      );

      if (controller.signal.aborted) return;
      if (profileError) {
        reportSupabaseFailure("navigation.profile_route", profileError);
        setRouteIssue("Your session is intact, but account setup could not be checked. Retry when connected.");
        return;
      }
      setRouteIssue(null);

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

    syncRoute().catch((error: unknown) => {
      if (classifySupabaseError(error).category !== "cancelled") {
        reportSupabaseFailure("navigation.profile_route", error);
      }
      // Preserve the current route and valid local session during an availability failure.
    });

    return () => {
      controller.abort();
    };
  }, [auth.phase, auth.ownerId, auth.expiresAt, navigationState?.key, segments]);

  if (auth.phase === 'hydrating') return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Restoring session" /></View>;

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      {(auth.phase === 'recovering' || routeIssue) && <View style={{ padding: 16, paddingTop: 48, backgroundColor: theme.surfaceBg }}>
        <Text style={{ color: theme.textPrimary }}>{auth.issue ?? routeIssue ?? 'Restoring your connection…'} Protected actions are paused.</Text>
        <Pressable accessibilityRole="button" onPress={auth.retry} style={{ paddingVertical: 12 }}><Text style={{ color: theme.textPrimary }}>Retry connection</Text></Pressable>
      </View>}
      <Stack key={auth.ownerId ?? "signed-out"}>
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
    <GestureHandlerRootView style={{ flex: 1 }}><AppThemeProvider>
      <AuthProvider><CurrentProgramProvider>
        <RootLayoutInner />
      </CurrentProgramProvider></AuthProvider>
    <AppDialogHost /></AppThemeProvider></GestureHandlerRootView>
  );
}
