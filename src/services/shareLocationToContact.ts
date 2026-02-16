/**
 * Location sharing service for sharing location to a selected contact.
 * Shares location for a set duration until the user reaches their destination.
 */
import * as Location from 'expo-location';
import { Linking, Platform, Alert } from 'react-native';
import { getEmergencyContacts, type EmergencyContact } from './storage';

let activeSharingSession: {
  contact: EmergencyContact;
  destinationName: string;
  endTime: Date;
  watchSubscription: Location.LocationSubscription | null;
} | null = null;

/**
 * Share location to a selected contact for a duration until destination is reached.
 * @param contact The contact to share location with
 * @param destinationName Name of the destination
 * @param estimatedDurationMinutes Estimated time to reach destination in minutes
 */
export async function shareLocationToContact(
  contact: EmergencyContact,
  destinationName: string,
  estimatedDurationMinutes: number
): Promise<boolean> {
  try {
    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Location permission is required to share your location. Please enable it in Settings.'
      );
      return false;
    }

    // Stop any existing sharing session
    stopLocationSharing();

    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = location.coords;
    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    
    // Create friendly message
    const message = `Hey! I'm using SafeRoute to navigate to ${destinationName}. I'll be sharing my location with you until I reach my destination for my safety. You can track my progress here: ${mapsUrl}\n\nCurrent location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\nEstimated arrival: ${estimatedDurationMinutes} minutes`;

    // Send initial SMS
    const phoneNumber = contact.phone.replace(/\D/g, '');
    const smsUrl = Platform.OS === 'ios' 
      ? `sms:${phoneNumber}&body=${encodeURIComponent(message)}`
      : `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(smsUrl);
    } catch (error) {
      console.error('Error opening SMS:', error);
      Alert.alert('Error', 'Could not open SMS app. Please share manually.');
      return false;
    }

    // Calculate end time
    const endTime = new Date(Date.now() + estimatedDurationMinutes * 60 * 1000);

    // Start location watching
    const watchSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 60000, // Update every minute
        distanceInterval: 100, // Update every 100 meters
      },
      async (location) => {
        const { latitude, longitude } = location.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const updateMessage = `SafeRoute location update - ${contact.name}:\n${mapsUrl}\nTime: ${new Date().toLocaleTimeString()}\nStill heading to: ${destinationName}`;

        // In production, this would be sent via a backend service
        // For now, we'll log it and could send periodic SMS updates
        console.log('Location update for', contact.name, ':', { latitude, longitude });
        
        // Note: In production, use a backend service to send updates
        // to avoid spamming the contact. Consider sending updates every 5 minutes
        // or when significant location changes occur.
      }
    );

    // Store active session
    activeSharingSession = {
      contact,
      destinationName,
      endTime,
      watchSubscription,
    };

    // Set up automatic stop when time expires
    const timeUntilEnd = endTime.getTime() - Date.now();
    setTimeout(() => {
      if (activeSharingSession && activeSharingSession.contact.id === contact.id) {
        stopLocationSharing();
        Alert.alert(
          'Location sharing ended',
          `Location sharing with ${contact.name} has ended. You should have reached ${destinationName} by now.`
        );
      }
    }, timeUntilEnd);

    return true;
  } catch (error) {
    console.error('Error sharing location to contact:', error);
    Alert.alert('Error', 'Could not start location sharing. Please try again.');
    return false;
  }
}

/**
 * Stop active location sharing session.
 */
export function stopLocationSharing(): void {
  if (activeSharingSession) {
    if (activeSharingSession.watchSubscription) {
      activeSharingSession.watchSubscription.remove();
    }
    activeSharingSession = null;
  }
}

/**
 * Check if location sharing is currently active.
 */
export function isLocationSharingActive(): boolean {
  return activeSharingSession !== null;
}

/**
 * Get the currently active sharing session.
 */
export function getActiveSharingSession(): typeof activeSharingSession {
  return activeSharingSession;
}

/**
 * Manually end location sharing and notify the contact.
 */
export async function endLocationSharingManually(): Promise<void> {
  if (!activeSharingSession) {
    return;
  }

  const contact = activeSharingSession.contact;
  const destinationName = activeSharingSession.destinationName;

  // Get final location
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = location.coords;
    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const endMessage = `I've safely arrived at ${destinationName}! Location sharing has ended.\n\nFinal location: ${mapsUrl}`;

    const phoneNumber = contact.phone.replace(/\D/g, '');
    const smsUrl = Platform.OS === 'ios'
      ? `sms:${phoneNumber}&body=${encodeURIComponent(endMessage)}`
      : `sms:${phoneNumber}?body=${encodeURIComponent(endMessage)}`;

    try {
      await Linking.openURL(smsUrl);
    } catch (error) {
      console.error('Error sending end message:', error);
    }
  } catch (error) {
    console.error('Error getting final location:', error);
  }

  stopLocationSharing();
}
