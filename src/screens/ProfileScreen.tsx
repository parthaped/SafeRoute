import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PersonIcon, PhoneIcon } from '../components/icons/Icons';
import { Card, Button } from '../components';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSizes, fontWeights } from '../theme/typography';
import { getUserProfile, saveUserProfile, type EmergencyContact, type UserProfile } from '../services/storage';
import { scanOrSelectID } from '../services/idScanner';
import { uploadOrSelectProfilePhoto } from '../services/profilePhoto';
import { pickPhoneContact } from '../services/contacts';

type RootStackParamList = {
  Main: undefined;
  TermsOfUse: undefined;
  PrivacyPolicy: undefined;
};

type ProfileNav = NativeStackNavigationProp<RootStackParamList>;

const RUPD_PHONE = '8489326512';
const EMERGENCY_911 = '911';

function openPhone(phone: string) {
  Linking.openURL(`tel:${phone}`).catch(() =>
    Alert.alert('Cannot call', `Call ${phone} from your phone.`)
  );
}

type RowProps = {
  label: string;
  subtitle?: string;
  onPress?: () => void;
  editable?: boolean;
};

function Row({ label, subtitle, onPress, editable }: RowProps) {
  const content = (
    <View style={styles.rowContent}>
      <Text style={styles.rowLabel}>{label}</Text>
      {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
    </View>
  );
  if (onPress || editable) {
    return (
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return <View style={styles.row}>{content}</View>;
}

type EditContactModalProps = {
  visible: boolean;
  contact: EmergencyContact | null;
  onSave: (contact: EmergencyContact) => void;
  onCancel: () => void;
  onDelete?: () => void;
};

function EditContactModal({ visible, contact, onSave, onCancel, onDelete }: EditContactModalProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setPhone(contact.phone);
      setRelationship(contact.relationship);
    } else {
      setName('');
      setPhone('');
      setRelationship('');
    }
  }, [contact, visible]);

  const handleSave = () => {
    if (!name.trim() || !phone.trim() || !relationship.trim()) {
      Alert.alert('Missing information', 'Please fill in all fields.');
      return;
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      Alert.alert('Invalid phone', 'Please enter a valid phone number.');
      return;
    }

    onSave({
      id: contact?.id || Date.now().toString(),
      name: name.trim(),
      phone: phoneDigits,
      relationship: relationship.trim(),
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : 0}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {contact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
          </Text>

          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Contact name"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="(848) 555-1234"
            keyboardType="phone-pad"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={styles.inputLabel}>Relationship</Text>
          <TextInput
            style={styles.input}
            value={relationship}
            onChangeText={setRelationship}
            placeholder="e.g., Parent, Friend, Roommate"
            placeholderTextColor={colors.textTertiary}
          />

          <View style={styles.modalButtons}>
            {contact && onDelete && (
              <Button
                title="Delete"
                onPress={() => {
                  Alert.alert(
                    'Delete contact',
                    'Are you sure you want to delete this contact?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => {
                          onDelete();
                          onCancel();
                        },
                      },
                    ]
                  );
                }}
                variant="secondary"
                style={styles.modalButton}
              />
            )}
            <Button
              title="Cancel"
              onPress={onCancel}
              variant="secondary"
              style={styles.modalButton}
            />
            <Button
              title="Save"
              onPress={handleSave}
              variant="primary"
              style={styles.modalButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNav>();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile>({ emergencyContacts: [] });
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingField, setEditingField] = useState<'classYear' | 'location' | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [showIDModal, setShowIDModal] = useState(false);
  const [showMedicalInsuranceModal, setShowMedicalInsuranceModal] = useState(false);
  const [showDriversInsuranceModal, setShowDriversInsuranceModal] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const data = await getUserProfile();
    if (data) {
      setProfile(data);
    }
  };

  const saveProfile = async (updatedProfile: UserProfile) => {
    const saved = await saveUserProfile(updatedProfile);
    if (saved) {
      setProfile(updatedProfile);
    } else {
      Alert.alert('Error', 'Could not save profile. Please try again.');
    }
  };

  const handleEditClassYear = () => {
    setShowYearPicker(true);
  };

  const handleEditLocation = () => {
    setTempValue(profile.location || '');
    setEditingField('location');
  };

  const handleSaveField = () => {
    if (editingField === 'location') {
      saveProfile({ ...profile, location: tempValue.trim() || undefined });
    }
    setEditingField(null);
    setTempValue('');
  };

  const handleSelectYear = (year: string) => {
    saveProfile({ ...profile, classYear: year });
    setShowYearPicker(false);
  };

  // Generate years from current year to 10 years in the future
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => (currentYear + i).toString());

  const handleAddContact = () => {
    setEditingContact(null);
    setShowContactModal(true);
  };

  const handleAddContactFromPhone = async () => {
    const picked = await pickPhoneContact();
    if (!picked) return;
    const temp: EmergencyContact = {
      id: picked.id,
      name: picked.name,
      phone: picked.phone,
      relationship: '',
    };
    setEditingContact(temp);
    setShowContactModal(true);
  };

  const handleEditContact = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setShowContactModal(true);
  };

  const handleSaveContact = (contact: EmergencyContact) => {
    const contacts = [...profile.emergencyContacts];
    const index = contacts.findIndex((c) => c.id === contact.id);
    if (index >= 0) {
      contacts[index] = contact;
    } else {
      contacts.push(contact);
    }
    saveProfile({ ...profile, emergencyContacts: contacts });
    setShowContactModal(false);
    setEditingContact(null);
  };

  const handleDeleteContact = () => {
    if (editingContact) {
      const contacts = profile.emergencyContacts.filter((c) => c.id !== editingContact.id);
      saveProfile({ ...profile, emergencyContacts: contacts });
    }
  };

  const handleScanID = async () => {
    const uri = await scanOrSelectID();
    if (uri) {
      saveProfile({ ...profile, idImageUri: uri });
    }
  };

  const handleViewID = () => {
    if (profile.idImageUri) {
      setShowIDModal(true);
    }
  };

  const handleDeleteID = () => {
    Alert.alert(
      'Delete ID',
      'Are you sure you want to delete your scanned ID?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            saveProfile({ ...profile, idImageUri: undefined });
          },
        },
      ]
    );
  };

  const handleScanMedicalInsurance = async () => {
    const uri = await scanOrSelectID();
    if (uri) {
      saveProfile({ ...profile, medicalInsuranceUri: uri });
    }
  };

  const handleViewMedicalInsurance = () => {
    if (profile.medicalInsuranceUri) {
      setShowMedicalInsuranceModal(true);
    }
  };

  const handleDeleteMedicalInsurance = () => {
    Alert.alert(
      'Delete Medical Insurance',
      'Are you sure you want to delete your scanned medical insurance card?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            saveProfile({ ...profile, medicalInsuranceUri: undefined });
          },
        },
      ]
    );
  };

  const handleScanDriversInsurance = async () => {
    const uri = await scanOrSelectID();
    if (uri) {
      saveProfile({ ...profile, driversInsuranceUri: uri });
    }
  };

  const handleViewDriversInsurance = () => {
    if (profile.driversInsuranceUri) {
      setShowDriversInsuranceModal(true);
    }
  };

  const handleDeleteDriversInsurance = () => {
    Alert.alert(
      'Delete Driver\'s Insurance',
      'Are you sure you want to delete your scanned driver\'s insurance card?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            saveProfile({ ...profile, driversInsuranceUri: undefined });
          },
        },
      ]
    );
  };

  const handleUploadProfilePhoto = async () => {
    const uri = await uploadOrSelectProfilePhoto();
    if (uri) {
      saveProfile({ ...profile, profilePhotoUri: uri });
    }
  };

  const handleViewProfilePhoto = () => {
    if (profile.profilePhotoUri) {
      setShowProfilePhotoModal(true);
    }
  };

  const handleDeleteProfilePhoto = () => {
    Alert.alert(
      'Delete Profile Photo',
      'Are you sure you want to delete your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            saveProfile({ ...profile, profilePhotoUri: undefined });
          },
        },
      ]
    );
  };

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign out',
      'In production this would sign you out. Continue?',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: () => {} }]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatar}
            onPress={profile.profilePhotoUri ? handleViewProfilePhoto : handleUploadProfilePhoto}
            activeOpacity={0.8}
          >
            {profile.profilePhotoUri ? (
              <Image
                source={{ uri: profile.profilePhotoUri }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <PersonIcon color={colors.primaryRed} />
            )}
            {profile.profilePhotoUri && (
              <View style={styles.avatarOverlay}>
                <Text style={styles.avatarOverlayText}>Tap to view</Text>
              </View>
            )}
          </TouchableOpacity>
          {profile.profilePhotoUri && (
            <TouchableOpacity
              style={styles.changePhotoButton}
              onPress={handleUploadProfilePhoto}
              activeOpacity={0.7}
            >
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>SafeRoute user · Rutgers NB</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <Card useBlur intensity={50} style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={handleEditClassYear} activeOpacity={0.7}>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Class Year</Text>
                <Text style={styles.rowSubtitle}>
                  {profile.classYear || 'Tap to add'}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.row} onPress={handleEditLocation} activeOpacity={0.7}>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Where I Live</Text>
                <Text style={styles.rowSubtitle}>
                  {profile.location || 'Tap to add'}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity
              style={styles.row}
              onPress={profile.idImageUri ? handleViewID : handleScanID}
              activeOpacity={0.7}
            >
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Photo ID</Text>
                <Text style={styles.rowSubtitle}>
                  {profile.idImageUri ? 'Tap to view' : 'Tap to scan'}
                </Text>
              </View>
              {profile.idImageUri && (
                <View style={styles.idThumbnail}>
                  <Image source={{ uri: profile.idImageUri }} style={styles.idThumbnailImage} />
                </View>
              )}
            </TouchableOpacity>
            {profile.idImageUri && (
              <>
                <View style={styles.separator} />
                <TouchableOpacity style={styles.row} onPress={handleScanID} activeOpacity={0.7}>
                  <Text style={styles.replaceIDText}>Replace ID</Text>
                </TouchableOpacity>
                <View style={styles.separator} />
                <TouchableOpacity style={styles.row} onPress={handleDeleteID} activeOpacity={0.7}>
                  <Text style={styles.deleteIDText}>Delete ID</Text>
                </TouchableOpacity>
              </>
            )}
            <View style={styles.separator} />
            <TouchableOpacity
              style={styles.row}
              onPress={profile.medicalInsuranceUri ? handleViewMedicalInsurance : handleScanMedicalInsurance}
              activeOpacity={0.7}
            >
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Medical Insurance</Text>
                <Text style={styles.rowSubtitle}>
                  {profile.medicalInsuranceUri ? 'Tap to view' : 'Tap to scan'}
                </Text>
              </View>
              {profile.medicalInsuranceUri && (
                <View style={styles.idThumbnail}>
                  <Image source={{ uri: profile.medicalInsuranceUri }} style={styles.idThumbnailImage} />
                </View>
              )}
            </TouchableOpacity>
            {profile.medicalInsuranceUri && (
              <>
                <View style={styles.separator} />
                <TouchableOpacity style={styles.row} onPress={handleScanMedicalInsurance} activeOpacity={0.7}>
                  <Text style={styles.replaceIDText}>Replace Medical Insurance</Text>
                </TouchableOpacity>
                <View style={styles.separator} />
                <TouchableOpacity style={styles.row} onPress={handleDeleteMedicalInsurance} activeOpacity={0.7}>
                  <Text style={styles.deleteIDText}>Delete Medical Insurance</Text>
                </TouchableOpacity>
              </>
            )}
            <View style={styles.separator} />
            <TouchableOpacity
              style={styles.row}
              onPress={profile.driversInsuranceUri ? handleViewDriversInsurance : handleScanDriversInsurance}
              activeOpacity={0.7}
            >
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Driver's Insurance</Text>
                <Text style={styles.rowSubtitle}>
                  {profile.driversInsuranceUri ? 'Tap to view' : 'Tap to scan'}
                </Text>
              </View>
              {profile.driversInsuranceUri && (
                <View style={styles.idThumbnail}>
                  <Image source={{ uri: profile.driversInsuranceUri }} style={styles.idThumbnailImage} />
                </View>
              )}
            </TouchableOpacity>
            {profile.driversInsuranceUri && (
              <>
                <View style={styles.separator} />
                <TouchableOpacity style={styles.row} onPress={handleScanDriversInsurance} activeOpacity={0.7}>
                  <Text style={styles.replaceIDText}>Replace Driver's Insurance</Text>
                </TouchableOpacity>
                <View style={styles.separator} />
                <TouchableOpacity style={styles.row} onPress={handleDeleteDriversInsurance} activeOpacity={0.7}>
                  <Text style={styles.deleteIDText}>Delete Driver's Insurance</Text>
                </TouchableOpacity>
              </>
            )}
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          <Card useBlur intensity={50} style={styles.card}>
            {profile.emergencyContacts.length === 0 ? (
              <View style={styles.row}>
                <Text style={styles.rowSubtitle}>No emergency contacts added</Text>
              </View>
            ) : (
              profile.emergencyContacts.map((contact, index) => (
                <React.Fragment key={contact.id}>
                  {index > 0 && <View style={styles.separator} />}
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => handleEditContact(contact)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.rowContent}>
                      <Text style={styles.rowLabel}>{contact.name}</Text>
                      <Text style={styles.rowSubtitle}>
                        {formatPhone(contact.phone)} · {contact.relationship}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </React.Fragment>
              ))
            )}
            <View style={styles.separator} />
            <TouchableOpacity style={styles.row} onPress={handleAddContact} activeOpacity={0.7}>
              <Text style={styles.addContactText}>+ Add Emergency Contact</Text>
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.row} onPress={handleAddContactFromPhone} activeOpacity={0.7}>
              <Text style={styles.addContactFromPhoneText}>+ Add from phone</Text>
            </TouchableOpacity>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency</Text>
          <Card useBlur intensity={50} style={styles.card}>
            <Row
              label="RUPD"
              subtitle="(848) 932-6512"
              onPress={() => openPhone(RUPD_PHONE)}
            />
            <View style={styles.separator} />
            <Row
              label="911"
              subtitle="Emergency"
              onPress={() => openPhone(EMERGENCY_911)}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <Card useBlur intensity={50} style={styles.card}>
            <Row label="Notifications" subtitle="Alerts and quiet hours" onPress={() => {}} />
            <View style={styles.separator} />
            <Row label="Share location by default" subtitle="When starting a route" onPress={() => {}} />
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Card useBlur intensity={50} style={styles.card}>
            <Row label="SafeRoute" subtitle="v1.0.0" />
            <View style={styles.separator} />
            <Row label="Privacy policy" onPress={() => navigation.navigate('PrivacyPolicy')} />
            <View style={styles.separator} />
            <Row label="Terms of use" onPress={() => navigation.navigate('TermsOfUse')} />
          </Card>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <View style={styles.footer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Year Picker Modal */}
      <Modal visible={showYearPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Class Year</Text>
            <ScrollView style={styles.yearPickerContainer} showsVerticalScrollIndicator={true}>
              {years.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.yearOption,
                    profile.classYear === year && styles.yearOptionSelected,
                  ]}
                  onPress={() => handleSelectYear(year)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.yearOptionText,
                      profile.classYear === year && styles.yearOptionTextSelected,
                    ]}
                  >
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => setShowYearPicker(false)}
                variant="secondary"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Field Modal */}
      <Modal visible={editingField !== null} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : 0}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Location</Text>
            <TextInput
              style={styles.input}
              value={tempValue}
              onChangeText={setTempValue}
              placeholder="e.g., Livingston Apartments"
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  setEditingField(null);
                  setTempValue('');
                }}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Save"
                onPress={handleSaveField}
                variant="primary"
                style={styles.modalButton}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Contact Modal */}
      <EditContactModal
        visible={showContactModal}
        contact={editingContact}
        onSave={handleSaveContact}
        onCancel={() => {
          setShowContactModal(false);
          setEditingContact(null);
        }}
        onDelete={handleDeleteContact}
      />

      {/* ID View Modal - Full Screen */}
      <Modal visible={showIDModal} transparent animationType="fade" presentationStyle="overFullScreen">
        <SafeAreaView style={styles.idModalOverlay} edges={['top', 'bottom']}>
          <View style={styles.idModalHeader}>
            <Text style={styles.idModalTitle}>Photo ID</Text>
            <TouchableOpacity
              onPress={() => setShowIDModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          {profile.idImageUri && (
            <View style={styles.idFullImageWrapper}>
              <ScrollView
                style={styles.idFullImageScrollView}
                contentContainerStyle={styles.idFullImageContainer}
                maximumZoomScale={3}
                minimumZoomScale={1}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              >
                <Image
                  source={{ uri: profile.idImageUri }}
                  style={styles.idFullImage}
                  resizeMode="contain"
                />
              </ScrollView>
            </View>
          )}
          <View style={styles.idModalButtons}>
            <Button
              title="Replace"
              onPress={async () => {
                setShowIDModal(false);
                const uri = await scanOrSelectID();
                if (uri) {
                  saveProfile({ ...profile, idImageUri: uri });
                }
              }}
              variant="secondary"
              style={styles.idModalButton}
            />
            <Button
              title="Close"
              onPress={() => setShowIDModal(false)}
              variant="primary"
              style={styles.idModalButton}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Medical Insurance View Modal - Full Screen */}
      <Modal visible={showMedicalInsuranceModal} transparent animationType="fade" presentationStyle="overFullScreen">
        <SafeAreaView style={styles.idModalOverlay} edges={['top', 'bottom']}>
          <View style={styles.idModalHeader}>
            <Text style={styles.idModalTitle}>Medical Insurance</Text>
            <TouchableOpacity
              onPress={() => setShowMedicalInsuranceModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          {profile.medicalInsuranceUri && (
            <View style={styles.idFullImageWrapper}>
              <ScrollView
                style={styles.idFullImageScrollView}
                contentContainerStyle={styles.idFullImageContainer}
                maximumZoomScale={3}
                minimumZoomScale={1}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              >
                <Image
                  source={{ uri: profile.medicalInsuranceUri }}
                  style={styles.idFullImage}
                  resizeMode="contain"
                />
              </ScrollView>
            </View>
          )}
          <View style={styles.idModalButtons}>
            <Button
              title="Replace"
              onPress={async () => {
                setShowMedicalInsuranceModal(false);
                const uri = await scanOrSelectID();
                if (uri) {
                  saveProfile({ ...profile, medicalInsuranceUri: uri });
                }
              }}
              variant="secondary"
              style={styles.idModalButton}
            />
            <Button
              title="Close"
              onPress={() => setShowMedicalInsuranceModal(false)}
              variant="primary"
              style={styles.idModalButton}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Driver's Insurance View Modal - Full Screen */}
      <Modal visible={showDriversInsuranceModal} transparent animationType="fade" presentationStyle="overFullScreen">
        <SafeAreaView style={styles.idModalOverlay} edges={['top', 'bottom']}>
          <View style={styles.idModalHeader}>
            <Text style={styles.idModalTitle}>Driver's Insurance</Text>
            <TouchableOpacity
              onPress={() => setShowDriversInsuranceModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          {profile.driversInsuranceUri && (
            <View style={styles.idFullImageWrapper}>
              <ScrollView
                style={styles.idFullImageScrollView}
                contentContainerStyle={styles.idFullImageContainer}
                maximumZoomScale={3}
                minimumZoomScale={1}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              >
                <Image
                  source={{ uri: profile.driversInsuranceUri }}
                  style={styles.idFullImage}
                  resizeMode="contain"
                />
              </ScrollView>
            </View>
          )}
          <View style={styles.idModalButtons}>
            <Button
              title="Replace"
              onPress={async () => {
                setShowDriversInsuranceModal(false);
                const uri = await scanOrSelectID();
                if (uri) {
                  saveProfile({ ...profile, driversInsuranceUri: uri });
                }
              }}
              variant="secondary"
              style={styles.idModalButton}
            />
            <Button
              title="Close"
              onPress={() => setShowDriversInsuranceModal(false)}
              variant="primary"
              style={styles.idModalButton}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Profile Photo View Modal - Full Screen */}
      <Modal visible={showProfilePhotoModal} transparent animationType="fade" presentationStyle="overFullScreen">
        <SafeAreaView style={styles.idModalOverlay} edges={['top', 'bottom']}>
          <View style={styles.idModalHeader}>
            <Text style={styles.idModalTitle}>Profile Photo</Text>
            <TouchableOpacity
              onPress={() => setShowProfilePhotoModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          {profile.profilePhotoUri && (
            <View style={styles.profilePhotoWrapper}>
              <ScrollView
                style={styles.profilePhotoScrollView}
                contentContainerStyle={styles.profilePhotoContainer}
                maximumZoomScale={3}
                minimumZoomScale={1}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              >
                <Image
                  source={{ uri: profile.profilePhotoUri }}
                  style={styles.profilePhotoImage}
                  resizeMode="contain"
                />
              </ScrollView>
            </View>
          )}
          <View style={styles.idModalButtons}>
            <Button
              title="Replace"
              onPress={async () => {
                setShowProfilePhotoModal(false);
                const uri = await uploadOrSelectProfilePhoto();
                if (uri) {
                  saveProfile({ ...profile, profilePhotoUri: uri });
                }
              }}
              variant="secondary"
              style={styles.idModalButton}
            />
            <Button
              title="Delete"
              onPress={() => {
                setShowProfilePhotoModal(false);
                handleDeleteProfilePhoto();
              }}
              variant="secondary"
              style={styles.idModalButton}
            />
            <Button
              title="Close"
              onPress={() => setShowProfilePhotoModal(false)}
              variant="primary"
              style={styles.idModalButton}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: colors.primaryRed,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  avatarOverlayText: {
    fontSize: fontSizes.caption,
    color: colors.white,
    fontWeight: fontWeights.medium,
  },
  changePhotoButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  changePhotoText: {
    fontSize: fontSizes.footnote,
    color: colors.primaryRed,
    fontWeight: fontWeights.medium,
  },
  title: {
    fontSize: fontSizes.title2,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    overflow: 'hidden',
  },
  row: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addContactText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.primaryRed,
  },
  addContactFromPhoneText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg,
  },
  signOutButton: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  signOutText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    color: colors.primaryRed,
  },
  footer: {
    height: spacing.xxxl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: spacing.lg,
    borderTopRightRadius: spacing.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  modalTitle: {
    fontSize: fontSizes.title3,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  inputLabel: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.md,
    padding: spacing.md,
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  modalButton: {
    flex: 1,
  },
  idThumbnail: {
    width: 50,
    height: 32,
    borderRadius: spacing.xs,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  idThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  replaceIDText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.primaryRed,
  },
  deleteIDText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.primaryRed,
  },
  idModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.98)',
    paddingHorizontal: spacing.lg,
  },
  idFullImageWrapper: {
    flex: 1,
    marginVertical: spacing.md,
  },
  idModalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.lg,
    padding: spacing.xl,
  },
  idModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  idFullImageScrollView: {
    flex: 1,
  },
  idFullImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
  },
  profilePhotoWrapper: {
    flex: 1,
    marginVertical: spacing.md,
  },
  profilePhotoScrollView: {
    flex: 1,
  },
  profilePhotoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
  },
  profilePhotoImage: {
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
    borderRadius: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  idModalTitle: {
    fontSize: fontSizes.title3,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: fontSizes.title3,
    color: colors.textPrimary,
    fontWeight: fontWeights.bold,
  },
  idFullImage: {
    width: '100%',
    maxWidth: '100%',
    height: undefined,
    aspectRatio: 1.6, // ID card aspect ratio
    borderRadius: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  idModalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  yearPickerContainer: {
    maxHeight: 300,
    marginVertical: spacing.md,
  },
  yearOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.sm,
    marginVertical: 2,
  },
  yearOptionSelected: {
    backgroundColor: colors.primaryRed + '20',
  },
  yearOptionText: {
    fontSize: fontSizes.body,
    color: colors.textPrimary,
  },
  yearOptionTextSelected: {
    color: colors.primaryRed,
    fontWeight: fontWeights.semibold,
  },
  idModalButton: {
    flex: 1,
  },
});
