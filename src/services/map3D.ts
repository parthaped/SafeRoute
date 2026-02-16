/**
 * 3D Map utilities for immersive walking navigation.
 * Provides camera controls and 3D view configurations.
 */

import type { LatLng } from './directions';

export type CameraConfig = {
  center: LatLng;
  pitch: number; // 0-90 degrees (0 = top-down, 90 = horizontal)
  heading: number; // 0-360 degrees (0 = North)
  altitude: number; // meters above ground
  zoom?: number; // optional zoom level
};

/**
 * Default 3D camera configuration for walking navigation.
 */
export const DEFAULT_3D_CAMERA: Partial<CameraConfig> = {
  pitch: 45, // 45-degree angle for immersive view
  altitude: 100, // 100 meters above ground
};

/**
 * Calculate camera heading based on route direction.
 * Returns heading in degrees (0-360).
 */
export function calculateHeading(from: LatLng, to: LatLng): number {
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const deltaLon = ((to.longitude - from.longitude) * Math.PI) / 180;

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  let heading = (Math.atan2(y, x) * 180) / Math.PI;
  heading = (heading + 360) % 360; // Normalize to 0-360

  return heading;
}

/**
 * Smooth camera transition for following route.
 * Returns intermediate camera position between current and target.
 */
export function interpolateCamera(
  current: CameraConfig,
  target: CameraConfig,
  progress: number // 0-1
): CameraConfig {
  return {
    center: {
      latitude:
        current.center.latitude +
        (target.center.latitude - current.center.latitude) * progress,
      longitude:
        current.center.longitude +
        (target.center.longitude - current.center.longitude) * progress,
    },
    pitch: current.pitch + (target.pitch - current.pitch) * progress,
    heading:
      current.heading +
      ((target.heading - current.heading + 180) % 360) - 180 * progress,
    altitude: current.altitude + (target.altitude - current.altitude) * progress,
  };
}

/**
 * Get optimal camera configuration for walking navigation.
 */
export function getWalkingCameraConfig(
  currentLocation: LatLng,
  nextWaypoint: LatLng,
  distance: number // meters to next waypoint
): CameraConfig {
  const heading = calculateHeading(currentLocation, nextWaypoint);
  
  // Adjust pitch based on distance - closer waypoints get more horizontal view
  const pitch = Math.max(30, Math.min(60, 45 + distance / 10));
  
  // Adjust altitude based on distance - closer waypoints get lower altitude
  const altitude = Math.max(50, Math.min(200, 100 + distance / 2));

  return {
    center: {
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
    },
    pitch,
    heading,
    altitude,
  };
}

/**
 * Get camera configuration for standard 2D view.
 */
export function get2DCameraConfig(center: LatLng): CameraConfig {
  return {
    center,
    pitch: 0,
    heading: 0,
    altitude: 1000,
  };
}
