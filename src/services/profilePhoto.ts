/**
 * Profile photo service.
 * Allows users to upload/select their profile photo.
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
        'Camera permission is required to take a profile photo. Please enable it in Settings.'
      );
      return false;
    }

    // Request media library permission (for selecting existing photos)
    const mediaStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (mediaStatus.status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Photo library permission is required to select a profile photo. Please enable it in Settings.'
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
 * Take profile photo using camera.
 * Returns the URI of the captured image.
 */
export async function takeProfilePhoto(): Promise<string | null> {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for profile photo
      quality: 0.9,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0]?.uri || null;
  } catch (error) {
    console.error('Error taking profile photo:', error);
    Alert.alert('Error', 'Could not take photo. Please try again.');
    return null;
  }
}

/**
 * Select profile photo from photo library.
 * Returns the URI of the selected image.
 */
export async function selectProfilePhotoFromLibrary(): Promise<string | null> {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for profile photo
      quality: 0.9,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0]?.uri || null;
  } catch (error) {
    console.error('Error selecting profile photo:', error);
    Alert.alert('Error', 'Could not select photo. Please try again.');
    return null;
  }
}

/**
 * Show action sheet to choose between camera or library.
 * Returns the URI of the selected/scanned image.
 */
export async function uploadOrSelectProfilePhoto(): Promise<string | null> {
  try {
    return new Promise((resolve) => {
      Alert.alert(
        'Profile Photo',
        'How would you like to add your profile photo?',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              try {
                const uri = await takeProfilePhoto();
                resolve(uri);
              } catch (error) {
                console.error('Error taking photo:', error);
                resolve(null);
              }
            },
          },
          {
            text: 'Choose from Library',
            onPress: async () => {
              try {
                const uri = await selectProfilePhotoFromLibrary();
                resolve(uri);
              } catch (error) {
                console.error('Error selecting photo:', error);
                resolve(null);
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(null),
          },
        ],
        { 
          cancelable: true, 
          onDismiss: () => resolve(null) 
        }
      );
    });
  } catch (error) {
    console.error('Error in uploadOrSelectProfilePhoto:', error);
    Alert.alert('Error', 'Could not open photo options. Please try again.');
    return null;
  }
}
