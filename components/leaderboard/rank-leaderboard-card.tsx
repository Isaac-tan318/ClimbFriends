import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { LeaderboardEntry } from '@/types';

type RankLeaderboardCardProps = {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
};

function RankLeaderboardCardInner({ entry, isCurrentUser }: RankLeaderboardCardProps) {
  const cardBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');
  const highlightBg = useThemeColor({ light: '#eff6ff', dark: '#1e3a5f' }, 'background');
  const hours = Math.round(entry.totalMinutes / 60 * 10) / 10;

  return (
    <View
      style={[
        styles.lbCard,
        { backgroundColor: isCurrentUser ? highlightBg : cardBg, borderColor },
        isCurrentUser && styles.lbCurrentUserCard,
      ]}
    >
      <View style={[styles.lbRankBadge, { backgroundColor: '#f3f4f6' }]}>
        <ThemedText style={styles.lbRankNumber}>#{entry.rank}</ThemedText>
      </View>

      <View style={[styles.lbAvatar, { backgroundColor: isCurrentUser ? '#0a7ea4' : '#9ca3af' }]}>
        <ThemedText style={styles.lbAvatarText}>{entry.user.displayName[0]}</ThemedText>
      </View>

      <View style={styles.lbUserInfo}>
        <ThemedText style={styles.lbUserName}>
          {entry.user.displayName}
          {isCurrentUser && <ThemedText style={styles.lbYouTag}> (You)</ThemedText>}
        </ThemedText>
        <ThemedText style={styles.lbUserStats}>{entry.totalSessions} sessions</ThemedText>
      </View>

      <View style={styles.lbHoursContainer}>
        <ThemedText style={styles.lbHoursValue}>{hours}</ThemedText>
        <ThemedText style={styles.lbHoursLabel}>hours</ThemedText>
      </View>
    </View>
  );
}

export const RankLeaderboardCard = memo(RankLeaderboardCardInner);

const styles = StyleSheet.create({
  lbCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  lbCurrentUserCard: {
    borderColor: '#0a7ea4',
    borderWidth: 2,
  },
  lbRankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  lbRankNumber: {
    fontSize: 13,
    fontWeight: 'bold',
    opacity: 0.7,
  },
  lbAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  lbAvatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lbUserInfo: {
    flex: 1,
  },
  lbUserName: {
    fontSize: 15,
    fontWeight: '600',
  },
  lbYouTag: {
    color: '#0a7ea4',
    fontWeight: 'normal',
  },
  lbUserStats: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  lbHoursContainer: {
    alignItems: 'flex-end',
  },
  lbHoursValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a7ea4',
  },
  lbHoursLabel: {
    fontSize: 11,
    opacity: 0.5,
  },
});
