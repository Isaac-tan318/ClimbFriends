import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColorScheme } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GymDrawer, BRAND_COLORS } from '@/components/gym-drawer';
import { SINGAPORE_GYMS } from '@/data';
import { Gym, Friend } from '@/types';

const SINGAPORE_REGION = {
  latitude: 1.3521,
  longitude: 103.8198,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

function GymMarker({ gym, friends, onPress }: { gym: Gym; friends: Friend[]; onPress: (g: Gym) => void }) {
  const [tracked, setTracked] = useState(true);
  const brandColor = BRAND_COLORS[gym.brand] ?? '#6b7280';
  const friendsHere = friends.filter((f) => f.currentGymId === gym.id && f.isAtGym);

  useEffect(() => {
    const t = setTimeout(() => setTracked(false), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <Marker
      coordinate={{ latitude: gym.latitude, longitude: gym.longitude }}
      onPress={() => onPress(gym)}
      tracksViewChanges={tracked}
    >
      <View style={[styles.customMarker, { backgroundColor: brandColor }]}>
        <MaterialIcons name="fitness-center" size={16} color="white" />
        {friendsHere.length > 0 && (
          <View style={styles.markerBadge}>
            <ThemedText style={styles.markerBadgeText}>{friendsHere.length}</ThemedText>
          </View>
        )}
      </View>
    </Marker>
  );
}

export function GymMapTab({ friends }: { friends: Friend[] }) {
  const mapRef = useRef<MapView | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const scheme = useColorScheme();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationGranted(true);
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    })();
  }, []);

  const handleGymPress = useCallback((gym: Gym) => {
    setSelectedGym(gym);
    setDrawerVisible(true);
  }, []);

  const fitMapToGyms = useCallback(() => {
    if (!mapRef.current) return;
    mapRef.current.fitToCoordinates(
      SINGAPORE_GYMS.map((gym) => ({ latitude: gym.latitude, longitude: gym.longitude })),
      {
        edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
        animated: false,
      },
    );
  }, []);

  return (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={SINGAPORE_REGION}
        onMapReady={fitMapToGyms}
        showsUserLocation={locationGranted}
        showsMyLocationButton={false}
        userInterfaceStyle={scheme === 'dark' ? 'dark' : 'light'}
      >
        {SINGAPORE_GYMS.map((gym) => (
          <GymMarker key={gym.id} gym={gym} friends={friends} onPress={handleGymPress} />
        ))}
      </MapView>

      <GymDrawer
        gym={selectedGym}
        friends={friends}
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
  customMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
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
