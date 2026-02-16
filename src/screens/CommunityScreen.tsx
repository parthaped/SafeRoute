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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { SafeRouteLogo } from '../components';
import { PlusIcon, TrashIcon } from '../components/icons/Icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { fontSizes, fontWeights } from '../theme/typography';
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
  const backendAvailable = isCommunityBackendAvailable();

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

      {/* Posts List — Safety Alerts */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.postsHeader}>
          <Text style={styles.postsTitle}>Safety Alerts</Text>
          <Text style={styles.postsSubtitle}>
            Warnings and hazards others should be wary of. Share what to watch out for so the community can stay protected.
          </Text>
        </View>

        {posts.map((post) => (
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

        {posts.length === 0 && !backendAvailable && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No safety alerts yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add Firebase config to sync with all users, then share what others should be wary of.
            </Text>
          </View>
        )}
        {posts.length === 0 && backendAvailable && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No safety alerts yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Be the first to warn others — tap + to share something people should watch out for.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* New Post Modal */}
      <Modal
        visible={showNewPostModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNewPostModal(false)}
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  backButtonText: {
    fontSize: fontSizes.body,
    color: colors.primaryRed,
    fontWeight: fontWeights.semibold,
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
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryRed,
    gap: spacing.xs,
  },
  newPostButtonText: {
    fontSize: fontSizes.body,
    color: colors.white,
    fontWeight: fontWeights.semibold,
  },
  configBanner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primaryRed + '20',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primaryRed + '40',
  },
  configBannerText: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  feedErrorBanner: {
    backgroundColor: colors.primaryRed + '15',
    borderColor: colors.primaryRed + '50',
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryRed,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  postsHeader: {
    marginBottom: spacing.sm,
  },
  postsTitle: {
    fontSize: fontSizes.title2,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  postsSubtitle: {
    fontSize: fontSizes.footnote,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  postCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
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
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.secondaryGreen + '20',
  },
  verifiedText: {
    fontSize: fontSizes.caption,
    color: colors.secondaryGreen,
    fontWeight: fontWeights.semibold,
  },
  postTime: {
    fontSize: fontSizes.caption,
    color: colors.textTertiary,
  },
  postContent: {
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  postLocation: {
    fontSize: fontSizes.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconPositive: {
    backgroundColor: colors.secondaryGreen + '30',
  },
  typeIconNegative: {
    backgroundColor: colors.primaryRed + '30',
  },
  typeIconText: {
    fontSize: fontSizes.title3,
    fontWeight: fontWeights.bold,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    fontSize: fontSizes.title3,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSizes.title2,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.border,
  },
  closeButtonText: {
    fontSize: fontSizes.title3,
    color: colors.textPrimary,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonActive: {
    borderColor: colors.primaryRed,
    backgroundColor: colors.primaryRed + '20',
  },
  typeButtonText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  typeButtonTextActive: {
    color: colors.primaryRed,
  },
  postInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  submitButton: {
    backgroundColor: colors.primaryRed,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
});
