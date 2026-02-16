import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { fontSizes, fontWeights } from '../theme/typography';

type IconButtonProps = {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  style?: ViewStyle;
};

export function IconButton({ icon, label, onPress, style }: IconButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.container, style]}
    >
      <View style={styles.iconWrapper}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.cardBackground,
    minWidth: 100,
    maxWidth: 120,
  },
  iconWrapper: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSizes.footnote,
    fontWeight: fontWeights.medium,
    color: colors.textPrimary,
  },
});
