import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Keyboard, View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Link, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { KeyboardAvoidingView, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/utils/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import type { Theme } from "@/constants/themes";
import BackButton from '@/components/ui/BackButton';

export default function JoinScreen() {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);


    const insets = useSafeAreaInsets();

    const validateEmail = (value: string) => {
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            setEmailError('Please enter a valid email address');
        } else {
            setEmailError('');
        }
    };

    const passwordCriteria = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    const criteriaMetCount = Object.values(passwordCriteria).filter(Boolean).length;

    const passwordStrength: { label: string; color: string } | null =
        password.length === 0
            ? null
            : criteriaMetCount <= 1
              ? { label: "Weak", color: "#ef4444" }
              : criteriaMetCount === 2
                ? { label: "Fair", color: "#f97316" }
                : criteriaMetCount === 3
                  ? { label: "Strong", color: "#84cc16" }
                  : { label: "Excellent", color: "#22c55e" };

    const validatePassword = (value: string) => {
        if (!value) { setPasswordError(''); return; }
        const criteria = {
            length: value.length >= 8,
            uppercase: /[A-Z]/.test(value),
            number: /[0-9]/.test(value),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value),
        };
        if (!criteria.length || !criteria.uppercase || !criteria.number || !criteria.special) {
            setPasswordError('Password must have 8+ chars, uppercase, number, and special character');
        } else {
            setPasswordError('');
        }
    };

    const handleSubmit = async () => {
        console.log("SUPABASE_URL:", process.env.EXPO_PUBLIC_SUPABASE_URL);
        console.log("SUPABASE_KEY exists:", !!process.env.EXPO_PUBLIC_SUPABASE_KEY);
        console.log("[Sign up clicked] User attempting to join with: ", fullName, email, password);
        if (emailError) {
            console.log("[Sign up clicked] Email error: ", emailError);
            //TODO: show error in ui
            return;
        } else if (passwordError) {
            console.log("[Sign up clicked] Password error: ", passwordError);
            //TODO: show error in ui
            return;
        } else if (!email || !password || !fullName){
            console.log("[Sign up clicked] Some fields incomplete")
            //TODO: show error in ui
            return;
        } else {
            console.log("[Sign up clicked] All fields complete")
        }

        const { data, error}  = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        if (error) {
            console.log("[Sign up clicked] Error: ", error.message);
            //TODO: show error in ui
            return;
        }

        console.log("[Sign up clicked] Success! User signed up with id: ", data.user?.id);

        // Navigate to quick setup after successful signup
        router.push("/quick-setup");
    };


    const disabled = !email || !password || !fullName || !!emailError || !!passwordError || criteriaMetCount < 4;

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
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={'padding'}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps={'handled'}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={[styles.header, { paddingTop: insets.top + 8}]}>
                        <BackButton/>
                    </View>

                    <View style={styles.content}>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join AdaptivPush today</Text>

                        {/* Full Name */}
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder={"Enter your full name"}
                            placeholderTextColor={theme.placeholder}
                            style={styles.input}
                            autoCapitalize={"words"}
                        />

                        {/* Email */}
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            value={email}
                            onChangeText={(t) => {
                                setEmail(t);
                                validateEmail(t);
                            }}
                            onBlur={()=> validateEmail(email)}
                            placeholder={"you@example.com"}
                            placeholderTextColor={theme.placeholder}
                            style={[styles.input, emailError ? styles.inputError : null]}
                            autoCapitalize={"none"}
                            autoCorrect={false}
                            keyboardType="email-address"
                            textContentType="emailAddress"
                            autoComplete={"email"}
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
                            onBlur={()=> validatePassword(password)}
                            placeholder={"At least 8 characters"}
                            placeholderTextColor={theme.placeholder}
                            style={[styles.input, passwordError ? styles.inputError : null]}
                            secureTextEntry={true}
                            autoCapitalize={"none"}
                            autoCorrect={false}
                            textContentType="newPassword"
                            autoComplete={"password-new"}
                        />

                        {/* Strength meter */}
                        {password.length > 0 && (
                            <View style={styles.strengthContainer}>
                                <View style={styles.strengthBarRow}>
                                    {[0, 1, 2, 3].map((i) => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.strengthSegment,
                                                i < criteriaMetCount
                                                    ? { backgroundColor: passwordStrength?.color }
                                                    : styles.strengthSegmentEmpty,
                                            ]}
                                        />
                                    ))}
                                </View>
                                {passwordStrength && (
                                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                                        {passwordStrength.label}
                                    </Text>
                                )}
                            </View>
                        )}

                        {/* Criteria checklist */}
                        {password.length > 0 && (
                            <View style={styles.criteriaList}>
                                {[
                                    { met: passwordCriteria.length, text: "At least 8 characters" },
                                    { met: passwordCriteria.uppercase, text: "One uppercase letter" },
                                    { met: passwordCriteria.number, text: "One number" },
                                    { met: passwordCriteria.special, text: "One special character" },
                                ].map(({ met, text }) => (
                                    <Text
                                        key={text}
                                        style={[styles.criteriaItem, met ? styles.criteriaMet : styles.criteriaUnmet]}
                                    >
                                        {met ? "✓" : "✗"} {text}
                                    </Text>
                                ))}
                            </View>
                        )}

                        {/* Primary Button */}
                        <Pressable
                            onPress={handleSubmit}
                            disabled={disabled}
                            style={[styles.primaryButton, disabled ? styles.primaryButtonDisabled : null]}
                        >
                            <Text style={styles.primaryButtonText}>Create Account</Text>
                        </Pressable>

                        {/* Sign In Link */}
                        <Text style={styles.signInText}>
                            Already have an account?{' '}
                            <Link
                                href="/login"
                                style={styles.signInLink}
                            >
                                Sign In
                            </Link>
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Hide keyboard button */}
            {keyboardVisible && (
                <Pressable
                    onPress={() => {
                        setKeyboardVisible(false); // hide immediately (should resolve lag)
                        Keyboard.dismiss()
                    }}
                    style={[
                        styles.hideKeyboardButton,
                        { bottom: keyboardHeight + 12 }, // sits just above keyboard
                    ]}
                    hitSlop={10}
                >
                    <SymbolView name="keyboard.chevron.compact.down" size={18} tintColor="white" />
                </Pressable>
            )}

        </View>
    );
}

function createStyles(theme: Theme) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.backgroundDark },
        header: { paddingHorizontal: 16, paddingBottom: 8 },
        backButton: {
            width: 40,
            height: 40,
            borderRadius: 999,
            backgroundColor: theme.background,
            alignItems: "center",
            justifyContent: "center",
        },
        backText: { color: theme.textPrimary, fontSize: 18 },
        content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
        title: { color: theme.textPrimary, fontSize: 30, marginBottom: 8, fontWeight: "600" },
        subtitle: { color: theme.text, marginBottom: 24 },
        label: { color: theme.text, marginBottom: 8, marginTop: 12 },
        input: {
            backgroundColor: theme.background,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 12,
            color: theme.textPrimary,
        },
        inputError: { borderColor: theme.error },
        errorText: { color: theme.errorLight, marginTop: 8 },
        strengthContainer: { marginTop: 8, gap: 6 },
        strengthBarRow: { flexDirection: "row", gap: 4 },
        strengthSegment: {
            flex: 1,
            height: 4,
            borderRadius: 2,
        },
        strengthSegmentEmpty: { backgroundColor: "#374151" },
        strengthLabel: { fontSize: 12, fontWeight: "600" },
        criteriaList: { marginTop: 6, gap: 2 },
        criteriaItem: { fontSize: 12 },
        criteriaMet: { color: "#22c55e" },
        criteriaUnmet: { color: "#6b7280" },
        primaryButton: {
            marginTop: 20,
            backgroundColor: theme.primary,
            paddingVertical: 14,
            borderRadius: 16,
            alignItems: "center",
        },
        primaryButtonDisabled: { opacity: 0.5 },
        primaryButtonText: { color: theme.white, fontWeight: "600" },
        signInText: { color: theme.text, textAlign: "center", marginTop: 16 },
        signInLink: { color: theme.primaryLight },
        hideKeyboardButton: {
            position: "absolute",
            right: 16,
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: 999,
            backgroundColor: theme.background,
            borderWidth: 1,
            borderColor: theme.border,
            shadowOpacity: 0.25,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
        },
        hideKeyboardText: {
            color: theme.textPrimary,
            fontWeight: "600",
            fontSize: 14,
        },
        scrollContent: {
            flexGrow: 1,
            paddingBottom: 24, // keeps bottom content from feeling cramped
        },
    });
}
