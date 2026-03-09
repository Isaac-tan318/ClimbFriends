import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppColors } from '@/constants/theme';
import { getGymById } from '@/data';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ClimbingSession } from '@/types';

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

type ActiveSessionCardProps = {
  gymName: string;
  elapsed: number;
  onEnd: () => void;
  onLogClimb: () => void;
  session: ClimbingSession;
};

export function ActiveSessionCard({
  gymName,
  elapsed,
  onEnd,
  onLogClimb,
  session,
}: ActiveSessionCardProps) {
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');
  const gym = getGymById(session.gymId);
  const gymLogoText = (gym?.brand || gym?.name || 'Gym')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.activeCardContainer, { borderColor }]}>
      <View style={styles.liveIndicator}>
        <View style={styles.liveDot} />
        <ThemedText style={styles.liveText}>Live Session</ThemedText>
      </View>

      <View style={styles.summaryHeaderRow}>
        {gym?.imageUrl ? (
          <Image source={{ uri: gym.imageUrl }} style={styles.summaryLogo} />
        ) : (
          <View style={styles.summaryLogoFallback}>
            <ThemedText style={styles.summaryLogoText}>{gymLogoText}</ThemedText>
          </View>
        )}
        <View style={styles.summaryHeaderText}>
          <ThemedText style={styles.summarySubtitle} numberOfLines={2}>
            {gymName}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.activeInfoBox, styles.timerBox, { borderColor, borderWidth: 0, padding: 24 }]}>
        <ThemedText style={styles.timerText}>{formatElapsed(elapsed)}</ThemedText>
      </View>

      {(session.climbs?.length ?? 0) > 0 && (
        <ThemedText style={styles.climbCountText}>
          {session.climbs!.length} climb{session.climbs!.length !== 1 ? 's' : ''} logged
        </ThemedText>
      )}

      <View style={styles.activeActions}>
        <Pressable style={styles.logClimbButton} onPress={onLogClimb}>
          <ThemedText style={styles.logClimbButtonText}>Log Climb</ThemedText>
        </Pressable>
        <Pressable style={[styles.endButton, styles.endButtonLight]} onPress={onEnd}>
          <View style={styles.endButtonIcon} />
          <ThemedText style={[styles.endButtonText, styles.endButtonTextDark]}>End Session</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  activeCardContainer: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#22c55e',
    letterSpacing: 1,
  },
  activeInfoBox: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  timerBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  activeActions: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  endButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endButtonLight: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    gap: 6,
  },
  endButtonIcon: {
    width: 14,
    height: 14,
    borderRadius: 2,
    backgroundColor: 'black',
  },
  endButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  endButtonTextDark: {
    color: 'black',
  },
  logClimbButton: {
    flex: 1,
    backgroundColor: AppColors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logClimbButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLogo: {
    width: 75,
    height: 75,
    borderRadius: 9999,
    marginRight: 12,
  },
  summaryLogoFallback: {
    width: 50,
    height: 50,
    borderRadius: 9999,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  summaryLogoText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  summaryHeaderText: {
    flex: 1,
  },
  summarySubtitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
  },
  climbCountText: {
    fontSize: 13,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 8,
  },
});
