import React, {useEffect, useState } from 'react';
import {Platform, Keyboard, View, Text, TextInput, Pressable, StyleSheet} from "react-native";
import { Link, router } from 'expo-router';

export default function JoinScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);


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

    const handleSubmit = () => {
        if (!emailError && !passwordError && email && password && fullName) {
            // Mock account creation
            router.push("../quick-setup")
        }
    };

    const disabled = !email || !password || !fullName || !!emailError || !!passwordError;

    useEffect(() => {
        const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
            setKeyboardVisible(true);
            setKeyboardHeight(e.endCoordinates?.height ?? 0);
        });

        const hideSub = Keyboard.addListener("keyboardDidHide", () => {
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
            {/* Header */}
            <View style={styles.header}>
                <Link href={"/welcome"} asChild>
                    <Pressable style={styles.backButton}>
                        <Text style={styles.backText}>{"<"}</Text>
                    </Pressable>
                </Link>
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

            {keyboardVisible && (
                <Pressable
                    onPress={() => Keyboard.dismiss()}
                    style={[
                        styles.hideKeyboardButton,
                        { bottom: keyboardHeight + 12 }, // sits just above keyboard
                    ]}
                >
                    <Text style={styles.hideKeyboardText}>Hide</Text>
                </Pressable>
            )}

        </View>
    );
}
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#09090b" }, // zinc-950-ish
    header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 999,
        backgroundColor: "#18181b", // zinc-900-ish
        alignItems: "center",
        justifyContent: "center",
    },
    backText: { color: "white", fontSize: 18 },
    content: { paddingHorizontal: 24, paddingTop: 24 },
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
        backgroundColor: "#2563eb",
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
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: "#18181b", // zinc-900-ish
        borderWidth: 1,
        borderColor: "#27272a",
        // a little lift so it feels tappable
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
});