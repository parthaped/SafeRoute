import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Switch, Linking, Alert, Modal, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Button, IconButton, SafeRouteLogo, HiddenCameraView } from '../components';
import {
  PhoneIcon,
  BellIcon,
  CommentIcon,
  FlashlightIcon,
  LocationIcon,
  EscortIcon,
  BellSlashIcon,
  MicrophoneIcon,
} from '../components/icons/Icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { fontSizes, fontWeights, letterSpacing } from '../theme/typography';
import type { TabParamList } from '../navigation/types';
import { toggleFlashlight } from '../services/flashlight';
import {
  shareCurrentLocation,
  shareCurrentLocationToContact,
  shareCurrentLocationToRecipients,
  type SOSRecipient,
} from '../services/locationShare';
import { pickPhoneContact } from '../services/contacts';
import { getEmergencyContacts, type EmergencyContact } from '../services/storage';
import {
  startRecording,
  stopRecording,
  getIsRecording,
  cancelRecording,
  sendIncidentReport,
  type IncidentType,
  CRIME_TYPES,
} from '../services/incidentReporting';
import {
  loadQuietMode,
  setQuietMode,
  subscribeToQuietMode,
  getQuietModePromptDismissedForever,
  setQuietModePromptDismissedForever,
} from '../services/quietMode';
import { submitEscortRequest } from '../services/escortRequest';

const RUPD_PHONE = '8489326512';
/** RUPD escort — request walking escort (https://ipo.rutgers.edu/publicsafety/rupd/escorts) */
const RUPD_ESCORT_PHONE = '7329327211';

type RootStackParamList = {
  Main: undefined;
  Community: undefined;
  TermsOfUse: undefined;
  PrivacyPolicy: undefined;
};

type HomeNav = BottomTabNavigationProp<TabParamList, 'Safety'> & NativeStackNavigationProp<RootStackParamList>;

type HomeScreenProps = {
  onStartRoute?: () => void;
  quietMode?: boolean;
  onQuietModeChange?: (value: boolean) => void;
};

export function HomeScreen({
  onStartRoute,
  quietMode: quietModeProp,
  onQuietModeChange,
}: HomeScreenProps) {
  const navigation = useNavigation<HomeNav>();
  const insets = useSafeAreaInsets();
  const [quietMode, setQuietModeState] = useState(quietModeProp ?? true);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [incidentType, setIncidentType] = useState<IncidentType>('self');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [selectedCrimeType, setSelectedCrimeType] = useState<string>('');
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showShareLocationModal, setShowShareLocationModal] = useState(false);
  const [shareContacts, setShareContacts] = useState<EmergencyContact[]>([]);
  const [selectedShareContact, setSelectedShareContact] = useState<EmergencyContact | null>(null);
  const [shareDurationMinutes, setShareDurationMinutes] = useState(30);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [sosRecipients, setSosRecipients] = useState<SOSRecipient[]>([]);
  const [isSendingSOS, setIsSendingSOS] = useState(false);
  const [showWalkWithMeModal, setShowWalkWithMeModal] = useState(false);
  const [walkWithMeContacts, setWalkWithMeContacts] = useState<SOSRecipient[]>([]);
  const [isSendingWalkWithMe, setIsSendingWalkWithMe] = useState(false);
  const [showEscortFormModal, setShowEscortFormModal] = useState(false);
  const [escortReason, setEscortReason] = useState('');
  const [escortPriority, setEscortPriority] = useState<'normal' | 'urgent'>('normal');
  const [isSubmittingEscort, setIsSubmittingEscort] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  const [reportDescStep, setReportDescStep] = useState(false);
  const reportScrollRef = useRef<ScrollView>(null);

  const handleStartRoute = () => {
    if (onStartRoute) {
      onStartRoute();
    } else {
      navigation.navigate('Route', { openDestination: true });
    }
  };

  const handleCallRUPD = () => {
    Linking.openURL(`tel:${RUPD_PHONE}`).catch(() =>
      Alert.alert('Cannot call', 'Opening phone failed. Call RUPD at (848) 932-6512.')
    );
  };

  const handleRequestEscort = () => {
    Alert.alert(
      'Request Escort',
      'Choose how you’d like to get an escort: ask someone you know to walk with you, or call RUPD for an official campus escort.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request RUPD escort via app',
          onPress: () => {
            setEscortReason('');
            setEscortPriority('normal');
            setShowEscortFormModal(true);
          },
        },
        {
          text: 'Ask someone to walk with me',
          onPress: async () => {
            const contacts = await getEmergencyContacts();
            const initial: SOSRecipient[] = contacts.map((c) => ({
              id: c.id,
              name: c.name,
              phone: c.phone,
              relationship: c.relationship,
            }));
            setWalkWithMeContacts(initial);
            setShowWalkWithMeModal(true);
          },
        },
        {
          text: 'Call RUPD',
          onPress: () =>
            Linking.openURL(`tel:${RUPD_ESCORT_PHONE}`).catch(() =>
              Alert.alert('Cannot call', 'Call RUPD at (732) 932-7211 to request an escort.')
            ),
        },
      ]
    );
  };

  const handleSubmitEscortRequest = async () => {
    if (!escortReason.trim()) {
      Alert.alert('Reason required', 'Please tell the officer why you need an escort.');
      return;
    }
    setIsSubmittingEscort(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required to request an escort.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      await submitEscortRequest({
        userId: `user-${Date.now().toString(36)}`,
        userName: 'SafeRoute User',
        userPhone: '',
        origin: { lat: latitude, lng: longitude, name: 'Current Location' },
        destination: { lat: latitude, lng: longitude, name: 'Nearby' },
        currentLocation: { lat: latitude, lng: longitude },
        routeLabel: 'Escort from current location',
        priority: escortPriority,
        reason: escortReason.trim(),
      });

      setShowEscortFormModal(false);
      Alert.alert(
        'Escort Requested',
        'Your request has been sent to RUPD dispatch. An officer will be assigned shortly. Stay where you are if possible.',
        [{ text: 'OK' }]
      );
    } catch {
      Alert.alert('Error', 'Could not submit request. Try calling RUPD at (732) 932-7211.');
    } finally {
      setIsSubmittingEscort(false);
    }
  };

  const handleCloseWalkWithMeModal = () => {
    setShowWalkWithMeModal(false);
    setWalkWithMeContacts([]);
  };

  const handleAddWalkWithMeFromPhone = async () => {
    const picked = await pickPhoneContact();
    if (!picked) return;
    const normalized = picked.phone.replace(/\D/g, '');
    const already = walkWithMeContacts.some((r) => r.phone.replace(/\D/g, '') === normalized);
    if (already) return;
    setWalkWithMeContacts((prev) => [...prev, picked]);
  };

  const handleSendWalkWithMeToContact = async (contact: SOSRecipient) => {
    setIsSendingWalkWithMe(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required to include your location in the message.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = location.coords;
      const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      const message =
        `Hey, can you walk with me? Here’s where I am:\n${mapsUrl}\n\n- Sent from SafeRoute`;
      const phone = contact.phone.replace(/\D/g, '');
      const smsUrl =
        Platform.OS === 'ios'
          ? `sms:${phone}&body=${encodeURIComponent(message)}`
          : `sms:${phone}?body=${encodeURIComponent(message)}`;
      await Linking.openURL(smsUrl);
      handleCloseWalkWithMeModal();
    } catch {
      Alert.alert('Error', 'Could not open messages. Please try again.');
    } finally {
      setIsSendingWalkWithMe(false);
    }
  };

  const handleSOS = async () => {
    const emergency = await getEmergencyContacts();
    const initial: SOSRecipient[] = emergency.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      relationship: c.relationship,
    }));
    setSosRecipients(initial);
    setShowSOSModal(true);
  };

  const handleCloseSOSModal = () => {
    setShowSOSModal(false);
    setSosRecipients([]);
  };

  const handleAddSOSFromPhone = async () => {
    const picked = await pickPhoneContact();
    if (!picked) return;
    const normalized = picked.phone.replace(/\D/g, '');
    const already = sosRecipients.some((r) => r.phone.replace(/\D/g, '') === normalized);
    if (already) return;
    setSosRecipients((prev) => [...prev, picked]);
  };

  const handleRemoveSOSRecipient = (id: string) => {
    setSosRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSendSOS = async () => {
    if (sosRecipients.length === 0) {
      Alert.alert('No contacts', 'Add at least one contact (emergency or from phone) to send your location.');
      return;
    }
    setIsSendingSOS(true);
    try {
      const ok = await shareCurrentLocationToRecipients(sosRecipients);
      handleCloseSOSModal();
      if (ok) {
        Alert.alert(
          'SOS',
          'Your location is being shared with the selected contacts. Complete sending in your messaging app. Call RUPD at 848-932-6512 if needed.',
          [
            { text: 'Call RUPD', onPress: () => Linking.openURL(`tel:${RUPD_PHONE}`) },
            { text: 'OK' },
          ]
        );
      } else {
        Alert.alert(
          'SOS',
          'Could not share location. Please call RUPD at 848-932-6512.',
          [
            { text: 'Call RUPD', onPress: () => Linking.openURL(`tel:${RUPD_PHONE}`) },
            { text: 'OK' },
          ]
        );
      }
    } finally {
      setIsSendingSOS(false);
    }
  };

  const handleCommunity = () => {
    navigation.navigate('Community');
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: { endCoordinates: { height: number } }) => {
      setKbHeight(e.endCoordinates.height);
      setTimeout(() => reportScrollRef.current?.scrollToEnd({ animated: true }), 100);
    };
    const onHide = () => setKbHeight(0);
    const sub1 = Keyboard.addListener(showEvent, onShow);
    const sub2 = Keyboard.addListener(hideEvent, onHide);
    return () => { sub1.remove(); sub2.remove(); };
  }, []);

  // Load quiet mode on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadQuietMode();
      if (!cancelled) {
        setQuietModeState(stored);
        onQuietModeChange?.(stored);
      }
    })();
    
    // Subscribe to quiet mode changes
    const unsubscribe = subscribeToQuietMode((value) => {
      if (!cancelled) {
        setQuietModeState(value);
        onQuietModeChange?.(value);
      }
    });
    
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [onQuietModeChange]);

  const handleQuietModeChange = async (value: boolean) => {
    setQuietModeState(value);
    await setQuietMode(value);
    onQuietModeChange?.(value);

    if (value) {
      const dismissedForever = await getQuietModePromptDismissedForever();
      if (!dismissedForever) {
        Alert.alert(
          'Quiet mode',
          'When Quiet mode is ON, low-priority safety alerts and route change notifications (e.g. turn reminders, arrival) are suppressed so you’re not interrupted. High-priority alerts still appear.\n\nTurn Quiet mode OFF to get all notifications and route updates.',
          [
            { text: 'OK' },
            {
              text: "Don't show again",
              onPress: () => setQuietModePromptDismissedForever(),
            },
          ]
        );
      }
    }
  };

  const handleFlashlight = async () => {
    await toggleFlashlight();
  };

  const handleShareLocation = async () => {
    const contacts = await getEmergencyContacts();
    if (contacts.length === 0) {
      Alert.alert(
        'No contacts',
        'Add emergency contacts in Profile first, then choose one to share your location with.',
        [
          { text: 'OK' },
          {
            text: 'Go to Profile',
            onPress: () => navigation.navigate('Profile'),
          },
        ]
      );
      return;
    }
    setShareContacts(contacts);
    setSelectedShareContact(contacts[0]);
    setShareDurationMinutes(30);
    setShowShareLocationModal(true);
  };

  const handleCloseShareLocationModal = () => {
    setShowShareLocationModal(false);
    setSelectedShareContact(null);
  };

  const DURATION_OPTIONS = [15, 30, 60, 120] as const;

  const handleConfirmShareLocation = async () => {
    if (!selectedShareContact) return;
    setIsSharingLocation(true);
    try {
      const ok = await shareCurrentLocationToContact(selectedShareContact, shareDurationMinutes);
      if (ok) {
        handleCloseShareLocationModal();
        Alert.alert(
          'Message ready',
          `Your location message is ready to send to ${selectedShareContact.name}. Complete sending in your messaging app. You'll get a reminder when the ${shareDurationMinutes}-minute period ends.`
        );
      }
    } finally {
      setIsSharingLocation(false);
    }
  };

  // Recording timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecordingAudio) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecordingAudio]);

  const handleStartRecord = () => {
    setShowRecordModal(true);
    setIncidentType('self');
    setIncidentDescription('');
    setAudioUri(null);
    setIsRecordingAudio(false);
    setRecordingTime(0);
  };

  const handleStartReport = () => {
    setShowReportModal(true);
    setIncidentType('self');
    setIncidentDescription('');
    setSelectedCrimeType('');
  };

  const handleStartRecording = async () => {
    const error = await startRecording();
    if (error === null) {
      setIsRecordingAudio(true);
      setRecordingTime(0);
    }
  };

  const handleStopRecording = async () => {
    const uri = await stopRecording();
    setIsRecordingAudio(false);
    if (uri) {
      setAudioUri(uri);
    }
  };

  const handleCancelRecording = async () => {
    await cancelRecording();
    setIsRecordingAudio(false);
    setRecordingTime(0);
    setAudioUri(null);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendRecord = async () => {
    if (!audioUri) {
      Alert.alert('No recording', 'Please record audio evidence before sending the report.');
      return;
    }

    setIsSending(true);
    try {
      const success = await sendIncidentReport(
        'audio',
        incidentType,
        incidentDescription.trim() || undefined,
        audioUri,
        undefined
      );
      if (success) {
        Alert.alert(
          'Report sent',
          'Your audio recording has been sent to the local police department.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowRecordModal(false);
                setAudioUri(null);
                setIncidentDescription('');
                setIsSending(false);
              },
            },
          ]
        );
      } else {
        setIsSending(false);
      }
    } catch (error) {
      setIsSending(false);
      Alert.alert('Error', 'Could not send report. Please try again.');
    }
  };

  const handleSendReport = async () => {
    if (!selectedCrimeType) {
      Alert.alert('Crime type required', 'Please select a crime type.');
      return;
    }

    setIsSending(true);
    try {
      const success = await sendIncidentReport(
        'event',
        incidentType,
        incidentDescription.trim() || undefined,
        undefined,
        selectedCrimeType
      );
      if (success) {
        Alert.alert(
          'Report sent',
          'Your incident report has been sent to the local police department.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowReportModal(false);
                setIncidentDescription('');
                setSelectedCrimeType('');
                setIsSending(false);
              },
            },
          ]
        );
      } else {
        setIsSending(false);
      }
    } catch (error) {
      setIsSending(false);
      Alert.alert('Error', 'Could not send report. Please try again.');
    }
  };

  const handleCloseRecordModal = () => {
    if (isRecordingAudio) {
      Alert.alert(
        'Recording in progress',
        'Stop recording before closing?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Stop & Close',
            style: 'destructive',
            onPress: async () => {
              await handleCancelRecording();
              setShowRecordModal(false);
              setAudioUri(null);
              setIncidentDescription('');
            },
          },
        ]
      );
    } else {
      setShowRecordModal(false);
      setAudioUri(null);
      setIncidentDescription('');
    }
  };

  const handleCloseReportModal = () => {
    setShowReportModal(false);
    setIncidentDescription('');
    setSelectedCrimeType('');
    setReportDescStep(false);
  };
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <HiddenCameraView />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SafeRouteLogo width={100} height={120} showText />

        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.primaryButtons}>
          <IconButton
            icon={<PhoneIcon />}
            label="Call RUPD"
            onPress={handleCallRUPD}
          />
          <IconButton
            icon={<BellIcon />}
            label="SOS"
            onPress={handleSOS}
          />
          <IconButton
            icon={<CommentIcon />}
            label="Community"
            onPress={handleCommunity}
          />
        </View>

        {/* Start Route Card */}
        <Card style={styles.startRouteCard} useBlur intensity={50}>
          <View style={styles.startRouteCardContent}>
            <View style={styles.startRouteCardHeader}>
              <Text style={styles.startRouteTitle}>Start Route</Text>
              <Text style={styles.startRouteSubtitle}>
                Begin a safe route monitored by RUPD
              </Text>
            </View>
            <Button
              title="START ROUTE"
              onPress={handleStartRoute}
              variant="primary"
              fullWidth
              style={styles.startRouteButton}
            />
          </View>
        </Card>

        {/* Request Escort Card */}
        <Card style={styles.escortCard} useBlur intensity={50}>
          <View style={styles.escortCardContent}>
            <View style={styles.escortCardLeft}>
              <View style={styles.escortCardIconWrap}>
                <EscortIcon color={colors.white} />
              </View>
              <View style={styles.escortCardText}>
                <Text style={styles.escortCardTitle}>Request Escort</Text>
                <Text style={styles.escortCardSubtitle}>
                  RUPD officer walks with you
                </Text>
              </View>
            </View>
            <Button
              title="REQUEST"
              onPress={handleRequestEscort}
              variant="primary"
              style={styles.escortCardButton}
            />
          </View>
        </Card>

        <Text style={styles.sectionLabel}>INCIDENT TOOLS</Text>
        {/* Report Event Card */}
        <Card style={styles.reportCard} useBlur intensity={50}>
          <View style={styles.reportCardContent}>
            <View style={styles.reportIconWrap}>
              <BellIcon color={colors.textPrimary} />
            </View>
            <View style={styles.reportCardText}>
              <Text style={styles.reportCardTitle}>Report</Text>
              <Text style={styles.reportCardSubtitle}>
                Report an incident
              </Text>
            </View>
            <Button
              title="REPORT"
              onPress={handleStartReport}
              variant="primary"
              style={styles.reportButton}
            />
          </View>
        </Card>

        {/* Record Audio Card */}
        <Card style={styles.recordCard} useBlur intensity={50}>
          <View style={styles.recordCardContent}>
            <View style={styles.reportIconWrap}>
              <MicrophoneIcon color={colors.textPrimary} />
            </View>
            <View style={styles.recordCardText}>
              <Text style={styles.recordCardTitle}>Record</Text>
              <Text style={styles.recordCardSubtitle}>
                Record audio evidence
              </Text>
            </View>
            <Button
              title="RECORD"
              onPress={handleStartRecord}
              variant="primary"
              style={styles.recordButton}
            />
          </View>
        </Card>

        <Text style={styles.sectionLabel}>TOOLS</Text>
        <View style={styles.secondaryButtons}>
          <IconButton
            icon={<FlashlightIcon />}
            label="Flashlight"
            onPress={handleFlashlight}
          />
          <IconButton
            icon={<LocationIcon />}
            label="Share Location"
            onPress={handleShareLocation}
          />
        </View>

        <View style={[styles.quietModeRow, { marginBottom: insets.bottom + spacing.lg }]}>
          <BellSlashIcon />
          <Text style={styles.quietModeLabel}>Quiet mode</Text>
          <Switch
            value={quietMode}
            onValueChange={handleQuietModeChange}
            trackColor={{ false: 'rgba(255,255,255,0.08)', true: colors.primaryRed }}
            thumbColor={colors.white}
          />
        </View>
      </ScrollView>

      {/* Record Audio Modal */}
      <Modal
        visible={showRecordModal}
        animationType="slide"
        transparent
        onRequestClose={handleCloseRecordModal}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Audio</Text>
              <TouchableOpacity onPress={handleCloseRecordModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Record audio evidence that will be sent to local police
            </Text>

            {/* Incident Type Selection */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  incidentType === 'self' && styles.typeButtonActive,
                ]}
                onPress={() => setIncidentType('self')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    incidentType === 'self' && styles.typeButtonTextActive,
                  ]}
                >
                  Happening to me
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  incidentType === 'other' && styles.typeButtonActive,
                ]}
                onPress={() => setIncidentType('other')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    incidentType === 'other' && styles.typeButtonTextActive,
                  ]}
                >
                  Happening to someone else
                </Text>
              </TouchableOpacity>
            </View>

            {/* Recording Section */}
            <View style={styles.recordingSection}>
              {isRecordingAudio ? (
                <View style={styles.recordingActive}>
                  <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingText}>Recording...</Text>
                    <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
                  </View>
                  <Button
                    title="STOP RECORDING"
                    onPress={handleStopRecording}
                    variant="primary"
                    style={styles.stopButton}
                  />
                </View>
              ) : audioUri ? (
                <View style={styles.recordingComplete}>
                  <Text style={styles.recordingCompleteText}>✓ Recording saved</Text>
                  <Text style={styles.recordingCompleteTime}>{formatTime(recordingTime)}</Text>
                  <View style={styles.recordingActions}>
                    <Button
                      title="Record Again"
                      onPress={async () => {
                        await handleCancelRecording();
                        await handleStartRecording();
                      }}
                      variant="outline"
                      style={styles.actionButton}
                    />
                    <Button
                      title="Send Report"
                      onPress={handleSendRecord}
                      variant="primary"
                      style={styles.actionButton}
                      loading={isSending}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.recordingStart}>
                  <MicrophoneIcon color={colors.primaryRed} />
                  <Text style={styles.recordingStartText}>
                    Tap to start recording audio evidence
                  </Text>
                  <Button
                    title="START RECORDING"
                    onPress={handleStartRecording}
                    variant="primary"
                    style={styles.startButton}
                  />
                </View>
              )}
            </View>

            {/* Description Input */}
            {audioUri && !isRecordingAudio && (
              <View style={styles.descriptionSection}>
                <Text style={styles.descriptionLabel}>Additional Details (Optional)</Text>
                <TextInput
                  style={styles.descriptionInput}
                  placeholder="Describe what happened..."
                  placeholderTextColor={colors.textTertiary}
                  value={incidentDescription}
                  onChangeText={setIncidentDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            )}
          </View>
        </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Report Event Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent
        onRequestClose={handleCloseReportModal}
      >
        {reportDescStep && selectedCrimeType ? (
          <View style={[styles.modalContainer, { backgroundColor: colors.surface1 }]}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
              <View style={{ flex: 1, paddingHorizontal: spacing.xxl, paddingTop: spacing.md }}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Report Incident</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity onPress={() => Keyboard.dismiss()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={{ fontSize: fontSizes.caption, fontWeight: fontWeights.semibold, color: colors.primaryRed }}>Done</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { Keyboard.dismiss(); handleCloseReportModal(); }} style={styles.closeButton}>
                      <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.crimeTypeButton, styles.crimeTypeButtonActive, { alignSelf: 'flex-start', marginBottom: spacing.md }]}
                  onPress={() => { Keyboard.dismiss(); setReportDescStep(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.crimeTypeButtonText, styles.crimeTypeButtonTextActive]}>
                    {selectedCrimeType} ✕
                  </Text>
                </TouchableOpacity>

                <Text style={styles.descriptionLabel}>Describe what happened</Text>
                <TextInput
                  style={[styles.descriptionInput, { maxHeight: 200, marginBottom: spacing.md }]}
                  placeholder="Provide details about the incident..."
                  placeholderTextColor={colors.textTertiary}
                  value={incidentDescription}
                  onChangeText={setIncidentDescription}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />

                <Button
                  title="Send Report"
                  onPress={() => { Keyboard.dismiss(); handleSendReport(); }}
                  variant="primary"
                  fullWidth
                  style={{ marginBottom: kbHeight > 0 ? kbHeight : spacing.xl }}
                  loading={isSending}
                />
              </View>
            </SafeAreaView>
          </View>
        ) : (
          <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Report Incident</Text>
                <TouchableOpacity onPress={handleCloseReportModal} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                ref={reportScrollRef}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: spacing.xl }}
              >
                <Text style={styles.modalSubtitle}>
                  Report an incident with details about what's happening
                </Text>

                {/* Incident Type Selection */}
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      incidentType === 'self' && styles.typeButtonActive,
                    ]}
                    onPress={() => setIncidentType('self')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        incidentType === 'self' && styles.typeButtonTextActive,
                      ]}
                    >
                      Happening to me
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      incidentType === 'other' && styles.typeButtonActive,
                    ]}
                    onPress={() => setIncidentType('other')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        incidentType === 'other' && styles.typeButtonTextActive,
                      ]}
                    >
                      Happening to someone else
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Crime Type Selector */}
                <View style={styles.crimeTypeSection}>
                  <Text style={styles.crimeTypeLabel}>Select Crime Type</Text>
                  <View style={styles.crimeTypeScrollContent}>
                    {CRIME_TYPES.map((crime) => (
                      <TouchableOpacity
                        key={crime}
                        style={[
                          styles.crimeTypeButton,
                          selectedCrimeType === crime && styles.crimeTypeButtonActive,
                        ]}
                        onPress={() => setSelectedCrimeType(crime)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.crimeTypeButtonText,
                            selectedCrimeType === crime && styles.crimeTypeButtonTextActive,
                          ]}
                        >
                          {crime}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Tap to describe */}
                {selectedCrimeType && (
                  <TouchableOpacity
                    style={[styles.descriptionInput, { marginTop: spacing.xl }]}
                    onPress={() => setReportDescStep(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: incidentDescription ? colors.textPrimary : colors.textTertiary, fontSize: fontSizes.caption }}>
                      {incidentDescription || 'Tap to describe what happened...'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Send Button */}
                {selectedCrimeType && (
                  <View style={styles.sendButtonContainer}>
                    <Button
                      title="Send Report"
                      onPress={handleSendReport}
                      variant="primary"
                      style={styles.sendButton}
                      loading={isSending}
                    />
                  </View>
                )}
              </ScrollView>
            </View>
          </SafeAreaView>
        )}
      </Modal>

      {/* Share Location Modal */}
      <Modal
        visible={showShareLocationModal}
        animationType="slide"
        transparent
        onRequestClose={handleCloseShareLocationModal}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share my location</Text>
              <TouchableOpacity onPress={handleCloseShareLocationModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Choose a contact and duration. A message from SafeRoute will be sent with your current location.
            </Text>

            <Text style={styles.descriptionLabel}>Contact</Text>
            <ScrollView
              style={styles.shareContactList}
              contentContainerStyle={styles.shareContactListContent}
              showsVerticalScrollIndicator={false}
            >
              {shareContacts.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.shareContactItem,
                    selectedShareContact?.id === c.id && styles.shareContactItemActive,
                  ]}
                  onPress={() => setSelectedShareContact(c)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.shareContactName,
                      selectedShareContact?.id === c.id && styles.shareContactNameActive,
                    ]}
                  >
                    {c.name}
                  </Text>
                  <Text style={styles.shareContactDetail}>{c.relationship} · {c.phone}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.descriptionLabel, { marginTop: spacing.md }]}>Duration</Text>
            <View style={styles.durationRow}>
              {DURATION_OPTIONS.map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={[
                    styles.durationChip,
                    shareDurationMinutes === mins && styles.durationChipActive,
                  ]}
                  onPress={() => setShareDurationMinutes(mins)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      shareDurationMinutes === mins && styles.durationChipTextActive,
                    ]}
                  >
                    {mins < 60 ? `${mins} min` : mins === 60 ? '1 hr' : `${mins / 60} hr`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title={isSharingLocation ? 'Opening messages…' : 'Share location'}
              onPress={handleConfirmShareLocation}
              variant="primary"
              fullWidth
              style={styles.shareConfirmButton}
              disabled={isSharingLocation || !selectedShareContact}
              loading={isSharingLocation}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Ask someone to walk with me — pregenerated message to chosen contact */}
      <Modal
        visible={showWalkWithMeModal}
        animationType="slide"
        transparent
        onRequestClose={handleCloseWalkWithMeModal}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ask someone to walk with me</Text>
              <TouchableOpacity onPress={handleCloseWalkWithMeModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Send a prewritten message with your location so they can walk with you.
            </Text>

            <ScrollView
              style={styles.sosRecipientList}
              contentContainerStyle={styles.sosRecipientListContent}
              showsVerticalScrollIndicator={false}
            >
              {walkWithMeContacts.length === 0 ? (
                <Text style={styles.walkWithMeEmpty}>
                  Add emergency contacts in Profile, or add someone from your phone below.
                </Text>
              ) : (
                walkWithMeContacts.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.walkWithMeContactItem}
                    onPress={() => handleSendWalkWithMeToContact(r)}
                    disabled={isSendingWalkWithMe}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.shareContactName}>{r.name}</Text>
                    <Text style={styles.shareContactDetail}>
                      {r.relationship ? `${r.relationship} · ` : ''}{r.phone}
                    </Text>
                    <Text style={styles.walkWithMeTapHint}>Tap to send message</Text>
                  </TouchableOpacity>
                ))
              )}
              <TouchableOpacity
                style={styles.addFromPhoneButton}
                onPress={handleAddWalkWithMeFromPhone}
                activeOpacity={0.7}
              >
                <Text style={styles.addFromPhoneButtonText}>+ Add from phone</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* SOS Modal: choose emergency + phone contacts, send current location */}
      <Modal
        visible={showSOSModal}
        animationType="slide"
        transparent
        onRequestClose={handleCloseSOSModal}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send SOS location</Text>
              <TouchableOpacity onPress={handleCloseSOSModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Your current location will be included. Choose who to send it to — emergency contacts or add anyone from your phone.
            </Text>

            <ScrollView
              style={styles.sosRecipientList}
              contentContainerStyle={styles.sosRecipientListContent}
              showsVerticalScrollIndicator={false}
            >
              {sosRecipients.map((r) => (
                <View key={r.id} style={styles.sosRecipientItem}>
                  <View style={styles.sosRecipientInfo}>
                    <Text style={styles.shareContactName}>{r.name}</Text>
                    <Text style={styles.shareContactDetail}>
                      {r.relationship ? `${r.relationship} · ` : ''}{r.phone}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveSOSRecipient(r.id)}
                    style={styles.sosRemoveButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.sosRemoveButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={handleAddSOSFromPhone}
              style={styles.addFromPhoneButton}
              activeOpacity={0.7}
            >
              <Text style={styles.addFromPhoneButtonText}>+ Add from phone</Text>
            </TouchableOpacity>

            <Button
              title={
                isSendingSOS
                  ? 'Opening messages…'
                  : sosRecipients.length === 0
                    ? 'Add at least one contact'
                    : `Send to ${sosRecipients.length} contact${sosRecipients.length === 1 ? '' : 's'}`
              }
              onPress={handleSendSOS}
              variant="primary"
              fullWidth
              style={styles.shareConfirmButton}
              disabled={isSendingSOS || sosRecipients.length === 0}
              loading={isSendingSOS}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* RUPD Escort Request Form Modal */}
      <Modal
        visible={showEscortFormModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEscortFormModal(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request RUPD Escort</Text>
              <TouchableOpacity onPress={() => setShowEscortFormModal(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              An officer will be dispatched to walk with you. Your location will be shared with RUPD dispatch.
            </Text>

            <View style={styles.escortFormSection}>
              <Text style={styles.escortFormLabel}>PRIORITY</Text>
              <View style={styles.escortPriorityRow}>
                <TouchableOpacity
                  style={[styles.escortPriorityButton, escortPriority === 'normal' && styles.escortPriorityActive]}
                  onPress={() => setEscortPriority('normal')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.escortPriorityText, escortPriority === 'normal' && styles.escortPriorityTextActive]}>Normal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.escortPriorityButton, escortPriority === 'urgent' && styles.escortPriorityUrgentActive]}
                  onPress={() => setEscortPriority('urgent')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.escortPriorityText, escortPriority === 'urgent' && styles.escortPriorityUrgentText]}>Urgent</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.escortFormSection}>
              <Text style={styles.escortFormLabel}>WHY DO YOU NEED AN ESCORT?</Text>
              <TextInput
                style={styles.escortReasonInput}
                placeholder="e.g. Walking alone late at night, street lights are out..."
                placeholderTextColor={colors.textTertiary}
                value={escortReason}
                onChangeText={setEscortReason}
                multiline
                numberOfLines={4}
                maxLength={300}
                textAlignVertical="top"
              />
            </View>

            <Button
              title={isSubmittingEscort ? 'Submitting...' : 'Submit Escort Request'}
              onPress={handleSubmitEscortRequest}
              variant="primary"
              fullWidth
              style={styles.shareConfirmButton}
              disabled={isSubmittingEscort || !escortReason.trim()}
              loading={isSubmittingEscort}
            />
          </View>
        </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: fontSizes.caption2,
    fontWeight: fontWeights.semibold,
    color: colors.textTertiary,
    letterSpacing: letterSpacing.caps,
    alignSelf: 'flex-start',
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  primaryButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    width: '100%',
  },
  startRouteCard: {
    width: '100%',
    marginTop: spacing.lg,
    borderColor: colors.primaryRed + '30',
  },
  startRouteCardContent: {
    gap: spacing.md,
  },
  startRouteCardHeader: {
    gap: spacing.xs,
  },
  startRouteTitle: {
    fontSize: fontSizes.title3,
    fontWeight: fontWeights.bold,
    color: colors.primaryRed,
    letterSpacing: letterSpacing.tight,
  },
  startRouteSubtitle: {
    fontSize: fontSizes.footnote,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  startRouteButton: {
    marginTop: spacing.xs,
  },
  escortCard: {
    width: '100%',
    marginTop: spacing.lg,
    borderColor: '#007AFF' + '30',
  },
  escortCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  escortCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  escortCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.xs,
    backgroundColor: '#007AFF' + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  escortCardText: {
    flex: 1,
  },
  escortCardTitle: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    letterSpacing: letterSpacing.tight,
  },
  escortCardSubtitle: {
    fontSize: fontSizes.footnote,
    color: colors.textSecondary,
    marginTop: 2,
  },
  escortCardButton: {
    minWidth: 90,
  },
  secondaryButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    width: '100%',
  },
  quietModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxl,
    width: '100%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quietModeLabel: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.textPrimary,
    flex: 1,
    marginLeft: spacing.sm,
  },
  recordCard: {
    width: '100%',
    marginTop: spacing.sm,
  },
  recordCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  recordCardText: {
    flex: 1,
  },
  recordCardTitle: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    letterSpacing: letterSpacing.tight,
  },
  recordCardSubtitle: {
    fontSize: fontSizes.footnote,
    color: colors.textTertiary,
    marginTop: 2,
  },
  recordButton: {
    minWidth: 100,
  },
  reportCard: {
    width: '100%',
  },
  reportCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  reportIconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.xs,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportCardText: {
    flex: 1,
  },
  reportCardTitle: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    letterSpacing: letterSpacing.tight,
  },
  reportCardSubtitle: {
    fontSize: fontSizes.footnote,
    color: colors.textTertiary,
    marginTop: 2,
  },
  reportButton: {
    minWidth: 100,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface1,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xxl,
    paddingBottom: spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSizes.title3,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    letterSpacing: letterSpacing.tight,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: fontWeights.semibold,
  },
  modalSubtitle: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 21,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: colors.primaryRed,
    backgroundColor: colors.primaryRed + '15',
  },
  typeButtonText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  typeButtonTextActive: {
    color: colors.primaryRed,
    fontWeight: fontWeights.semibold,
  },
  crimeTypeSection: {
    marginBottom: spacing.xl,
  },
  crimeTypeLabel: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  crimeTypeScroll: {
    maxHeight: 200,
  },
  crimeTypeScrollContent: {
    gap: spacing.sm,
  },
  crimeTypeButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  crimeTypeButtonActive: {
    borderColor: colors.primaryRed,
    backgroundColor: colors.primaryRed + '15',
  },
  crimeTypeButtonText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.textPrimary,
  },
  crimeTypeButtonTextActive: {
    color: colors.primaryRed,
    fontWeight: fontWeights.semibold,
  },
  sendButtonContainer: {
    marginTop: spacing.xl,
  },
  sendButton: {
    width: '100%',
  },
  recordingSection: {
    marginBottom: spacing.xl,
    minHeight: 200,
    justifyContent: 'center',
  },
  recordingStart: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  recordingStartText: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  startButton: {
    minWidth: 200,
  },
  recordingActive: {
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primaryRed + '12',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primaryRed + '40',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primaryRed,
  },
  recordingText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    color: colors.primaryRed,
  },
  recordingTime: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  stopButton: {
    minWidth: 200,
  },
  recordingComplete: {
    alignItems: 'center',
  },
  recordingCompleteText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    color: colors.secondaryGreen,
    marginBottom: spacing.xs,
  },
  recordingCompleteTime: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    fontVariant: ['tabular-nums'],
  },
  recordingActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
  descriptionSection: {
    marginTop: spacing.xl,
  },
  descriptionLabel: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  descriptionInput: {
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
    color: colors.textPrimary,
    fontSize: fontSizes.caption,
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareContactList: {
    maxHeight: 180,
    marginBottom: spacing.sm,
  },
  shareContactListContent: {
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  shareContactItem: {
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  shareContactItemActive: {
    borderColor: colors.primaryRed,
    backgroundColor: colors.primaryRed + '10',
  },
  shareContactName: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  shareContactNameActive: {
    color: colors.primaryRed,
  },
  shareContactDetail: {
    fontSize: fontSizes.footnote,
    color: colors.textTertiary,
    marginTop: 3,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  durationChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  durationChipActive: {
    borderColor: colors.primaryRed,
    backgroundColor: colors.primaryRed + '12',
  },
  durationChipText: {
    fontSize: fontSizes.footnote,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  durationChipTextActive: {
    color: colors.primaryRed,
    fontWeight: fontWeights.semibold,
  },
  shareConfirmButton: {
    marginTop: spacing.sm,
  },
  sosRecipientList: {
    maxHeight: 200,
    marginBottom: spacing.md,
  },
  sosRecipientListContent: {
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  sosRecipientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  sosRecipientInfo: {
    flex: 1,
  },
  sosRemoveButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  sosRemoveButtonText: {
    fontSize: fontSizes.caption,
    color: colors.textTertiary,
    fontWeight: fontWeights.medium,
  },
  walkWithMeEmpty: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 21,
  },
  walkWithMeContactItem: {
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    marginBottom: spacing.sm,
  },
  walkWithMeTapHint: {
    fontSize: fontSizes.footnote,
    color: colors.primaryRed,
    marginTop: spacing.xs,
  },
  addFromPhoneButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primaryRed + '40',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addFromPhoneButtonText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.primaryRed,
  },
  escortFormSection: {
    marginBottom: spacing.xl,
  },
  escortFormLabel: {
    fontSize: fontSizes.caption2,
    fontWeight: fontWeights.semibold,
    color: colors.textTertiary,
    letterSpacing: letterSpacing.caps,
    marginBottom: spacing.sm,
  },
  escortPriorityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  escortPriorityButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: 'center',
  },
  escortPriorityActive: {
    borderColor: colors.primaryRed + '60',
    backgroundColor: colors.primaryRed + '10',
  },
  escortPriorityUrgentActive: {
    borderColor: '#FF3B30' + '60',
    backgroundColor: '#FF3B30' + '15',
  },
  escortPriorityText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  escortPriorityTextActive: {
    color: colors.primaryRed,
  },
  escortPriorityUrgentText: {
    color: '#FF3B30',
  },
  escortReasonInput: {
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    padding: spacing.md,
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    minHeight: 100,
  },
});

