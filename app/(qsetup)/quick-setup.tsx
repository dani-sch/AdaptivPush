import { isOldEnough, kgToLb, parseDateInput } from '@/utils/conversions';
import { supabase } from '@/utils/supabase';
import { GenerateProgramModal } from '@/components/GenerateProgramModal';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useEffect, useMemo, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Dropdown } from 'react-native-element-dropdown';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from '@/contexts/ThemeContext';
import type { Theme } from '@/constants/themes';
import type { SexAssigned, TrainingExperience, UserProfileUpdate } from '@/types/database';

export default function QSetupPage() {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [dateOfBirth, setDateOfBirth] = useState('');
    const [sexAssigned, setSexAssigned] = useState<SexAssigned | ''>('');
    const [genderIdentity, setGenderIdentity] = useState('');
    const [weight, setWeight] = useState('');
    const [weightUnit, setWeightUnit] = useState<'lb' | 'kg'>('lb');
    const [experienceLevel, setExperienceLevel] = useState<TrainingExperience | ''>('');
    const [healthKitConnected, setHealthKitConnected] = useState(false);
    const [showGenModal, setShowGenModal] = useState(false);
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

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
        setFormError('');

        // Validate required fields
        if (!dateOfBirth || !sexAssigned || !experienceLevel) {
            setFormError('Please complete your date of birth, sex assigned at birth, and training experience.');
            return;
        }

        // Parse and validate date
        const parsedDate = parseDateInput(dateOfBirth);
        if (!parsedDate) {
            setFormError('Enter a valid date of birth in mm/dd/yyyy format.');
            return;
        }

        if (!isOldEnough(parsedDate, 13)) {
            setFormError('You must be at least 13 years old to continue.');
            return;
        }

        try {
            setSaving(true);

            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser();

            if (authError) {
                throw authError;
            }

            if (!user) {
                setFormError('Your session expired. Please sign in again to finish setup.');
                router.replace('/login');
                return;
            }

            // Convert weight if provided
            let weightLb: number | null = null;
            if (weight) {
                const weightNum = parseFloat(weight);
                if (isNaN(weightNum) || weightNum <= 0) {
                    setFormError('Enter a valid weight or leave it blank.');
                    return;
                }
                weightLb = weightUnit === 'kg' ? kgToLb(weightNum) : weightNum;
            }


            const payload: UserProfileUpdate & { user_id: string } = {
                user_id: user.id,
                date_of_birth: parsedDate,
                sex_assigned_at_birth: sexAssigned,
                gender_identity: genderIdentity || null,
                weight_lb: weightLb,
                weight_unit_preference: weightUnit,
                experience_level: experienceLevel,
                healthkit_enabled: healthKitConnected,
                onboarded: true,
            };

            const { error: updateError } = await supabase
                .from('user_profile')
                .upsert(payload, { onConflict: 'user_id' });

            if (updateError) {
                setFormError(updateError.message);
                return;
            }

            setShowGenModal(true);
        } catch (error: unknown) {
            setFormError(
                error instanceof Error
                    ? error.message
                    : 'Something went wrong while saving your setup.',
            );
        } finally {
            setSaving(false);
        }
    };

    const handleHealthConnect = () => {
        setHealthKitConnected(true);
        // TODO: Actual HealthKit permission flow
    };

    const handleHealthNotNow = () => {
        setHealthKitConnected(false);
    };

    return (
        <>
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
                                    <SymbolView name="heart.fill" size={24} tintColor={theme.white} />
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
                                placeholderTextColor={theme.placeholder}
                                style={styles.input}
                                keyboardType="numbers-and-punctuation"
                            />
                            <SymbolView name="calendar" size={20} tintColor={theme.placeholder} style={styles.inputIcon} />
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
                                <SymbolView name="chevron.down" size={16} tintColor={theme.placeholder} />
                            )}
                            activeColor={theme.border}
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
                                <SymbolView name="chevron.down" size={16} tintColor={theme.placeholder} />
                            )}
                            activeColor={theme.border}
                        />

                        {/* Weight */}
                        <Text style={styles.label}>Weight <Text style={styles.optional}>(optional)</Text></Text>
                        <View style={styles.weightContainer}>
                            <TextInput
                                value={weight}
                                onChangeText={setWeight}
                                placeholder="Enter weight"
                                placeholderTextColor={theme.placeholder}
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
                                <SymbolView name="chevron.down" size={16} tintColor={theme.placeholder} />
                            )}
                            activeColor={theme.border}
                        />

                        {/* Continue Button */}
                        {!!formError && <Text style={styles.errorText}>{formError}</Text>}
                        <Pressable
                            onPress={handleContinue}
                            disabled={saving}
                            style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
                        >
                            <Text style={styles.primaryButtonText}>
                                {saving ? 'Saving...' : 'Continue'}
                            </Text>
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
                    <SymbolView name="keyboard.chevron.compact.down" size={18} tintColor={theme.textPrimary} />
                </Pressable>
            )}
        </View>

        <Modal visible={showGenModal} transparent animationType="slide">
            <GenerateProgramModal
                visible={showGenModal}
                onClose={() => {
                    setShowGenModal(false);
                    router.replace('/(tabs)/home');
                }}
                onProgramCreated={() => {
                    setShowGenModal(false);
                    router.replace('/(tabs)/home');
                }}
                defaultParams={{ daysPerWeek: 3, durationWeeks: 8, goal: 'general_fitness', focusMuscleGroups: [] }}
            />
        </Modal>
        </>
    );
}

function createStyles(theme: Theme) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.backgroundDark,
        },
        content: {
            paddingHorizontal: 24,
            paddingBottom: 24,
        },
        title: {
            color: theme.textPrimary,
            fontSize: 30,
            marginBottom: 8,
            fontWeight: "600",
        },
        subtitle: {
            color: theme.text,
            marginBottom: 24,
            fontSize: 16,
        },
        healthCard: {
            backgroundColor: theme.background,
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: theme.border,
        },
        healthCardHeader: {
            flexDirection: "row",
            marginBottom: 16,
        },
        healthIconContainer: {
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: theme.primary,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
        },
        healthTextContainer: {
            flex: 1,
        },
        healthCardTitle: {
            color: theme.textPrimary,
            fontSize: 16,
            fontWeight: "600",
            marginBottom: 4,
        },
        healthCardSubtitle: {
            color: theme.text,
            fontSize: 14,
            lineHeight: 18,
        },
        healthCardActions: {
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
        },
        healthConnectButton: {
            backgroundColor: theme.primary,
            paddingVertical: 12,
            paddingHorizontal: 32,
            borderRadius: 999,
            flex: 1,
            alignItems: "center",
        },
        healthConnectButtonText: {
            color: theme.white,
            fontSize: 16,
            fontWeight: "600",
        },
        healthNotNowText: {
            color: theme.text,
            fontSize: 16,
            fontWeight: "600",
        },
        label: {
            color: theme.text,
            marginBottom: 8,
            marginTop: 16,
            fontSize: 14,
        },
        optional: {
            color: theme.placeholder,
        },
        input: {
            backgroundColor: theme.background,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 14,
            color: theme.textPrimary,
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
            backgroundColor: theme.background,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 14,
            minHeight: 50,
        },
        dropdownContainer: {
            backgroundColor: theme.background,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 12,
            marginTop: 4,
        },
        dropdownPlaceholder: {
            color: theme.placeholder,
            fontSize: 16,
        },
        dropdownSelectedText: {
            color: theme.textPrimary,
            fontSize: 16,
        },
        dropdownItemText: {
            color: theme.textPrimary,
            fontSize: 16,
            padding: 12,
        },
        weightContainer: {
            flexDirection: "row",
            gap: 12,
        },
        weightInput: {
            flex: 1,
            backgroundColor: theme.background,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 14,
            color: theme.textPrimary,
            fontSize: 16,
        },
        weightUnitToggle: {
            flexDirection: "row",
            backgroundColor: theme.background,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
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
            backgroundColor: theme.primary,
        },
        weightUnitText: {
            color: theme.placeholder,
            fontSize: 16,
            fontWeight: "600",
        },
        weightUnitTextActive: {
            color: theme.white,
        },
        primaryButton: {
            marginTop: 24,
            backgroundColor: theme.primary,
            paddingVertical: 14,
            borderRadius: 16,
            alignItems: "center",
        },
        primaryButtonDisabled: {
            opacity: 0.6,
        },
        primaryButtonText: {
            color: theme.white,
            fontWeight: "600",
            fontSize: 16,
        },
        errorText: {
            color: theme.errorLight,
            marginTop: 12,
        },
        secondaryButton: {
            marginTop: 12,
            backgroundColor: theme.border,
            paddingVertical: 14,
            borderRadius: 16,
            alignItems: "center",
        },
        secondaryButtonText: {
            color: theme.text,
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
            backgroundColor: theme.background,
            borderWidth: 1,
            borderColor: theme.border,
            shadowOpacity: 0.25,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
        },
        scrollContent: {
            flexGrow: 1,
            paddingBottom: 24,
        },
    });
}
