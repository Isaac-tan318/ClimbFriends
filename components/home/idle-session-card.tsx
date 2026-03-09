import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppColors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

type IdleSessionCardProps = {
  onStart: () => void;
};

export function IdleSessionCard({ onStart }: IdleSessionCardProps) {
  const cardBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');

  return (
    <View style={[styles.idleCard, { backgroundColor: cardBg, borderColor }]}>
      <ThemedText style={styles.idleTitle}>Not climbing currently</ThemedText>
      <ThemedText style={styles.idleSubtitle}>
        Start a session manually or let auto-detect find your gym
      </ThemedText>
      <Pressable style={styles.startButton} onPress={onStart}>
        <ThemedText style={styles.startButtonText}>Start Climbing!</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  idleCard: {
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  idleTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  idleSubtitle: {
    fontSize: 13,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: AppColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  startButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
});
