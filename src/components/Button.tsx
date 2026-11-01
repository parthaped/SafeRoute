import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { fontSizes, fontWeights } from '../theme/typography';

type ButtonVariant = 'primary' | 'secondary' | 'outline';

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth,
}: ButtonProps) {
  const variantStyles = {
    primary: styles.primary,
    secondary: styles.secondary,
    outline: styles.outline,
  };
  const textVariantStyles = {
    primary: styles.primaryText,
    secondary: styles.secondaryText,
    outline: styles.outlineText,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? colors.primaryRed : colors.white}
        />
      ) : (
        <Text style={[styles.text, textVariantStyles[variant], textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 13,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.45,
  },
  primary: {
    backgroundColor: colors.primaryRed,
  },
  secondary: {
    backgroundColor: colors.surface3,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primaryRed,
  },
  text: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.3,
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.white,
  },
  outlineText: {
    color: colors.primaryRed,
  },
});
