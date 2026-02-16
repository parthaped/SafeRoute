/**
 * Safety check-in service.
 * Monitors if user arrives at destination on time and sends check-in requests.
 */
import * as Haptics from 'expo-haptics';
import { Linking, Platform, Alert } from 'react-native';
import { getEmergencyContacts } from './storage';
import * as Location from 'expo-location';

export type CheckInStatus = 'ok' | 'not_ok' | 'no_response';

let checkInTimer: NodeJS.Timeout | null = null;
let checkInCallback: ((status: CheckInStatus) => void) | null = null;

/**
 * Parse duration text (e.g., "15 min", "1 hr 30 min") to seconds.
 */
export function parseDurationToSeconds(durationText: string): number {
  const text = durationText.toLowerCase().trim();
  let totalSeconds = 0;

  // Match hours
  const hourMatch = text.match(/(\d+)\s*hr/);
  if (hourMatch) {
    totalSeconds += parseInt(hourMatch[1], 10) * 3600;
  }

  // Match minutes
  const minMatch = text.match(/(\d+)\s*min/);
  if (minMatch) {
    totalSeconds += parseInt(minMatch[1], 10) * 60;
  }

  // Match seconds (if present)
  const secMatch = text.match(/(\d+)\s*sec/);
  if (secMatch) {
    totalSeconds += parseInt(secMatch[1], 10);
  }

  // If no matches, try to parse as just a number (assume minutes)
  if (totalSeconds === 0) {
    const numMatch = text.match(/(\d+)/);
    if (numMatch) {
      totalSeconds = parseInt(numMatch[1], 10) * 60;
    }
  }

  return totalSeconds || 0;
}

/**
 * Check if user has arrived at destination (within 50 meters).
 */
export async function checkIfArrived(
  currentLocation: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): Promise<boolean> {
  const distance = calculateDistance(currentLocation, destination);
  return distance < 0.05; // 50 meters threshold
}

/**
 * Calculate distance between two coordinates in kilometers.
 */
function calculateDistance(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.latitude * Math.PI) / 180) *
      Math.cos((to.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Trigger haptic vibration for check-in.
 */
export async function triggerCheckInVibration(): Promise<void> {
  try {
    // Strong vibration pattern
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise((resolve) => setTimeout(resolve, 200));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await new Promise((resolve) => setTimeout(resolve, 200));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (error) {
    console.error('Error triggering vibration:', error);
  }
}

/**
 * Send gentle message to emergency contacts.
 */
export async function sendSafetyAlert(
  currentLocation: { latitude: number; longitude: number } | null,
  destinationName: string,
  estimatedArrivalTime: Date
): Promise<boolean> {
  try {
    const contacts = await getEmergencyContacts();
    if (contacts.length === 0) {
      return false;
    }

    const locationText = currentLocation
      ? `Current location: https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}\nCoordinates: ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`
      : 'Location: Not available';

    const message =
      `SafeRoute Safety Alert\n\n` +
      `I was expected to arrive at ${destinationName} by ${estimatedArrivalTime.toLocaleTimeString()}, but I haven't arrived yet and didn't respond to the safety check-in.\n\n` +
      `${locationText}\n\n` +
      `Please check on me if you don't hear from me soon.`;

    const phoneNumbers = contacts.map((c) => c.phone.replace(/\D/g, ''));

    // Send SMS to each emergency contact
    for (const phone of phoneNumbers) {
      const smsUrl =
        Platform.OS === 'ios'
          ? `sms:${phone}&body=${encodeURIComponent(message)}`
          : `sms:${phone}?body=${encodeURIComponent(message)}`;
      try {
        await Linking.openURL(smsUrl);
        // Small delay between messages
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error sending SMS to ${phone}:`, error);
      }
    }

    return true;
  } catch (error) {
    console.error('Error sending safety alert:', error);
    return false;
  }
}

/**
 * Start monitoring for safety check-in.
 * @param estimatedDurationSeconds Estimated travel time in seconds
 * @param destination Destination coordinates
 * @param destinationName Name of destination
 * @param onCheckInRequired Callback when check-in is required
 */
export function startSafetyMonitoring(
  estimatedDurationSeconds: number,
  destination: { latitude: number; longitude: number },
  destinationName: string,
  onCheckInRequired: () => void
): void {
  // Clear any existing timer
  stopSafetyMonitoring();

  const startTime = Date.now();
  const estimatedArrivalTime = new Date(startTime + estimatedDurationSeconds * 1000);

  // Set timer to check after estimated time + 2 minute buffer
  const checkTime = estimatedDurationSeconds * 1000 + 120000; // Add 2 minute buffer

  checkInTimer = setTimeout(async () => {
    // Check if user has arrived
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const hasArrived = await checkIfArrived(
          {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          },
          destination
        );

        if (hasArrived) {
          // User has arrived, no check-in needed
          return;
        }
      }
    } catch (error) {
      console.error('Error checking arrival:', error);
    }

    // User hasn't arrived, trigger check-in
    onCheckInRequired();
  }, checkTime);
}

/**
 * Stop safety monitoring.
 */
export function stopSafetyMonitoring(): void {
  if (checkInTimer) {
    clearTimeout(checkInTimer);
    checkInTimer = null;
  }
}
