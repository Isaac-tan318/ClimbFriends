import { AppState, Platform } from 'react-native';

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { CURRENT_USER, SINGAPORE_GYMS, getGymById } from '@/data';
import { hasSupabaseConfig } from '@/lib/supabase';
import { err, ok, type AppResult } from '@/services/api/result';
import { getCurrentUserId } from '@/services/auth/current-user';
import { sessionService } from '@/services/sessions/session-service';
import { settingsService } from '@/services/settings/settings-service';
import { useSessionStore } from '@/stores/session-store';

export const GYM_GEOFENCING_TASK_NAME = 'gym-geofencing-task';
export const KEEP_ALIVE_TASK_NAME = 'gym-keep-alive-task';

if (!TaskManager.isTaskDefined(KEEP_ALIVE_TASK_NAME)) {
  TaskManager.defineTask(KEEP_ALIVE_TASK_NAME, async () => {
    // Dummy task for Android Foreground Service keep-alive
  });
}

// --- ADD THIS MATH HELPER ---
const toRadians = (value: number) => (value * Math.PI) / 180;
const getDistanceMeters = (
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number }
) => {
  const earthRadiusMeters = 6371000;
  const deltaLatitude = toRadians(second.latitude - first.latitude);
  const deltaLongitude = toRadians(second.longitude - first.longitude);
  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(toRadians(first.latitude)) *
    Math.cos(toRadians(second.latitude)) *
    Math.sin(deltaLongitude / 2) *
    Math.sin(deltaLongitude / 2);
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

type GymGeofencingTaskData = {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
};

type GymGeofencingSyncResult = {
  enabled: boolean;
  running: boolean;
  promptedForPermissions: boolean;
  regions: Location.LocationRegion[];
};

const IOS_GEOFENCE_REGION_LIMIT = 20;
const DWELL_REQUIREMENT_MS = 2 * 60 * 1000;
const shouldUseMockAuth = !hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseAuth;

const isLocationPermissionGranted = (permission: Location.LocationPermissionResponse) =>
  permission.status === 'granted';

const buildGymGeofencingRegions = (): Location.LocationRegion[] => {
  const gyms =
    Platform.OS === 'ios' ? SINGAPORE_GYMS.slice(0, IOS_GEOFENCE_REGION_LIMIT) : SINGAPORE_GYMS;

  if (Platform.OS === 'ios' && SINGAPORE_GYMS.length > IOS_GEOFENCE_REGION_LIMIT) {
    console.warn(
      `iOS only supports monitoring up to ${IOS_GEOFENCE_REGION_LIMIT} geofences at a time. ` +
      'Extra gyms were skipped during registration.',
    );
  }

  return gyms.map((gym) => ({
    identifier: gym.id,
    latitude: gym.latitude,
    longitude: gym.longitude,
    radius: gym.radiusMeters,
    notifyOnEnter: true,
    notifyOnExit: true,
  }));
};

const isGeofencingSupportedAsync = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return false;
  }
  return TaskManager.isAvailableAsync();
};

const resolveGeofencingUserIdAsync = async (): Promise<string | null> => {
  const userId = await getCurrentUserId();
  if (userId) {
    return userId;
  }
  return shouldUseMockAuth ? CURRENT_USER.id : null;
};

const refreshSessionStoreForActiveAppAsync = async () => {
  if (Platform.OS === 'web' || AppState.currentState !== 'active') {
    return;
  }

  const refreshResult = await useSessionStore.getState().refreshSessions();
  if (!refreshResult.ok) {
    console.warn('Unable to refresh session store after geofence event:', refreshResult.error.message);
  }
};

const handleEnterRegionAsync = async (userId: string, gymId: string) => {
  console.log(`🚪 [GEOFENCE ENTER] Processing entry for Gym: ${gymId}`);

  const sessionsResult = await sessionService.getSessions(userId);
  if (!sessionsResult.ok) {
    console.warn('❌ [GEOFENCE ENTER] Unable to load sessions:', sessionsResult.error.message);
    return;
  }

  const activeSession = sessionsResult.data.find((session) => session.isActive) ?? null;

  if (activeSession?.gymId === gymId) {
    console.log('ℹ️ [GEOFENCE ENTER] Session already active for this gym. Updating presence only.');
    return;
  }

  if (activeSession && activeSession.gymId !== gymId) {
    console.log(`🔄 [GEOFENCE ENTER] Ending previous session at ${activeSession.gymId} before starting new one.`);
    const endResult = await sessionService.endSession(activeSession.id);
    if (!endResult.ok) {
      console.warn('❌ [GEOFENCE ENTER] Unable to close previous session:', endResult.error.message);
      return;
    }
  }

  console.log('✅ [GEOFENCE ENTER] Starting new provisional session in database.');
  const startResult = await sessionService.startSession(userId, gymId);
  if (!startResult.ok) {
    console.warn('❌ [GEOFENCE ENTER] Failed to start session:', startResult.error.message);
    return;
  }

  await refreshSessionStoreForActiveAppAsync();
};

const handleExitRegionAsync = async (userId: string, gymId: string) => {
  console.log(`🏃 [GEOFENCE EXIT] Processing exit for Gym: ${gymId}`);

  const sessionsResult = await sessionService.getSessions(userId);
  if (!sessionsResult.ok) {
    console.warn('❌ [GEOFENCE EXIT] Unable to load sessions:', sessionsResult.error.message);
    return;
  }

  const activeSession = sessionsResult.data.find((session) => session.isActive) ?? null;
  if (!activeSession || activeSession.gymId !== gymId) {
    console.log('Active session:', JSON.stringify(activeSession));
    console.log('Incoming gymId from region:', gymId);
    console.log('ℹ️ [GEOFENCE EXIT] No matching active session found for this exit event. Ignoring.');
    return;
  }

  const elapsedMs = Date.now() - activeSession.startedAt.getTime();
  console.log(`⏱️ [GEOFENCE EXIT] Dwell time was: ${elapsedMs}ms`);

  const hasLoggedClimbs = activeSession.climbs && activeSession.climbs.length > 0;

  if (elapsedMs < DWELL_REQUIREMENT_MS && !hasLoggedClimbs) {
    console.log('🗑️ [GEOFENCE EXIT] Drive-by detected (Under 2 mins) and no climbs logged. Deleting ghost session.');
    const deleteResult = await sessionService.deleteSession(activeSession.id);
    if (!deleteResult.ok) {
      console.warn('❌ [GEOFENCE EXIT] Failed to delete ghost session:', deleteResult.error.message);
      return;
    }
  } else {
    if (hasLoggedClimbs) {
      console.log('✅ [GEOFENCE EXIT] Session has climbs. Ending normally despite short duration.');
    } else {
      console.log('✅ [GEOFENCE EXIT] Valid session (over 2 mins). Ending normally.');
    }
    const endResult = await sessionService.endSession(activeSession.id);
    if (!endResult.ok) {
      console.warn('❌ [GEOFENCE EXIT] Failed to end session:', endResult.error.message);
      return;
    }
  }

  await refreshSessionStoreForActiveAppAsync();
};

let isHandlingGeofenceEvent = false;

const handleGymGeofencingEventAsync = async ({
  eventType,
  region,
}: GymGeofencingTaskData): Promise<void> => {
  const gymId = region.identifier;
  console.log(`📍 [GEOFENCE EVENT] Fired for: ${gymId} | Type: ${eventType === Location.GeofencingEventType.Enter ? 'ENTER' : 'EXIT'}`);

  if (!gymId || !getGymById(gymId)) {
    console.warn('❌ [GEOFENCE EVENT] Unknown gym region identifier:', region.identifier);
    return;
  }

  const userId = await resolveGeofencingUserIdAsync();
  if (!userId) {
    console.warn('⚠️ [GEOFENCE AUTH] No user logged in or session temporarily unavailable. Skipping event.');
    // DO NOT stop geofencing here! It might just be a temporary storage lock or network issue.
    // If we stop it, it never starts again until the user opens the app.
    return;
  }
  console.log(`👤 [GEOFENCE AUTH] User resolved: ${userId}`);

  const settingsResult = await settingsService.getSettings(userId);
  if (!settingsResult.ok) {
    console.warn('❌ [GEOFENCE SETTINGS] Unable to load settings:', settingsResult.error.message);
    return;
  }

  if (!settingsResult.data.locationEnabled) {
    console.log('🛑 [GEOFENCE SETTINGS] Location is disabled in app settings. Stopping tasks.');
    await stopGymGeofencingAsync();
    return;
  }

  if (eventType === Location.GeofencingEventType.Enter) {
    await handleEnterRegionAsync(userId, gymId);
    return;
  }

  if (eventType === Location.GeofencingEventType.Exit) {
    await handleExitRegionAsync(userId, gymId);
  }
};

if (!TaskManager.isTaskDefined(GYM_GEOFENCING_TASK_NAME)) {
  TaskManager.defineTask<GymGeofencingTaskData>(GYM_GEOFENCING_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.error('💥 [TASK MANAGER FATAL] Task failed before handling event:', error.message);
      return;
    }

    if (!data) {
      console.warn('⚠️ [TASK MANAGER] Task ran without a payload.');
      return;
    }

    console.log('\n🚨 --- [BACKGROUND TASK WOKE UP] --- 🚨');
    await handleGymGeofencingEventAsync(data);
  });
}

export const requestGymGeofencingPermissionsAsync = async (): Promise<
  AppResult<{
    foreground: Location.LocationPermissionResponse;
    background: Location.LocationPermissionResponse;
  }>
> => {
  const isSupported = await isGeofencingSupportedAsync();
  if (!isSupported) {
    return err('Background geofencing unavailable (Are you on Expo Go?).', 'GEOFENCING_UNAVAILABLE');
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    return err('Location services are turned off on device.', 'LOCATION_SERVICES_DISABLED');
  }

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!isLocationPermissionGranted(foreground)) {
    return err('Foreground permission denied.', 'FOREGROUND_PERMISSION_DENIED', foreground);
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (!isLocationPermissionGranted(background)) {
    return err('Background permission denied.', 'BACKGROUND_PERMISSION_DENIED', background);
  }

  return ok({ foreground, background });
};

export const registerGymGeofencingAsync = async (): Promise<
  AppResult<{ regions: Location.LocationRegion[] }>
> => {
  console.log('📝 [GEOFENCE REGISTRATION] Attempting to register regions...');
  const permissionsResult = await requestGymGeofencingPermissionsAsync();
  if (!permissionsResult.ok) {
    console.warn('❌ [GEOFENCE REGISTRATION] Permission failed:', permissionsResult.error.message);
    return permissionsResult;
  }

  const regions = buildGymGeofencingRegions();

  await stopGymGeofencingAsync();

  await Location.startGeofencingAsync(GYM_GEOFENCING_TASK_NAME, regions);

  if (Platform.OS === 'android') {
    await Location.startLocationUpdatesAsync(KEEP_ALIVE_TASK_NAME, {
      accuracy: Location.Accuracy.Low,
      distanceInterval: 500, // 500m
      foregroundService: {
        notificationTitle: 'ClimbFriends Active',
        notificationBody: 'Automatic check-in is running.',
      },
    });
  }

  console.log(`✅ [GEOFENCE REGISTRATION] Successfully registered ${regions.length} gyms with OS.`);
  return ok({ regions });
};

export const stopGymGeofencingAsync = async (): Promise<AppResult<void>> => {
  console.log('🛑 [GEOFENCE CONTROL] Stopping background geofencing...');
  const isSupported = await isGeofencingSupportedAsync();
  if (!isSupported) return ok(undefined);

  try {
    const isRunning = await Location.hasStartedGeofencingAsync(GYM_GEOFENCING_TASK_NAME);
    if (!isRunning) return ok(undefined);

    await Location.stopGeofencingAsync(GYM_GEOFENCING_TASK_NAME);

    if (Platform.OS === 'android') {
      const isKeepAliveRunning = await Location.hasStartedLocationUpdatesAsync(KEEP_ALIVE_TASK_NAME);
      if (isKeepAliveRunning) {
        await Location.stopLocationUpdatesAsync(KEEP_ALIVE_TASK_NAME);
      }
    }

    console.log('✅ [GEOFENCE CONTROL] Geofencing stopped.');
  } catch (error: any) {
    // If the OS throws "Not authorized", it means geofencing is definitely 
    // not running because the user hasn't granted permissions yet.
    // We can safely ignore this error during a stop/cleanup operation.
    console.log('ℹ️ [GEOFENCE CONTROL] Skipped stop check (no permissions granted yet).');
  }
  return ok(undefined);

};

export const syncGymGeofencingAsync = async (input: {
  enabled: boolean;
  promptForPermissions: boolean;
}): Promise<AppResult<GymGeofencingSyncResult>> => {
  console.log(`🔄 [GEOFENCE SYNC] Syncing... Enabled: ${input.enabled}`);
  const isSupported = await isGeofencingSupportedAsync();
  if (!isSupported) {
    return ok({ enabled: input.enabled, running: false, promptedForPermissions: false, regions: [] });
  }

  if (!input.enabled) {
    const stopResult = await stopGymGeofencingAsync();
    if (!stopResult.ok) return stopResult;
    return ok({ enabled: false, running: false, promptedForPermissions: false, regions: [] });
  }

  const [foreground, background, servicesEnabled] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
    Location.hasServicesEnabledAsync(),
  ]);

  if (!servicesEnabled) {
    return ok({ enabled: true, running: false, promptedForPermissions: false, regions: [] });
  }

  const alreadyGranted = isLocationPermissionGranted(foreground) && isLocationPermissionGranted(background);

  if (!alreadyGranted && input.promptForPermissions) {
    const registerResult = await registerGymGeofencingAsync();
    if (!registerResult.ok) {
      return err(registerResult.error.message, registerResult.error.code, registerResult.error.details);
    }
    return ok({ enabled: true, running: true, promptedForPermissions: true, regions: registerResult.data.regions });
  }

  if (!alreadyGranted) {
    return ok({ enabled: true, running: false, promptedForPermissions: false, regions: [] });
  }

  await stopGymGeofencingAsync();

  const regions = buildGymGeofencingRegions();
  await Location.startGeofencingAsync(GYM_GEOFENCING_TASK_NAME, regions);

  if (Platform.OS === 'android') {
    await Location.startLocationUpdatesAsync(KEEP_ALIVE_TASK_NAME, {
      accuracy: Location.Accuracy.Low,
      distanceInterval: 500, // 500m
      foregroundService: {
        notificationTitle: 'ClimbFriends Active',
        notificationBody: 'Automatic check-in is running.',
      },
    });
  }

  return ok({ enabled: true, running: true, promptedForPermissions: false, regions });
};

export const evaluateCurrentLocationAsync = async () => {
  try {
    console.log('🔍 [GEOFENCE MANUAL CHECK] Checking current location against gyms...');
    const userId = await resolveGeofencingUserIdAsync();
    if (!userId) return;

    // Grab a quick, single GPS ping
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    for (const gym of SINGAPORE_GYMS) {
      const distance = getDistanceMeters(
        { latitude: location.coords.latitude, longitude: location.coords.longitude },
        { latitude: gym.latitude, longitude: gym.longitude }
      );

      if (gym.id.includes('test')) {
        console.log(`📍 [GEOFENCE CHECK] Distance to ${gym.name}: ${Math.round(distance)} meters`);
        console.log('lat and long of user:', location.coords.latitude, location.coords.longitude);
      }

      // If they are currently standing inside a gym, force the Enter logic!
      if (distance <= gym.radiusMeters) {
        console.log(`🎯 [GEOFENCE MANUAL CHECK] User is currently inside: ${gym.id}`);
        await handleEnterRegionAsync(userId, gym.id);
        return;
      }
    }

    console.log('🤷 [GEOFENCE MANUAL CHECK] User is not inside any gym.');
    const sessionsResult = await sessionService.getSessions(userId);
    if (sessionsResult.ok) {
      const activeSession = sessionsResult.data.find((s) => s.isActive) ?? null;
      if (activeSession) {
        console.log(`🏃 [GEOFENCE MANUAL CHECK] Closing stale session at ${activeSession.gymId}`);
        await handleExitRegionAsync(userId, activeSession.gymId);
      }
    }
  } catch (error) {
    console.warn('❌ [GEOFENCE MANUAL CHECK] Failed to check location:', error);
  }
};
