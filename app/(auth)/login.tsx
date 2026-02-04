import { Link, router } from "expo-router";
import { SymbolView } from "expo-symbols";
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {SymbolView} from "expo-symbols";
import {PRIMARY_COLOR} from "@/constants/colors";
import { supabase } from "@/utils/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const insets = useSafeAreaInsets();

  const validateEmail = (value: string) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  const validatePassword = (value: string) => {
    // Optional: enforce min length like your Join page does
    // If you want it consistent, uncomment this:
    /*
    if (value && value.length < 8) {
      setPasswordError("Password must be at least 8 characters");
    } else {
      setPasswordError("");
    }
    */
    setPasswordError("");
  };

  const handleSubmit = async () => {
    setAuthError("");

    // Guard checks (same idea as join)
    if (emailError || passwordError) return;
    if (!email || !password) {
      setAuthError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log("[Login] Error:", error.message);
        setAuthError(error.message);
        return;
      }

      console.log("[Login] Success! User id:", data.user?.id);

      // Navigate into the app
      router.replace("/(tabs)");
    } catch (e: any) {
      console.log("[Login] Unexpected error:", e?.message ?? e);
      setAuthError(e?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const disabled =
    loading || !email || !password || !!emailError || !!passwordError;

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardWillShow", (e) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });

    const hideSub = Keyboard.addListener("keyboardWillHide", () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={"padding"} keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps={"handled"}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <Link href={"/"} asChild>
              <Pressable style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backText}>{"<"}</Text>
              </Pressable>
            </Link>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Sign In</Text>
            <Text style={styles.subtitle}>Welcome back to AdaptivPush</Text>

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                validateEmail(t);
              }}
              onBlur={() => validateEmail(email)}
              placeholder={"you@example.com"}
              placeholderTextColor={"#71717a"}
              style={[styles.input, emailError ? styles.inputError : null]}
              autoCapitalize={"none"}
              autoCorrect={false}
              keyboardType="email-address"
            />
            {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                validatePassword(t);
              }}
              onBlur={() => validatePassword(password)}
              placeholder={"At least 8 characters"}
              placeholderTextColor={"#71717a"}
              style={[styles.input, passwordError ? styles.inputError : null]}
              secureTextEntry={true}
              autoCapitalize={"none"}
              autoCorrect={false}
            />
            {!!passwordError && (
              <Text style={styles.errorText}>{passwordError}</Text>
            )}

            {/* Auth error */}
            {!!authError && <Text style={styles.errorText}>{authError}</Text>}

            {/* Forgot password (outline) */}
            <Pressable onPress={() => {}} style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

            {/* Primary Button */}
            <Pressable
              onPress={handleSubmit}
              disabled={disabled}
              style={[
                styles.primaryButton,
                disabled ? styles.primaryButtonDisabled : null,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? "Signing In..." : "Sign In"}
              </Text>
            </Pressable>

            {/* Sign up link */}
            <Text style={styles.signInText}>
              Don&apos;t have an account?{" "}
              <Link href={"/join"} style={styles.signInLink}>
                Join
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Hide keyboard button */}
      {keyboardVisible && (
        <Pressable
          onPress={() => {
            setKeyboardVisible(false);
            Keyboard.dismiss();
          }}
          style={[styles.hideKeyboardButton, { bottom: keyboardHeight + 12 }]}
          hitSlop={10}
        >
          <SymbolView
            name="keyboard.chevron.compact.down"
            size={18}
            tintColor="white"
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#09090b", // zinc-950-ish
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 999,
        backgroundColor: "#18181b", // zinc-900-ish
        alignItems: "center",
        justifyContent: "center",
    },
    backText: {
        color: "white",
        fontSize: 18,
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    title: {
        color: "white",
        fontSize: 30,
        marginBottom: 8,
        fontWeight: "600",
    },
    subtitle: {
        color: "#a1a1aa",
        marginBottom: 24,
    },
    label: {
        color: "#a1a1aa",
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        backgroundColor: "#18181b",
        borderColor: "#27272a",
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: "white",
    },
    inputError: {
        borderColor: "#dc2626",
    },
    errorText: {
        color: "#ef4444",
        marginTop: 8,
    },
    forgotWrap: {
        marginTop: 12,
        alignSelf: "flex-end",
    },
    forgotText: {
        color: "#60a5fa",
        fontWeight: "600",
    },
    primaryButton: {
        marginTop: 20,
        backgroundColor: PRIMARY_COLOR,
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: "center",
    },
    primaryButtonDisabled: {
        opacity: 0.5,
    },
    primaryButtonText: {
        color: "white",
        fontWeight: "600",
    },
    signInText: {
        color: "#a1a1aa",
        textAlign: "center",
        marginTop: 16,
    },
    signInLink: {
        color: "#60a5fa",
    },
    hideKeyboardButton: {
        position: "absolute",
        right: 16,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: "#18181b",
        borderWidth: 1,
        borderColor: "#27272a",
        // small lift so it feels tappable
        shadowOpacity: Platform.OS === "ios" ? 0.25 : 0,
        shadowRadius: Platform.OS === "ios" ? 6 : 0,
        shadowOffset: { width: 0, height: 2 },
        elevation: Platform.OS === "android" ? 6 : 0,
    },
    hideKeyboardText: {
        color: "white",
        fontWeight: "600",
        fontSize: 14,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 24,
    },
});

