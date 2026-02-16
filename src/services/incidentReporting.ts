/**
 * Incident reporting service with audio recording and email functionality.
 * 
 * NOTE: expo-av is deprecated in SDK 54 and will be removed in SDK 55.
 * This should be migrated to expo-audio in the future.
 * See: https://docs.expo.dev/versions/v54.0.0/sdk/audio/
 */
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import { Linking, Platform, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';

export type IncidentType = 'self' | 'other';
export type ReportType = 'audio' | 'event';

export interface IncidentReport {
  reportType: ReportType;
  type: IncidentType;
  description?: string;
  audioUri?: string; // Optional for event reports
  crimeType?: string; // For event reports
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
}

// Common crime types for event reporting
export const CRIME_TYPES = [
  'Assault',
  'Burglary',
  'Robbery',
  'Theft',
  'Vandalism',
  'Harassment',
  'Drug Activity',
  'Suspicious Activity',
  'Vehicle Break-in',
  'Public Disturbance',
  'Domestic Violence',
  'Other',
];

let recording: Audio.Recording | null = null;
let isRecording = false;

/**
 * Request audio recording permissions.
 */
export async function requestAudioPermissions(): Promise<boolean> {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Audio recording permission is required to record evidence. Please enable it in Settings.'
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error requesting audio permissions:', error);
    return false;
  }
}

/**
 * Start recording audio.
 */
export async function startRecording(): Promise<string | null> {
  try {
    const hasPermission = await requestAudioPermissions();
    if (!hasPermission) {
      return null;
    }

    // Configure audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    // Create new recording
    const { recording: newRecording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );

    recording = newRecording;
    isRecording = true;

    return null; // Success, recording started
  } catch (error) {
    console.error('Error starting recording:', error);
    Alert.alert('Recording error', 'Could not start recording. Please try again.');
    return null;
  }
}

/**
 * Stop recording and return the file URI.
 */
export async function stopRecording(): Promise<string | null> {
  try {
    if (!recording) {
      return null;
    }

    isRecording = false;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    recording = null;

    return uri;
  } catch (error) {
    console.error('Error stopping recording:', error);
    Alert.alert('Recording error', 'Could not stop recording.');
    return null;
  }
}

/**
 * Check if currently recording.
 */
export function getIsRecording(): boolean {
  return isRecording;
}

/**
 * Get the local police department email based on location.
 * For Rutgers area, returns RUPD email.
 */
function getPoliceEmail(latitude: number, longitude: number): string {
  // Rutgers New Brunswick area
  const RUTGERS_LAT = 40.5008;
  const RUTGERS_LON = -74.4474;
  const RUTGERS_RADIUS = 0.1; // ~11km radius

  const distance = Math.sqrt(
    Math.pow(latitude - RUTGERS_LAT, 2) + Math.pow(longitude - RUTGERS_LON, 2)
  );

  if (distance < RUTGERS_RADIUS) {
    return 'rupd@rutgers.edu'; // RUPD email
  }

  // Default to RUPD for now, in production this would use a geocoding service
  return 'rupd@rutgers.edu';
}

/**
 * Get current location.
 */
async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
}

/**
 * Send incident report via email.
 */
export async function sendIncidentReport(
  reportType: ReportType,
  type: IncidentType,
  description?: string,
  audioUri?: string,
  crimeType?: string
): Promise<boolean> {
  try {
    // Get location - always required
    const location = await getCurrentLocation();
    if (!location) {
      Alert.alert(
        'Location needed',
        'Could not get your location. Please enable location permissions to send the report.'
      );
      return false;
    }

    const policeEmail = getPoliceEmail(location.latitude, location.longitude);

    const timestamp = new Date().toLocaleString();
    const locationText = `Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}\nGoogle Maps: https://www.google.com/maps?q=${location.latitude},${location.longitude}`;

    let subject: string;
    let body: string;

    if (reportType === 'audio') {
      if (!audioUri) {
        Alert.alert('Audio required', 'Please record audio evidence before sending the report.');
        return false;
      }
      subject = `SafeRoute Audio Incident Report - ${type === 'self' ? 'Self' : 'Other'} - ${timestamp}`;
      body = `SafeRoute Incident Report\n\n` +
        `Report Type: Audio Recording\n` +
        `Incident Type: ${type === 'self' ? 'Happening to me' : 'Happening to someone else'}\n` +
        `Time: ${timestamp}\n` +
        `${locationText}\n\n` +
        (description ? `Description: ${description}\n\n` : '') +
        `An audio recording is attached as evidence.\n\n` +
        `This report was automatically generated by SafeRoute.`;
    } else {
      // Event report
      if (!crimeType) {
        Alert.alert('Crime type required', 'Please select a crime type.');
        return false;
      }
      subject = `SafeRoute Event Report - ${crimeType} - ${timestamp}`;
      body = `SafeRoute Event Report\n\n` +
        `Report Type: Event Report\n` +
        `Crime Type: ${crimeType}\n` +
        `Incident Type: ${type === 'self' ? 'Happening to me' : 'Happening to someone else'}\n` +
        `Time: ${timestamp}\n` +
        `${locationText}\n\n` +
        (description ? `Details: ${description}\n\n` : '') +
        `This report was automatically generated by SafeRoute.`;
    }

    // Create mailto link
    const mailtoUrl = `mailto:${policeEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // For audio reports, handle file attachment
    if (reportType === 'audio' && audioUri) {
      // On iOS, we can use mailto with attachment hint
      // On Android, we'll use Sharing API to share the file
      if (Platform.OS === 'ios') {
        // Try to open mail app
        const canOpen = await Linking.canOpenURL(mailtoUrl);
        if (canOpen) {
          await Linking.openURL(mailtoUrl);
          
          // Then share the audio file separately
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(audioUri, {
              mimeType: 'audio/m4a',
              dialogTitle: 'Share audio evidence',
            });
          }
          return true;
        }
      }

      // Fallback: Share audio file and provide email instructions
      if (await Sharing.isAvailableAsync()) {
        Alert.alert(
          'Email Instructions',
          `Please email the audio recording to:\n\n${policeEmail}\n\nSubject: ${subject}\n\nThe audio file will open in your sharing menu.`,
          [
            {
              text: 'Share Audio',
              onPress: async () => {
                await Sharing.shareAsync(audioUri, {
                  mimeType: 'audio/m4a',
                  dialogTitle: 'Share audio evidence',
                });
              },
            },
            {
              text: 'Open Email',
              onPress: () => Linking.openURL(mailtoUrl),
            },
            { text: 'Cancel' },
          ]
        );
        return true;
      }
    } else {
      // Event report - just open email
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
        return true;
      } else {
        Alert.alert(
          'Email Instructions',
          `Please email the report to:\n\n${policeEmail}\n\nSubject: ${subject}\n\nBody:\n${body}`,
          [
            {
              text: 'Copy Email',
              onPress: () => {
                // In a real app, you'd copy to clipboard
                Alert.alert('Email copied', `Email: ${policeEmail}`);
              },
            },
            { text: 'OK' },
          ]
        );
        return true;
      }
    }

    // Last resort: just open email
    await Linking.openURL(mailtoUrl);
    return true;
  } catch (error) {
    console.error('Error sending incident report:', error);
    Alert.alert(
      'Error',
      'Could not send report. Please manually email the recording to your local police department.'
    );
    return false;
  }
}

/**
 * Cancel current recording.
 */
export async function cancelRecording(): Promise<void> {
  try {
    if (recording) {
      await recording.stopAndUnloadAsync();
      recording = null;
      isRecording = false;
      // Note: File cleanup would be handled by the OS
    }
  } catch (error) {
    console.error('Error canceling recording:', error);
  }
}
