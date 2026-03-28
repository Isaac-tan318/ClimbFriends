import { Platform } from 'react-native';

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { CURRENT_USER, SINGAPORE_GYMS, getGymById } from '@/data';
import { hasSupabaseConfig } from '@/lib/supabase';
import { err, ok, type AppResult } from '@/services/api/result';
import { getCurrentUserId } from '@/services/auth/current-user';
import { presenceService } from '@/services/presence/presence-service';
import { sessionService } from '@/services/sessions/session-service';
import { settingsService } from '@/services/settings/settings-service';

export const GYM_GEOFENCING_TASK_NAME = 'gym-geofencing-task';

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

const handleEnterRegionAsync = async (userId: string, gymId: string) => {
  const sessionsResult = await sessionService.getSessions(userId);
  if (!sessionsResult.ok) {
    console.warn('Unable to load sessions during geofence enter:', sessionsResult.error.message);
    return;
  }

  const activeSession = sessionsResult.data.find((session) => session.isActive) ?? null;

  if (activeSession?.gymId === gymId) {
    await presenceService.updatePresence({
      userId,
      currentGymId: gymId,
      isAtGym: true,
    });
    return;
  }

  if (activeSession && activeSession.gymId !== gymId) {
    const endResult = await sessionService.endSession(activeSession.id);
    if (!endResult.ok) {
      console.warn('Unable to close previous session during geofence handoff:', endResult.error.message);
      return;
    }
  }

  // This is an intentionally provisional "ghost" session. If the user exits the geofence before
  // two minutes elapse, handleExitRegionAsync deletes it entirely instead of ending it.
  const startResult = await sessionService.startSession(userId, gymId);
  if (!startResult.ok) {
    console.warn('Unable to start session from geofence enter:', startResult.error.message);
    return;
  }

  await presenceService.updatePresence({
    userId,
    currentGymId: gymId,
    isAtGym: true,
  });
};

const handleExitRegionAsync = async (userId: string, gymId: string) => {
  const sessionsResult = await sessionService.getSessions(userId);
  if (!sessionsResult.ok) {
    console.warn('Unable to load sessions during geofence exit:', sessionsResult.error.message);
    return;
  }

  const activeSession = sessionsResult.data.find((session) => session.isActive) ?? null;
  if (!activeSession || activeSession.gymId !== gymId) {
    // Exit events can arrive after a cold start, after a manual session end, or after the user
    // already moved into another gym. Only close the session that matches the emitting region.
    return;
  }

  const elapsedMs = Date.now() - activeSession.startedAt.getTime();
  if (elapsedMs < DWELL_REQUIREMENT_MS) {
    const deleteResult = await sessionService.deleteSession(activeSession.id);
    if (!deleteResult.ok) {
      console.warn('Unable to delete provisional session after short dwell:', deleteResult.error.message);
      return;
    }
  } else {
    const endResult = await sessionService.endSession(activeSession.id);
    if (!endResult.ok) {
      console.warn('Unable to end session from geofence exit:', endResult.error.message);
      return;
    }
  }

  await presenceService.clearCheckIn(userId);
};

const handleGymGeofencingEventAsync = async ({
  eventType,
  region,
}: GymGeofencingTaskData): Promise<void> => {
  const gymId = region.identifier;
  if (!gymId || !getGymById(gymId)) {
    console.warn('Received geofence event for an unknown gym region:', region.identifier);
    return;
  }

  const userId = await resolveGeofencingUserIdAsync();
  if (!userId) {
    // A signed-out user should not keep background monitoring active. Stopping the task here keeps
    // native geofences from lingering if the app is relaunched headlessly after sign-out.
    await stopGymGeofencingAsync();
    return;
  }

  const settingsResult = await settingsService.getSettings(userId);
  if (!settingsResult.ok) {
    console.warn('Unable to load settings during geofence event:', settingsResult.error.message);
    return;
  }

  if (!settingsResult.data.locationEnabled) {
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
      console.error('Gym geofencing task failed before handling the event:', error.message);
      return;
    }

    if (!data) {
      console.warn('Gym geofencing task ran without an event payload.');
      return;
    }

    // Background tasks can run after iOS relaunches a terminated app, before any React tree exists.
    // This handler intentionally avoids Zustand/React state and rebuilds everything from persistent
    // auth + backend state so enter/exit events stay correct across cold starts.
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
    return err(
      'Background geofencing is unavailable here. Use a development build or standalone app instead of Expo Go.',
      'GEOFENCING_UNAVAILABLE',
    );
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    return err('Location services are turned off on this device.', 'LOCATION_SERVICES_DISABLED');
  }

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!isLocationPermissionGranted(foreground)) {
    return err(
      'Foreground location permission is required before background geofencing can be enabled.',
      'FOREGROUND_PERMISSION_DENIED',
      foreground,
    );
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (!isLocationPermissionGranted(background)) {
    return err(
      Platform.OS === 'android'
        ? 'Background location permission was not granted. On Android 11+ the system may send the user to Settings to approve it.'
        : 'Background location permission was not granted. iOS geofencing needs the Always location permission in a standalone build.',
      'BACKGROUND_PERMISSION_DENIED',
      background,
    );
  }

  return ok({ foreground, background });
};

export const registerGymGeofencingAsync = async (): Promise<
  AppResult<{
    regions: Location.LocationRegion[];
  }>
> => {
  const permissionsResult = await requestGymGeofencingPermissionsAsync();
  if (!permissionsResult.ok) {
    return permissionsResult;
  }

  const regions = buildGymGeofencingRegions();
  await Location.startGeofencingAsync(GYM_GEOFENCING_TASK_NAME, regions);

  return ok({ regions });
};

export const stopGymGeofencingAsync = async (): Promise<AppResult<void>> => {
  const isSupported = await isGeofencingSupportedAsync();
  if (!isSupported) {
    return ok(undefined);
  }

  const isRunning = await Location.hasStartedGeofencingAsync(GYM_GEOFENCING_TASK_NAME);
  if (!isRunning) {
    return ok(undefined);
  }

  await Location.stopGeofencingAsync(GYM_GEOFENCING_TASK_NAME);
  return ok(undefined);
};

export const syncGymGeofencingAsync = async (input: {
  enabled: boolean;
  promptForPermissions: boolean;
}): Promise<AppResult<GymGeofencingSyncResult>> => {
  const isSupported = await isGeofencingSupportedAsync();
  if (!isSupported) {
    return ok({
      enabled: input.enabled,
      running: false,
      promptedForPermissions: false,
      regions: [],
    });
  }

  if (!input.enabled) {
    const stopResult = await stopGymGeofencingAsync();
    if (!stopResult.ok) {
      return stopResult;
    }

    return ok({
      enabled: false,
      running: false,
      promptedForPermissions: false,
      regions: [],
    });
  }

  const [foreground, background, servicesEnabled] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
    Location.hasServicesEnabledAsync(),
  ]);

  if (!servicesEnabled) {
    return ok({
      enabled: true,
      running: false,
      promptedForPermissions: false,
      regions: [],
    });
  }

  const alreadyGranted =
    isLocationPermissionGranted(foreground) && isLocationPermissionGranted(background);

  if (!alreadyGranted && input.promptForPermissions) {
    const registerResult = await registerGymGeofencingAsync();
    if (!registerResult.ok) {
      return err(registerResult.error.message, registerResult.error.code, registerResult.error.details);
    }

    return ok({
      enabled: true,
      running: true,
      promptedForPermissions: true,
      regions: registerResult.data.regions,
    });
  }

  if (!alreadyGranted) {
    return ok({
      enabled: true,
      running: false,
      promptedForPermissions: false,
      regions: [],
    });
  }

  const regions = buildGymGeofencingRegions();
  await Location.startGeofencingAsync(GYM_GEOFENCING_TASK_NAME, regions);

  return ok({
    enabled: true,
    running: true,
    promptedForPermissions: false,
    regions,
  });
};
