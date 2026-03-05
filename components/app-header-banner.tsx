import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { useSessionStore } from '@/stores';

export function AppHeaderBanner({ title }: { title: string }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const stats = useSessionStore((state) => state.stats);

  return (
    <View style={[styles.headerBanner, { paddingTop: insets.top + 10 }]}>
      <View>
        <ThemedText type="title" style={styles.title}>
          {title}
        </ThemedText>
      </View>

      {pathname == '/' && (
        <View style={styles.streakBadge}>
          <ThemedText style={styles.streakEmoji}>🔥</ThemedText>
          <ThemedText style={styles.streakText}>{stats.currentStreak}w </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#1c1c1e',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
});
