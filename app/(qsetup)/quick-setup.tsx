import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    BACKGROUND_COLOR,
    BACKGROUND_COLOR_DARK,
    BORDER_COLOR,
    PLACEHOLDER_TEXT,
    PRIMARY_COLOR, TEXT_COLOR, WHITE
} from "@/constants/colors";

export default function QSetupPage() {
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [weight, setWeight] = useState('');
    const [weightUnit, setWeightUnit] = useState<'lb' | 'kg'>('lb');
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    const insets = useSafeAreaInsets();

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

    const handleContinue = () => {
        // TODO: Save data and navigate
        // router.replace("/(tabs)");
    };

    const handleSkip = () => {
        // router.replace("/(tabs)");
    };

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
                    <View style={[styles.content, { paddingTop: insets.top + 24 }]}>
                        {/* Header */}
                        <Text style={styles.title}>Quick Setup</Text>
                        <Text style={styles.subtitle}>Help us personalize your training</Text>

                        {/* Apple Health Card */}
                        <View style={styles.healthCard}>
                            <View style={styles.healthCardHeader}>
                                <View style={styles.healthIconContainer}>
                                    <SymbolView name="heart.fill" size={24} tintColor="white" />
                                </View>
                                <View style={styles.healthTextContainer}>
                                    <Text style={styles.healthCardTitle}>Connect Apple Health</Text>
                                    <Text style={styles.healthCardSubtitle}>
                                        Sync your health data for better insights (optional)
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.healthCardActions}>
                                <Pressable style={styles.healthConnectButton}>
                                    <Text style={styles.healthConnectButtonText}>Connect</Text>
                                </Pressable>
                                <Pressable>
                                    <Text style={styles.healthNotNowText}>Not now</Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Date of Birth */}
                        <Text style={styles.label}>Date of Birth</Text>
                        <View style={styles.inputWithIcon}>
                            <TextInput
                                value={dateOfBirth}
                                onChangeText={setDateOfBirth}
                                placeholder="mm/dd/yyyy"
                                placeholderTextColor={PLACEHOLDER_TEXT}
                                style={styles.input}
                                keyboardType="numbers-and-punctuation"
                            />
                            <SymbolView name="calendar" size={20} tintColor={PLACEHOLDER_TEXT} style={styles.inputIcon} />
                        </View>

                        {/* Sex assigned at birth */}
                        <Text style={styles.label}>Sex assigned at birth</Text>
                        <Pressable style={styles.dropdown}>
                            <Text style={styles.dropdownPlaceholder}>Select...</Text>
                            <SymbolView name="chevron.down" size={16} tintColor={PLACEHOLDER_TEXT} />
                        </Pressable>

                        {/* Gender identity */}
                        <Text style={styles.label}>Gender identity <Text style={styles.optional}>(optional)</Text></Text>
                        <Pressable style={styles.dropdown}>
                            <Text style={styles.dropdownPlaceholder}>Select...</Text>
                            <SymbolView name="chevron.down" size={16} tintColor={PLACEHOLDER_TEXT} />
                        </Pressable>

                        {/* Weight */}
                        <Text style={styles.label}>Weight <Text style={styles.optional}>(optional)</Text></Text>
                        <View style={styles.weightContainer}>
                            <TextInput
                                value={weight}
                                onChangeText={setWeight}
                                placeholder="Enter weight"
                                placeholderTextColor={PLACEHOLDER_TEXT}
                                style={styles.weightInput}
                                keyboardType="decimal-pad"
                            />
                            <View style={styles.weightUnitToggle}>
                                <Pressable
                                    style={[
                                        styles.weightUnitButton,
                                        styles.weightUnitButtonLeft,
                                        weightUnit === 'lb' && styles.weightUnitButtonActive
                                    ]}
                                    onPress={() => setWeightUnit('lb')}
                                >
                                    <Text style={[
                                        styles.weightUnitText,
                                        weightUnit === 'lb' && styles.weightUnitTextActive
                                    ]}>lb</Text>
                                </Pressable>
                                <Pressable
                                    style={[
                                        styles.weightUnitButton,
                                        styles.weightUnitButtonRight,
                                        weightUnit === 'kg' && styles.weightUnitButtonActive
                                    ]}
                                    onPress={() => setWeightUnit('kg')}
                                >
                                    <Text style={[
                                        styles.weightUnitText,
                                        weightUnit === 'kg' && styles.weightUnitTextActive
                                    ]}>kg</Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Training experience */}
                        <Text style={styles.label}>Training experience</Text>
                        <Pressable style={styles.dropdown}>
                            <Text style={styles.dropdownPlaceholder}>Select...</Text>
                            <SymbolView name="chevron.down" size={16} tintColor={PLACEHOLDER_TEXT} />
                        </Pressable>

                        {/* Continue Button */}
                        <Pressable
                            onPress={handleContinue}
                            style={styles.primaryButton}
                        >
                            <Text style={styles.primaryButtonText}>Continue</Text>
                        </Pressable>

                        {/* Skip Button */}
                        <Pressable
                            onPress={handleSkip}
                            style={styles.secondaryButton}
                        >
                            <Text style={styles.secondaryButtonText}>Skip for now</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {keyboardVisible && (
                <Pressable
                    onPress={() => {
                        setKeyboardVisible(false);
                        Keyboard.dismiss()
                    }}
                    style={[
                        styles.hideKeyboardButton,
                        { bottom: keyboardHeight + 12 },
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
    container: {
        flex: 1,
        backgroundColor: BACKGROUND_COLOR_DARK,
    },
    content: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    title: {
        color: "white",
        fontSize: 30,
        marginBottom: 8,
        fontWeight: "600",
    },
    subtitle: {
        color: TEXT_COLOR,
        marginBottom: 24,
        fontSize: 16,
    },
    healthCard: {
        backgroundColor: BACKGROUND_COLOR,
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
    },
    healthCardHeader: {
        flexDirection: "row",
        marginBottom: 16,
    },
    healthIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: PRIMARY_COLOR,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    healthTextContainer: {
        flex: 1,
    },
    healthCardTitle: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 4,
    },
    healthCardSubtitle: {
        color: TEXT_COLOR,
        fontSize: 14,
        lineHeight: 18,
    },
    healthCardActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    healthConnectButton: {
        backgroundColor: PRIMARY_COLOR,
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 999,
        flex: 1,
        alignItems: "center",
    },
    healthConnectButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
    },
    healthNotNowText: {
        color: TEXT_COLOR,
        fontSize: 16,
        fontWeight: "600",
    },
    label: {
        color: TEXT_COLOR,
        marginBottom: 8,
        marginTop: 16,
        fontSize: 14,
    },
    optional: {
        color: PLACEHOLDER_TEXT,
    },
    input: {
        backgroundColor: BACKGROUND_COLOR,
        borderColor: BORDER_COLOR,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: WHITE,
        fontSize: 16,
    },
    inputWithIcon: {
        position: "relative",
    },
    inputIcon: {
        position: "absolute",
        right: 16,
        top: 14,
    },
    dropdown: {
        backgroundColor: BACKGROUND_COLOR,
        borderColor: BORDER_COLOR,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    dropdownPlaceholder: {
        color: PLACEHOLDER_TEXT,
        fontSize: 16,
    },
    weightContainer: {
        flexDirection: "row",
        gap: 12,
    },
    weightInput: {
        flex: 1,
        backgroundColor: BACKGROUND_COLOR,
        borderColor: BORDER_COLOR,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: "white",
        fontSize: 16,
    },
    weightUnitToggle: {
        flexDirection: "row",
        backgroundColor: BACKGROUND_COLOR,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        overflow: "hidden",
    },
    weightUnitButton: {
        paddingHorizontal: 24,
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    weightUnitButtonLeft: {
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
    },
    weightUnitButtonRight: {
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
    },
    weightUnitButtonActive: {
        backgroundColor: PRIMARY_COLOR,
    },
    weightUnitText: {
        color: PLACEHOLDER_TEXT,
        fontSize: 16,
        fontWeight: "600",
    },
    weightUnitTextActive: {
        color: "white",
    },
    primaryButton: {
        marginTop: 24,
        backgroundColor: PRIMARY_COLOR,
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: "center",
    },
    primaryButtonText: {
        color: WHITE,
        fontWeight: "600",
        fontSize: 16,
    },
    secondaryButton: {
        marginTop: 12,
        backgroundColor: BORDER_COLOR,
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: "center",
    },
    secondaryButtonText: {
        color: TEXT_COLOR,
        fontWeight: "600",
        fontSize: 16,
    },
    hideKeyboardButton: {
        position: "absolute",
        right: 16,
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 44,
        borderRadius: 999,
        backgroundColor: BACKGROUND_COLOR,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 24,
    },
});