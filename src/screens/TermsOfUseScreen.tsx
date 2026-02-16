import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { SafeRouteLogo } from '../components';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { fontSizes, fontWeights } from '../theme/typography';

export function TermsOfUseScreen() {
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
        <Text style={styles.headerTitle}>Terms of Use</Text>
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
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By accessing and using SafeRoute ("the App"), you accept and agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use the App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Description of Service</Text>
          <Text style={styles.paragraph}>
            SafeRoute is a safety navigation application designed to help users navigate safely, share their location with emergency contacts, report incidents, and access emergency services. The App provides route planning, real-time navigation, and safety features.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
          <Text style={styles.paragraph}>
            You agree to:
          </Text>
          <Text style={styles.bulletPoint}>• Use the App only for lawful purposes</Text>
          <Text style={styles.bulletPoint}>• Provide accurate information when creating reports or using emergency features</Text>
          <Text style={styles.bulletPoint}>• Not misuse the emergency reporting features</Text>
          <Text style={styles.bulletPoint}>• Maintain the security of your account</Text>
          <Text style={styles.bulletPoint}>• Comply with all applicable laws and regulations</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Emergency Services</Text>
          <Text style={styles.paragraph}>
            SafeRoute provides features to contact emergency services and share your location. In case of a real emergency, always call 911 or your local emergency number directly. The App is not a replacement for emergency services and does not guarantee response times or availability.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Location Services</Text>
          <Text style={styles.paragraph}>
            The App requires access to your location to provide navigation and safety features. By using the App, you consent to the collection and use of your location data as described in our Privacy Policy. Location data may be shared with emergency contacts when you use the location sharing features.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Incident Reporting</Text>
          <Text style={styles.paragraph}>
            When you report an incident through the App, you acknowledge that:
          </Text>
          <Text style={styles.bulletPoint}>• Reports are sent to local law enforcement</Text>
          <Text style={styles.bulletPoint}>• False reports may result in legal consequences</Text>
          <Text style={styles.bulletPoint}>• Audio recordings and location data may be used as evidence</Text>
          <Text style={styles.bulletPoint}>• You are responsible for the accuracy of information provided</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            SafeRoute is provided "as is" without warranties of any kind. We do not guarantee that the App will be error-free, uninterrupted, or secure. We are not liable for any damages arising from your use of the App, including but not limited to navigation errors, missed emergency responses, or data loss.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Intellectual Property</Text>
          <Text style={styles.paragraph}>
            All content, features, and functionality of the App are owned by SafeRoute and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our written permission.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Modifications to Terms</Text>
          <Text style={styles.paragraph}>
            We reserve the right to modify these Terms of Use at any time. Changes will be effective immediately upon posting. Your continued use of the App after changes are posted constitutes acceptance of the modified terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Termination</Text>
          <Text style={styles.paragraph}>
            We reserve the right to terminate or suspend your access to the App at any time, with or without cause, and with or without notice, for any reason including violation of these Terms of Use.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Contact Information</Text>
          <Text style={styles.paragraph}>
            If you have questions about these Terms of Use, please contact us at support@saferoute.app
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
