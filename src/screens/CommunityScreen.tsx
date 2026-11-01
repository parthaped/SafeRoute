import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { SafeRouteLogo } from '../components';
import { PlusIcon, TrashIcon } from '../components/icons/Icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { fontSizes, fontWeights, letterSpacing } from '../theme/typography';
import * as Location from 'expo-location';
import Svg, { Path, Circle } from 'react-native-svg';
import {
  subscribePosts,
  createPost,
  deletePost,
  getDeviceUserId,
  isCommunityBackendAvailable,
  type CommunityPost,
} from '../services/community';
import {
  OFFICER_REPORTS,
  DEMO_COMMUNITY_POSTS,
  type OfficerAlert,
} from '../data/demoAlerts';

type RootStackParamList = {
  Main: undefined;
  Community: undefined;
  TermsOfUse: undefined;
  PrivacyPolicy: undefined;
};

type CommunityNav = NativeStackNavigationProp<RootStackParamList, 'Community'>;

function VerifiedBadge() {
  return (
    <View style={styles.verifiedBadge}>
      <Svg width={12} height={12} viewBox="0 0 12 12">
        <Circle cx="6" cy="6" r="5" fill={colors.secondaryGreen} />
        <Path
          d="M3.5 6L5.5 8L8.5 5"
          stroke={colors.white}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
      <Text style={styles.verifiedText}>Verified</Text>
    </View>
  );
}

function PostTypeIcon({ type }: { type: 'positive' | 'negative' }) {
  return (
    <View style={[styles.typeIcon, type === 'positive' ? styles.typeIconPositive : styles.typeIconNegative]}>
      <Text style={styles.typeIconText}>{type === 'positive' ? '✓' : '⚠'}</Text>
    </View>
  );
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function OfficerBadge() {
  return (
    <View style={styles.officerBadge}>
      <Svg width={12} height={12} viewBox="0 0 12 12">
        <Path
          d="M6 1L7.5 4.5H11L8.25 6.75L9.5 10.5L6 8.25L2.5 10.5L3.75 6.75L1 4.5H4.5L6 1Z"
          fill={colors.primaryRed}
        />
      </Svg>
      <Text style={styles.officerBadgeText}>RUPD</Text>
    </View>
  );
}

function PriorityIndicator({ priority }: { priority: string }) {
  const colorMap: Record<string, string> = {
    critical: '#E10600',
    high: '#FF6B35',
    medium: '#FFD60A',
    low: '#2ECC71',
  };
  return (
    <View style={[styles.priorityDot, { backgroundColor: colorMap[priority] ?? colors.textTertiary }]} />
  );
}

export function CommunityScreen() {
  const navigation = useNavigation<CommunityNav>();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [deviceUserId, setDeviceUserId] = useState<string | null>(null);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState<'positive' | 'negative'>('positive');
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'reports' | 'community'>('reports');
  const backendAvailable = isCommunityBackendAvailable();

  const displayPosts: CommunityPost[] = posts.length > 0
    ? posts
    : DEMO_COMMUNITY_POSTS.map((p) => ({
        id: p.id,
        content: p.content,
        type: p.type,
        timestamp: p.timestamp,
        verified: p.verified,
        location: p.location,
        authorId: p.authorId,
      }));

  useEffect(() => {
    getDeviceUserId().then(setDeviceUserId);
  }, []);

  useEffect(() => {
    setFeedError(null);
    const unsub = subscribePosts(
      (newPosts) => {
        setPosts(newPosts);
        setFeedError(null);
      },
      (err) => {
        console.warn('[Community]', err);
        setFeedError(err?.message ?? 'Could not load alerts.');
      }
    );
    return () => {
      if (unsub) unsub();
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync();
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch {
        // Location not available
      }
    })();
  }, []);

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      Alert.alert('Error', 'Please enter a message.');
      return;
    }
    if (!backendAvailable) {
      Alert.alert(
        'Not connected',
        'Add Firebase config (see .env.example) to sync safety alerts with all SafeRoute users so everyone can stay protected.'
      );
      return;
    }
    setIsSubmitting(true);
    const result = await createPost(newPostContent.trim(), newPostType, currentLocation ?? undefined);
    setIsSubmitting(false);
    if (result.success) {
      setNewPostContent('');
      setNewPostType('positive');
      setShowNewPostModal(false);
      Alert.alert('Alert shared', 'Your safety alert is visible to the community. Thank you for helping others stay protected.');
    } else {
      Alert.alert('Post failed', result.error ?? 'Please try again.');
    }
  };

  const handleDeletePost = (post: CommunityPost) => {
    if (post.authorId !== deviceUserId) return;
    Alert.alert('Delete post?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeletingId(post.id);
          const result = await deletePost(post.id, post.authorId);
          setIsDeletingId(null);
          if (!result.success) {
            Alert.alert('Delete failed', result.error ?? 'Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header: back + SafeRoute + Alert — no blur here so title below stays visible */}
      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <SafeRouteLogo width={120} height={32} />
          </View>
          <TouchableOpacity
            onPress={() => setShowNewPostModal(true)}
            style={styles.newPostButton}
            accessibilityLabel="Share safety alert"
          >
            <PlusIcon color={colors.white} size={20} />
            <Text style={styles.newPostButtonText}> Alert</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {!backendAvailable && (
        <View style={styles.configBanner}>
          <Text style={styles.configBannerText}>
            Add Firebase config to sync posts with all SafeRoute users (see .env.example).
          </Text>
        </View>
      )}

      {backendAvailable && feedError && (
        <View style={[styles.configBanner, styles.feedErrorBanner]}>
          <Text style={styles.configBannerText}>
            {feedError} Check the console for an index link if Firestore asked for one.
          </Text>
        </View>
      )}

      {/* Tab selector */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.tabActive]}
          onPress={() => setActiveTab('reports')}
        >
          <Text style={[styles.tabText, activeTab === 'reports' && styles.tabTextActive]}>
            Official Reports
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'community' && styles.tabActive]}
          onPress={() => setActiveTab('community')}
        >
          <Text style={[styles.tabText, activeTab === 'community' && styles.tabTextActive]}>
            Community
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'reports' && (
          <>
            <View style={styles.postsHeader}>
              <Text style={styles.postsTitle}>RUPD Reports</Text>
              <Text style={styles.postsSubtitle}>
                Official reports filed by Rutgers University Police. Stay informed about active incidents near you.
              </Text>
            </View>

            {OFFICER_REPORTS.filter((r) => r.status !== 'resolved' && r.status !== 'unfounded').map((report) => (
              <View key={report.id} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <View style={styles.postHeaderLeft}>
                    <PriorityIndicator priority={report.priority} />
                    <View style={styles.postMeta}>
                      <OfficerBadge />
                      <Text style={styles.postTime}>{formatTimestamp(report.timestamp)}</Text>
                    </View>
                  </View>
                  <View style={styles.reportStatusBadge}>
                    <Text style={styles.reportStatusText}>{report.status.replace('_', ' ')}</Text>
                  </View>
                </View>
                <Text style={styles.officerReportTitle}>{report.title}</Text>
                <Text style={styles.postContent}>{report.description}</Text>
                <View style={styles.reportFooter}>
                  <Text style={styles.postLocation}>📍 {report.locationName}</Text>
                  <Text style={styles.officerNameText}>{report.officerName}</Text>
                </View>
              </View>
            ))}

            {OFFICER_REPORTS.filter((r) => r.status === 'resolved').length > 0 && (
              <>
                <View style={styles.resolvedDivider}>
                  <View style={styles.resolvedLine} />
                  <Text style={styles.resolvedLabel}>Resolved</Text>
                  <View style={styles.resolvedLine} />
                </View>
                {OFFICER_REPORTS.filter((r) => r.status === 'resolved').map((report) => (
                  <View key={report.id} style={[styles.postCard, styles.resolvedCard]}>
                    <View style={styles.postHeader}>
                      <View style={styles.postHeaderLeft}>
                        <PriorityIndicator priority="low" />
                        <View style={styles.postMeta}>
                          <OfficerBadge />
                          <Text style={styles.postTime}>{formatTimestamp(report.timestamp)}</Text>
                        </View>
                      </View>
                      <View style={[styles.reportStatusBadge, styles.resolvedStatusBadge]}>
                        <Text style={[styles.reportStatusText, styles.resolvedStatusText]}>resolved</Text>
                      </View>
                    </View>
                    <Text style={[styles.officerReportTitle, { opacity: 0.6 }]}>{report.title}</Text>
                    <Text style={[styles.postContent, { opacity: 0.5 }]}>{report.description}</Text>
                    <Text style={[styles.postLocation, { opacity: 0.5 }]}>📍 {report.locationName}</Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {activeTab === 'community' && (
          <>
            <View style={styles.postsHeader}>
              <Text style={styles.postsTitle}>Safety Alerts</Text>
              <Text style={styles.postsSubtitle}>
                Warnings and hazards shared by the community. Share what to watch out for so others can stay protected.
              </Text>
            </View>

            {displayPosts.map((post) => (
              <View key={post.id} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <View style={styles.postHeaderLeft}>
                    <PostTypeIcon type={post.type} />
                    <View style={styles.postMeta}>
                      {post.verified && <VerifiedBadge />}
                      <Text style={styles.postTime}>{formatTimestamp(post.timestamp)}</Text>
                    </View>
                  </View>
                  {post.authorId === deviceUserId && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeletePost(post)}
                      disabled={isDeletingId === post.id}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityLabel="Delete your post"
                    >
                      {isDeletingId === post.id ? (
                        <ActivityIndicator size="small" color={colors.textTertiary} />
                      ) : (
                        <TrashIcon color={colors.textTertiary} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.postContent}>{post.content}</Text>
                {post.location && (
                  <Text style={styles.postLocation}>
                    📍 Near {post.location.latitude.toFixed(4)}, {post.location.longitude.toFixed(4)}
                  </Text>
                )}
              </View>
            ))}

            {displayPosts.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No safety alerts yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Be the first to warn others — tap + to share something people should watch out for.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={showNewPostModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNewPostModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
            <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Share a safety alert</Text>
                <TouchableOpacity
                  onPress={() => setShowNewPostModal(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    newPostType === 'positive' && styles.typeButtonActive,
                  ]}
                  onPress={() => setNewPostType('positive')}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      newPostType === 'positive' && styles.typeButtonTextActive,
                    ]}
                  >
                    ✓ All clear
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    newPostType === 'negative' && styles.typeButtonActive,
                  ]}
                  onPress={() => setNewPostType('negative')}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      newPostType === 'negative' && styles.typeButtonTextActive,
                    ]}
                  >
                    ⚠ Be wary
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.postInput}
                placeholder="Describe what others should watch out for (e.g. suspicious activity, poor lighting, hazard)..."
                placeholderTextColor={colors.textTertiary}
                value={newPostContent}
                onChangeText={setNewPostContent}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!newPostContent.trim() || isSubmitting) && styles.submitButtonDisabled,
                ]}
                onPress={handleCreatePost}
                disabled={!newPostContent.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Warn community</Text>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 52,
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  backButtonText: {
    fontSize: fontSizes.caption,
    color: colors.primaryRed,
    fontWeight: fontWeights.medium,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  newPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.primaryRed,
    gap: spacing.xs,
  },
  newPostButtonText: {
    fontSize: fontSizes.footnote,
    color: colors.white,
    fontWeight: fontWeights.semibold,
  },
  configBanner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primaryRed + '0C',
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.primaryRed + '25',
  },
  configBannerText: {
    fontSize: fontSizes.footnote,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  feedErrorBanner: {
    backgroundColor: colors.primaryRed + '0A',
    borderColor: colors.primaryRed + '30',
  },
  deleteButton: {
    padding: spacing.sm,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryRed,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.primaryRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 120,
    gap: spacing.sm,
  },
  postsHeader: {
    marginBottom: spacing.sm,
  },
  postsTitle: {
    fontSize: fontSizes.title3,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    letterSpacing: letterSpacing.tight,
    marginBottom: spacing.xs,
  },
  postsSubtitle: {
    fontSize: fontSizes.footnote,
    color: colors.textTertiary,
    lineHeight: 19,
  },
  postCard: {
    backgroundColor: colors.surface1,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.secondaryGreen + '15',
  },
  verifiedText: {
    fontSize: fontSizes.caption2,
    color: colors.secondaryGreen,
    fontWeight: fontWeights.semibold,
  },
  postTime: {
    fontSize: fontSizes.caption2,
    color: colors.textTertiary,
  },
  postContent: {
    fontSize: fontSizes.caption,
    color: colors.textPrimary,
    lineHeight: 21,
    marginBottom: spacing.xs,
  },
  postLocation: {
    fontSize: fontSizes.footnote,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  typeIcon: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconPositive: {
    backgroundColor: colors.secondaryGreen + '18',
  },
  typeIconNegative: {
    backgroundColor: colors.primaryRed + '18',
  },
  typeIconText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyStateText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: fontSizes.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primaryRed,
  },
  tabText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: fontWeights.semibold,
  },
  officerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.primaryRed + '12',
  },
  officerBadgeText: {
    fontSize: fontSizes.caption2,
    color: colors.primaryRed,
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacing.wide,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  officerReportTitle: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    letterSpacing: letterSpacing.tight,
    marginBottom: 3,
  },
  reportStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    backgroundColor: 'rgba(255,107,53,0.10)',
  },
  reportStatusText: {
    fontSize: fontSizes.caption2,
    fontWeight: fontWeights.medium,
    color: '#FF6B35',
    textTransform: 'capitalize',
  },
  resolvedStatusBadge: {
    backgroundColor: 'rgba(46,204,113,0.10)',
  },
  resolvedStatusText: {
    color: colors.secondaryGreen,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  officerNameText: {
    fontSize: fontSizes.footnote,
    color: colors.textTertiary,
  },
  resolvedCard: {
    opacity: 0.5,
  },
  resolvedDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  resolvedLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  resolvedLabel: {
    fontSize: fontSizes.caption2,
    color: colors.textTertiary,
    fontWeight: fontWeights.medium,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.caps,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface1,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    borderBottomWidth: 0,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
  },
  typeButtonActive: {
    borderColor: colors.primaryRed,
    backgroundColor: colors.primaryRed + '12',
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
  postInput: {
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.xs,
    padding: spacing.lg,
    fontSize: fontSizes.caption,
    color: colors.textPrimary,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  submitButton: {
    backgroundColor: colors.primaryRed,
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: colors.white,
    letterSpacing: 0.3,
  },
});
