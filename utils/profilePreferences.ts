export type ReadinessSource = 'apple' | 'manual';

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

export const mergeUserMetadata = (
  baseMetadata: unknown,
  updates: Record<string, unknown>,
): Record<string, unknown> => ({
  ...getRecord(baseMetadata),
  ...updates,
});
