import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { fontSizes, fontWeights, letterSpacing } from '../theme/typography';

export type ChatMessage = {
  id: string;
  sender: 'officer' | 'user';
  senderName: string;
  text: string;
  timestamp: Date;
};

type RouteChatProps = {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
  destinationName: string;
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function shouldShowTimestamp(current: ChatMessage, previous?: ChatMessage): boolean {
  if (!previous) return true;
  return current.timestamp.getTime() - previous.timestamp.getTime() > 5 * 60 * 1000;
}

function MessageBubble({ msg, showTail }: { msg: ChatMessage; showTail: boolean }) {
  const isUser = msg.sender === 'user';

  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
      {!isUser && showTail && (
        <View style={styles.senderBadge}>
          <Text style={styles.senderBadgeText}>RUPD</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleOfficer,
          showTail && !isUser && styles.bubbleOfficerTail,
          showTail && isUser && styles.bubbleUserTail,
        ]}
      >
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextOfficer]}>
          {msg.text}
        </Text>
        <Text style={[styles.bubbleTime, isUser ? styles.bubbleTimeUser : styles.bubbleTimeOfficer]}>
          {formatTime(msg.timestamp)}
        </Text>
      </View>
    </View>
  );
}

export function RouteChat({ messages, onSend, onClose, destinationName }: RouteChatProps) {
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    Keyboard.dismiss();
  };

  const renderItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    const prev = index > 0 ? messages[index - 1] : undefined;
    const showTime = shouldShowTimestamp(item, prev);
    const showTail = !prev || prev.sender !== item.sender || showTime;

    return (
      <View>
        {showTime && (
          <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
        )}
        <MessageBubble msg={item} showTail={showTail} />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <BlurView intensity={98} tint="dark" style={StyleSheet.absoluteFill} />

      {/* Header — manually pad for Dynamic Island / notch */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={onClose} style={styles.backButton} activeOpacity={0.7}>
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>RUPD Dispatch</Text>
          <Text style={styles.headerSubtitle}>Route to {destinationName}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>🛡</Text>
            </View>
            <Text style={styles.emptyTitle}>RUPD Safety Channel</Text>
            <Text style={styles.emptySubtitle}>
              You'll receive real-time safety alerts from officers monitoring your route.
            </Text>
          </View>
        }
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Input — manually pad for home indicator */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Message"
            placeholderTextColor={colors.textTertiary}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
            returnKeyType="default"
          />
          <TouchableOpacity
            onPress={handleSend}
            style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
            activeOpacity={0.7}
            disabled={!text.trim()}
          >
            <Text style={styles.sendArrow}>↑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const BLUE = '#007AFF';
const GRAY_BUBBLE = 'rgba(60, 60, 67, 0.65)';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.98)',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    minWidth: 70,
    minHeight: 44,
  },
  backChevron: {
    fontSize: 28,
    color: BLUE,
    fontWeight: fontWeights.regular,
    marginTop: -2,
  },
  backLabel: {
    fontSize: fontSizes.body,
    color: BLUE,
    marginLeft: 2,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    letterSpacing: letterSpacing.tight,
  },
  headerSubtitle: {
    fontSize: fontSizes.caption2,
    color: colors.textTertiary,
    marginTop: 1,
  },
  headerRight: {
    minWidth: 70,
  },

  messageList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    flexGrow: 1,
  },
  timestamp: {
    fontSize: fontSizes.caption2,
    color: colors.textTertiary,
    textAlign: 'center',
    marginVertical: spacing.md,
    letterSpacing: letterSpacing.wide,
  },
  bubbleRow: {
    marginBottom: 2,
    maxWidth: '80%',
  },
  bubbleRowLeft: {
    alignSelf: 'flex-start',
  },
  bubbleRowRight: {
    alignSelf: 'flex-end',
  },
  senderBadge: {
    marginBottom: 3,
  },
  senderBadgeText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.textTertiary,
    letterSpacing: 1.5,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: BLUE,
    borderBottomRightRadius: 4,
  },
  bubbleOfficer: {
    backgroundColor: GRAY_BUBBLE,
    borderBottomLeftRadius: 4,
  },
  bubbleUserTail: {
    borderBottomRightRadius: 4,
    marginTop: 2,
  },
  bubbleOfficerTail: {
    borderBottomLeftRadius: 4,
    marginTop: 2,
  },
  bubbleText: {
    fontSize: fontSizes.body,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: '#FFFFFF',
  },
  bubbleTextOfficer: {
    color: '#FFFFFF',
  },
  bubbleTime: {
    fontSize: 9,
    marginTop: 3,
  },
  bubbleTimeUser: {
    color: 'rgba(255, 255, 255, 0.50)',
    textAlign: 'right',
  },
  bubbleTimeOfficer: {
    color: 'rgba(255, 255, 255, 0.35)',
    textAlign: 'left',
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyIconText: {
    fontSize: 24,
  },
  emptyTitle: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    letterSpacing: letterSpacing.tight,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSizes.footnote,
    color: colors.textTertiary,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 19,
  },

  inputBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
    minHeight: 36,
  },
  input: {
    flex: 1,
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    maxHeight: 100,
    paddingTop: Platform.OS === 'ios' ? 6 : 4,
    paddingBottom: Platform.OS === 'ios' ? 6 : 4,
  },
  sendButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sendArrow: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
    marginTop: -1,
  },
});
