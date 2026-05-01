import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus } from 'lucide-react-native';
import { SymbolView } from 'expo-symbols';

import { supabase } from '@/utils/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import type { Theme } from '@/constants/themes';

interface ProgramDay {
    id: string;
    name: string;
    exercises: SelectedExercise[];
}

interface ExerciseOption {
    id: string;
    name: string;
    primary_muscle: string | null;
    target_muscle: string | null;
}

interface SelectedExercise {
    exercise_id: string;
    name: string;
    primary_muscle?: string | null;
    target_muscle?: string | null;
    set_count: number;
    rep_range_min: number;
    rep_range_max: number;
    target_rpe?: number | null;
    suggested_weight_lb?: number | null;
    notes?: string | null;
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

async function requireUserId() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error('Not signed in');
    return data.user.id;
}

export default function CreateProgramScreen() {
    const router = useRouter();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [step, setStep] = useState(1);
    const [programName, setProgramName] = useState('');
    const [programGoal, setProgramGoal] = useState('');
    const [daysPerWeek, setDaysPerWeek] = useState(4);
    const [programLength, setProgramLength] = useState('12');
    const [days, setDays] = useState<ProgramDay[]>(generateDays(4));
    const [saving, setSaving] = useState(false);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerDayIndex, setPickerDayIndex] = useState<number | null>(null);
    const [exerciseOptions, setExerciseOptions] = useState<ExerciseOption[]>([]);
    const [exerciseLoading, setExerciseLoading] = useState(false);
    const [exerciseError, setExerciseError] = useState<string | null>(null);
    const [exerciseSearch, setExerciseSearch] = useState('');
    const [muscleFilter, setMuscleFilter] = useState('all');
    const [selectedExerciseOption, setSelectedExerciseOption] = useState<ExerciseOption | null>(null);
    const [setCountInput, setSetCountInput] = useState('3');
    const [repMinInput, setRepMinInput] = useState('8');
    const [repMaxInput, setRepMaxInput] = useState('12');
    const [targetRpeInput, setTargetRpeInput] = useState('');
    const [weightInput, setWeightInput] = useState('');
    const [notesInput, setNotesInput] = useState('');

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

    const fetchExercises = async () => {
        setExerciseLoading(true);
        setExerciseError(null);
        const { data, error } = await supabase
            .from('exercises')
            .select('id, name, primary_muscle, target_muscle')
            .order('name', { ascending: true });
        if (error) {
            setExerciseError('Could not load exercises. Please try again.');
            setExerciseOptions([]);
        } else {
            setExerciseOptions((data as ExerciseOption[]) ?? []);
        }
        setExerciseLoading(false);
    };

    const handleAddExercise = async (dayIndex: number) => {
        setPickerDayIndex(dayIndex);
        setPickerVisible(true);
        setSelectedExerciseOption(null);
        setSetCountInput('3');
        setRepMinInput('8');
        setRepMaxInput('12');
        setTargetRpeInput('');
        setWeightInput('');
        setNotesInput('');
        if (exerciseOptions.length === 0 && !exerciseLoading) await fetchExercises();
    };

    const filteredExerciseOptions = useMemo(() => {
        return exerciseOptions.filter((ex) => {
            const matchesName = ex.name.toLowerCase().includes(exerciseSearch.toLowerCase().trim());
            if (!matchesName) return false;
            if (muscleFilter === 'all') return true;
            return ex.primary_muscle === muscleFilter || ex.target_muscle === muscleFilter;
        });
    }, [exerciseOptions, exerciseSearch, muscleFilter]);

    const muscleOptions = useMemo(() => {
        const set = new Set<string>();
        exerciseOptions.forEach((ex) => {
            if (ex.primary_muscle) set.add(ex.primary_muscle);
            if (ex.target_muscle) set.add(ex.target_muscle);
        });
        return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
    }, [exerciseOptions]);

    const handleConfirmExercise = () => {
        if (pickerDayIndex === null || !selectedExerciseOption) return;
        const setCount = Number(setCountInput);
        const repMin = Number(repMinInput);
        const repMax = Number(repMaxInput);
        if (setCount <= 0 || repMin <= 0 || repMax < repMin) {
            Alert.alert('Invalid values', 'Sets/reps must be valid positive numbers.');
            return;
        }
        const selectedExercise: SelectedExercise = {
            exercise_id: selectedExerciseOption.id,
            name: selectedExerciseOption.name,
            primary_muscle: selectedExerciseOption.primary_muscle,
            target_muscle: selectedExerciseOption.target_muscle,
            set_count: setCount,
            rep_range_min: repMin,
            rep_range_max: repMax,
            target_rpe: targetRpeInput.trim() ? Number(targetRpeInput) : null,
            suggested_weight_lb: weightInput.trim() ? Number(weightInput) : null,
            notes: notesInput.trim() || null,
        };
        setDays((prev) => prev.map((d, i) => i === pickerDayIndex ? { ...d, exercises: [...d.exercises, selectedExercise] } : d));
        setPickerVisible(false);
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
                    days_per_week: daysPerWeek,
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
                .returns<{ id: string; order_in_week: number }[]>();

            if (daysError) throw daysError;

            // Create program_day_exercises only for values that are actual exercise UUIDs
            const pdeRows =
                createdDays?.flatMap((createdDay) => {
                    const originalDay = visibleDays[createdDay.order_in_week - 1];
                    if (!originalDay) return [];

                    return originalDay.exercises
                        .filter((exercise) => exercise.set_count > 0 && exercise.rep_range_min > 0 && exercise.rep_range_max >= exercise.rep_range_min)
                        .map((exercise, exerciseIndex) => ({
                            program_day_id: createdDay.id,
                            exercise_id: exercise.exercise_id,
                            position: exerciseIndex + 1,
                            set_count: exercise.set_count,
                            rep_range_min: exercise.rep_range_min,
                            rep_range_max: exercise.rep_range_max,
                            target_rpe: exercise.target_rpe ?? null,
                            suggested_weight_lb: exercise.suggested_weight_lb ?? null,
                            notes: exercise.notes ?? null,
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
                            <ChevronLeft size={20} color={theme.textPrimary} />
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
                                        placeholderTextColor={theme.placeholder}
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
                                        placeholderTextColor={theme.placeholder}
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
                                        placeholderTextColor={theme.placeholder}
                                        style={styles.input}
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
                                                placeholderTextColor={theme.placeholder}
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
                                                <Plus size={16} color={theme.white} />
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
                                                                {exercise.name} • {exercise.set_count}x{exercise.rep_range_min}-{exercise.rep_range_max}
                                                            </Text>
                                                            <Pressable onPress={() => setDays((prev) => prev.map((d, di) => di === idx ? { ...d, exercises: d.exercises.filter((_, ei) => ei !== exerciseIdx) } : d))}>
                                                                <Text style={styles.removeText}>Remove</Text>
                                                            </Pressable>
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
                                { bottom: 12 },
                            ]}
                            hitSlop={10}
                        >
                            <SymbolView
                                name="keyboard.chevron.compact.down"
                                size={18}
                                tintColor={theme.textPrimary}
                            />
                        </Pressable>
                    )}
                </View>
            </KeyboardAvoidingView>
            <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.sectionTitle}>Add Exercise</Text>
                        <TextInput value={exerciseSearch} onChangeText={setExerciseSearch} placeholder="Search by name" placeholderTextColor={theme.placeholder} style={styles.input} />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                            {muscleOptions.map((option) => (
                                <Pressable key={option} onPress={() => setMuscleFilter(option)} style={[styles.filterChip, muscleFilter === option && styles.filterChipActive]}>
                                    <Text style={styles.exerciseChipText}>{option === 'all' ? 'All muscles' : option}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                        {exerciseLoading ? <Text style={styles.label}>Loading exercises...</Text> : null}
                        {!exerciseLoading && exerciseError ? <Text style={styles.label}>{exerciseError}</Text> : null}
                        {!exerciseLoading && !exerciseError && filteredExerciseOptions.length === 0 ? <Text style={styles.label}>No exercises found. Try another search/filter.</Text> : null}
                        <ScrollView style={{ maxHeight: 180 }}>
                            {filteredExerciseOptions.map((exercise) => (
                                <Pressable key={exercise.id} onPress={() => setSelectedExerciseOption(exercise)} style={[styles.optionRow, selectedExerciseOption?.id === exercise.id && styles.filterChipActive]}>
                                    <Text style={styles.exerciseChipText}>{exercise.name}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                        <TextInput value={setCountInput} onChangeText={setSetCountInput} keyboardType="number-pad" placeholder="Sets" placeholderTextColor={theme.placeholder} style={styles.input} />
                        <TextInput value={repMinInput} onChangeText={setRepMinInput} keyboardType="number-pad" placeholder="Rep min" placeholderTextColor={theme.placeholder} style={styles.input} />
                        <TextInput value={repMaxInput} onChangeText={setRepMaxInput} keyboardType="number-pad" placeholder="Rep max" placeholderTextColor={theme.placeholder} style={styles.input} />
                        <TextInput value={targetRpeInput} onChangeText={setTargetRpeInput} keyboardType="decimal-pad" placeholder="Target RPE (optional)" placeholderTextColor={theme.placeholder} style={styles.input} />
                        <TextInput value={weightInput} onChangeText={setWeightInput} keyboardType="decimal-pad" placeholder="Suggested weight lb (optional)" placeholderTextColor={theme.placeholder} style={styles.input} />
                        <TextInput value={notesInput} onChangeText={setNotesInput} placeholder="Notes (optional)" placeholderTextColor={theme.placeholder} style={styles.input} />
                        <Pressable onPress={handleConfirmExercise} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Add To Day</Text></Pressable>
                        <Pressable onPress={() => setPickerVisible(false)} style={styles.cancelButton}><Text style={styles.cancelButtonText}>Close</Text></Pressable>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function createStyles(theme: Theme) {
    return StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.backgroundDark,
        },
        flex: {
            flex: 1,
        },
        container: {
            flex: 1,
            backgroundColor: theme.backgroundDark,
        },
        header: {
            height: 64,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        iconButton: {
            width: 40,
            height: 40,
            borderRadius: 999,
            backgroundColor: theme.background,
            alignItems: 'center',
            justifyContent: 'center',
        },
        headerTitle: {
            color: theme.textPrimary,
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
            backgroundColor: theme.primary,
        },
        progressBarInactive: {
            backgroundColor: theme.border,
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
            color: theme.textPrimary,
            fontSize: 20,
            fontWeight: '600',
        },
        sectionSubtitle: {
            color: theme.text,
            fontSize: 14,
        },
        fieldGroup: {
            gap: 8,
        },
        label: {
            color: theme.text,
            fontSize: 14,
        },
        smallLabel: {
            color: theme.placeholder,
            fontSize: 12,
        },
        input: {
            backgroundColor: theme.background,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 14,
            color: theme.textPrimary,
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
            backgroundColor: theme.buttonPicked,
        },
        dayNumberButtonUnselected: {
            backgroundColor: theme.background,
            borderWidth: 1,
            borderColor: theme.border,
        },
        dayNumberText: {
            fontSize: 14,
            fontWeight: '600',
        },
        dayNumberTextSelected: {
            color: theme.white,
        },
        dayNumberTextUnselected: {
            color: theme.text,
        },
        cardList: {
            gap: 16,
        },
        workoutCard: {
            backgroundColor: theme.cardBg,
            borderWidth: 1,
            borderColor: theme.border,
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
            color: theme.textPrimary,
            fontSize: 16,
            fontWeight: '600',
        },
        workoutCardMeta: {
            color: theme.placeholder,
            fontSize: 14,
        },
        secondaryButton: {
            backgroundColor: theme.border,
            borderWidth: 1,
            borderColor: theme.buttonDisabled,
            borderRadius: 14,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
        },
        secondaryButtonText: {
            color: theme.white,
            fontSize: 14,
            fontWeight: '500',
        },
        exerciseList: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        exerciseChip: {
            backgroundColor: theme.backgroundDark,
            borderWidth: 1,
            borderColor: theme.buttonDisabled,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 8,
            gap: 6,
        },
        removeText: { color: theme.primary, fontSize: 12, fontWeight: '600' },
        modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
        modalCard: { backgroundColor: theme.cardBg, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, gap: 10, maxHeight: '88%' },
        filterRow: { gap: 8, paddingVertical: 4 },
        filterChip: { borderWidth: 1, borderColor: theme.border, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
        filterChipActive: { backgroundColor: theme.border },
        optionRow: { borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 10, marginBottom: 8 },
        exerciseChipText: {
            color: theme.textPrimary,
            fontSize: 13,
        },
        footerButtons: {
            gap: 8,
        },
        primaryButton: {
            backgroundColor: theme.primary,
            borderRadius: 14,
            paddingVertical: 15,
            alignItems: 'center',
            justifyContent: 'center',
        },
        primaryButtonDisabled: {
            opacity: 0.6,
        },
        primaryButtonText: {
            color: theme.white,
            fontSize: 16,
            fontWeight: '600',
        },
        cancelButton: {
            backgroundColor: theme.border,
            borderRadius: 14,
            paddingVertical: 15,
            alignItems: 'center',
            justifyContent: 'center',
        },
        cancelButtonText: {
            color: theme.white,
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
            backgroundColor: theme.background,
            borderWidth: 1,
            borderColor: theme.border,
            shadowOpacity: 0.25,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
        },
    });
}
