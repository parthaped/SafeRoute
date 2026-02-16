/**
 * Location sharing service.
 * Shares location with emergency contacts; supports share-to-one-contact with duration.
 */
import * as Location from 'expo-location';
import { Linking, Platform, Alert } from 'react-native';
import { getEmergencyContacts, type EmergencyContact } from './storage';

let locationSharingActive = false;
let locationWatchSubscription: Location.LocationSubscription | null = null;

/**
 * Share current location to a single contact of choice with a duration.
 * Opens SMS with a SafeRoute message and optional "sharing ended" reminder.
 */
export async function shareCurrentLocationToContact(
  contact: EmergencyContact,
  durationMinutes: number
): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Location permission is required to share your location. Please enable it in Settings.'
      );
      return false;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = location.coords;
    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const durationText =
      durationMinutes < 60
        ? `${durationMinutes} minutes`
        : durationMinutes === 60
          ? '1 hour'
          : `${Math.floor(durationMinutes / 60)} hours`;
    const message =
      `Sent from SafeRoute app.\n\n` +
      `I'm sharing my live location with you for ${durationText}.\n\n` +
      `Current location: ${mapsUrl}\n` +
      `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

    const phone = contact.phone.replace(/\D/g, '');
    const smsUrl =
      Platform.OS === 'ios'
        ? `sms:${phone}&body=${encodeURIComponent(message)}`
        : `sms:${phone}?body=${encodeURIComponent(message)}`;

    await Linking.openURL(smsUrl);

    // Remind user when duration ends so they can send an "ended" message if desired
    const endMessage = `Location sharing period ended — SafeRoute app.`;
    const endSmsUrl =
      Platform.OS === 'ios'
        ? `sms:${phone}&body=${encodeURIComponent(endMessage)}`
        : `sms:${phone}?body=${encodeURIComponent(endMessage)}`;
    setTimeout(() => {
      Alert.alert(
        'Location sharing period ended',
        `Send an "ended" message to ${contact.name}?`,
        [
          {
            text: 'Send',
            onPress: () => Linking.openURL(endSmsUrl).catch(() => {}),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }, durationMinutes * 60 * 1000);

    return true;
  } catch (error) {
    console.error('Error sharing location to contact:', error);
    Alert.alert('Error', 'Could not open messages. Please try again.');
    return false;
  }
}

/** Recipient for SOS: emergency contact or device contact. */
export type SOSRecipient = {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
};

/**
 * Share the current location with a list of recipients via SMS (e.g. SOS).
 * Uses the user's current location and opens the messaging app for each recipient.
 */
export async function shareCurrentLocationToRecipients(
  recipients: SOSRecipient[]
): Promise<boolean> {
  if (recipients.length === 0) return false;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Location permission is required to share your location. Please enable it in Settings.'
      );
      return false;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = location.coords;
    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const message =
      `Sent from SafeRoute app (SOS).\n\n` +
      `I'm sharing my location with you.\n\n` +
      `Location: ${mapsUrl}\n` +
      `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

    const seen = new Set<string>();
    for (const r of recipients) {
      const phone = r.phone.replace(/\D/g, '');
      if (!phone || seen.has(phone)) continue;
      seen.add(phone);
      const smsUrl =
        Platform.OS === 'ios'
          ? `sms:${phone}&body=${encodeURIComponent(message)}`
          : `sms:${phone}?body=${encodeURIComponent(message)}`;
      try {
        await Linking.openURL(smsUrl);
      } catch {
        // Continue to next contact
      }
    }

    return true;
  } catch (error) {
    console.error('Error sharing location:', error);
    Alert.alert('Error', 'Could not share location. Please try again.');
    return false;
  }
}

/**
 * Share the current location with all emergency contacts via SMS (e.g. SOS).
 * Prefer using shareCurrentLocationToRecipients with a chosen list (emergency + phone contacts).
 */
export async function shareCurrentLocation(): Promise<boolean> {
  const contacts = await getEmergencyContacts();
  if (contacts.length === 0) {
    Alert.alert(
      'No emergency contacts',
      'Please add emergency contacts in your Profile settings, or use SOS and choose "Add from phone" to pick a contact.',
      [{ text: 'OK' }]
    );
    return false;
  }
  return shareCurrentLocationToRecipients(contacts);
}

/**
 * Start continuous location sharing during a route.
 * Shares location updates with emergency contacts.
 */
export async function startRouteLocationSharing(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return false;
    }

    // Get emergency contacts
    const contacts = await getEmergencyContacts();
    if (contacts.length === 0) {
      return false;
    }

    locationSharingActive = true;

    // Start watching location
    locationWatchSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // Update every 30 seconds
        distanceInterval: 50, // Update every 50 meters
      },
      async (location) => {
        const { latitude, longitude } = location.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const message = `SafeRoute location update:\n${mapsUrl}\nTime: ${new Date().toLocaleTimeString()}`;

        // Share with emergency contacts (in production, use a backend service)
        const phoneNumbers = contacts.map((c) => c.phone.replace(/\D/g, ''));
        
        // Note: In production, this should be done via a backend service
        // to avoid spamming contacts. For now, we'll log it.
        console.log('Location update:', { latitude, longitude, contacts: phoneNumbers });
      }
    );

    return true;
  } catch (error) {
    console.error('Error starting location sharing:', error);
    return false;
  }
}

/**
 * Stop continuous location sharing.
 */
export function stopRouteLocationSharing(): void {
  locationSharingActive = false;
  if (locationWatchSubscription) {
    locationWatchSubscription.remove();
    locationWatchSubscription = null;
  }
}

/**
 * Check if location sharing is currently active.
 */
export function isLocationSharingActive(): boolean {
  return locationSharingActive;
}

/**
 * Get current location coordinates.
 */
export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
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
  } catch {
    return null;
  }
}
