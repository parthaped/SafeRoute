import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import MapView, { Polyline, Marker, Camera, Polygon } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { BlurView } from 'expo-blur';
import { Button, SafeRouteLogo } from '../components';
import { UserLocationPointer } from '../components/UserLocationPointer';
import { RouteChat, type ChatMessage } from '../components/RouteChat';
import { CheckIcon, SearchIcon, ChevronRightIcon, View3DIcon, PhoneIcon } from '../components/icons/Icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { fontSizes, fontWeights, letterSpacing } from '../theme/typography';
import type { TabParamList } from '../navigation/types';
import { RUTGERS_CENTER } from '../constants/places';
import { searchPlaces, getPlaceDetails, type PlacePrediction } from '../services/placesSearch';
import type { LatLng, RouteStep, TravelMode, RouteOption, DirectionsResult } from '../services/directions';
import { fetchDirections } from '../services/directions';
import { GOOGLE_MAPS_API_KEY } from '../config';
import { getCurrentLocation, startRouteLocationSharing, stopRouteLocationSharing } from '../services/locationShare';
import { shareLocationToContact, stopLocationSharing, endLocationSharingManually, isLocationSharingActive, getActiveSharingSession } from '../services/shareLocationToContact';
import { getEmergencyContacts, type EmergencyContact } from '../services/storage';
import { getWalkingCameraConfig, get2DCameraConfig, type CameraConfig } from '../services/map3D';
import {
  startSafetyMonitoring,
  stopSafetyMonitoring,
  parseDurationToSeconds,
  triggerCheckInVibration,
  sendSafetyAlert,
  type CheckInStatus,
} from '../services/safetyCheckIn';
import { shouldShowRouteChangeNotification } from '../services/quietMode';
import { submitEscortRequest } from '../services/escortRequest';
import { publishActiveRoute, removeActiveRoute } from '../services/activeRouteSync';
import { subscribePosts, type CommunityPost } from '../services/community';
import * as CrimeHeatmap from '../services/crimeHeatmap';
import type { DangerZoneSummary, DangerZoneIncident, DangerZoneWithScore } from '../services/crimeHeatmap';
import {
  LIGHTING_CONDITIONS,
  ACOUSTIC_ANOMALIES,
  ACTIVE_HAZARD_ZONES,
} from '../data/demoAlerts';
import { DARK_MAP_STYLES } from '../theme/mapStyles';
import Svg, { Circle, Line } from 'react-native-svg';

const INITIAL_REGION = {
  ...RUTGERS_CENTER,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const HEADER_BAR_HEIGHT = 44;
const TAB_BAR_HEIGHT = 56; // Bottom tab bar; use with insets.bottom so map actions are not covered
// ——— Navigation camera (Google-Maps-style) ———
// Zoom in heavily when nav starts so route and street detail are clearly visible.
const NAV_ZOOM_WALKING = 27;
const NAV_PITCH_WALKING = 72;
const NAV_ZOOM_DRIVING = 26;
const NAV_PITCH_DRIVING = 68;
const NAV_ENTER_DURATION = 600; // One-time "enter nav" snap
const NAV_CAMERA_DURATION = 350; // Smooth animate (300–400ms) — only center + heading, never zoom/pitch
// Forward offset: camera looks AHEAD so user marker sits in lower third (arrow fixed on screen, map rotates underneath).
const FORWARD_OFFSET_METERS = 80; // Distance ahead to place camera center; user appears in lower third
// Throttle: ~4–5 camera updates per second to avoid jank and match expo-location update rate.
const NAV_CAMERA_THROTTLE_MS = 250;
// Heading: reduce sensitivity so map doesn't twitch on small device movements.
const HEADING_THRESHOLD = 12; // degrees — only rotate after a meaningful turn
const HEADING_SMOOTH_ALPHA = 0.08; // Low-pass: more lag, smoother rotation

const EARTH_RADIUS_M = 6371000;

/**
 * Smooth heading: low-pass filter with wrap-around.
 * WHY: Minor compass jitter would spin the map; we only apply rotation when delta exceeds deadband, then ease it in.
 */
function smoothHeading(prev: number, next: number, alpha: number = HEADING_SMOOTH_ALPHA): number {
  const delta = ((next - prev + 540) % 360) - 180;
  return (prev + delta * alpha + 360) % 360;
}

/**
 * Compute a point ahead of the user in the direction of travel (bearing).
 * WHY: Camera center is placed here so the user marker stays in the LOWER THIRD; map "looks forward" like Google Maps.
 */
function getForwardOffsetCoordinate(
  lat: number,
  lng: number,
  headingDeg: number,
  distanceMeters: number
): LatLng {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const brngRad = (headingDeg * Math.PI) / 180;
  const d = distanceMeters / EARTH_RADIUS_M;
  const lat2Rad = Math.asin(
    Math.sin(latRad) * Math.cos(d) + Math.cos(latRad) * Math.sin(d) * Math.cos(brngRad)
  );
  const lng2Rad =
    lngRad +
    Math.atan2(
      Math.sin(brngRad) * Math.sin(d) * Math.cos(latRad),
      Math.cos(d) - Math.sin(latRad) * Math.sin(lat2Rad)
    );
  return {
    latitude: (lat2Rad * 180) / Math.PI,
    longitude: (lng2Rad * 180) / Math.PI,
  };
}

type MapRouteProp = RouteProp<TabParamList, 'Route'>;

type Destination = {
  name: string;
  latitude: number;
  longitude: number;
};

export function MapScreen() {
  const route = useRoute<MapRouteProp>();
  const params = route.params;
  const mapRef = useRef<MapView>(null);
  const insets = useSafeAreaInsets();

  const [origin, setOrigin] = useState<LatLng>(RUTGERS_CENTER);
  const [originName, setOriginName] = useState<string>('Rutgers Center');
  const [destination, setDestination] = useState<Destination | null>(null);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [routeCoordinates, setRouteCoordinates] = useState<LatLng[]>([]);
  const [steps, setSteps] = useState<RouteStep[]>([]);
  const [durationText, setDurationText] = useState('');
  const [distanceText, setDistanceText] = useState('');
  const [loading, setLoading] = useState(false);
  const [directionsError, setDirectionsError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userHeading, setUserHeading] = useState<number | undefined>(undefined);
  const [showAlternateRoutes, setShowAlternateRoutes] = useState(false);
  const [searchFocused, setSearchFocused] = useState(!!params?.openDestination);
  const [searchQuery, setSearchQuery] = useState('');
  const [autocompletePredictions, setAutocompletePredictions] = useState<PlacePrediction[]>([]);
  const [originSearchQuery, setOriginSearchQuery] = useState('');
  const [originPredictions, setOriginPredictions] = useState<PlacePrediction[]>([]);
  const [travelMode, setTravelMode] = useState<TravelMode>('walking');
  const [showOriginPicker, setShowOriginPicker] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);
  const [preferredViewMode, setPreferredViewMode] = useState<'2d' | '3d'>('2d'); // User's preference
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
  const [cameraConfig, setCameraConfig] = useState<CameraConfig | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const activeRef = useRef(active);
  const onNavigationLocationRef = useRef<(loc: LatLng) => void>(() => {});
  const lastTurnNotificationRef = useRef<number>(-1); // Track last notified step
  const hasCenteredOnUserRef = useRef(false);
  const [showSafetyCheckIn, setShowSafetyCheckIn] = useState(false);
  const [estimatedArrivalTime, setEstimatedArrivalTime] = useState<Date | null>(null);
  const checkInTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const headingWatchRef = useRef<Location.LocationSubscription | null>(null);
  const lastNavCameraUpdateRef = useRef<number>(0); // Throttle: only update camera every NAV_CAMERA_THROTTLE_MS
  const [showContactShareModal, setShowContactShareModal] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<EmergencyContact[]>([]);
  const [showMapViewMenu, setShowMapViewMenu] = useState(false);
  const [recentReports, setRecentReports] = useState<CommunityPost[]>([]);
  const [showCrimeHeatmap, setShowCrimeHeatmap] = useState(true);
  const [showLightingOverlay, setShowLightingOverlay] = useState(true);
  const [showHazardZones, setShowHazardZones] = useState(true);
  const [routeAvoidanceSummary, setRouteAvoidanceSummary] = useState<DangerZoneSummary[] | null>(null);
  const [showDirectionsList, setShowDirectionsList] = useState(false);
  const [liveTimeRemainingText, setLiveTimeRemainingText] = useState<string>('');
  const [liveArrivalTime, setLiveArrivalTime] = useState<Date | null>(null);
  const [selectedZoneIncidents, setSelectedZoneIncidents] = useState<DangerZoneIncident[] | null>(null);
  const [showRouteChat, setShowRouteChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatUnreadRef = useRef(0);
  const [chatUnread, setChatUnread] = useState(0);
  const [showEscortModal, setShowEscortModal] = useState(false);
  const [escortReason, setEscortReason] = useState('');
  const [escortPriority, setEscortPriority] = useState<'normal' | 'urgent'>('normal');
  const [isSubmittingEscort, setIsSubmittingEscort] = useState(false);
  const deviceUserIdRef = useRef(`device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);

  const searchBarTop = insets.top + HEADER_BAR_HEIGHT + 8;
  const bottomCardBottom = insets.bottom + TAB_BAR_HEIGHT + spacing.md;

  const dangerZonePolygonsWithScore = useMemo(() => CrimeHeatmap.getDangerZonePolygonsWithScore(), []);

  /** When origin is "My location", use latest user position so the route starts from where the user actually is. */
  const effectiveOrigin = useMemo(
    () => (originName === 'My location' && userLocation ? userLocation : origin),
    [origin, originName, userLocation]
  );

  const loadDirections = useCallback(async (from: LatLng, to: LatLng, mode: TravelMode = travelMode) => {
    setRouteOptions([]);
    setRouteCoordinates([]);
    setSteps([]);
    setDurationText('');
    setDistanceText('');
    setSelectedRouteIndex(0);
    setShowAlternateRoutes(false);
    
    setLoading(true);
    setDirectionsError(null);
    setRouteAvoidanceSummary(null);

    const TIMEOUT_MS = 8000;
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; }, TIMEOUT_MS);

    try {
      let result: DirectionsResult = await fetchDirections(from, to, GOOGLE_MAPS_API_KEY, mode);
      const alternatives = result.routes;
      const SAFETY_TO_MINUTES = 900;
      let bestIdx = 0;
      let bestCombined = Infinity;
      for (let i = 0; i < alternatives.length; i++) {
        const r = alternatives[i];
        const safetyScore = CrimeHeatmap.getRouteSafetyScore(r.coordinates);
        const combined = r.durationMinutes + safetyScore / SAFETY_TO_MINUTES;
        if (combined < bestCombined) {
          bestCombined = combined;
          bestIdx = i;
        }
      }
      result = { routes: alternatives, selectedRouteIndex: bestIdx };
      const selectedRoute = result.routes[bestIdx];

      if (!timedOut && selectedRoute && CrimeHeatmap.doesRouteIntersectDangerZones(selectedRoute.coordinates)) {
        const MAX_DETOUR_RATIO = 1.7;
        const originalMinutes = selectedRoute.durationMinutes;
        let safeRoute: RouteOption | null = null;
        let avoidResult: DirectionsResult | null = null;

        const waypoints = CrimeHeatmap.getAvoidanceWaypoints(from, to, selectedRoute.coordinates, 5);
        if (waypoints.length > 0 && !timedOut) {
          try {
            const res = await fetchDirections(from, to, GOOGLE_MAPS_API_KEY, mode, waypoints);
            const route = res.routes[0];
            if (route &&
                !CrimeHeatmap.doesRouteIntersectDangerZones(route.coordinates) &&
                route.durationMinutes <= originalMinutes * MAX_DETOUR_RATIO) {
              safeRoute = route;
              avoidResult = res;
            }
          } catch { /* fallthrough */ }
        }

        if (!safeRoute && !timedOut) {
          const dijkstraWaypoints = CrimeHeatmap.getSafeRouteWaypointsDijkstra(from, to, 6);
          if (dijkstraWaypoints.length > 0 && !timedOut) {
            try {
              const res = await fetchDirections(from, to, GOOGLE_MAPS_API_KEY, mode, dijkstraWaypoints);
              const route = res.routes[0];
              if (route &&
                  !CrimeHeatmap.doesRouteIntersectDangerZones(route.coordinates) &&
                  route.durationMinutes <= originalMinutes * MAX_DETOUR_RATIO) {
                safeRoute = route;
                avoidResult = res;
              }
            } catch { /* keep direct route */ }
          }
        }

        if (safeRoute && avoidResult) {
          result = avoidResult;
          setRouteAvoidanceSummary(
            CrimeHeatmap.getDangerZoneSummariesForRoute(selectedRoute.coordinates)
          );
        }
      }

      const routes = result.routes;
      const idx = Math.min(result.selectedRouteIndex, Math.max(0, routes.length - 1));
      const finalRoute = routes[idx] ?? routes[0];
      if (!finalRoute) return;
      setRouteOptions(routes);
      setSelectedRouteIndex(idx);
      setRouteCoordinates(finalRoute.coordinates);
      setSteps(finalRoute.steps);
      setDurationText(finalRoute.durationText);
      setDistanceText(finalRoute.distanceText);
      setCurrentStepIndex(0);

      if (finalRoute.coordinates.length > 1 && mapRef.current) {
        const fitCoords = extendRouteToExactEndpoints(finalRoute.coordinates, from, to);
        mapRef.current.fitToCoordinates(fitCoords, {
          edgePadding: { top: 120, right: 24, bottom: 200, left: 24 },
          animated: true,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load directions';
      setDirectionsError(msg);
      setRouteOptions([]);
      setRouteCoordinates([]);
      setSteps([]);
      setDurationText('');
      setDistanceText('');
      if (msg.includes('API key') || msg.includes('access denied') || msg.includes('REQUEST_DENIED') || msg.includes('Directions API')) {
        Alert.alert(
          'Directions unavailable',
          msg.includes('access denied') || msg.includes('REQUEST_DENIED')
            ? msg
            : 'Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file (see .env.example) and enable the Directions API in Google Cloud Console.\n\nSteps:\n1. Copy .env.example to .env\n2. Add your API key to .env\n3. Go to https://console.cloud.google.com/apis and enable "Directions API"\n4. Restart Expo'
        );
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, [travelMode]);

  // Update route when selection changes
  useEffect(() => {
    if (routeOptions.length > 0 && selectedRouteIndex < routeOptions.length) {
      const selectedRoute = routeOptions[selectedRouteIndex];
      setRouteCoordinates(selectedRoute.coordinates);
      setSteps(selectedRoute.steps);
      setDurationText(selectedRoute.durationText);
      setDistanceText(selectedRoute.distanceText);
      
      if (selectedRoute.coordinates.length > 1 && mapRef.current) {
        mapRef.current.fitToCoordinates(selectedRoute.coordinates, {
          edgePadding: { top: 120, right: 24, bottom: 200, left: 24 },
          animated: true,
        });
      }
    }
  }, [selectedRouteIndex, routeOptions]);

  // Clear routes when search is closed without selecting a destination
  // Only clear if there's no destination but routes are still displayed
  useEffect(() => {
    if (!searchFocused && !destination && !loading && routeCoordinates.length > 0) {
      setRouteOptions([]);
      setRouteCoordinates([]);
      setSteps([]);
      setDurationText('');
      setDistanceText('');
      setSelectedRouteIndex(0);
      setShowAlternateRoutes(false);
      setRouteAvoidanceSummary(null);
    }
  }, [searchFocused, destination, loading, routeCoordinates.length]);

  // Get current location on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loc = await getCurrentLocation();
        if (!cancelled && loc) {
          setOrigin(loc);
          setOriginName('My location');
        }
      } catch {
        // Keep RUTGERS_CENTER
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (params?.openDestination) setSearchFocused(true);
    if (params?.destinationLat != null && params?.destinationLng != null && params?.destinationName) {
      handleSelectPlace({
        name: params.destinationName,
        latitude: params.destinationLat,
        longitude: params.destinationLng,
      });
    } else if (params?.destinationName) {
      setSearchQuery(params.destinationName);
      setSearchFocused(true);
    }
  }, [params?.openDestination, params?.destinationName, params?.destinationLat, params?.destinationLng, handleSelectPlace]);

  // Debounced Google Places autocomplete for destination search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setAutocompletePredictions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchPlaces(searchQuery);
      setAutocompletePredictions(results);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Debounced Google Places autocomplete for origin search
  useEffect(() => {
    if (!originSearchQuery.trim()) {
      setOriginPredictions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchPlaces(originSearchQuery);
      setOriginPredictions(results);
    }, 300);
    return () => clearTimeout(timer);
  }, [originSearchQuery]);

  // Cleanup location tracking on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  // Start/stop compass heading when entering/leaving navigation — deadband + low-pass smoothing
  const lastHeadingRef = useRef<number | null>(null);
  useEffect(() => {
    if (!active) {
      lastHeadingRef.current = null;
      if (headingWatchRef.current) {
        headingWatchRef.current.remove();
        headingWatchRef.current = null;
      }
      return;
    }
    let cancelled = false;
    Location.watchHeadingAsync(
      (headingData) => {
        if (cancelled) return;
        const raw =
          headingData.trueHeading >= 0 ? headingData.trueHeading : headingData.magHeading;
        const last = lastHeadingRef.current;
        const deltaDeg = last != null ? Math.abs(((raw - last + 540) % 360) - 180) : 360;
        // Deadband: only rotate if user actually turns; then smooth
        if (last == null || deltaDeg > HEADING_THRESHOLD) {
          const filtered = last != null ? smoothHeading(last, raw) : raw;
          lastHeadingRef.current = filtered;
          setUserHeading(filtered);
        }
      },
      (err) => {
        if (!cancelled) console.warn('Heading watch error:', err);
      }
    ).then((sub) => {
      if (!cancelled) headingWatchRef.current = sub;
    });
    return () => {
      cancelled = true;
      lastHeadingRef.current = null;
      if (headingWatchRef.current) {
        headingWatchRef.current.remove();
        headingWatchRef.current = null;
      }
    };
  }, [active]);

  const handleSelectPlace = useCallback(
    (place: { name: string; latitude: number; longitude: number }) => {
      setRouteOptions([]);
      setRouteCoordinates([]);
      setSteps([]);
      setDurationText('');
      setDistanceText('');
      setSelectedRouteIndex(0);
      setShowAlternateRoutes(false);

      setDestination({ name: place.name, latitude: place.latitude, longitude: place.longitude });
      setSearchQuery('');
      setAutocompletePredictions([]);
      setSearchFocused(false);
      loadDirections(effectiveOrigin, { latitude: place.latitude, longitude: place.longitude }, travelMode);
    },
    [loadDirections, effectiveOrigin, travelMode]
  );

  const handleSelectPrediction = useCallback(
    async (prediction: PlacePrediction) => {
      setLoading(true);
      const details = await getPlaceDetails(prediction.placeId);
      if (details) {
        handleSelectPlace({ name: details.name, latitude: details.latitude, longitude: details.longitude });
      } else {
        Alert.alert('Location unavailable', 'Could not get details for this place.');
        setLoading(false);
      }
    },
    [handleSelectPlace]
  );

  const handleSelectOrigin = async (useCurrentLocation: boolean) => {
    setShowOriginPicker(false);
    setOriginSearchQuery('');
    setOriginPredictions([]);
    if (useCurrentLocation) {
      const loc = await getCurrentLocation();
      if (loc) {
        setOrigin(loc);
        setOriginName('My location');
        if (destination) {
          loadDirections(loc, { latitude: destination.latitude, longitude: destination.longitude }, travelMode);
        }
      } else {
        Alert.alert('Location unavailable', 'Could not get your current location.');
      }
    }
  };

  const handleSelectOriginPrediction = useCallback(
    async (prediction: PlacePrediction) => {
      const details = await getPlaceDetails(prediction.placeId);
      if (details) {
        setShowOriginPicker(false);
        setOriginSearchQuery('');
        setOriginPredictions([]);
        const newOrigin = { latitude: details.latitude, longitude: details.longitude };
        setOrigin(newOrigin);
        setOriginName(details.name);
        if (destination) {
          loadDirections(newOrigin, { latitude: destination.latitude, longitude: destination.longitude }, travelMode);
        }
      } else {
        Alert.alert('Location unavailable', 'Could not get details for this place.');
      }
    },
    [destination, loadDirections, travelMode]
  );

  const handleChatSend = useCallback((text: string) => {
    const msg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      senderName: 'You',
      text,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, msg]);

    // Simulate officer acknowledgement after 2 seconds (demo)
    setTimeout(() => {
      const reply: ChatMessage = {
        id: `officer-${Date.now()}`,
        sender: 'officer',
        senderName: 'RUPD Dispatch',
        text: 'Copy that. Stay on your current route — an officer is nearby.',
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, reply]);
      if (!showRouteChat) {
        chatUnreadRef.current += 1;
        setChatUnread(chatUnreadRef.current);
      }
    }, 2000);
  }, [showRouteChat]);

  const handleSubmitEscort = async () => {
    if (!escortReason.trim()) {
      Alert.alert('Reason required', 'Please describe why you need an escort.');
      return;
    }
    setIsSubmittingEscort(true);
    try {
      const loc = userLocation ?? (await getCurrentLocation());
      const lat = loc?.latitude ?? origin.latitude;
      const lng = loc?.longitude ?? origin.longitude;

      await submitEscortRequest({
        userId: `user-${Date.now().toString(36)}`,
        userName: 'SafeRoute User',
        userPhone: '',
        origin: {
          lat: origin.latitude,
          lng: origin.longitude,
          name: originName || 'Current Location',
        },
        destination: {
          lat: destination?.latitude ?? lat,
          lng: destination?.longitude ?? lng,
          name: destination?.name ?? 'Nearby',
        },
        currentLocation: { lat, lng },
        routeLabel: destination ? `${originName} → ${destination.name}` : 'Escort from current location',
        priority: escortPriority,
        reason: escortReason.trim(),
      });

      setShowEscortModal(false);
      setEscortReason('');
      Alert.alert(
        'Escort Requested',
        'Your request has been sent to RUPD dispatch. An officer will be assigned shortly.',
        [{ text: 'OK' }]
      );
    } catch {
      Alert.alert('Error', 'Could not submit request. Try calling RUPD at (732) 932-7211.');
    } finally {
      setIsSubmittingEscort(false);
    }
  };

  const handleStartGuiding = async () => {
    // Show contact selection modal if user wants to share location
    if (destination && durationText) {
      const contacts = await getEmergencyContacts();
      if (contacts.length > 0) {
        setAvailableContacts(contacts);
        setShowContactShareModal(true);
        return; // Wait for user to select contact or cancel
      }
    }
    
    // If no contacts or user cancels, proceed without contact sharing
    await startNavigation();
  };

  const startNavigation = async () => {
    setActive(true);
    setCurrentStepIndex(0);
    lastTurnNotificationRef.current = -1;

    // Publish route to Firestore so the dashboard sees it in real-time
    if (destination && routeCoordinates.length > 0) {
      publishActiveRoute({
        userId: deviceUserIdRef.current,
        userName: 'SafeRoute User',
        origin: {
          lat: effectiveOrigin.latitude,
          lng: effectiveOrigin.longitude,
          name: originName || 'Current Location',
        },
        destination: {
          lat: destination.latitude,
          lng: destination.longitude,
          name: destination.name,
        },
        path: routeCoordinates.map((c) => ({ lat: c.latitude, lng: c.longitude })),
        label: `${originName || 'Current Location'} → ${destination.name}`,
        durationText,
        distanceText,
        travelMode,
      }).catch(() => {});
    }

    // Seed demo chat messages from RUPD dispatch
    const now = Date.now();
    setChatMessages([
      {
        id: 'demo-1',
        sender: 'officer',
        senderName: 'RUPD Dispatch',
        text: `Route monitoring active. We can see your path to ${destination?.name ?? 'your destination'}. Stay safe.`,
        timestamp: new Date(now - 2000),
      },
      {
        id: 'demo-2',
        sender: 'officer',
        senderName: 'Ofc. R. Martinez',
        text: 'Be advised — increased patrol on College Ave tonight due to a lighting outage. You should be routed around it.',
        timestamp: new Date(now),
      },
    ]);
    setChatUnread(2);
    chatUnreadRef.current = 2;
    
    // Set 3D mode based on user preference
    setIs3DMode(preferredViewMode === '3d');
    
    // Start sharing location with emergency contacts
    await startRouteLocationSharing();
    
    // Start location tracking for turn-by-turn navigation
    startLocationTracking();
    
    // Start safety monitoring if we have duration and destination
    if (durationText && destination) {
      const estimatedSeconds = parseDurationToSeconds(durationText);
      const arrivalTime = new Date(Date.now() + estimatedSeconds * 1000);
      setEstimatedArrivalTime(arrivalTime);
      
      startSafetyMonitoring(
        estimatedSeconds,
        { latitude: destination.latitude, longitude: destination.longitude },
        destination.name,
        () => {
          // Check-in required callback
          triggerCheckInVibration();
          setShowSafetyCheckIn(true);
          
          // Set timeout for no response (30 seconds)
          checkInTimeoutRef.current = setTimeout(async () => {
            // User didn't respond, send alert
            const currentLoc = await getCurrentLocation();
            await sendSafetyAlert(currentLoc, destination.name, arrivalTime);
            setShowSafetyCheckIn(false);
          }, 30000);
        }
      );
    }
    
    // One-time camera snap: zoom in 400%, lock on user — center = forward offset so user is in lower third.
    const loc = userLocation ?? (await getCurrentLocation());
    if (loc && mapRef.current) {
      const heading = userHeading ?? 0;
      const zoom = travelMode === 'walking' ? NAV_ZOOM_WALKING : NAV_ZOOM_DRIVING;
      const pitch = travelMode === 'walking' ? NAV_PITCH_WALKING : NAV_PITCH_DRIVING;
      const centerAhead = getForwardOffsetCoordinate(
        loc.latitude,
        loc.longitude,
        heading,
        FORWARD_OFFSET_METERS
      );
      mapRef.current.animateCamera(
        {
          center: centerAhead,
          heading,
          pitch,
          zoom,
        },
        { duration: NAV_ENTER_DURATION }
      );
      lastNavCameraUpdateRef.current = Date.now();
    }
  };

  const handleShareWithContact = async (contact: EmergencyContact) => {
    setShowContactShareModal(false);
    
    if (!destination || !durationText) {
      await startNavigation();
      return;
    }

    // Parse duration to get minutes
    const durationMatch = durationText.match(/(\d+)/);
    const estimatedMinutes = durationMatch ? parseInt(durationMatch[1], 10) : 15;
    
    // Start sharing location with selected contact
    const shared = await shareLocationToContact(contact, destination.name, estimatedMinutes);
    
    if (shared) {
      Alert.alert(
        'Location sharing started',
        `Your location is being shared with ${contact.name} until you reach ${destination.name}.`
      );
    }
    
    // Start navigation regardless
    await startNavigation();
  };

  const handleNewRoute = () => {
    removeActiveRoute(deviceUserIdRef.current).catch(() => {});
    setDestination(null);
    setRouteOptions([]);
    setRouteCoordinates([]);
    setSteps([]);
    setDurationText('');
    setDistanceText('');
    setSelectedRouteIndex(0);
    setShowAlternateRoutes(false);
    setRouteAvoidanceSummary(null);
    setShowDirectionsList(false);
    setLiveTimeRemainingText('');
    setLiveArrivalTime(null);
    setDirectionsError(null);
    setActive(false);
    setSearchFocused(true);
    stopLocationTracking();
    
    // Stop safety monitoring
    stopSafetyMonitoring();
    if (checkInTimeoutRef.current) {
      clearTimeout(checkInTimeoutRef.current);
      checkInTimeoutRef.current = null;
    }
    setShowSafetyCheckIn(false);
    setEstimatedArrivalTime(null);

    // Clear chat
    setChatMessages([]);
    setChatUnread(0);
    chatUnreadRef.current = 0;
    setShowRouteChat(false);
    
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...RUTGERS_CENTER,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  };

  const handleEndRoute = async () => {
    removeActiveRoute(deviceUserIdRef.current).catch(() => {});
    setActive(false);
    setCurrentStepIndex(0);
    
    // End location sharing with contact if active
    if (isLocationSharingActive()) {
      await endLocationSharingManually();
    }
    
    setDestination(null);
    setRouteOptions([]);
    setRouteCoordinates([]);
    setSteps([]);
    setDurationText('');
    setDistanceText('');
    setSelectedRouteIndex(0);
    setShowAlternateRoutes(false);
    setRouteAvoidanceSummary(null);
    setShowDirectionsList(false);
    setLiveTimeRemainingText('');
    setLiveArrivalTime(null);
    setDirectionsError(null);
    setIs3DMode(false);
    setCameraConfig(null);
    lastTurnNotificationRef.current = -1;

    // Clear chat
    setChatMessages([]);
    setChatUnread(0);
    chatUnreadRef.current = 0;
    setShowRouteChat(false);
    
    // Stop location tracking
    stopLocationTracking();
    
    // Stop sharing location
    stopRouteLocationSharing();
    stopLocationSharing();
    
    // Stop safety monitoring
    stopSafetyMonitoring();
    if (checkInTimeoutRef.current) {
      clearTimeout(checkInTimeoutRef.current);
      checkInTimeoutRef.current = null;
    }
    setShowSafetyCheckIn(false);
    setEstimatedArrivalTime(null);
    
    // Restore normal north-up map (heading 0, pitch 0)
    if (mapRef.current) {
      const center = userLocation || RUTGERS_CENTER;
      mapRef.current.animateCamera(
        {
          center,
          heading: 0,
          pitch: 0,
          zoom: 16,
        },
        { duration: 500 }
      );
    }
  };

  const update3DCamera = () => {
    if (!is3DMode || !active || routeCoordinates.length < 2) return;

    const currentLoc = userLocation || origin;
    const nextIndex = Math.min(currentStepIndex + 1, routeCoordinates.length - 1);
    const nextWaypoint = routeCoordinates[nextIndex];
    
    // Calculate distance to next waypoint
    const distance = calculateDistance(currentLoc, nextWaypoint);
    
    const config = getWalkingCameraConfig(currentLoc, nextWaypoint, distance);
    setCameraConfig(config);

    // Animate camera to 3D position
    if (mapRef.current && config) {
      mapRef.current.animateCamera(
        {
          center: config.center,
          pitch: config.pitch,
          heading: config.heading,
          altitude: config.altitude,
          zoom: 18, // Close zoom for walking
        },
        { duration: 1000 }
      );
    }
  };

  const update2DCamera = () => {
    if (is3DMode || !active || !userLocation || !mapRef.current) return;
    
    // Follow user location in 2D mode (only used when not in navigation follow mode)
    mapRef.current.animateToRegion({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    });
  };

  /**
   * Navigation camera: forward-biased center + smoothed heading only (no zoom/pitch reset).
   * Optional locationOverride: use when called from the location watcher so camera uses the latest position immediately.
   */
  const updateNavigationCamera = useCallback((locationOverride?: LatLng) => {
    const loc = locationOverride ?? userLocation;
    const isNavigating = active && loc && mapRef.current;
    if (!isNavigating) return;
    const now = Date.now();
    if (now - lastNavCameraUpdateRef.current < NAV_CAMERA_THROTTLE_MS) return;
    lastNavCameraUpdateRef.current = now;

    const heading = userHeading ?? 0;
    const centerAhead = getForwardOffsetCoordinate(
      loc.latitude,
      loc.longitude,
      heading,
      FORWARD_OFFSET_METERS
    );
    mapRef.current!.animateCamera(
      {
        center: centerAhead,
        heading,
      },
      { duration: NAV_CAMERA_DURATION }
    );
  }, [active, userLocation, userHeading]);

  // Keep ref current so the location watcher callback (stable) always runs latest navigation logic
  activeRef.current = active;

  // Navigation mode: camera follows user continuously when state updates (e.g. heading)
  useEffect(() => {
    if (active && userLocation && mapRef.current) {
      updateNavigationCamera();
    }
  }, [active, userLocation, userHeading, updateNavigationCamera]);

  const startLocationTracking = async () => {
    if (locationWatchRef.current) return; // Already watching — arrow stays locked on user
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required for turn-by-turn navigation.');
        return;
      }

      // Start watching location so the arrow is always locked to the user's position
      locationWatchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000, // Update every second so arrow tracks user smoothly
          distanceInterval: 3, // Update every 3 meters
        },
        (location) => {
          const newLocation: LatLng = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setUserLocation(newLocation);
          setOrigin(newLocation);
          // Always run latest navigation logic via ref so it sees current active/route/destination (avoids stale closure)
          onNavigationLocationRef.current(newLocation);
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  const stopLocationTracking = () => {
    if (locationWatchRef.current) {
      locationWatchRef.current.remove();
      locationWatchRef.current = null;
    }
  };

  const checkAndUpdateStep = (currentLoc: LatLng) => {
    if (!active || routeCoordinates.length === 0 || steps.length === 0) return;

    const totalSteps = steps.length;
    if (currentStepIndex >= totalSteps - 1) return;

    // Find the closest point on the route to current location (from current step onward)
    const stepStartRouteIndex = Math.floor((currentStepIndex / totalSteps) * routeCoordinates.length);
    let closestIndex = stepStartRouteIndex;
    let minDistance = Infinity;
    for (let i = stepStartRouteIndex; i < routeCoordinates.length; i++) {
      const distance = calculateDistance(currentLoc, routeCoordinates[i]);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    // Google/Apple style: only advance to next step when user is near that step's point
    const nextStepIndex = currentStepIndex + 1;
    const nextStepStartRouteIndex = Math.min(
      Math.floor((nextStepIndex / totalSteps) * routeCoordinates.length),
      routeCoordinates.length - 1
    );
    const coordAtNextStep = routeCoordinates[nextStepStartRouteIndex];
    const distanceToNextStepPoint = calculateDistance(currentLoc, coordAtNextStep);
    const NEAR_STEP_THRESHOLD_M = 35; // Show next direction when within ~35m of that point

    const hasReachedNextStep = closestIndex >= nextStepStartRouteIndex || distanceToNextStepPoint < NEAR_STEP_THRESHOLD_M;

    if (hasReachedNextStep && nextStepIndex < totalSteps) {
      setCurrentStepIndex(nextStepIndex);
      const nextStep = steps[nextStepIndex];
      if (nextStep && nextStepIndex !== lastTurnNotificationRef.current) {
        showTurnNotification(nextStep, distanceToNextStepPoint);
        lastTurnNotificationRef.current = nextStepIndex;
      }
    }

    // Check if reached destination
    if (destination) {
      const distanceToDestination = calculateDistance(currentLoc, {
        latitude: destination.latitude,
        longitude: destination.longitude,
      });
      
      if (distanceToDestination < 20) {
        // Reached destination - this is a route change, check quiet mode
        // Note: "Arrived" is a critical route change, but per requirements,
        // all route changes should be suppressed in quiet mode
        if (shouldShowRouteChangeNotification()) {
          Alert.alert(
            'Arrived',
            `You have arrived at ${destination.name}`,
            [{ text: 'OK', onPress: handleEndRoute }]
          );
        } else {
          // Still end the route silently if quiet mode is on
          handleEndRoute();
        }
      }
    }
  };

  const formatReportTime = (date: Date): string => {
    const now = Date.now();
    const diff = (now - date.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const showTurnNotification = (step: RouteStep, distance: number) => {
    // Check quiet mode - route change notifications are suppressed when quiet mode is enabled
    if (!shouldShowRouteChangeNotification()) {
      return;
    }
    
    const distanceText = distance < 10 ? 'Now' : `${Math.round(distance)}m`;
    
    // Show alert for important turns
    if (step.instruction.toLowerCase().includes('turn') || 
        step.instruction.toLowerCase().includes('left') ||
        step.instruction.toLowerCase().includes('right')) {
      Alert.alert(
        'Turn Ahead',
        `${step.instruction} in ${distanceText}`,
        [{ text: 'OK' }],
        { cancelable: true }
      );
    }
  };

  // On mount: fetch user location so map can start centered on them
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loc = await getCurrentLocation();
      if (!cancelled && loc) setUserLocation(loc);
    })();
    return () => { cancelled = true; };
  }, []);

  // When Map tab is focused: start location tracking so the arrow stays locked on user
  useFocusEffect(
    useCallback(() => {
      startLocationTracking();
      return () => {
        if (!active) stopLocationTracking();
      };
    }, [active])
  );

  // Whenever user navigates to the map tab, recenter on current location (one-shot)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const loc = await getCurrentLocation();
        if (cancelled || !loc || !mapRef.current) return;
        setUserLocation(loc);
        mapRef.current.animateToRegion({
          latitude: loc.latitude,
          longitude: loc.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
      })();
      return () => { cancelled = true; };
    }, [])
  );

  // When we have user location and haven't centered yet (initial load), center map on user (once)
  useEffect(() => {
    if (!userLocation || hasCenteredOnUserRef.current || !mapRef.current) return;
    hasCenteredOnUserRef.current = true;
    mapRef.current.animateToRegion({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  }, [userLocation]);

  // Live ETA and time remaining during navigation (updates as user moves)
  useEffect(() => {
    if (!active || !userLocation || !destination || routeCoordinates.length < 2) {
      setLiveTimeRemainingText('');
      setLiveArrivalTime(null);
      return;
    }
    const distanceRemainingMeters = calculateDistance(userLocation, {
      latitude: destination.latitude,
      longitude: destination.longitude,
    });
    let totalRouteDistanceMeters = 0;
    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      totalRouteDistanceMeters += calculateDistance(routeCoordinates[i], routeCoordinates[i + 1]);
    }
    const selectedRoute = routeOptions[selectedRouteIndex];
    const totalDurationMinutes = selectedRoute?.durationMinutes ?? parseDurationToSeconds(durationText) / 60;
    const remainingMinutes =
      totalRouteDistanceMeters > 0
        ? Math.max(0, (distanceRemainingMeters / totalRouteDistanceMeters) * totalDurationMinutes)
        : 0;
    setLiveTimeRemainingText(
      remainingMinutes < 0.5 ? 'Arriving' : remainingMinutes < 1 ? '< 1 min' : `${Math.round(remainingMinutes)} min`
    );
    setLiveArrivalTime(new Date(Date.now() + remainingMinutes * 60 * 1000));
  }, [active, userLocation, destination, routeCoordinates, routeOptions, selectedRouteIndex, durationText]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      stopSafetyMonitoring();
      if (checkInTimeoutRef.current) {
        clearTimeout(checkInTimeoutRef.current);
      }
    };
  }, []);

  // Subscribe to community posts when in navigation mode for recent reports
  useEffect(() => {
    if (!active || !destination || routeCoordinates.length === 0) {
      setRecentReports([]);
      return;
    }
    const unsub = subscribePosts(
      (posts) => setRecentReports(posts.slice(0, 5)),
      () => setRecentReports([])
    );
    return () => {
      if (unsub) unsub();
    };
  }, [active, destination, routeCoordinates.length]);

  // Get route color based on traffic level and selection (Google/Apple standard)
  const getRouteColor = (route: RouteOption, mode: TravelMode, isSelected: boolean): string => {
    if (!isSelected) {
      return colors.routeAlternate;
    }
    // Walking: no traffic concept — use green (free flow)
    if (mode === 'walking') {
      return colors.routeTrafficFree;
    }
    // Driving: Google/Apple standard — Green / Orange / Red / Dark red
    switch (route.trafficLevel) {
      case 'severe':
        return colors.routeTrafficSevere;   // Dark red — very slow / stop-and-go
      case 'heavy':
        return colors.routeTrafficHeavy;    // Red — traffic delays
      case 'moderate':
        return colors.routeTrafficModerate; // Orange — medium traffic
      case 'light':
      default:
        return colors.routeTrafficFree;     // Green — no delays
    }
  };

  const calculateDistance = (from: LatLng, to: LatLng): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (from.latitude * Math.PI) / 180;
    const φ2 = (to.latitude * Math.PI) / 180;
    const Δφ = ((to.latitude - from.latitude) * Math.PI) / 180;
    const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  /** Ensure route polyline starts at exact origin and ends at exact destination.
   *  directions.ts already pins endpoints, but this acts as a safety net for
   *  rendering — guarantees the drawn line meets the markers. */
  const extendRouteToExactEndpoints = useCallback(
    (coords: LatLng[], originPt: LatLng | null, destPt: { latitude: number; longitude: number } | null): LatLng[] => {
      if (coords.length < 2) return coords;
      const result = [...coords];
      const DEDUP_M = 3;
      if (originPt) {
        if (calculateDistance(originPt, result[0]) > DEDUP_M) {
          result.unshift(originPt);
        } else {
          result[0] = originPt;
        }
      }
      if (destPt) {
        if (calculateDistance(result[result.length - 1], destPt) > DEDUP_M) {
          result.push(destPt);
        } else {
          result[result.length - 1] = destPt;
        }
      }
      return result;
    },
    [calculateDistance]
  );

  // Location watcher calls this ref so navigation logic always sees current active/route/destination (avoids stale closure)
  useEffect(() => {
    onNavigationLocationRef.current = (loc: LatLng) => {
      if (!activeRef.current) return;
      updateNavigationCamera(loc);
      checkAndUpdateStep(loc);
      if (destination && !showSafetyCheckIn) {
        const distance = calculateDistance(loc, {
          latitude: destination.latitude,
          longitude: destination.longitude,
        });
        if (distance < 50) {
          if (isLocationSharingActive()) endLocationSharingManually().catch(console.error);
          stopSafetyMonitoring();
          if (checkInTimeoutRef.current) {
            clearTimeout(checkInTimeoutRef.current);
            checkInTimeoutRef.current = null;
          }
          setShowSafetyCheckIn(false);
          setEstimatedArrivalTime(null);
        }
      }
    };
  }, [active, updateNavigationCamera, checkAndUpdateStep, destination, showSafetyCheckIn, calculateDistance]);

  /** Apply map type (Map/Satellite) and optionally 2D/3D from the inner menu */
  const applyMapView = (newMapType?: 'standard' | 'satellite', new3D?: boolean) => {
    if (newMapType !== undefined) setMapType(newMapType);
    if (new3D !== undefined) {
      setIs3DMode(new3D);
      setPreferredViewMode(new3D ? '3d' : '2d');
      if (mapRef.current) {
        if (new3D) {
          if (active && routeCoordinates.length > 0) {
            setTimeout(() => update3DCamera(), 0);
          } else {
            mapRef.current.getCamera().then((c) => {
              mapRef.current?.animateCamera(
                {
                  center: c.center || INITIAL_REGION,
                  pitch: 45,
                  heading: c.heading || 0,
                  altitude: 1000,
                  zoom: c.zoom || 16,
                },
                { duration: 500 }
              );
            }).catch(() => {});
          }
        } else {
          if (active && userLocation) {
            mapRef.current.animateToRegion({
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            });
          } else {
            mapRef.current.getCamera().then((c) => {
              mapRef.current?.animateCamera(
                { center: c.center || INITIAL_REGION, pitch: 0, heading: 0, altitude: 0, zoom: c.zoom || 16 },
                { duration: 500 }
              );
            }).catch(() => {});
          }
        }
      }
    }
  };

  const toggle3DMode = async () => {
    const newMode = !is3DMode;
    setIs3DMode(newMode);
    setPreferredViewMode(newMode ? '3d' : '2d');
    
    if (mapRef.current) {
      if (newMode) {
        // Switch to 3D mode
        if (active && routeCoordinates.length > 0) {
          update3DCamera();
        } else {
          // When not navigating, set a 3D camera view
          try {
            const currentCamera = await mapRef.current.getCamera();
            mapRef.current.animateCamera(
              {
                center: currentCamera.center || INITIAL_REGION,
                pitch: 45,
                heading: currentCamera.heading || 0,
                altitude: 1000,
                zoom: currentCamera.zoom || 16,
              },
              { duration: 500 }
            );
          } catch (error) {
            // Fallback if getCamera fails
            mapRef.current.animateCamera(
              {
                center: INITIAL_REGION,
                pitch: 45,
                heading: 0,
                altitude: 1000,
                zoom: 16,
              },
              { duration: 500 }
            );
          }
        }
      } else {
        // Switch to 2D mode
        if (active && userLocation) {
          // Return to 2D view - center on user location
          mapRef.current.animateToRegion({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });
        } else {
          // When not navigating, reset to 2D view
          try {
            const currentCamera = await mapRef.current.getCamera();
            mapRef.current.animateCamera(
              {
                center: currentCamera.center || INITIAL_REGION,
                pitch: 0,
                heading: 0,
                altitude: 0,
                zoom: currentCamera.zoom || 16,
              },
              { duration: 500 }
            );
          } catch (error) {
            // Fallback if getCamera fails
            mapRef.current.animateToRegion({
              ...INITIAL_REGION,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            });
          }
        }
        setCameraConfig(null);
      }
    }
  };

  const showSearchResults = searchFocused && !active;
  const hasRoute = routeCoordinates.length > 0 && destination;
  const showRouteCard = (hasRoute || loading || directionsError) && destination;
  const isGuiding = active && hasRoute;
  // User is at start if they chose "My location" or are within ~50 m of the route start
  const isUserAtStart =
    originName === 'My location' ||
    (userLocation != null && routeCoordinates.length > 0 && calculateDistance(origin, userLocation) < 50);
  const currentStep = steps[currentStepIndex];

  return (
    <View style={styles.container}>
      {!isGuiding && (
        <SafeAreaView style={styles.header} edges={['top']}>
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.headerContent}>
            <SafeRouteLogo width={140} height={36} showText={false} />
            <View style={styles.headerRightButtons}>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => setShowMapViewMenu(true)}
                accessibilityLabel={`${is3DMode ? '3D' : '2D'} ${mapType === 'satellite' ? 'Satellite' : 'Regular'} — tap to change view`}
                activeOpacity={0.7}
              >
                <View3DIcon color={is3DMode ? colors.tabActive : colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      )}
      {/* ── Google/Apple-style navigation guidance ── */}
      {isGuiding && (
        <>
          {/* Top instruction banner */}
          <SafeAreaView style={styles.navBanner} edges={['top']}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.navBannerContent}>
              <View style={styles.navBannerInstruction}>
                <Text style={styles.navBannerArrow}>
                  {currentStep?.instruction?.toLowerCase().includes('left') ? '↰'
                    : currentStep?.instruction?.toLowerCase().includes('right') ? '↱'
                    : currentStep?.instruction?.toLowerCase().includes('u-turn') ? '↩'
                    : '↑'}
                </Text>
                <View style={styles.navBannerTextBlock}>
                  <Text style={styles.navBannerDistance} numberOfLines={1}>
                    {currentStep?.distance ?? ''}
                  </Text>
                  <Text style={styles.navBannerText} numberOfLines={2}>
                    {currentStep ? currentStep.instruction : (destination?.name ?? 'Navigation')}
                  </Text>
                </View>
              </View>
              <View style={styles.navBannerActions}>
                <TouchableOpacity
                  style={styles.navChatButton}
                  onPress={() => { setShowRouteChat(true); setChatUnread(0); chatUnreadRef.current = 0; }}
                  activeOpacity={0.7}
                  accessibilityLabel="Open safety chat"
                >
                  <Text style={styles.navChatIcon}>💬</Text>
                  {chatUnread > 0 && (
                    <View style={styles.chatBadge}>
                      <Text style={styles.chatBadgeText}>{chatUnread}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.navEscortPill}
                  onPress={() => {
                    setEscortReason('');
                    setEscortPriority('urgent');
                    setShowEscortModal(true);
                  }}
                  activeOpacity={0.7}
                  accessibilityLabel="Request RUPD escort"
                >
                  <SafeRouteLogo width={22} height={22} showText={false} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </>
      )}

      {!isGuiding && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.searchContainer, { top: searchBarTop }]}
        >
          {/* Origin and mode selector */}
          <View style={styles.routeOptions}>
            <TouchableOpacity
              style={styles.originButton}
              onPress={() => setShowOriginPicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.originButtonText}>From: {originName}</Text>
            </TouchableOpacity>
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[styles.modeButton, travelMode === 'walking' && styles.modeButtonActive]}
                onPress={() => {
                  setTravelMode('walking');
                  // Clear old routes before loading new ones
                  setRouteOptions([]);
                  setRouteCoordinates([]);
                  if (destination) {
                    loadDirections(effectiveOrigin, { latitude: destination.latitude, longitude: destination.longitude }, 'walking');
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.modeButtonText, travelMode === 'walking' && styles.modeButtonTextActive]}>
                  Walking
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, travelMode === 'driving' && styles.modeButtonActive]}
                onPress={() => {
                  setTravelMode('driving');
                  // Clear old routes before loading new ones
                  setRouteOptions([]);
                  setRouteCoordinates([]);
                  if (destination) {
                    loadDirections(origin, { latitude: destination.latitude, longitude: destination.longitude }, 'driving');
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.modeButtonText, travelMode === 'driving' && styles.modeButtonTextActive]}>
                  Driving
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <BlurView intensity={95} tint="dark" style={styles.searchBarBlur}>
            <TouchableOpacity
              style={styles.searchBar}
              onPress={() => setSearchFocused(true)}
              activeOpacity={0.9}
            >
              <View style={styles.searchIconContainer}>
                <SearchIcon color={colors.textSecondary} />
              </View>
              {destination && !searchFocused ? (
                <Text style={styles.searchPlaceholder} numberOfLines={1}>
                  To: {destination.name}
                </Text>
              ) : (
                <TextInput
                  style={styles.searchInput}
                  placeholder="Where to?"
                  placeholderTextColor={colors.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onFocus={() => setSearchFocused(true)}
                  returnKeyType="search"
                  editable={!isGuiding}
                />
              )}
            </TouchableOpacity>
          </BlurView>
          {showSearchResults && (
            <BlurView intensity={95} tint="dark" style={styles.suggestionsBlur}>
              <ScrollView
                style={styles.suggestions}
                contentContainerStyle={styles.suggestionsContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                {searchQuery.trim().length === 0 ? (
                  <Text style={styles.suggestionsTitle}>Type to search any location</Text>
                ) : autocompletePredictions.length > 0 ? (
                  <>
                    <Text style={styles.suggestionsTitle}>Results</Text>
                    {autocompletePredictions.map((p) => (
                      <TouchableOpacity
                        key={p.placeId}
                        style={styles.suggestionRow}
                        onPress={() => handleSelectPrediction(p)}
                        activeOpacity={0.7}
                        disabled={loading}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.suggestionName}>{p.name}</Text>
                          <Text style={styles.suggestionSubtitle} numberOfLines={1}>{p.address}</Text>
                        </View>
                        <ChevronRightIcon />
                      </TouchableOpacity>
                    ))}
                  </>
                ) : (
                  <Text style={styles.suggestionsTitle}>No results found</Text>
                )}
              </ScrollView>
            </BlurView>
          )}
        </KeyboardAvoidingView>
      )}

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        mapType={mapType}
        customMapStyle={mapType === 'standard' ? DARK_MAP_STYLES : undefined}
        showsUserLocation={false}
        showsMyLocationButton
        showsCompass
        pitchEnabled={!active}
        rotateEnabled={!active}
        scrollEnabled={!active}
        zoomEnabled={!active}
        showsBuildings={is3DMode}
        showsIndoors={false}
        loadingEnabled
      >
        {/* Crime safety: danger zones — gradient red matching dashboard heatmap palette */}
        {showCrimeHeatmap && dangerZonePolygonsWithScore.length > 0 && (
          <>
            {dangerZonePolygonsWithScore.map((zone: DangerZoneWithScore, idx: number) => {
              const t = zone.riskScore / 100;
              const fillOpacity = 0.05 + t * 0.35;
              const strokeOpacity = 0.15 + t * 0.45;
              return (
                <Polygon
                  key={`danger-${idx}`}
                  coordinates={zone.coordinates}
                  fillColor={`rgba(225,6,0,${fillOpacity})`}
                  strokeColor={`rgba(225,6,0,${strokeOpacity})`}
                  strokeWidth={1}
                  zIndex={10}
                  tappable
                  onPress={() => setSelectedZoneIncidents(CrimeHeatmap.getIncidentsInPolygon(zone.coordinates))}
                />
              );
            })}
          </>
        )}
        {/* Hazard zones from RUPD broadcasts — matches dashboard style */}
        {showHazardZones && ACTIVE_HAZARD_ZONES.map((zone) => {
          const centroid = zone.polygon.reduce(
            (acc, p) => ({ latitude: acc.latitude + p.latitude / zone.polygon.length, longitude: acc.longitude + p.longitude / zone.polygon.length }),
            { latitude: 0, longitude: 0 },
          );
          return (
            <React.Fragment key={`hazard-${zone.id}`}>
              <Polygon
                coordinates={zone.polygon}
                fillColor="rgba(255,59,48,0.06)"
                strokeColor="rgba(255,59,48,0.6)"
                strokeWidth={1.5}
                zIndex={8}
                tappable
                onPress={() => Alert.alert(zone.title, zone.message)}
              />
              <Marker
                coordinate={centroid}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
                zIndex={9}
                onPress={() => Alert.alert(zone.title, zone.message)}
              >
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  backgroundColor: 'rgba(255,59,48,0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,59,48,0.5)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#FF3B30' }}>!</Text>
                </View>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Lighting condition markers — dashboard-style sensor icons */}
        {showLightingOverlay && LIGHTING_CONDITIONS.map((light) => {
          const color = light.condition === 'dark' ? '#E10600' : light.condition === 'dim' ? '#FFD60A' : '#2ECC71';
          return (
            <Marker
              key={`light-${light.id}`}
              coordinate={light.location}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              zIndex={12}
              title={light.label}
              description={light.condition === 'dark' ? 'Lighting out — use caution' : light.condition === 'dim' ? 'Low lighting' : 'Well lit'}
            >
              <View style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                backgroundColor: 'rgba(10,10,10,0.92)',
                borderWidth: 1.2,
                borderColor: color,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
                  <Circle cx="8" cy="8" r="3" fill={color} opacity="0.9" />
                  <Line x1="8" y1="1" x2="8" y2="4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                  <Line x1="8" y1="12" x2="8" y2="15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                  <Line x1="1" y1="8" x2="4" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                  <Line x1="12" y1="8" x2="15" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
              </View>
            </Marker>
          );
        })}

        {/* Acoustic anomaly markers — dashboard-style sensor icons */}
        {showLightingOverlay && ACOUSTIC_ANOMALIES.map((anomaly) => (
          <Marker
            key={`acoustic-${anomaly.id}`}
            coordinate={anomaly.location}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            zIndex={13}
            title={anomaly.label}
            description={anomaly.description}
          >
            <View style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              backgroundColor: 'rgba(10,10,10,0.92)',
              borderWidth: 1.2,
              borderColor: '#FF6B35',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
                <Line x1="2" y1="6" x2="2" y2="10" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" />
                <Line x1="5.5" y1="4" x2="5.5" y2="12" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" />
                <Line x1="9" y1="2" x2="9" y2="14" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" />
                <Line x1="12.5" y1="5" x2="12.5" y2="11" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" />
              </Svg>
            </View>
          </Marker>
        ))}

        {/* Render all route options; extend to exact origin/destination so line starts/ends at requested location */}
        {routeOptions.map((route, index) => {
          const isSelected = index === selectedRouteIndex;
          const routeColor = getRouteColor(route, travelMode, isSelected);
          const displayCoords = extendRouteToExactEndpoints(route.coordinates, effectiveOrigin, destination);
          return (
            <Polyline
              key={`route-${index}`}
              coordinates={displayCoords}
              strokeColor={routeColor}
              strokeWidth={isSelected ? 6 : 4}
              lineDashPattern={isSelected ? undefined : [5, 5]}
              zIndex={isSelected ? 1 : 0}
            />
          );
        })}
        
        {/* Custom user location pointer — always locked to latest user position */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={false}
          >
            <UserLocationPointer
              navigationMode={active}
              heading={userHeading ?? 0}
              size={35}
            />
          </Marker>
        )}
        
        {/* Destination marker */}
        {destination && (
          <Marker
            coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
            title={destination.name}
            pinColor={colors.primaryRed}
          />
        )}
      </MapView>

      {!destination && !showSearchResults && (
        <View style={[styles.emptyMapHint, { bottom: bottomCardBottom + 80 }]} pointerEvents="none">
          <Text style={styles.emptyMapText}>
            Tap "Where to?" to choose a destination and get directions.
          </Text>
        </View>
      )}

      {/* Map view menu: Map/Satellite + 2D/3D (button within button) */}
      <Modal
        visible={showMapViewMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMapViewMenu(false)}
      >
        <Pressable style={styles.mapViewMenuOverlay} onPress={() => setShowMapViewMenu(false)}>
          <Pressable style={[styles.mapViewMenuCard, { top: insets.top + HEADER_BAR_HEIGHT + 8 }]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.mapViewMenuTitle}>Map view</Text>
            <View style={styles.mapViewMenuRow}>
              <Text style={styles.mapViewMenuLabel}>Map type</Text>
              <View style={styles.mapViewMenuOptions}>
                <TouchableOpacity
                  style={[styles.mapViewMenuOption, mapType === 'standard' && styles.mapViewMenuOptionActive]}
                  onPress={() => { applyMapView('standard'); setShowMapViewMenu(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.mapViewMenuOptionText, mapType === 'standard' && styles.mapViewMenuOptionTextActive]}>Map</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mapViewMenuOption, mapType === 'satellite' && styles.mapViewMenuOptionActive]}
                  onPress={() => { applyMapView('satellite'); setShowMapViewMenu(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.mapViewMenuOptionText, mapType === 'satellite' && styles.mapViewMenuOptionTextActive]}>Satellite</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.mapViewMenuRow}>
              <Text style={styles.mapViewMenuLabel}>View</Text>
              <View style={styles.mapViewMenuOptions}>
                <TouchableOpacity
                  style={[styles.mapViewMenuOption, !is3DMode && styles.mapViewMenuOptionActive]}
                  onPress={() => { applyMapView(undefined, false); setShowMapViewMenu(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.mapViewMenuOptionText, !is3DMode && styles.mapViewMenuOptionTextActive]} numberOfLines={1}>2D</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mapViewMenuOption, is3DMode && styles.mapViewMenuOptionActive]}
                  onPress={() => { applyMapView(undefined, true); setShowMapViewMenu(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.mapViewMenuOptionText, is3DMode && styles.mapViewMenuOptionTextActive]} numberOfLines={1}>3D</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.mapViewMenuRow}>
              <Text style={styles.mapViewMenuLabel}>Safety overlays</Text>
              <View style={styles.mapViewMenuOptions}>
                <TouchableOpacity
                  style={[styles.mapViewMenuOption, showCrimeHeatmap && styles.mapViewMenuOptionActive]}
                  onPress={() => setShowCrimeHeatmap(!showCrimeHeatmap)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.mapViewMenuOptionText, showCrimeHeatmap && styles.mapViewMenuOptionTextActive]}>
                    Risk areas
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mapViewMenuOption, showLightingOverlay && styles.mapViewMenuOptionActive]}
                  onPress={() => setShowLightingOverlay(!showLightingOverlay)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.mapViewMenuOptionText, showLightingOverlay && styles.mapViewMenuOptionTextActive]}>
                    Lighting
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.mapViewMenuRow}>
              <Text style={styles.mapViewMenuLabel}>Alerts</Text>
              <TouchableOpacity
                style={[styles.mapViewMenuOption, showHazardZones && styles.mapViewMenuOptionActive]}
                onPress={() => { setShowHazardZones(!showHazardZones); setShowMapViewMenu(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.mapViewMenuOptionText, showHazardZones && styles.mapViewMenuOptionTextActive]}>
                  {showHazardZones ? 'Hazard zones on' : 'Hazard zones off'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Danger zone incident list — tap a red zone to see what happened */}
      <Modal
        visible={selectedZoneIncidents !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedZoneIncidents(null)}
      >
        <Pressable
          style={styles.placesOverlay}
          onPress={() => setSelectedZoneIncidents(null)}
        >
          <Pressable style={styles.zoneIncidentsSheet} onPress={(e) => e.stopPropagation()}>
            <SafeAreaView style={styles.zoneIncidentsInner} edges={['bottom']}>
              <View style={styles.zoneIncidentsHeader}>
                <Text style={styles.zoneIncidentsTitle}>What you're avoiding</Text>
                <Text style={styles.zoneIncidentsSubtitle}>Incidents in this area</Text>
                <TouchableOpacity
                  onPress={() => setSelectedZoneIncidents(null)}
                  style={styles.zoneIncidentsCloseBtn}
                >
                  <Text style={styles.placesCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.zoneIncidentsScroll}
                contentContainerStyle={styles.zoneIncidentsContent}
                showsVerticalScrollIndicator={true}
              >
                {selectedZoneIncidents?.map((inc, i) => (
                  <View key={inc.incident_id || i} style={styles.zoneIncidentRow}>
                    <View style={styles.zoneIncidentBullet} />
                    <View style={styles.zoneIncidentText}>
                      <Text style={styles.zoneIncidentType}>{inc.crime_type}</Text>
                      <Text style={styles.zoneIncidentLocation}>{inc.location_name}</Text>
                      {inc.campus ? (
                        <Text style={styles.zoneIncidentCampus}>{inc.campus} · Severity {inc.severity_score}</Text>
                      ) : (
                        <Text style={styles.zoneIncidentCampus}>Severity {inc.severity_score}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Origin picker: choose start point */}
      <Modal
        visible={showOriginPicker}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowOriginPicker(false); setOriginSearchQuery(''); setOriginPredictions([]); }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <Pressable
            style={styles.placesOverlay}
            onPress={() => { setShowOriginPicker(false); setOriginSearchQuery(''); setOriginPredictions([]); }}
          >
            <Pressable style={styles.placesSheet} onPress={(e) => e.stopPropagation()}>
              <SafeAreaView style={styles.placesSheetInner} edges={['bottom']}>
                <View style={styles.placesHeader}>
                  <Text style={styles.placesTitle}>Choose start</Text>
                  <TouchableOpacity
                    onPress={() => { setShowOriginPicker(false); setOriginSearchQuery(''); setOriginPredictions([]); }}
                    style={styles.placesCloseBtn}
                  >
                    <Text style={styles.placesCloseText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.originSearchContainer}>
                  <View style={styles.searchIconContainer}>
                    <SearchIcon color={colors.textSecondary} />
                  </View>
                  <TextInput
                    style={styles.originSearchInput}
                    placeholder="Search for a starting location"
                    placeholderTextColor={colors.textTertiary}
                    value={originSearchQuery}
                    onChangeText={setOriginSearchQuery}
                    returnKeyType="search"
                    autoFocus
                  />
                </View>
                <ScrollView
                  style={styles.placesScroll}
                  contentContainerStyle={styles.placesScrollContent}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                >
                  <TouchableOpacity
                    style={styles.originPickerCurrentRow}
                    onPress={() => handleSelectOrigin(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.originPickerCurrentText}>Use my location</Text>
                    <ChevronRightIcon color={colors.textSecondary} />
                  </TouchableOpacity>
                  {originPredictions.map((p) => (
                    <TouchableOpacity
                      key={p.placeId}
                      style={styles.placeRow}
                      onPress={() => handleSelectOriginPrediction(p)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.placeRowText}>
                        <Text style={styles.placeName}>{p.name}</Text>
                        <Text style={styles.placeSubtitle} numberOfLines={1}>{p.address}</Text>
                      </View>
                      <ChevronRightIcon />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </SafeAreaView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {showRouteCard && (
        <View
          style={[
            styles.cardWrapper,
            { bottom: isGuiding ? insets.bottom + TAB_BAR_HEIGHT + spacing.lg : bottomCardBottom },
            isGuiding && styles.cardWrapperGuiding,
          ]}
        >
          <View style={[styles.card, isGuiding && styles.cardGuiding]}>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.tabActive} />
                <Text style={styles.loadingText}>Getting directions…</Text>
              </View>
            ) : directionsError ? (
              <View style={styles.errorBlock}>
                <Text style={styles.errorTitle}>Could not load route</Text>
                <Text style={styles.errorDetail}>{directionsError}</Text>
                <Button
                  title="Try again"
                  variant="outline"
                  fullWidth
                  onPress={() =>
                    destination && loadDirections(effectiveOrigin, { latitude: destination.latitude, longitude: destination.longitude })
                  }
                  style={styles.cardButton}
                />
                <TouchableOpacity onPress={handleNewRoute} style={styles.newRouteLink}>
                  <Text style={styles.newRouteText}>New route</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {!isGuiding && (
                  <>
                    <View style={styles.cardTitleRow}>
                      <View style={styles.checkIconWrapper}>
                        <CheckIcon color={colors.secondaryGreen} />
                      </View>
                      <Text style={styles.cardTitle} numberOfLines={1}>Route to {destination?.name ?? ''}</Text>
                    </View>
                    <Text style={styles.cardSubtitle}>
                      {durationText} · {distanceText}
                      {routeAvoidanceSummary && routeAvoidanceSummary.length > 0 && ' · Fastest safe route'}
                    </Text>
                    {routeAvoidanceSummary && routeAvoidanceSummary.length > 0 && (
                      <View style={styles.avoidanceBlock}>
                        <Text style={styles.avoidanceLabel}>Avoiding high-crime areas:</Text>
                        {routeAvoidanceSummary.slice(0, 2).map((s, i) => (
                          <Text key={i} style={styles.avoidanceText} numberOfLines={2}>
                            {s.areaName} — {s.reason}
                          </Text>
                        ))}
                      </View>
                    )}
                    {/* Directions list when user is not at start (path on map + list) */}
                    {showDirectionsList && steps.length > 0 && (
                      <View style={styles.directionsListBlock}>
                        <Text style={styles.directionsListTitle}>
                          From {originName} to {destination?.name ?? ''}
                        </Text>
                        <ScrollView
                          style={styles.directionsListScroll}
                          contentContainerStyle={styles.directionsListContent}
                          showsVerticalScrollIndicator={true}
                          nestedScrollEnabled
                        >
                          {steps.map((step, i) => (
                            <View key={i} style={styles.directionsListItem}>
                              <Text style={styles.directionsListNumber}>{i + 1}</Text>
                              <Text style={styles.directionsListInstruction}>{step.instruction}</Text>
                              <Text style={styles.directionsListMeta}>{step.distance} · {step.duration}</Text>
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                    {/* When not showing directions list: alternate routes (only if user is at start) */}
                    {!showDirectionsList && isUserAtStart && routeOptions.length > 1 && (
                      <View style={styles.alternateRoutesContainer}>
                        <TouchableOpacity
                          onPress={() => setShowAlternateRoutes(!showAlternateRoutes)}
                          style={styles.alternateRoutesHeader}
                        >
                          <Text style={styles.alternateRoutesTitle}>
                            {routeOptions.length - 1} alternate route{routeOptions.length > 2 ? 's' : ''}
                          </Text>
                          <Text style={styles.alternateRoutesToggle}>
                            {showAlternateRoutes ? 'Hide' : 'Show'}
                          </Text>
                        </TouchableOpacity>
                        
                        {showAlternateRoutes && (
                          <View style={styles.alternateRoutesList}>
                            {routeOptions.map((route, index) => {
                              if (index === selectedRouteIndex) return null;
                              const currentRoute = routeOptions[selectedRouteIndex];
                              const timeDiff = route.durationMinutes - (currentRoute?.durationMinutes ?? 0);
                              const distanceDiff = route.distanceMiles - (currentRoute?.distanceMiles ?? 0);
                              
                              return (
                                <TouchableOpacity
                                  key={index}
                                  style={[
                                    styles.alternateRouteItem,
                                    index === selectedRouteIndex && styles.alternateRouteItemSelected,
                                  ]}
                                  onPress={() => setSelectedRouteIndex(index)}
                                >
                                  <View style={styles.alternateRouteInfo}>
                                    <Text style={styles.alternateRouteTime}>{route.durationText}</Text>
                                    <Text style={styles.alternateRouteDistance}>{route.distanceText}</Text>
                                  </View>
                                  <View style={styles.alternateRouteDiff}>
                                    {timeDiff !== 0 && (
                                      <Text style={[
                                        styles.alternateRouteDiffText,
                                        timeDiff > 0 ? styles.alternateRouteDiffPositive : styles.alternateRouteDiffNegative,
                                      ]}>
                                        {timeDiff > 0 ? '+' : ''}{timeDiff} min
                                      </Text>
                                    )}
                                    {distanceDiff !== 0 && (
                                      <Text style={[
                                        styles.alternateRouteDiffText,
                                        distanceDiff > 0 ? styles.alternateRouteDiffPositive : styles.alternateRouteDiffNegative,
                                      ]}>
                                        {distanceDiff > 0 ? '+' : ''}{distanceDiff.toFixed(1)} mi
                                      </Text>
                                    )}
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    )}
                  </>
                )}
                {isGuiding && (
                  <View style={styles.guidingBottomBar}>
                    <View style={styles.guidingEtaRow}>
                      <View style={styles.guidingEtaLeft}>
                        <Text style={styles.guidingEtaBig} numberOfLines={1}>
                          {liveTimeRemainingText || durationText || '—'}
                        </Text>
                        <Text style={styles.guidingEtaDetail} numberOfLines={1}>
                          {distanceText}{liveArrivalTime ? ` · ${liveArrivalTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.guidingEndBtn} onPress={handleEndRoute} activeOpacity={0.7}>
                        <Text style={styles.guidingEndBtnText}>End</Text>
                      </TouchableOpacity>
                    </View>
                    {routeAvoidanceSummary && routeAvoidanceSummary.length > 0 && (
                      <Text style={styles.guidingAvoidanceText} numberOfLines={1}>
                        Safe route — avoiding: {routeAvoidanceSummary.map((s) => s.areaName).join(', ')}
                      </Text>
                    )}
                  </View>
                )}
                <View style={[styles.cardButtons, isGuiding && styles.cardButtonsGuiding]}>
                  {isGuiding ? (
                    <View />
                  ) : showDirectionsList ? (
                    <>
                      <Button
                        title="Close"
                        variant="outline"
                        fullWidth
                        onPress={() => setShowDirectionsList(false)}
                        style={styles.cardButton}
                      />
                      <TouchableOpacity onPress={handleNewRoute} style={styles.newRouteLink}>
                        <Text style={styles.newRouteText}>New route</Text>
                      </TouchableOpacity>
                    </>
                  ) : isUserAtStart ? (
                    <>
                      <Button
                        title="Start navigation"
                        variant="primary"
                        fullWidth
                        onPress={handleStartGuiding}
                        style={styles.cardButton}
                      />
                      <TouchableOpacity onPress={handleNewRoute} style={styles.newRouteLink}>
                        <Text style={styles.newRouteText}>New route</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={styles.notAtStartHint}>
                        You're not at the start. Path shown on map.
                      </Text>
                      <Button
                        title="View directions"
                        variant="primary"
                        fullWidth
                        onPress={() => setShowDirectionsList(true)}
                        style={styles.cardButton}
                      />
                      <TouchableOpacity onPress={handleNewRoute} style={styles.newRouteLink}>
                        <Text style={styles.newRouteText}>New route</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      )}

      {/* Safety Check-In Modal */}
      <Modal
        visible={showSafetyCheckIn}
        animationType="fade"
        transparent
        onRequestClose={() => {}} // Prevent closing without response
      >
        <View style={styles.checkInOverlay}>
          <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
          <SafeAreaView style={styles.checkInContainer} edges={['top', 'bottom']}>
            <View style={styles.checkInContent}>
              <Text style={styles.checkInTitle}>Safety Check-In</Text>
              <Text style={styles.checkInMessage}>
                You were expected to arrive at {destination?.name} by{' '}
                {estimatedArrivalTime?.toLocaleTimeString()}, but you haven't arrived yet.
              </Text>
              <Text style={styles.checkInQuestion}>Are you okay?</Text>
              
              <View style={styles.checkInButtons}>
                <Button
                  title="I'm OK"
                  onPress={async () => {
                    if (checkInTimeoutRef.current) {
                      clearTimeout(checkInTimeoutRef.current);
                      checkInTimeoutRef.current = null;
                    }
                    setShowSafetyCheckIn(false);
                    // Continue monitoring in case they're delayed further
                    if (durationText && destination) {
                      const estimatedSeconds = parseDurationToSeconds(durationText);
                      const arrivalTime = new Date(Date.now() + estimatedSeconds * 1000);
                      startSafetyMonitoring(
                        estimatedSeconds,
                        { latitude: destination.latitude, longitude: destination.longitude },
                        destination.name,
                        () => {
                          triggerCheckInVibration();
                          setShowSafetyCheckIn(true);
                          checkInTimeoutRef.current = setTimeout(async () => {
                            const currentLoc = await getCurrentLocation();
                            await sendSafetyAlert(currentLoc, destination.name, arrivalTime);
                            setShowSafetyCheckIn(false);
                          }, 30000);
                        }
                      );
                    }
                  }}
                  variant="primary"
                  style={styles.checkInButton}
                />
                <Button
                  title="I Need Help"
                  onPress={async () => {
                    if (checkInTimeoutRef.current) {
                      clearTimeout(checkInTimeoutRef.current);
                      checkInTimeoutRef.current = null;
                    }
                    const currentLoc = await getCurrentLocation();
                    await sendSafetyAlert(currentLoc, destination?.name || 'destination', estimatedArrivalTime || new Date());
                    Alert.alert(
                      'Help Requested',
                      'Your emergency contacts have been notified. Please call 911 if this is an emergency.',
                      [
                        {
                          text: 'Call 911',
                          onPress: () => Linking.openURL('tel:911'),
                          style: 'destructive',
                        },
                        { text: 'OK' },
                      ]
                    );
                    setShowSafetyCheckIn(false);
                  }}
                  variant="secondary"
                  style={styles.checkInButton}
                />
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Contact Selection Modal for Location Sharing */}
      <Modal
        visible={showContactShareModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowContactShareModal(false);
          startNavigation(); // Start navigation even if cancelled
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowContactShareModal(false);
            startNavigation();
          }}
        >
          <Pressable style={styles.contactModalContent} onPress={(e) => e.stopPropagation()}>
            <SafeAreaView edges={['bottom']}>
              <View style={styles.contactModalHeader}>
                <Text style={styles.contactModalTitle}>Share Location</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowContactShareModal(false);
                    startNavigation();
                  }}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.contactModalSubtitle}>
                Select a contact to share your location with until you reach {destination?.name}
              </Text>
              
              <ScrollView style={styles.contactList} showsVerticalScrollIndicator={false}>
                {availableContacts.map((contact) => (
                  <TouchableOpacity
                    key={contact.id}
                    style={styles.contactItem}
                    onPress={() => handleShareWithContact(contact)}
                  >
                    <View style={styles.contactItemContent}>
                      <View style={styles.contactIcon}>
                        <PhoneIcon color={colors.primaryRed} />
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        <Text style={styles.contactRelationship}>{contact.relationship}</Text>
                        <Text style={styles.contactPhone}>{contact.phone}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => {
                  setShowContactShareModal(false);
                  startNavigation();
                }}
              >
                <Text style={styles.skipButtonText}>Skip - Start navigation without sharing</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Route Chat — iMessage-style safety messaging with RUPD */}
      <Modal
        visible={showRouteChat}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowRouteChat(false)}
      >
        <RouteChat
          messages={chatMessages}
          onSend={handleChatSend}
          onClose={() => setShowRouteChat(false)}
          destinationName={destination?.name ?? 'destination'}
        />
      </Modal>

      {/* Request Escort Modal (during navigation) */}
      <Modal
        visible={showEscortModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEscortModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowEscortModal(false)}>
          <Pressable style={styles.escortModalSheet} onPress={(e) => e.stopPropagation()}>
            <SafeAreaView style={styles.escortModalInner} edges={['bottom']}>
              <View style={styles.escortModalHeader}>
                <Text style={styles.escortModalTitle}>Request RUPD Escort</Text>
                <TouchableOpacity onPress={() => setShowEscortModal(false)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.escortModalDesc}>
                An officer will be dispatched to your location to walk with you.
                {destination ? ` Route: ${originName} → ${destination.name}` : ''}
              </Text>

              <View style={styles.escortPrioritySection}>
                <Text style={styles.escortSectionLabel}>PRIORITY</Text>
                <View style={styles.escortPriorityRow}>
                  <TouchableOpacity
                    style={[styles.escortPriorityBtn, escortPriority === 'normal' && styles.escortPriorityBtnActive]}
                    onPress={() => setEscortPriority('normal')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.escortPriorityBtnText, escortPriority === 'normal' && styles.escortPriorityBtnTextActive]}>Normal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.escortPriorityBtn, escortPriority === 'urgent' && styles.escortPriorityBtnUrgent]}
                    onPress={() => setEscortPriority('urgent')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.escortPriorityBtnText, escortPriority === 'urgent' && styles.escortPriorityBtnTextUrgent]}>Urgent</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.escortPrioritySection}>
                <Text style={styles.escortSectionLabel}>WHY DO YOU NEED AN ESCORT?</Text>
                <TextInput
                  style={styles.escortReasonInput}
                  placeholder="e.g. Walking alone, feeling unsafe, area seems dangerous..."
                  placeholderTextColor={colors.textTertiary}
                  value={escortReason}
                  onChangeText={setEscortReason}
                  multiline
                  numberOfLines={3}
                  maxLength={300}
                  textAlignVertical="top"
                />
              </View>

              <Button
                title={isSubmittingEscort ? 'Submitting...' : 'Submit Escort Request'}
                onPress={handleSubmitEscort}
                variant="primary"
                fullWidth
                disabled={isSubmittingEscort || !escortReason.trim()}
                loading={isSubmittingEscort}
              />
            </SafeAreaView>
          </Pressable>
        </Pressable>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: HEADER_BAR_HEIGHT,
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(10, 10, 10, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  mapViewMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  mapViewMenuCard: {
    position: 'absolute',
    right: spacing.lg,
    minWidth: 220,
    backgroundColor: colors.surface1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  mapViewMenuTitle: {
    fontSize: fontSizes.caption2,
    fontWeight: fontWeights.semibold,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.caps,
  },
  mapViewMenuRow: {
    marginBottom: spacing.sm,
  },
  mapViewMenuLabel: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  mapViewMenuOptions: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: spacing.sm,
  },
  mapViewMenuOption: {
    flex: 1,
    minWidth: 72,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapViewMenuOptionActive: {
    backgroundColor: colors.primaryRed + '18',
    borderColor: colors.primaryRed + '60',
  },
  mapViewMenuOptionText: {
    fontSize: fontSizes.footnote,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  mapViewMenuOptionTextActive: {
    color: colors.primaryRed,
  },
  searchContainer: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
  },
  searchBarBlur: {
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(8, 8, 8, 0.95)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minHeight: 50,
  },
  searchIconContainer: {
    marginRight: spacing.md,
    opacity: 0.7,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: fontSizes.body,
    color: colors.textPrimary,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  suggestionsBlur: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  suggestions: {
    backgroundColor: 'rgba(8, 8, 8, 0.95)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    maxHeight: 400,
  },
  suggestionsContent: {
    paddingBottom: spacing.md,
  },
  suggestionsTitle: {
    fontSize: fontSizes.caption,
    color: colors.textTertiary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionName: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  suggestionSubtitle: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  emptyMapHint: {
    position: 'absolute',
    bottom: 200,
    left: spacing.xl,
    right: spacing.xl,
    alignItems: 'center',
  },
  emptyMapText: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  cardWrapper: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    maxHeight: '35%',
  },
  cardWrapperGuiding: {
    maxHeight: 140,
    marginBottom: 0,
  },
  cardGuiding: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  cardButtonsGuiding: {
    marginTop: 0,
    height: 0,
    overflow: 'hidden',
  },
  recentReportsSectionGuiding: {
    maxHeight: 52,
  },
  avoidanceBlock: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryRed + '0A',
    borderRadius: borderRadius.xs,
    borderLeftWidth: 2,
    borderLeftColor: colors.primaryRed,
  },
  avoidanceLabel: {
    fontSize: fontSizes.caption2,
    fontWeight: fontWeights.semibold,
    color: colors.primaryRed,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.caps,
  },
  avoidanceText: {
    fontSize: fontSizes.footnote,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  directionsListBlock: {
    marginBottom: spacing.md,
    maxHeight: 200,
  },
  directionsListTitle: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  directionsListScroll: {
    maxHeight: 160,
  },
  directionsListContent: {
    paddingBottom: spacing.sm,
  },
  directionsListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  directionsListNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primaryRed + '40',
    color: colors.primaryRed,
    fontSize: fontSizes.footnote,
    fontWeight: fontWeights.bold,
    textAlign: 'center',
    lineHeight: 22,
  },
  directionsListInstruction: {
    flex: 1,
    fontSize: fontSizes.footnote,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  directionsListMeta: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  notAtStartHint: {
    fontSize: fontSizes.footnote,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  zoneIncidentsSheet: {
    backgroundColor: colors.surface1,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
    marginTop: '30%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    borderBottomWidth: 0,
  },
  zoneIncidentsInner: {
    paddingBottom: spacing.xl,
    maxHeight: '100%',
  },
  zoneIncidentsHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  zoneIncidentsTitle: {
    fontSize: fontSizes.title3,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  zoneIncidentsSubtitle: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  zoneIncidentsCloseBtn: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  zoneIncidentsScroll: {
    maxHeight: 320,
  },
  zoneIncidentsContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xxl,
  },
  zoneIncidentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  zoneIncidentBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryRed,
    marginTop: 6,
  },
  zoneIncidentText: {
    flex: 1,
  },
  zoneIncidentType: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  zoneIncidentLocation: {
    fontSize: fontSizes.footnote,
    color: colors.textSecondary,
    marginTop: 2,
  },
  zoneIncidentCampus: {
    fontSize: fontSizes.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  guidingBottomBar: {
    width: '100%',
  },
  guidingEtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guidingEtaLeft: {
    flex: 1,
    minWidth: 0,
  },
  guidingEtaBig: {
    fontSize: fontSizes.title2,
    fontWeight: fontWeights.bold,
    color: colors.secondaryGreen,
    letterSpacing: letterSpacing.tight,
  },
  guidingEtaDetail: {
    fontSize: fontSizes.footnote,
    color: colors.textSecondary,
    marginTop: 1,
  },
  guidingEndBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryRed + '18',
    borderWidth: 1,
    borderColor: colors.primaryRed + '40',
    marginLeft: spacing.md,
  },
  guidingEndBtnText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    color: colors.primaryRed,
  },
  guidingAvoidanceText: {
    fontSize: fontSizes.caption2,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  guidingEtaBlock: {
    marginBottom: spacing.sm,
  },
  guidingEtaText: {
    fontSize: fontSizes.footnote,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  cardButtonEndRoute: {
    marginTop: spacing.xs,
    backgroundColor: colors.primaryRed,
    borderWidth: 0,
    paddingVertical: spacing.xs,
    minHeight: 36,
  },
  cardButtonEndRouteText: {
    color: colors.white,
    fontSize: fontSizes.footnote,
    fontWeight: fontWeights.semibold,
  },
  originPickerCurrentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  originPickerCurrentText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    color: colors.tabActive,
  },
  originSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  originSearchInput: {
    flex: 1,
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
  },
  navStepBlock: {
    marginBottom: spacing.lg,
  },
  navStepLabel: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: colors.tabActive,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  navStepInstruction: {
    fontSize: fontSizes.title3,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    lineHeight: 26,
    letterSpacing: letterSpacing.tight,
  },
  recentReportsSection: {
    marginBottom: spacing.md,
    maxHeight: 140,
  },
  recentReportsTitle: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentReportsEmpty: {
    fontSize: fontSizes.footnote,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  recentReportsList: {
    maxHeight: 110,
  },
  recentReportItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  recentReportMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  recentReportBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
  },
  recentReportBadgeNegative: {
    backgroundColor: 'rgba(255, 152, 0, 0.3)',
  },
  recentReportBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  recentReportTime: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  recentReportContent: {
    fontSize: fontSizes.footnote,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  placesOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  placesSheet: {
    backgroundColor: colors.surface1,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    borderBottomWidth: 0,
  },
  placesSheetInner: {
    paddingBottom: spacing.xl,
    maxHeight: '100%',
  },
  placesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  placesTitle: {
    fontSize: fontSizes.title3,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  placesCloseBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  placesCloseText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    color: colors.primaryRed,
  },
  placesScroll: {
    maxHeight: 400,
  },
  placesScrollContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  placesCategory: {
    marginBottom: spacing.xxl,
  },
  placesCategoryTitle: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface2,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  placeRowText: {
    flex: 1,
  },
  placeName: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  placeSubtitle: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  card: {
    padding: spacing.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  loadingText: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
  errorBlock: {
    marginBottom: spacing.xs,
  },
  errorTitle: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  errorDetail: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  checkIconWrapper: {
    transform: [{ scale: 0.75 }],
  },
  cardTitle: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    flex: 1,
  },
  cardSubtitle: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  stepsScroll: {
    marginBottom: spacing.md,
    marginHorizontal: -spacing.xl,
  },
  stepsContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  stepChip: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surface2,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepChipActive: {
    backgroundColor: colors.primaryRed,
    borderColor: colors.primaryRed,
  },
  stepChipText: {
    fontSize: fontSizes.footnote,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  stepChipTextActive: {
    color: colors.white,
    fontWeight: fontWeights.semibold,
  },
  cardButtons: {
    gap: spacing.xs,
  },
  cardButton: {
    marginTop: spacing.xs,
  },
  newRouteLink: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  newRouteText: {
    fontSize: fontSizes.footnote,
    color: colors.tabActive,
  },
  alternateRoutesContainer: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  alternateRoutesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  alternateRoutesTitle: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  alternateRoutesToggle: {
    fontSize: fontSizes.caption,
    color: colors.primaryRed,
    fontWeight: fontWeights.semibold,
  },
  alternateRoutesList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  alternateRouteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surface2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  alternateRouteItemSelected: {
    backgroundColor: colors.primaryRed + '12',
    borderColor: colors.primaryRed + '50',
  },
  alternateRouteInfo: {
    flex: 1,
  },
  alternateRouteTime: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  alternateRouteDistance: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  alternateRouteDiff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  alternateRouteDiffText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
  },
  alternateRouteDiffPositive: {
    color: colors.textTertiary,
  },
  alternateRouteDiffNegative: {
    color: colors.secondaryGreen,
  },
  /* ── Google/Apple-style navigation banner ── */
  navBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
  },
  navBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  navBannerInstruction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 0,
  },
  navBannerArrow: {
    fontSize: 32,
    color: colors.textPrimary,
    width: 40,
    textAlign: 'center',
  },
  navBannerTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  navBannerDistance: {
    fontSize: fontSizes.title3,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    letterSpacing: letterSpacing.tight,
  },
  navBannerText: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  navBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: spacing.md,
  },
  navChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navChatIcon: {
    fontSize: 18,
  },
  chatBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primaryRed,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chatBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  navEscortPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(225, 6, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(225, 6, 0, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  escortModalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface1,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    borderBottomWidth: 0,
  },
  escortModalInner: {
    padding: spacing.xl,
  },
  escortModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  escortModalTitle: {
    fontSize: fontSizes.title3,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    letterSpacing: letterSpacing.tight,
  },
  escortModalDesc: {
    fontSize: fontSizes.footnote,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: spacing.xl,
  },
  escortPrioritySection: {
    marginBottom: spacing.xl,
  },
  escortSectionLabel: {
    fontSize: fontSizes.caption2,
    fontWeight: fontWeights.semibold,
    color: colors.textTertiary,
    letterSpacing: letterSpacing.caps,
    marginBottom: spacing.sm,
  },
  escortPriorityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  escortPriorityBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: 'center',
  },
  escortPriorityBtnActive: {
    borderColor: '#007AFF60',
    backgroundColor: '#007AFF15',
  },
  escortPriorityBtnUrgent: {
    borderColor: '#FF3B3060',
    backgroundColor: '#FF3B3015',
  },
  escortPriorityBtnText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  escortPriorityBtnTextActive: {
    color: '#007AFF',
  },
  escortPriorityBtnTextUrgent: {
    color: '#FF3B30',
  },
  escortReasonInput: {
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    padding: spacing.md,
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    minHeight: 80,
  },
  cardWrapperFullScreen: {
    left: 0,
    right: 0,
    borderRadius: 0,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  routeOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  originButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surface2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  originButtonText: {
    fontSize: fontSizes.footnote,
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: fontWeights.medium,
  },
  modeSelector: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 2,
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.xs,
    padding: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  modeButton: {
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xs - 2,
    minWidth: 70,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  modeButtonActive: {
    backgroundColor: colors.primaryRed,
  },
  modeButtonText: {
    fontSize: fontSizes.footnote,
    lineHeight: fontSizes.footnote,
    fontWeight: fontWeights.medium,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  modeButtonTextActive: {
    color: colors.white,
    fontWeight: fontWeights.semibold,
  },
  checkInOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkInContainer: {
    width: '90%',
    maxWidth: 400,
  },
  checkInContent: {
    backgroundColor: colors.surface1,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.primaryRed + '40',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  checkInTitle: {
    fontSize: fontSizes.title3,
    fontWeight: fontWeights.bold,
    color: colors.primaryRed,
    marginBottom: spacing.md,
    textAlign: 'center',
    letterSpacing: letterSpacing.tight,
  },
  checkInMessage: {
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: 22,
  },
  checkInQuestion: {
    fontSize: fontSizes.title3,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  checkInButtons: {
    gap: spacing.md,
  },
  checkInButton: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  contactModalContent: {
    backgroundColor: colors.surface1,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  contactModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactModalTitle: {
    fontSize: fontSizes.title3,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    letterSpacing: letterSpacing.tight,
  },
  contactModalSubtitle: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    lineHeight: 20,
  },
  contactList: {
    maxHeight: 400,
    paddingHorizontal: spacing.xl,
  },
  contactItem: {
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  contactItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.primaryRed + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  contactRelationship: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: fontSizes.caption,
    color: colors.textTertiary,
  },
  skipButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  skipButtonText: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
