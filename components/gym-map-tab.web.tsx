import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Friend } from '@/types';

export function GymMapTab({ friends: _friends }: { friends: Friend[] }) {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.icon}>🗺️</ThemedText>
      <ThemedText style={styles.title}>Map not available on web</ThemedText>
      <ThemedText style={styles.subtitle}>Use the Gyms tab to browse climbing gyms.</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  icon: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: 'center',
  },
});
