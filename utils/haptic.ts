import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

export { Haptics };

/**
 * Fires a haptic only if the user has haptics enabled (default: on).
 * Call fire-and-forget — do not await at the call site.
 */
export async function haptic(fn: () => Promise<void>): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem('haptics_enabled');
    if (stored === 'false') return;
    await fn();
  } catch {
    // Never let a haptic error surface to the user
  }
}
