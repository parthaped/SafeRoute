import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface UserLocationPointerProps {
  /** When true, show rotating arrow; when false, show dot. */
  navigationMode?: boolean;
  /** Device heading in degrees (0–360). Arrow rotates with compass. */
  heading?: number;
  size?: number;
}

/**
 * User location pin: dot when browsing; white arrow (rotates with heading) in navigation mode.
 */
export function UserLocationPointer({
  navigationMode = false,
  heading = 0,
  size = 64,
}: UserLocationPointerProps) {
  if (!navigationMode) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Circle cx="32" cy="32" r="20" fill="rgba(0,122,255,0.15)" />
          <Circle cx="32" cy="32" r="10" fill="#ffffff" />
          <Circle cx="32" cy="32" r="6" fill="#007AFF" />
        </Svg>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size },
        { transform: [{ rotate: `${heading}deg` }] },
      ]}
    >
      <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size}>
        <Path d="M32 6 L50 56 L32 46 L14 56 Z" fill="#FFFFFF" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
