import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  useBlur?: boolean;
  intensity?: number;
};

export function Card({ children, style, useBlur = true, intensity = 40 }: CardProps) {
  if (useBlur) {
    return (
      <View style={[styles.wrapper, style]}>
        <BlurView
          intensity={intensity}
          tint="dark"
          style={[styles.blur, styles.rounded]}
        >
          <View style={styles.inner}>{children}</View>
        </BlurView>
      </View>
    );
  }

  return (
    <View style={[styles.solid, styles.rounded, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  blur: {
    overflow: 'hidden',
    width: '100%',
  },
  rounded: {
    borderRadius: borderRadius.lg,
  },
  inner: {
    padding: spacing.lg,
    backgroundColor: 'rgba(8, 8, 8, 0.65)',
    width: '100%',
  },
  solid: {
    backgroundColor: colors.surface1,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
