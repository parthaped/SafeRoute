/**
 * Hidden CameraView component for flashlight control.
 * This component should be rendered but hidden (position: absolute, opacity: 0).
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import { setTorchCallback, isFlashlightEnabled } from '../services/flashlight';

export function HiddenCameraView() {
  const [torchEnabled, setTorchEnabled] = useState(false);

  useEffect(() => {
    // Register callback to control torch
    setTorchCallback((enabled: boolean) => {
      setTorchEnabled(enabled);
    });

    // Initialize with current state
    setTorchEnabled(isFlashlightEnabled());

    return () => {
      setTorchCallback(null);
    };
  }, []);

  return (
    <View style={styles.hidden}>
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={torchEnabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  camera: {
    width: 1,
    height: 1,
  },
});
