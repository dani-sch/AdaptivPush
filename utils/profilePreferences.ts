import type {
  AdaptationAggressiveness,
  DepthMode,
  EvidenceDisplayPreferencesUpdate,
  ReadinessAuthority,
  ReadinessCheckinMode,
  ReadinessSource,
  UserAdaptationPreferencesUpdate,
  WearablesPriority,
} from '@/types/database';

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  workoutReminder: boolean;
  deloadReminder: boolean;
  prCelebrations: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface PrivacyPreferences {
  analyticsEnabled: boolean;
  crashReportsEnabled: boolean;
  sensitiveDataMasking: boolean;
}

export interface ReadinessQuestionPreferences {
  sleep: boolean;
  stress: boolean;
  menstrualCycle: boolean;
}

export interface ReadinessPreferences {
  source: ReadinessSource;
  promptsEnabled: boolean;
  questions: ReadinessQuestionPreferences;
}

export interface SchemaErrorLike {
  code?: string | null;
  message?: string | null;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  workoutReminder: true,
  deloadReminder: true,
  prCelebrations: true,
  quietHoursEnabled: false,
  quietHoursStart: '10:00 PM',
  quietHoursEnd: '7:00 AM',
};

export const DEFAULT_PRIVACY_PREFERENCES: PrivacyPreferences = {
  analyticsEnabled: true,
  crashReportsEnabled: true,
  sensitiveDataMasking: true,
};

export const DEFAULT_READINESS_PREFERENCES: ReadinessPreferences = {
  source: 'manual',
  promptsEnabled: true,
  questions: {
    sleep: true,
    stress: true,
    menstrualCycle: true,
  },
};

export const DEFAULT_DEPTH_MODE: DepthMode = 'guided';
export const DEFAULT_READINESS_AUTHORITY: ReadinessAuthority = 'moderate';
export const DEFAULT_ADAPTATION_AGGRESSIVENESS: AdaptationAggressiveness = 'moderate';
export const DEFAULT_WEARABLES_PRIORITY: WearablesPriority = 'secondary';

export const DEFAULT_EVIDENCE_DISPLAY_PREFERENCES: Omit<
  EvidenceDisplayPreferencesUpdate,
  'user_id' | 'updated_at'
> = {
  verbosity: DEFAULT_DEPTH_MODE,
  show_evidence_badges: true,
  show_source_links: true,
  show_uncertainty_notes: false,
  auto_open_why_sheet: false,
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const getString = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
};

const getRecord = (value: unknown): UnknownRecord => (isRecord(value) ? value : {});

const parseDepthMode = (value: unknown): DepthMode | null => {
  if (value === 'essential' || value === 'guided' || value === 'advanced') {
    return value;
  }

  return null;
};

const parseReadinessCheckinMode = (value: unknown): ReadinessCheckinMode | null => {
  if (value === 'off' || value === 'one_tap' || value === 'guided' || value === 'deep') {
    return value;
  }

  return null;
};

const parseWearablesPriority = (value: unknown): WearablesPriority | null => {
  if (value === 'secondary' || value === 'ignored') {
    return value;
  }

  return null;
};

export const parseNotificationPreferences = (value: unknown): NotificationPreferences => {
  const source = getRecord(value);

  return {
    pushEnabled: getBoolean(source.pushEnabled, DEFAULT_NOTIFICATION_PREFERENCES.pushEnabled),
    emailEnabled: getBoolean(source.emailEnabled, DEFAULT_NOTIFICATION_PREFERENCES.emailEnabled),
    smsEnabled: getBoolean(source.smsEnabled, DEFAULT_NOTIFICATION_PREFERENCES.smsEnabled),
    workoutReminder: getBoolean(
      source.workoutReminder,
      DEFAULT_NOTIFICATION_PREFERENCES.workoutReminder,
    ),
    deloadReminder: getBoolean(
      source.deloadReminder,
      DEFAULT_NOTIFICATION_PREFERENCES.deloadReminder,
    ),
    prCelebrations: getBoolean(
      source.prCelebrations,
      DEFAULT_NOTIFICATION_PREFERENCES.prCelebrations,
    ),
    quietHoursEnabled: getBoolean(
      source.quietHoursEnabled,
      DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnabled,
    ),
    quietHoursStart: getString(
      source.quietHoursStart,
      DEFAULT_NOTIFICATION_PREFERENCES.quietHoursStart,
    ),
    quietHoursEnd: getString(source.quietHoursEnd, DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnd),
  };
};

export const parsePrivacyPreferences = (value: unknown): PrivacyPreferences => {
  const source = getRecord(value);

  return {
    analyticsEnabled: getBoolean(
      source.analyticsEnabled,
      DEFAULT_PRIVACY_PREFERENCES.analyticsEnabled,
    ),
    crashReportsEnabled: getBoolean(
      source.crashReportsEnabled,
      DEFAULT_PRIVACY_PREFERENCES.crashReportsEnabled,
    ),
    sensitiveDataMasking: getBoolean(
      source.sensitiveDataMasking,
      DEFAULT_PRIVACY_PREFERENCES.sensitiveDataMasking,
    ),
  };
};

export const parseReadinessPreferences = (value: unknown): ReadinessPreferences => {
  const source = getRecord(value);
  const rawQuestions = getRecord(source.questions);

  const readinessSource: ReadinessSource =
    source.source === 'apple' || source.source === 'manual'
      ? source.source
      : DEFAULT_READINESS_PREFERENCES.source;

  return {
    source: readinessSource,
    promptsEnabled: getBoolean(
      source.promptsEnabled,
      DEFAULT_READINESS_PREFERENCES.promptsEnabled,
    ),
    questions: {
      sleep: getBoolean(rawQuestions.sleep, DEFAULT_READINESS_PREFERENCES.questions.sleep),
      stress: getBoolean(rawQuestions.stress, DEFAULT_READINESS_PREFERENCES.questions.stress),
      menstrualCycle: getBoolean(
        rawQuestions.menstrualCycle,
        DEFAULT_READINESS_PREFERENCES.questions.menstrualCycle,
      ),
    },
  };
};

export const parseUserAdaptationPreferences = (
  value: unknown,
): Partial<UserAdaptationPreferencesUpdate> => {
  const source = getRecord(value);
  const readinessCheckinMode = parseReadinessCheckinMode(source.readiness_checkin_mode);
  const wearablesPriority = parseWearablesPriority(source.wearables_priority);

  return {
    readiness_enabled:
      typeof source.readiness_enabled === 'boolean' ? source.readiness_enabled : undefined,
    readiness_checkin_mode: readinessCheckinMode ?? undefined,
    readiness_authority:
      source.readiness_authority === 'low' ||
      source.readiness_authority === 'moderate' ||
      source.readiness_authority === 'strong'
        ? source.readiness_authority
        : undefined,
    adaptation_aggressiveness:
      source.adaptation_aggressiveness === 'conservative' ||
      source.adaptation_aggressiveness === 'moderate' ||
      source.adaptation_aggressiveness === 'assertive'
        ? source.adaptation_aggressiveness
        : undefined,
    cycle_support_enabled:
      typeof source.cycle_support_enabled === 'boolean'
        ? source.cycle_support_enabled
        : undefined,
    symptom_tracking_enabled:
      typeof source.symptom_tracking_enabled === 'boolean'
        ? source.symptom_tracking_enabled
        : undefined,
    wearables_enabled:
      typeof source.wearables_enabled === 'boolean' ? source.wearables_enabled : undefined,
    wearables_priority: wearablesPriority ?? undefined,
  };
};

export const resolveReadinessPreferences = (
  adaptationPreferences: unknown,
  legacyPreferences: unknown,
): ReadinessPreferences => {
  const parsedAdaptationPreferences = parseUserAdaptationPreferences(adaptationPreferences);
  const parsedLegacyPreferences = parseReadinessPreferences(legacyPreferences);
  const readinessCheckinMode = parsedAdaptationPreferences.readiness_checkin_mode;
  const wearablesEnabled = parsedAdaptationPreferences.wearables_enabled ?? false;

  const promptsEnabled =
    typeof parsedAdaptationPreferences.readiness_enabled === 'boolean'
      ? parsedAdaptationPreferences.readiness_enabled
      : readinessCheckinMode === 'off'
        ? false
        : parsedLegacyPreferences.promptsEnabled;

  return {
    source: wearablesEnabled ? 'apple' : parsedLegacyPreferences.source,
    promptsEnabled,
    questions: {
      sleep: parsedLegacyPreferences.questions.sleep,
      stress: parsedLegacyPreferences.questions.stress,
      menstrualCycle:
        parsedAdaptationPreferences.symptom_tracking_enabled ??
        parsedAdaptationPreferences.cycle_support_enabled ??
        parsedLegacyPreferences.questions.menstrualCycle,
    },
  };
};

export interface BuildUserAdaptationPreferencesInput {
  userId: string;
  readinessSource: ReadinessSource;
  promptsEnabled: boolean;
  cycleSupportEnabled: boolean;
  symptomTrackingEnabled: boolean;
  wearablesEnabled: boolean;
  readinessAuthority?: ReadinessAuthority;
  adaptationAggressiveness?: AdaptationAggressiveness;
  wearablesPriority?: WearablesPriority;
  depthMode?: DepthMode;
}

export const buildUserAdaptationPreferencesUpdate = ({
  userId,
  readinessSource,
  promptsEnabled,
  cycleSupportEnabled,
  symptomTrackingEnabled,
  wearablesEnabled,
  readinessAuthority = DEFAULT_READINESS_AUTHORITY,
  adaptationAggressiveness = DEFAULT_ADAPTATION_AGGRESSIVENESS,
  wearablesPriority,
  depthMode = DEFAULT_DEPTH_MODE,
}: BuildUserAdaptationPreferencesInput): UserAdaptationPreferencesUpdate => {
  const readinessCheckinMode: ReadinessCheckinMode = !promptsEnabled
    ? 'off'
    : readinessSource === 'apple' && wearablesEnabled
      ? 'one_tap'
      : depthMode === 'advanced'
        ? 'deep'
        : 'guided';

  return {
    user_id: userId,
    readiness_enabled: promptsEnabled,
    readiness_checkin_mode: readinessCheckinMode,
    readiness_authority: readinessAuthority,
    adaptation_aggressiveness: adaptationAggressiveness,
    cycle_support_enabled: cycleSupportEnabled,
    symptom_tracking_enabled: symptomTrackingEnabled,
    wearables_enabled: wearablesEnabled,
    wearables_priority:
      wearablesPriority ??
      (wearablesEnabled && readinessSource === 'apple'
        ? DEFAULT_WEARABLES_PRIORITY
        : 'ignored'),
    updated_at: new Date().toISOString(),
  };
};

export const buildEvidenceDisplayPreferencesUpdate = (
  userId: string,
  depthMode: DepthMode = DEFAULT_DEPTH_MODE,
): EvidenceDisplayPreferencesUpdate => ({
  user_id: userId,
  verbosity: parseDepthMode(depthMode) ?? DEFAULT_EVIDENCE_DISPLAY_PREFERENCES.verbosity,
  show_evidence_badges: DEFAULT_EVIDENCE_DISPLAY_PREFERENCES.show_evidence_badges,
  show_source_links: DEFAULT_EVIDENCE_DISPLAY_PREFERENCES.show_source_links,
  show_uncertainty_notes: DEFAULT_EVIDENCE_DISPLAY_PREFERENCES.show_uncertainty_notes,
  auto_open_why_sheet: DEFAULT_EVIDENCE_DISPLAY_PREFERENCES.auto_open_why_sheet,
  updated_at: new Date().toISOString(),
});

export const isMissingRelationOrColumnError = (
  error: SchemaErrorLike | null | undefined,
  relationName: string,
  columnName?: string,
): boolean => {
  if (!error) {
    return false;
  }

  if (
    error.code === 'PGRST205' ||
    error.code === 'PGRST204' ||
    error.code === '42P01' ||
    error.code === '42703'
  ) {
    return true;
  }

  const normalized = error.message?.toLowerCase() ?? '';

  if (
    normalized.includes(`could not find the table 'public.${relationName}'`) ||
    normalized.includes(`relation "public.${relationName}" does not exist`) ||
    normalized.includes(`relation "${relationName}" does not exist`)
  ) {
    return true;
  }

  if (!columnName) {
    return false;
  }

  return (
    normalized.includes(`could not find the '${columnName}' column`) ||
    normalized.includes(`column "${columnName}" does not exist`) ||
    normalized.includes(`column ${columnName} does not exist`)
  );
};

export const mergeUserMetadata = (
  baseMetadata: unknown,
  updates: Record<string, unknown>,
): Record<string, unknown> => ({
  ...getRecord(baseMetadata),
  ...updates,
});
