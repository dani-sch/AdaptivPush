import { isOldEnough, kgToLb, parseDateInput } from '@/utils/conversions';
import { supabase } from '@/utils/supabase';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Dropdown } from 'react-native-element-dropdown';
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
    const [sexAssigned, setSexAssigned] = useState('');
    const [genderIdentity, setGenderIdentity] = useState('');
    const [weight, setWeight] = useState('');
    const [weightUnit, setWeightUnit] = useState<'lb' | 'kg'>('lb');
    const [experienceLevel, setExperienceLevel] = useState('');
    const [healthKitConnected, setHealthKitConnected] = useState(false);

    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    const insets = useSafeAreaInsets();

    // Dropdown options
    const sexOptions = [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
        { label: 'Prefer not to say', value: 'prefer_not_to_say' },
    ];

    const genderOptions = [
        { label: 'Man', value: 'man' },
        { label: 'Woman', value: 'woman' },
        { label: 'Non-binary', value: 'non_binary' },
        { label: 'Prefer to self-describe', value: 'self_describe' },
        { label: 'Prefer not to say', value: 'prefer_not_to_say' },
    ];

    const experienceOptions = [
        { label: 'Beginner', value: 'beginner' },
        { label: 'Intermediate', value: 'intermediate' },
        { label: 'Advanced', value: 'advanced' },
    ];

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

    const handleContinue = async () => {
        console.log('[Quick Setup] Continue pressed');
        console.log('[Quick Setup] Current state:', { dateOfBirth, sexAssigned, experienceLevel, weight, weightUnit, genderIdentity, healthKitConnected });
        
        // Validate required fields
        if (!dateOfBirth || !sexAssigned || !experienceLevel) {
            console.log('[Quick Setup] Validation failed: missing required fields');
            console.log('[Quick Setup] Missing:', { 
                dateOfBirth: !dateOfBirth, 
                sexAssigned: !sexAssigned, 
                experienceLevel: !experienceLevel 
            });
            return;
        }

        // Parse and validate date
        const parsedDate = parseDateInput(dateOfBirth);
        console.log('[Quick Setup] Parsed date:', parsedDate, 'from input:', dateOfBirth);
        if (!parsedDate) {
            console.log('[Quick Setup] Invalid date format');
            return;
        }

        if (!isOldEnough(parsedDate, 13)) {
            console.log('[Quick Setup] User must be at least 13 years old');
            return;
        }

        try {
            // Get current user session - try multiple methods
            let userId: string | null = null;
            
            // Method 1: Try getSession (more reliable immediately after signup)
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (session?.user) {
                userId = session.user.id;
                console.log('[Quick Setup] User authenticated via getSession:', userId);
            } else {
                // Method 2: Try getUser as fallback
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                
                if (user) {
                    userId = user.id;
                    console.log('[Quick Setup] User authenticated via getUser:', userId);
                } else {
                    // DEV MODE: Use hardcoded user ID for testing (REMOVE BEFORE PRODUCTION!)
                    // This is the user_id from your screenshot: "dani test"
                    userId = 'e3f19ef7-9cac-4436-9f15-97fb6d469eba';
                    console.log('[Quick Setup] ⚠️ DEV MODE: Using hardcoded user_id for testing:', userId);
                    console.log('[Quick Setup] Auth error - session:', sessionError?.message, 'user:', authError?.message);
                }
            }

            // Convert weight if provided
            let weightLb: number | null = null;
            if (weight) {
                const weightNum = parseFloat(weight);
                if (isNaN(weightNum) || weightNum <= 0) {
                    console.log('[Quick Setup] Invalid weight value');
                    return;
                }
                weightLb = weightUnit === 'kg' ? kgToLb(weightNum) : weightNum;
            }

            // Use lowercase column names (Postgres default)
            const payload = {
                date_of_birth: parsedDate,
                sex_assigned_at_birth: sexAssigned,
                gender_identity: genderIdentity || null,
                weight_lb: weightLb,
                weight_unit_preference: weightUnit,
                experience_level: experienceLevel,
                healthkit_enabled: healthKitConnected,
                onboarded: true,
            };

            console.log('[Quick Setup] Updating user_profile with payload:', payload);
            console.log('[Quick Setup] Using user_id:', userId);

            // Upsert user profile (insert if doesn't exist, update if it does)
            const { data, error: updateError } = await supabase
                .from('user_profile')
                .upsert({ 
                    user_id: userId,
                    ...payload 
                }, { 
                    onConflict: 'user_id',
                    ignoreDuplicates: false 
                })
                .select();

            if (updateError) {
                console.log('[Quick Setup] Update error:', updateError.message);
                console.log('[Quick Setup] Full error object:', JSON.stringify(updateError, null, 2));
                return;
            }

            console.log('[Quick Setup] Success! Profile updated');
            console.log('[Quick Setup] Updated data:', data);
            
            router.replace("/");
        } catch (e: any) {
            console.log('[Quick Setup] Unexpected error:', e?.message ?? e);
            console.log('[Quick Setup] Full error:', e);
        }
    };

    const handleSkip = () => {
        console.log('[Quick Setup] Skip pressed');
        router.replace("/");
    };

    const handleHealthConnect = () => {
        console.log('[Quick Setup] Apple Health Connect pressed');
        setHealthKitConnected(true);
        // TODO: Actual HealthKit permission flow
    };

    const handleHealthNotNow = () => {
        console.log('[Quick Setup] Apple Health Not Now pressed');
        setHealthKitConnected(false);
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
                    nestedScrollEnabled={true}
                >
                    <View style={[styles.content, { paddingTop: insets.top + 24 }]}>
                        {/* Header */}
                        <Text style={styles.title}>Quick Setup</Text>
                        <Text style={styles.subtitle}>Help us personalize your training</Text>

                        {/* Apple Health Card */}
                        <View style={styles.healthCard}>
                            <View style={styles.healthCardHeader}>
                                <View style={styles.healthIconContainer}>
                                    <SymbolView name="heart.fill" size={24} tintColor={WHITE} />
                                </View>
                                <View style={styles.healthTextContainer}>
                                    <Text style={styles.healthCardTitle}>Connect Apple Health</Text>
                                    <Text style={styles.healthCardSubtitle}>
                                        Sync your health data for better insights (optional)
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.healthCardActions}>
                                <Pressable
                                    style={styles.healthConnectButton}
                                    onPress={handleHealthConnect}
                                    hitSlop={8}
                                >
                                    <Text style={styles.healthConnectButtonText}>
                                        {healthKitConnected ? 'Connected' : 'Connect'}
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleHealthNotNow}
                                    hitSlop={8}
                                >
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
                        <Dropdown
                            data={sexOptions}
                            labelField="label"
                            valueField="value"
                            placeholder="Select..."
                            value={sexAssigned}
                            onChange={item => setSexAssigned(item.value)}
                            style={styles.dropdown}
                            containerStyle={styles.dropdownContainer}
                            itemTextStyle={styles.dropdownItemText}
                            selectedTextStyle={styles.dropdownSelectedText}
                            placeholderStyle={styles.dropdownPlaceholder}
                            renderRightIcon={() => (
                                <SymbolView name="chevron.down" size={16} tintColor={PLACEHOLDER_TEXT} />
                            )}
                            activeColor={BORDER_COLOR}
                        />

                        {/* Gender identity */}
                        <Text style={styles.label}>Gender identity <Text style={styles.optional}>(optional)</Text></Text>
                        <Dropdown
                            data={genderOptions}
                            labelField="label"
                            valueField="value"
                            placeholder="Select..."
                            value={genderIdentity}
                            onChange={item => setGenderIdentity(item.value)}
                            style={styles.dropdown}
                            containerStyle={styles.dropdownContainer}
                            itemTextStyle={styles.dropdownItemText}
                            selectedTextStyle={styles.dropdownSelectedText}
                            placeholderStyle={styles.dropdownPlaceholder}
                            renderRightIcon={() => (
                                <SymbolView name="chevron.down" size={16} tintColor={PLACEHOLDER_TEXT} />
                            )}
                            activeColor={BORDER_COLOR}
                        />

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
                        <Dropdown
                            data={experienceOptions}
                            labelField="label"
                            valueField="value"
                            placeholder="Select..."
                            value={experienceLevel}
                            onChange={item => setExperienceLevel(item.value)}
                            style={styles.dropdown}
                            containerStyle={styles.dropdownContainer}
                            itemTextStyle={styles.dropdownItemText}
                            selectedTextStyle={styles.dropdownSelectedText}
                            placeholderStyle={styles.dropdownPlaceholder}
                            renderRightIcon={() => (
                                <SymbolView name="chevron.down" size={16} tintColor={PLACEHOLDER_TEXT} />
                            )}
                            activeColor={BORDER_COLOR}
                        />

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
                    <SymbolView name="keyboard.chevron.compact.down" size={18} tintColor={WHITE} />
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
        color: WHITE,
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
        color: WHITE,
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
        color: WHITE,
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
        minHeight: 50,
    },
    dropdownContainer: {
        backgroundColor: BACKGROUND_COLOR,
        borderColor: BORDER_COLOR,
        borderWidth: 1,
        borderRadius: 12,
        marginTop: 4,
    },
    dropdownPlaceholder: {
        color: PLACEHOLDER_TEXT,
        fontSize: 16,
    },
    dropdownSelectedText: {
        color: WHITE,
        fontSize: 16,
    },
    dropdownItemText: {
        color: WHITE,
        fontSize: 16,
        padding: 12,
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
        color: WHITE,
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
        color: WHITE,
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