import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { SafeRouteLogo } from '../components';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { fontSizes, fontWeights } from '../theme/typography';

export function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <SafeRouteLogo width={120} height={140} showText />
        
        <Text style={styles.lastUpdated}>Last Updated: January 2026</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.paragraph}>
            SafeRoute ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Information We Collect</Text>
          
          <Text style={styles.subsectionTitle}>2.1 Personal Information</Text>
          <Text style={styles.paragraph}>
            We may collect the following personal information:
          </Text>
          <Text style={styles.bulletPoint}>• Name and contact information</Text>
          <Text style={styles.bulletPoint}>• Class year and location</Text>
          <Text style={styles.bulletPoint}>• Emergency contact information</Text>
          <Text style={styles.bulletPoint}>• Profile photo</Text>
          <Text style={styles.bulletPoint}>• Identification documents (ID cards, insurance cards)</Text>

          <Text style={styles.subsectionTitle}>2.2 Location Data</Text>
          <Text style={styles.paragraph}>
            The App collects precise location data to provide navigation and safety features. This includes:
          </Text>
          <Text style={styles.bulletPoint}>• Current location when using navigation</Text>
          <Text style={styles.bulletPoint}>• Route history</Text>
          <Text style={styles.bulletPoint}>• Location shared with emergency contacts</Text>
          <Text style={styles.bulletPoint}>• Location data included in incident reports</Text>

          <Text style={styles.subsectionTitle}>2.3 Audio Recordings</Text>
          <Text style={styles.paragraph}>
            When you use the audio recording feature to report incidents, audio files are created and may be sent to law enforcement. These recordings are stored locally on your device until sent.
          </Text>

          <Text style={styles.subsectionTitle}>2.4 Usage Data</Text>
          <Text style={styles.paragraph}>
            We may collect information about how you use the App, including features accessed, routes taken, and settings preferences.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use the information we collect to:
          </Text>
          <Text style={styles.bulletPoint}>• Provide navigation and route planning services</Text>
          <Text style={styles.bulletPoint}>• Enable location sharing with emergency contacts</Text>
          <Text style={styles.bulletPoint}>• Process and forward incident reports to law enforcement</Text>
          <Text style={styles.bulletPoint}>• Send safety check-in notifications</Text>
          <Text style={styles.bulletPoint}>• Improve and maintain the App</Text>
          <Text style={styles.bulletPoint}>• Respond to your requests and support needs</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Information Sharing</Text>
          
          <Text style={styles.subsectionTitle}>4.1 Emergency Contacts</Text>
          <Text style={styles.paragraph}>
            When you use location sharing features, your location may be shared with emergency contacts you have designated in the App.
          </Text>

          <Text style={styles.subsectionTitle}>4.2 Law Enforcement</Text>
          <Text style={styles.paragraph}>
            When you submit an incident report, the following information may be sent to local law enforcement:
          </Text>
          <Text style={styles.bulletPoint}>• Your location at the time of the incident</Text>
          <Text style={styles.bulletPoint}>• Audio recordings (if provided)</Text>
          <Text style={styles.bulletPoint}>• Incident details and description</Text>
          <Text style={styles.bulletPoint}>• Timestamp of the incident</Text>

          <Text style={styles.subsectionTitle}>4.3 Service Providers</Text>
          <Text style={styles.paragraph}>
            We may share information with third-party service providers who assist us in operating the App, such as mapping services (Google Maps) and cloud storage providers. These providers are contractually obligated to protect your information.
          </Text>

          <Text style={styles.subsectionTitle}>4.4 Legal Requirements</Text>
          <Text style={styles.paragraph}>
            We may disclose your information if required by law, court order, or government regulation, or to protect our rights, property, or safety, or that of our users.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Data Storage and Security</Text>
          <Text style={styles.paragraph}>
            We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
          </Text>
          <Text style={styles.paragraph}>
            Your data is stored locally on your device and may be backed up to cloud services. You can delete your account and associated data at any time through the App settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Your Rights</Text>
          <Text style={styles.paragraph}>
            You have the right to:
          </Text>
          <Text style={styles.bulletPoint}>• Access your personal information</Text>
          <Text style={styles.bulletPoint}>• Correct inaccurate information</Text>
          <Text style={styles.bulletPoint}>• Delete your account and data</Text>
          <Text style={styles.bulletPoint}>• Opt out of location tracking (though this may limit App functionality)</Text>
          <Text style={styles.bulletPoint}>• Request a copy of your data</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
          <Text style={styles.paragraph}>
            SafeRoute is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Third-Party Services</Text>
          <Text style={styles.paragraph}>
            The App uses third-party services including Google Maps for navigation. These services have their own privacy policies. We encourage you to review their privacy policies to understand how they handle your information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Changes to This Privacy Policy</Text>
          <Text style={styles.paragraph}>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy in the App and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
          </Text>
          <Text style={styles.paragraph}>
            Email: privacy@saferoute.app
          </Text>
          <Text style={styles.paragraph}>
            Support: support@saferoute.app
          </Text>
        </View>

        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    minWidth: 80,
  },
  backButtonText: {
    fontSize: fontSizes.body,
    color: colors.primaryRed,
    fontWeight: fontWeights.semibold,
  },
  headerTitle: {
    fontSize: fontSizes.title2,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    alignItems: 'center',
  },
  lastUpdated: {
    fontSize: fontSizes.caption,
    color: colors.textTertiary,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
    width: '100%',
  },
  sectionTitle: {
    fontSize: fontSizes.title3,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  subsectionTitle: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  paragraph: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  bulletPoint: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginLeft: spacing.md,
    marginBottom: spacing.xs,
  },
  footer: {
    height: spacing.xxxl,
  },
});
