import React, {useEffect, useState } from 'react';
import {Platform, Keyboard, View, Text, TextInput, Pressable, StyleSheet} from "react-native";
import { Link, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {KeyboardAvoidingView, ScrollView} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {supabase} from "@/utils/supabase";
import {PRIMARY_COLOR} from "@/constants/colors";
import BackButton from '@/components/ui/BackButton';

export default function JoinScreen() {
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

    const validatePassword = (value: string) => {
        if (value && value.length < 8) {
            setPasswordError('Password must be at least 8 characters');
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
        router.push("/QuickSetup");
    };


    const disabled = !email || !password || !fullName || !!emailError || !!passwordError;

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
                            placeholderTextColor={"#71717a"}
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
                            placeholderTextColor={"#71717a"}
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
                            placeholderTextColor={"#71717a"}
                            style={[styles.input, passwordError ? styles.inputError : null]}
                            secureTextEntry={true}
                            autoCapitalize={"none"}
                            autoCorrect={false}
                            textContentType="newPassword"
                            autoComplete={"password-new"}
                        />
                        {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}

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
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#09090b" },
    header: { paddingHorizontal: 16, paddingBottom: 8 },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 999,
        backgroundColor: "#18181b",
        alignItems: "center",
        justifyContent: "center",
    },
    backText: { color: "white", fontSize: 18 },
    content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
    title: { color: "white", fontSize: 30, marginBottom: 8, fontWeight: "600" },
    subtitle: { color: "#a1a1aa", marginBottom: 24 },
    label: { color: "#a1a1aa", marginBottom: 8, marginTop: 12 },
    input: {
        backgroundColor: "#18181b",
        borderColor: "#27272a",
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: "white",
    },
    inputError: { borderColor: "#dc2626" },
    errorText: { color: "#ef4444", marginTop: 8 },
    primaryButton: {
        marginTop: 20,
        backgroundColor: PRIMARY_COLOR,
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: "center",
    },
    primaryButtonDisabled: { opacity: 0.5 },
    primaryButtonText: { color: "white", fontWeight: "600" },
    signInText: { color: "#a1a1aa", textAlign: "center", marginTop: 16 },
    signInLink: { color: "#60a5fa" },
    hideKeyboardButton: {
        position: "absolute",
        right: 16,
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 44,
        borderRadius: 999,
        backgroundColor: "#18181b",
        borderWidth: 1,
        borderColor: "#27272a",
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    hideKeyboardText: {
        color: "white",
        fontWeight: "600",
        fontSize: 14,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 24, // keeps bottom content from feeling cramped
    },
});