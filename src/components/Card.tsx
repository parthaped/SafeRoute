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
    borderRadius: borderRadius.xl,
    backgroundColor: colors.cardBackground,
  },
  blur: {
    overflow: 'hidden',
    width: '100%',
  },
  rounded: {
    borderRadius: borderRadius.xl,
  },
  inner: {
    padding: spacing.lg,
    backgroundColor: 'rgba(10, 10, 10, 0.7)',
    width: '100%',
  },
  solid: {
    backgroundColor: colors.cardBackground,
    padding: spacing.lg,
  },
});
