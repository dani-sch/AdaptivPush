import AsyncStorage from '@react-native-async-storage/async-storage';
import { createRecoveryCheckpoint } from './recoveryCheckpoint';
export const preserveWorkoutRecovery = createRecoveryCheckpoint(AsyncStorage);
