import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus } from 'lucide-react-native';
import { SymbolView } from 'expo-symbols';

import { supabase } from '@/utils/supabase';
import {
    PRIMARY_COLOR,
    BUTTON_PICKED,
    BUTTON_DISABLED,
    BACKGROUND_COLOR,
    BACKGROUND_COLOR_DARK,
    TEXT_COLOR,
    PLACEHOLDER_TEXT,
    WHITE,
    BORDER_COLOR,
    CARD_BG,
} from '@/constants/colors';

interface ProgramDay {
    id: string;
    name: string;
    exercises: string[]; // should eventually store exercises.id UUIDs
}

const DEFAULT_DAY_NAMES = [
    'Upper Body A',
    'Lower Body A',
    'Upper Body B',
    'Lower Body B',
    'Push',
    'Pull',
    'Legs',
];

// Monday=1 ... Sunday=7
const DEFAULT_DAY_INDEXES_BY_COUNT: Record<number, number[]> = {
    1: [1],
    2: [1, 4],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 5, 6],
    6: [1, 2, 3, 4, 5, 6],
    7: [1, 2, 3, 4, 5, 6, 7],
};

function generateDays(count: number, existingDays: ProgramDay[] = []): ProgramDay[] {
    return Array.from({ length: count }, (_, idx) => {
        const existing = existingDays[idx];
        return {
            id: existing?.id ?? String(idx + 1),
            name: existing?.name ?? DEFAULT_DAY_NAMES[idx] ?? `Day ${idx + 1}`,
            exercises: existing?.exercises ?? [],
        };
    });
}

function todayISODate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function looksLikeUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function requireUserId() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error('Not signed in');
    return data.user.id;
}

export default function CreateProgramScreen() {
    const router = useRouter();

    const [step, setStep] = useState(1);
    const [programName, setProgramName] = useState('');
    const [programGoal, setProgramGoal] = useState('');
    const [daysPerWeek, setDaysPerWeek] = useState(4);
    const [programLength, setProgramLength] = useState('12');
    const [days, setDays] = useState<ProgramDay[]>(generateDays(4));
    const [saving, setSaving] = useState(false);

    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        setDays((prev) => generateDays(daysPerWeek, prev));
    }, [daysPerWeek]);

    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
            setKeyboardVisible(true);
            setKeyboardHeight(e.endCoordinates.height);
        });

        const hideSub = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardVisible(false);
            setKeyboardHeight(0);
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const visibleDays = useMemo(() => days.slice(0, daysPerWeek), [days, daysPerWeek]);

    const handleBack = () => {
        if (step > 1) {
            setStep((prev) => prev - 1);
            return;
        }

        router.back();
    };

    const handleUpdateDayName = (index: number, value: string) => {
        setDays((prev) =>
            prev.map((day, idx) => (idx === index ? { ...day, name: value } : day))
        );
    };

    const handleAddExercise = (dayIndex: number) => {
        // TODO: replace this with your real exercise picker/modal.
        // This placeholder only adds local demo values and will not save to program_day_exercises
        // unless they are real exercise UUIDs.
        setDays((prev) =>
            prev.map((day, idx) =>
                idx === dayIndex
                    ? {
                        ...day,
                        exercises: [...day.exercises, `Exercise ${day.exercises.length + 1}`],
                    }
                    : day
            )
        );
    };

    const handleSave = async () => {
        const trimmedName = programName.trim();
        const trimmedGoal = programGoal.trim();
        const parsedLength = Number(programLength);

        if (!trimmedName || !trimmedGoal || parsedLength < 1 || parsedLength > 52) {
            Alert.alert('Missing information', 'Please complete all required fields.');
            return;
        }

        try {
            setSaving(true);

            const userId = await requireUserId();

            // End any currently active program first
            const { error: endExistingError } = await supabase
                .from('programs')
                .update({
                    is_active: false,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', userId)
                .eq('is_active', true);

            if (endExistingError) throw endExistingError;

            // Create the new active program
            const { data: createdProgram, error: programError } = await supabase
                .from('programs')
                .insert({
                    user_id: userId,
                    name: trimmedName,
                    goal: trimmedGoal,
                    duration_weeks: parsedLength,
                    start_date: todayISODate(),
                    is_active: true,
                })
                .select('id')
                .single<{ id: string }>();

            if (programError) throw programError;
            if (!createdProgram?.id) {
                throw new Error('Program was created but no id was returned.');
            }

            const programId = createdProgram.id;
            const chosenDayIndexes = DEFAULT_DAY_INDEXES_BY_COUNT[daysPerWeek];

            // Create week 1 program_days
            const dayRows = visibleDays.map((day, index) => ({
                program_id: programId,
                week_number: 1,
                day_index: chosenDayIndexes[index],
                order_in_week: index + 1,
                workout_name: day.name.trim() || `Day ${index + 1}`,
                estimated_duration_min: 45,
            }));

            const { data: createdDays, error: daysError } = await supabase
                .from('program_days')
                .insert(dayRows)
                .select('id, order_in_week')
                .returns<Array<{ id: string; order_in_week: number }>>();

            if (daysError) throw daysError;

            // Create program_day_exercises only for values that are actual exercise UUIDs
            const pdeRows =
                createdDays?.flatMap((createdDay) => {
                    const originalDay = visibleDays[createdDay.order_in_week - 1];
                    if (!originalDay) return [];

                    return originalDay.exercises
                        .filter((exerciseId) => looksLikeUuid(exerciseId))
                        .map((exerciseId, exerciseIndex) => ({
                            program_day_id: createdDay.id,
                            exercise_id: exerciseId,
                            position: exerciseIndex + 1,
                            set_count: 3,
                            rep_range_min: 8,
                            rep_range_max: 12,
                            target_rpe: null,
                            suggested_weight_lb: null,
                            notes: null,
                        }));
                }) ?? [];

            if (pdeRows.length > 0) {
                const { error: pdeError } = await supabase
                    .from('program_day_exercises')
                    .insert(pdeRows);

                if (pdeError) throw pdeError;
            }

            Alert.alert('Program created', 'Your custom program has been saved.');
            router.replace('/plan');
        } catch (error: any) {
            console.error('Error creating custom program:', error);
            Alert.alert(
                'Could not create program',
                error?.message ?? 'Something went wrong while saving your program.'
            );
        } finally {
            setSaving(false);
        }
    };

    const isStepOneValid =
        programName.trim().length > 0 &&
        programGoal.trim().length > 0 &&
        Number(programLength) >= 1 &&
        Number(programLength) <= 52;

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Pressable onPress={handleBack} style={styles.iconButton}>
                            <ChevronLeft size={20} color={WHITE} />
                        </Pressable>

                        <Text style={styles.headerTitle}>Create Program</Text>

                        <View style={styles.headerSpacer} />
                    </View>

                    <View style={styles.progressWrapper}>
                        {[1, 2, 3].map((s) => (
                            <View
                                key={s}
                                style={[
                                    styles.progressBar,
                                    s <= step ? styles.progressBarActive : styles.progressBarInactive,
                                ]}
                            />
                        ))}
                    </View>

                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {step === 1 && (
                            <View style={styles.section}>
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.label}>Program Name</Text>
                                    <TextInput
                                        value={programName}
                                        onChangeText={setProgramName}
                                        placeholder="e.g., Push Pull Legs"
                                        placeholderTextColor={PLACEHOLDER_TEXT}
                                        style={styles.input}
                                        returnKeyType="done"
                                    />
                                </View>

                                <View style={styles.fieldGroup}>
                                    <Text style={styles.label}>Goal</Text>
                                    <TextInput
                                        value={programGoal}
                                        onChangeText={setProgramGoal}
                                        placeholder="e.g., Strength & Hypertrophy"
                                        placeholderTextColor={PLACEHOLDER_TEXT}
                                        style={styles.input}
                                        returnKeyType="done"
                                    />
                                </View>

                                <View style={styles.fieldGroup}>
                                    <Text style={styles.label}>Training Days per Week</Text>
                                    <View style={styles.daysGrid}>
                                        {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                                            const selected = daysPerWeek === num;
                                            return (
                                                <Pressable
                                                    key={num}
                                                    onPress={() => setDaysPerWeek(num)}
                                                    style={[
                                                        styles.dayNumberButton,
                                                        selected
                                                            ? styles.dayNumberButtonSelected
                                                            : styles.dayNumberButtonUnselected,
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.dayNumberText,
                                                            selected
                                                                ? styles.dayNumberTextSelected
                                                                : styles.dayNumberTextUnselected,
                                                        ]}
                                                    >
                                                        {num}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                </View>

                                <View style={styles.fieldGroup}>
                                    <Text style={styles.label}>Program Length (weeks)</Text>
                                    <TextInput
                                        value={programLength}
                                        onChangeText={setProgramLength}
                                        keyboardType="number-pad"
                                        placeholder="12"
                                        placeholderTextColor={PLACEHOLDER_TEXT}
                                        style={styles.input}
                                        returnKeyType="done"
                                    />
                                </View>

                                <Pressable
                                    onPress={() => setStep(2)}
                                    disabled={!isStepOneValid}
                                    style={[
                                        styles.primaryButton,
                                        !isStepOneValid && styles.primaryButtonDisabled,
                                    ]}
                                >
                                    <Text style={styles.primaryButtonText}>Continue</Text>
                                </Pressable>
                            </View>
                        )}

                        {step === 2 && (
                            <View style={styles.section}>
                                <View style={styles.titleBlock}>
                                    <Text style={styles.sectionTitle}>Name Your Training Days</Text>
                                    <Text style={styles.sectionSubtitle}>
                                        Give each training day a custom name
                                    </Text>
                                </View>

                                <View style={styles.cardList}>
                                    {visibleDays.map((day, idx) => (
                                        <View key={day.id} style={styles.fieldGroup}>
                                            <Text style={styles.smallLabel}>Day {idx + 1}</Text>
                                            <TextInput
                                                value={day.name}
                                                onChangeText={(value) => handleUpdateDayName(idx, value)}
                                                placeholder={`Day ${idx + 1}`}
                                                placeholderTextColor={PLACEHOLDER_TEXT}
                                                style={styles.input}
                                                returnKeyType="done"
                                            />
                                        </View>
                                    ))}
                                </View>

                                <Pressable onPress={() => setStep(3)} style={styles.primaryButton}>
                                    <Text style={styles.primaryButtonText}>Continue</Text>
                                </Pressable>
                            </View>
                        )}

                        {step === 3 && (
                            <View style={styles.section}>
                                <View style={styles.titleBlock}>
                                    <Text style={styles.sectionTitle}>Build Your Workouts</Text>
                                    <Text style={styles.sectionSubtitle}>
                                        Add exercises to each training day
                                    </Text>
                                </View>

                                <View style={styles.cardList}>
                                    {visibleDays.map((day, idx) => (
                                        <View key={day.id} style={styles.workoutCard}>
                                            <View style={styles.workoutCardHeader}>
                                                <Text style={styles.workoutCardTitle}>{day.name}</Text>
                                                <Text style={styles.workoutCardMeta}>
                                                    {day.exercises.length} exercises
                                                </Text>
                                            </View>

                                            <Pressable
                                                onPress={() => handleAddExercise(idx)}
                                                style={styles.secondaryButton}
                                            >
                                                <Plus size={16} color={WHITE} />
                                                <Text style={styles.secondaryButtonText}>Add Exercises</Text>
                                            </Pressable>

                                            {day.exercises.length > 0 && (
                                                <View style={styles.exerciseList}>
                                                    {day.exercises.map((exercise, exerciseIdx) => (
                                                        <View
                                                            key={`${day.id}-${exerciseIdx}`}
                                                            style={styles.exerciseChip}
                                                        >
                                                            <Text style={styles.exerciseChipText}>
                                                                {exercise}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.footerButtons}>
                                    <Pressable
                                        onPress={handleSave}
                                        disabled={saving}
                                        style={[
                                            styles.primaryButton,
                                            saving && styles.primaryButtonDisabled,
                                        ]}
                                    >
                                        <Text style={styles.primaryButtonText}>
                                            {saving ? 'Creating...' : 'Create Program'}
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => router.back()}
                                        disabled={saving}
                                        style={styles.cancelButton}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {keyboardVisible && (
                        <Pressable
                            onPress={() => {
                                setKeyboardVisible(false);
                                Keyboard.dismiss();
                            }}
                            style={[
                                styles.hideKeyboardButton,
                                { bottom: keyboardHeight + 12 },
                            ]}
                            hitSlop={10}
                        >
                            <SymbolView
                                name="keyboard.chevron.compact.down"
                                size={18}
                                tintColor={WHITE}
                            />
                        </Pressable>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: BACKGROUND_COLOR_DARK,
    },
    flex: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: BACKGROUND_COLOR_DARK,
    },
    header: {
        height: 64,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: BORDER_COLOR,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 999,
        backgroundColor: BACKGROUND_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: WHITE,
        fontSize: 18,
        fontWeight: '600',
    },
    headerSpacer: {
        width: 40,
    },
    progressWrapper: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 24,
    },
    progressBar: {
        flex: 1,
        height: 4,
        borderRadius: 999,
    },
    progressBarActive: {
        backgroundColor: PRIMARY_COLOR,
    },
    progressBarInactive: {
        backgroundColor: BORDER_COLOR,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
    section: {
        gap: 24,
    },
    titleBlock: {
        gap: 6,
    },
    sectionTitle: {
        color: WHITE,
        fontSize: 20,
        fontWeight: '600',
    },
    sectionSubtitle: {
        color: TEXT_COLOR,
        fontSize: 14,
    },
    fieldGroup: {
        gap: 8,
    },
    label: {
        color: TEXT_COLOR,
        fontSize: 14,
    },
    smallLabel: {
        color: PLACEHOLDER_TEXT,
        fontSize: 12,
    },
    input: {
        backgroundColor: BACKGROUND_COLOR,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: WHITE,
        fontSize: 16,
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    dayNumberButton: {
        width: 44,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayNumberButtonSelected: {
        backgroundColor: BUTTON_PICKED,
    },
    dayNumberButtonUnselected: {
        backgroundColor: BACKGROUND_COLOR,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
    },
    dayNumberText: {
        fontSize: 14,
        fontWeight: '600',
    },
    dayNumberTextSelected: {
        color: WHITE,
    },
    dayNumberTextUnselected: {
        color: TEXT_COLOR,
    },
    cardList: {
        gap: 16,
    },
    workoutCard: {
        backgroundColor: CARD_BG,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        borderRadius: 18,
        padding: 16,
        gap: 14,
    },
    workoutCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    workoutCardTitle: {
        color: WHITE,
        fontSize: 16,
        fontWeight: '600',
    },
    workoutCardMeta: {
        color: PLACEHOLDER_TEXT,
        fontSize: 14,
    },
    secondaryButton: {
        backgroundColor: BORDER_COLOR,
        borderWidth: 1,
        borderColor: BUTTON_DISABLED,
        borderRadius: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    secondaryButtonText: {
        color: WHITE,
        fontSize: 14,
        fontWeight: '500',
    },
    exerciseList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    exerciseChip: {
        backgroundColor: BACKGROUND_COLOR_DARK,
        borderWidth: 1,
        borderColor: BUTTON_DISABLED,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    exerciseChipText: {
        color: WHITE,
        fontSize: 13,
    },
    footerButtons: {
        gap: 8,
    },
    primaryButton: {
        backgroundColor: PRIMARY_COLOR,
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonDisabled: {
        opacity: 0.6,
    },
    primaryButtonText: {
        color: WHITE,
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        backgroundColor: BORDER_COLOR,
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        color: WHITE,
        fontSize: 16,
        fontWeight: '600',
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
});