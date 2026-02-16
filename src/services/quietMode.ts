/**
 * Quiet mode service for managing notification preferences.
 * 
 * Behavior:
 * - When quiet mode is OFF: All crime notifications and route changes will be on alert/priority
 * - When quiet mode is ON: Less priority events won't be notified, and route changes won't be notified
 * 
 * Usage for crime notifications:
 * ```typescript
 * import { shouldShowNotification } from '../services/quietMode';
 * 
 * // For high-priority crimes (always shown, even in quiet mode)
 * if (shouldShowNotification(true)) {
 *   Alert.alert('High Priority Crime', 'Assault reported nearby');
 * }
 * 
 * // For low-priority crimes (suppressed in quiet mode)
 * if (shouldShowNotification(false)) {
 *   Alert.alert('Crime Alert', 'Theft reported nearby');
 * }
 * ```
 * 
 * Usage for route changes:
 * ```typescript
 * import { shouldShowRouteChangeNotification } from '../services/quietMode';
 * 
 * if (shouldShowRouteChangeNotification()) {
 *   Alert.alert('Turn Ahead', 'Turn left in 50m');
 * }
 * ```
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@saferoute:quiet_mode';
const PROMPT_DISMISSED_FOREVER_KEY = '@saferoute:quiet_mode_prompt_dismissed_forever';

let quietModeState: boolean = true; // Default to enabled
let listeners: Set<(value: boolean) => void> = new Set();

/**
 * Load quiet mode state from storage.
 */
export async function loadQuietMode(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      quietModeState = JSON.parse(stored);
    }
    return quietModeState;
  } catch {
    return quietModeState;
  }
}

/**
 * Get current quiet mode state (synchronous).
 */
export function getQuietMode(): boolean {
  return quietModeState;
}

/**
 * Set quiet mode state and persist it.
 */
export async function setQuietMode(enabled: boolean): Promise<boolean> {
  try {
    quietModeState = enabled;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(enabled));
    
    // Notify all listeners
    listeners.forEach((listener) => listener(enabled));
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Subscribe to quiet mode changes.
 * Returns an unsubscribe function.
 */
export function subscribeToQuietMode(listener: (value: boolean) => void): () => void {
  listeners.add(listener);
  
  // Immediately call with current value
  listener(quietModeState);
  
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Check if the user chose to never see the Quiet Mode explanation again.
 */
export async function getQuietModePromptDismissedForever(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(PROMPT_DISMISSED_FOREVER_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

/**
 * Save that the user chose "Don't show again" for the Quiet Mode explanation.
 */
export async function setQuietModePromptDismissedForever(): Promise<void> {
  try {
    await AsyncStorage.setItem(PROMPT_DISMISSED_FOREVER_KEY, 'true');
  } catch {
    // ignore
  }
}

/**
 * Check if a notification should be shown based on quiet mode and priority.
 * @param isHighPriority - Whether this is a high-priority notification (always shown)
 * @returns true if notification should be shown, false otherwise
 */
export function shouldShowNotification(isHighPriority: boolean = false): boolean {
  // High priority notifications are always shown
  if (isHighPriority) {
    return true;
  }
  
  // In quiet mode, low priority notifications are suppressed
  // When quiet mode is OFF, all notifications are shown
  return !quietModeState;
}

/**
 * Check if route change notifications should be shown.
 * Route changes are suppressed when quiet mode is enabled.
 */
export function shouldShowRouteChangeNotification(): boolean {
  // Route changes are only shown when quiet mode is disabled
  return !quietModeState;
}
