import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import { Camera, LocationPuck, MapView, MarkerView } from '@rnmapbox/maps';
import * as Location from 'expo-location';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedText } from '@/components/themed-text';
import { GymDrawer, BRAND_COLORS, CROWDED_COLORS } from '@/components/gym-drawer';
import { SINGAPORE_GYMS } from '@/data';
import { getMapboxStyleURL, hasMapboxConfig } from '@/lib/mapbox';
import { useGymOccupancy } from '@/hooks/use-gym-occupancy';
import { Gym, Friend, GymOccupancy } from '@/types';

type MapboxCoordinate = [number, number];

const SINGAPORE_CENTER: MapboxCoordinate = [103.8198, 1.3521];
const DEFAULT_ZOOM_LEVEL = 9.5;
const MAP_PADDING = {
  paddingTop: 48,
  paddingRight: 48,
  paddingBottom: 48,
  paddingLeft: 48,
};

const toMapboxCoordinate = (gym: Pick<Gym, 'latitude' | 'longitude'>): MapboxCoordinate => [
  gym.longitude,
  gym.latitude,
];

const getGymBounds = (gyms: Gym[]) => {
  if (!gyms.length) {
    return null;
  }

  return gyms.reduce(
    (bounds, gym) => ({
      ne: [Math.max(bounds.ne[0], gym.longitude), Math.max(bounds.ne[1], gym.latitude)] as MapboxCoordinate,
      sw: [Math.min(bounds.sw[0], gym.longitude), Math.min(bounds.sw[1], gym.latitude)] as MapboxCoordinate,
    }),
    {
      ne: toMapboxCoordinate(gyms[0]),
      sw: toMapboxCoordinate(gyms[0]),
    },
  );
};

const GYM_BOUNDS = getGymBounds(SINGAPORE_GYMS);

function GymMarker({ 
  gym, 
  friends, 
  occupancy, 
  onPress 
}: { 
  gym: Gym; 
  friends: Friend[]; 
  occupancy: GymOccupancy | null;
  onPress: (g: Gym) => void 
}) {
  const brandColor = BRAND_COLORS[gym.brand] ?? '#6b7280';
  const friendsHere = friends.filter((f) => f.currentGymId === gym.id && f.isAtGym);
  const occupancyColor = occupancy ? CROWDED_COLORS[occupancy.level] : 'white';

  return (
    <MarkerView coordinate={toMapboxCoordinate(gym)} allowOverlap allowOverlapWithPuck>
      <Pressable 
        onPress={() => onPress(gym)} 
        style={[
          styles.customMarker, 
          { 
            backgroundColor: brandColor,
            borderColor: occupancyColor,
            borderWidth: occupancy ? 3 : 2
          }
        ]}
      >
        <MaterialIcons name="fitness-center" size={16} color="white" />
        {friendsHere.length > 0 && (
          <View style={styles.markerBadge}>
            <ThemedText style={styles.markerBadgeText}>{friendsHere.length}</ThemedText>
          </View>
        )}
      </Pressable>
    </MarkerView>
  );
}

export function GymMapTab({ friends }: { friends: Friend[] }) {
  const cameraRef = useRef<Camera>(null);
  const hasFittedGymsRef = useRef(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const scheme = useColorScheme();
  const mapStyleUrl = getMapboxStyleURL(scheme);
  const { getGymOccupancy } = useGymOccupancy();

  useEffect(() => {
    if (!hasMapboxConfig) {
      return;
    }

    let isMounted = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (isMounted && status === 'granted') {
        setLocationGranted(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleGymPress = useCallback((gym: Gym) => {
    setSelectedGym(gym);
    setDrawerVisible(true);
  }, []);

  const fitCameraToGyms = useCallback(() => {
    if (!cameraRef.current || !GYM_BOUNDS) {
      return;
    }

    cameraRef.current.setCamera({
      bounds: {
        ...GYM_BOUNDS,
        ...MAP_PADDING,
      },
      animationDuration: 0,
    });
  }, []);

  const handleMapLoaded = useCallback(() => {
    if (hasFittedGymsRef.current) {
      return;
    }

    hasFittedGymsRef.current = true;
    fitCameraToGyms();
  }, [fitCameraToGyms]);

  if (!hasMapboxConfig) {
    return (
      <View style={styles.unavailableContainer}>
        <ThemedText style={styles.unavailableTitle}>Mapbox token missing</ThemedText>
        <ThemedText style={styles.unavailableSubtitle}>
          Add `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` to `.env` and rebuild the native app to use the gym map.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.mapContainer}>
      <MapView
        style={styles.map}
        styleURL={mapStyleUrl}
        logoEnabled
        attributionEnabled
        scaleBarEnabled={false}
        compassEnabled={false}
        onDidFinishLoadingMap={handleMapLoaded}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: SINGAPORE_CENTER,
            zoomLevel: DEFAULT_ZOOM_LEVEL,
          }}
        />
        {locationGranted ? <LocationPuck visible /> : null}
        {SINGAPORE_GYMS.map((gym) => (
          <GymMarker 
            key={gym.id} 
            gym={gym} 
            friends={friends} 
            occupancy={getGymOccupancy(gym.id)}
            onPress={handleGymPress} 
          />
        ))}
      </MapView>

      <GymDrawer
        gym={selectedGym}
        friends={friends}
        occupancy={selectedGym ? getGymOccupancy(selectedGym.id) : null}
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  unavailableContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  unavailableTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  unavailableSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  customMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  markerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#22c55e',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
  },
  markerBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'white',
  },
});
