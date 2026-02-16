/**
 * ID scanning service.
 * Allows users to scan/upload their state identification.
 */
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

/**
 * Request camera and media library permissions.
 */
async function requestPermissions(): Promise<boolean> {
  try {
    // Request camera permission
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraStatus.status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Camera permission is required to scan your ID. Please enable it in Settings.'
      );
      return false;
    }

    // Request media library permission (for selecting existing photos)
    const mediaStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (mediaStatus.status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Photo library permission is required to select your ID photo. Please enable it in Settings.'
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return false;
  }
}

/**
 * Scan ID using camera.
 * Returns the URI of the captured image.
 */
export async function scanIDWithCamera(): Promise<string | null> {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 2], // ID card aspect ratio
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0]?.uri || null;
  } catch (error) {
    console.error('Error scanning ID:', error);
    Alert.alert('Error', 'Could not scan ID. Please try again.');
    return null;
  }
}

/**
 * Select ID from photo library.
 * Returns the URI of the selected image.
 */
export async function selectIDFromLibrary(): Promise<string | null> {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 2], // ID card aspect ratio
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0]?.uri || null;
  } catch (error) {
    console.error('Error selecting ID:', error);
    Alert.alert('Error', 'Could not select ID. Please try again.');
    return null;
  }
}

/**
 * Show action sheet to choose between camera or library.
 * Returns the URI of the selected/scanned image.
 */
export async function scanOrSelectID(): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(
      'Add Photo ID',
      'How would you like to add your ID?',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const uri = await scanIDWithCamera();
            resolve(uri);
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            const uri = await selectIDFromLibrary();
            resolve(uri);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}
