import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { Stack, router, useRootNavigationState, useSegments } from "expo-router";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import Constants from 'expo-constants';
import { Platform } from 'react-native';
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
  const { isDark } = useTheme();
  const [authVersion, setAuthVersion] = useState(0);
  const [routeOwnerId, setRouteOwnerId] = useState<string | null>(null);
  const routeOwnerIdRef = useRef<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
      const nextOwnerId = session?.user.id ?? null;
      if (nextOwnerId === routeOwnerIdRef.current) return;
      routeOwnerIdRef.current = nextOwnerId;
      setRouteOwnerId(nextOwnerId);
      setAuthVersion((value) => value + 1);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!navigationState?.key) return;

    const controller = new AbortController();

    const syncRoute = async () => {
      const rootSegment = segments[0];
      const isAuthRoute = rootSegment === "(auth)";
      const isSetupRoute = rootSegment === "(qsetup)";
      const isRootRoute = rootSegment == null;

      const {
        data: { session },
      } = await runSupabaseOperation(() => supabase.auth.getSession(), {
        kind: "auth",
        operation: "navigation.local_session",
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      if (!session?.user) {
        routeOwnerIdRef.current = null;
        setRouteOwnerId(null);
        if (!isAuthRoute && !isRootRoute) {
          router.replace("/");
        }
        return;
      }

      const { data: profile, error: profileError } = await runSupabaseOperation(
        (signal) =>
          supabase
            .from("user_profile")
            .select("onboarded")
            .eq("user_id", session.user.id)
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
        return;
      }
      routeOwnerIdRef.current = session.user.id;
      setRouteOwnerId(session.user.id);

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
  }, [authVersion, navigationState?.key, segments]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack key={routeOwnerId ?? "signed-out"}>
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
      <CurrentProgramProvider>
        <RootLayoutInner />
      </CurrentProgramProvider>
    </AppThemeProvider>
  );
}
