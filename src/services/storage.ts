/**
 * Simple storage service for user profile data.
 * In production, use AsyncStorage or a proper database.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  PROFILE: '@saferoute:profile',
  EMERGENCY_CONTACTS: '@saferoute:emergency_contacts',
} as const;

export type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
  relationship: string; // e.g., "Parent", "Friend", "Roommate"
};

export type UserProfile = {
  classYear?: string;
  location?: string; // Where they live
  emergencyContacts: EmergencyContact[];
  idImageUri?: string; // URI of scanned photo ID image
  medicalInsuranceUri?: string; // URI of scanned medical insurance card image
  driversInsuranceUri?: string; // URI of scanned driver's insurance card image
  profilePhotoUri?: string; // URI of user's profile photo
};

/**
 * Get user profile from storage.
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
    if (data) {
      return JSON.parse(data);
    }
    return {
      emergencyContacts: [],
    };
  } catch {
    return {
      emergencyContacts: [],
    };
  }
}

/**
 * Save user profile to storage.
 */
export async function saveUserProfile(profile: UserProfile): Promise<boolean> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get emergency contacts.
 */
export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  const profile = await getUserProfile();
  return profile?.emergencyContacts || [];
}

/**
 * Save emergency contacts.
 */
export async function saveEmergencyContacts(contacts: EmergencyContact[]): Promise<boolean> {
  const profile = await getUserProfile();
  if (profile) {
    profile.emergencyContacts = contacts;
    return await saveUserProfile(profile);
  }
  return await saveUserProfile({ emergencyContacts: contacts });
}
