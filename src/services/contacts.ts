/**
 * Device contacts — pick from phone for SOS / share location.
 */
import * as Contacts from 'expo-contacts';
import { Alert } from 'react-native';
import type { SOSRecipient } from './locationShare';

/**
 * Request contacts permission and present the native contact picker.
 * Returns one contact as SOSRecipient (first phone number) or null if denied/cancelled.
 */
export async function pickPhoneContact(): Promise<SOSRecipient | null> {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Contacts access',
        'SafeRoute needs access to contacts so you can choose who to send your location to in an emergency. You can enable it in Settings.'
      );
      return null;
    }

    const contact = await Contacts.presentContactPickerAsync();
    if (!contact?.phoneNumbers?.length) {
      return null;
    }

    const first = contact.phoneNumbers[0];
    const number = first?.number ?? first?.digits ?? '';
    const digits = number.replace(/\D/g, '');
    if (!digits) return null;

    // Sync name from device: full name, or firstName + lastName
    const name =
      contact.name?.trim() ||
      [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() ||
      'Unknown';
    const id = `phone-${digits}-${Date.now()}`;

    return {
      id,
      name,
      phone: number,
      relationship: undefined,
    };
  } catch (error) {
    console.warn('Contact picker error:', error);
    return null;
  }
}
