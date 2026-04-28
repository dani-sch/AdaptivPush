import React, { useMemo, useState} from 'react';
import {SafeAreaView, Text, View, TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, CheckCircle } from 'lucide-react-native';
import { router, Link } from 'expo-router';
import BackButton from "@/components/ui/BackButton";
import { useTheme } from "@/contexts/ThemeContext";
import type { Theme } from "@/constants/themes";

export default function ForgotPasswordScreen() {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const emailIsValid = useMemo(() => {
        if (!email) return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }, [email]);

    const validateEmail = (value: string) => {
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            setError('Please enter a valid email address');
        } else {
            setError('');
        }
    };

    const handleSubmit = async () => {
        validateEmail(email);
        if (email && !error && emailIsValid) {
            // TODO: send email to reset password
            setSubmitted(true);
        }
    };

//    if (submitted) {
        return (
            <SafeAreaView style={styles.safe}>
                <KeyboardAvoidingView style={styles.safe} behavior={'padding'}>
                    {/*Header*/}
                    <View style={styles.header}>
                        <BackButton/>
                    </View>

                    <View style={styles.content}>
                        <Text style={styles.title}>
                            Forgot Password
                        </Text>
                        <Text style={styles.subtitle}>
                            Enter your email address to reset your password.
                        </Text>

                        {/* Email */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                value={email}
                                onChangeText={(val) => {
                                    setEmail(val);
                                    validateEmail(val);
                                }}
                                onBlur={() => validateEmail(email)}
                                placeholder={'you@example.com'}
                                placeholderTextColor={theme.placeholder}
                                style={[styles.input, error ? styles.inputError : styles.inputNormal]}
                                autoCapitalize={'none'}
                                autoCorrect={false}
                                keyboardType={'email-address'}
                            />
                            {!error && <Text style={styles.errorText}>{error}</Text>}
                        </View>

                        {/* Primary Button */}
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={!email || !!error || !emailIsValid}
                            style={[
                                styles.primaryButton,
                                (!email || !!error || !emailIsValid) && styles.primaryDisabled,
                            ]}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.primaryButtonText}>Send reset link</Text>
                        </TouchableOpacity>

                        {/* Back to login */}
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.bottomLinkWrap}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.linkText}>Back to Sign In</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
//    }
}


function createStyles(theme: Theme) {
    return StyleSheet.create({
        safe: {
            flex: 1,
            backgroundColor: theme.backgroundDark,
        },

        header: {
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 8,
        },
        backButton: {
            width: 40,
            height: 40,
            borderRadius: 999,
            backgroundColor: theme.background,
            alignItems: 'center',
            justifyContent: 'center',
        },

        content: {
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 32,
        },
        title: {
            fontSize: 30,
            color: theme.textPrimary,
            marginBottom: 8,
            fontWeight: '600',
        },
        subtitle: {
            fontSize: 14,
            color: theme.text,
            marginBottom: 28,
            lineHeight: 20,
        },

        field: {
            marginBottom: 20,
        },
        label: {
            fontSize: 13,
            color: theme.text,
            marginBottom: 8,
        },
        input: {
            width: '100%',
            backgroundColor: theme.background,
            borderWidth: 1,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 14,
            color: theme.textPrimary,
            fontSize: 16,
        },
        inputNormal: {
            borderColor: theme.border,
        },
        inputError: {
            borderColor: theme.error,
        },
        errorText: {
            marginTop: 8,
            color: theme.errorLight,
            fontSize: 13,
        },

        primaryButton: {
            width: '100%',
            backgroundColor: theme.primary,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
        },
        primaryDisabled: {
            backgroundColor: theme.buttonDisabled,
        },
        primaryButtonText: {
            color: theme.white,
            fontSize: 16,
            fontWeight: '600',
        },

        bottomLinkWrap: {
            marginTop: 18,
            alignItems: 'center',
        },
        linkText: {
            color: theme.primaryLight,
            fontSize: 14,
        },

        // Success state
        successContainer: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
        },
        successCircle: {
            width: 64,
            height: 64,
            borderRadius: 999,
            backgroundColor: theme.success,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
        },
        successTitle: {
            fontSize: 22,
            color: theme.textPrimary,
            marginBottom: 10,
            fontWeight: '600',
            textAlign: 'center',
        },
        successBody: {
            fontSize: 14,
            color: theme.text,
            textAlign: 'center',
            lineHeight: 20,
            marginBottom: 22,
            maxWidth: 320,
        },
        successEmail: {
            color: theme.textPrimary,
            fontWeight: '600',
        },
    });
}
