/**
 * Flashlight/torch service.
 * Uses device torch via expo-camera with a hidden CameraView.
 */
import { Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// Global torch state
let torchEnabled = false;
let torchCallback: ((enabled: boolean) => void) | null = null;

/**
 * Register a callback to control torch from a CameraView component.
 */
export function setTorchCallback(callback: ((enabled: boolean) => void) | null) {
  torchCallback = callback;
}

/**
 * Toggle the device flashlight/torch on or off.
 * Returns true if successful, false otherwise.
 */
export async function toggleFlashlight(): Promise<boolean> {
  try {
    // Request camera permission (needed for torch)
    // Using ImagePicker's permission API as it's the same camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Camera permission is required to use the flashlight. Please enable it in Settings.'
      );
      return false;
    }

    // Toggle torch state
    torchEnabled = !torchEnabled;

    // Notify the CameraView component to update torch
    if (torchCallback) {
      torchCallback(torchEnabled);
      return true;
    }

    // Fallback: Show platform-specific instructions
    Alert.alert(
      'Flashlight',
      Platform.select({
        ios: 'Swipe down from the top-right corner and tap the flashlight icon in Control Center.',
        android: 'Swipe down from the top and tap the flashlight icon in Quick Settings.',
        default: 'Use your device\'s flashlight feature.',
      })
    );

    return false;
  } catch (error) {
    console.error('Flashlight error:', error);
    Alert.alert(
      'Flashlight unavailable',
      Platform.select({
        ios: 'Please use Control Center to access your flashlight.',
        android: 'Please use Quick Settings to access your flashlight.',
        default: 'Please use your device\'s flashlight feature.',
      })
    );
    return false;
  }
}

/**
 * Check if flashlight is currently enabled.
 */
export function isFlashlightEnabled(): boolean {
  return torchEnabled;
}

/**
 * Turn flashlight on.
 */
export async function turnFlashlightOn(): Promise<boolean> {
  if (!torchEnabled) {
    return await toggleFlashlight();
  }
  return true;
}

/**
 * Turn flashlight off.
 */
export async function turnFlashlightOff(): Promise<boolean> {
  if (torchEnabled) {
    return await toggleFlashlight();
  }
  return true;
}
