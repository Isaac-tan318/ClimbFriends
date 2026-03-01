import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { MOCK_LEADERBOARD, CURRENT_USER } from '@/data';
import { LeaderboardEntry } from '@/types';

function LeaderboardCard({ entry, isCurrentUser }: { entry: LeaderboardEntry; isCurrentUser: boolean }) {
  const cardBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');
  const highlightBg = useThemeColor({ light: '#eff6ff', dark: '#1e3a5f' }, 'background');
  
  const hours = Math.round(entry.totalMinutes / 60 * 10) / 10;
  
  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return { backgroundColor: '#fef3c7', emoji: '🥇' };
      case 2:
        return { backgroundColor: '#f3f4f6', emoji: '🥈' };
      case 3:
        return { backgroundColor: '#fef3c7', emoji: '🥉' };
      default:
        return { backgroundColor: '#f3f4f6', emoji: null };
    }
  };
  
  const rankStyle = getRankStyle(entry.rank);
  
  return (
    <View style={[
      styles.leaderboardCard,
      { backgroundColor: isCurrentUser ? highlightBg : cardBg, borderColor },
      isCurrentUser && styles.currentUserCard,
    ]}>
      <View style={[styles.rankBadge, { backgroundColor: rankStyle.backgroundColor }]}>
        {rankStyle.emoji ? (
          <ThemedText style={styles.rankEmoji}>{rankStyle.emoji}</ThemedText>
        ) : (
          <ThemedText style={styles.rankNumber}>#{entry.rank}</ThemedText>
        )}
      </View>
      
      <View style={[styles.avatar, { backgroundColor: isCurrentUser ? '#0a7ea4' : '#9ca3af' }]}>
        <ThemedText style={styles.avatarText}>
          {entry.user.displayName[0]}
        </ThemedText>
      </View>
      
      <View style={styles.userInfo}>
        <ThemedText style={styles.userName}>
          {entry.user.displayName}
          {isCurrentUser && <ThemedText style={styles.youTag}> (You)</ThemedText>}
        </ThemedText>
        <ThemedText style={styles.userStats}>
          {entry.totalSessions} sessions
        </ThemedText>
      </View>
      
      <View style={styles.hoursContainer}>
        <ThemedText style={styles.hoursValue}>{hours}</ThemedText>
        <ThemedText style={styles.hoursLabel}>hours</ThemedText>
      </View>
    </View>
  );
}

function StatHighlight({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  const bgColor = useThemeColor({ light: '#f3f4f6', dark: '#262626' }, 'background');
  
  return (
    <View style={[styles.statHighlight, { backgroundColor: bgColor }]}>
      <ThemedText style={styles.statEmoji}>{emoji}</ThemedText>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
  );
}

export default function LeaderboardScreen() {
  const currentUserEntry = MOCK_LEADERBOARD.find((e) => e.userId === CURRENT_USER.id);
  
  // Calculate some fun stats
  const topClimber = MOCK_LEADERBOARD[0];
  const totalCommunityHours = MOCK_LEADERBOARD.reduce((sum, e) => sum + e.totalMinutes, 0) / 60;
  const totalSessions = MOCK_LEADERBOARD.reduce((sum, e) => sum + e.totalSessions, 0);
  
  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title">Leaderboard</ThemedText>
          <ThemedText style={styles.subtitle}>
            See how you rank among friends
          </ThemedText>
        </View>
        
        {/* Community Stats */}
        <View style={styles.statsRow}>
          <StatHighlight 
            emoji="👑" 
            label="Top Climber" 
            value={topClimber.user.displayName.split(' ')[0]} 
          />
          <StatHighlight 
            emoji="⏱️" 
            label="Total Hours" 
            value={`${Math.round(totalCommunityHours)}h`} 
          />
          <StatHighlight 
            emoji="🧗" 
            label="Sessions" 
            value={String(totalSessions)} 
          />
        </View>
        
        {/* Your Position */}
        {currentUserEntry && (
          <View style={styles.yourPositionSection}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Your Position
            </ThemedText>
            <LeaderboardCard entry={currentUserEntry} isCurrentUser={true} />
          </View>
        )}
        
        {/* Full Leaderboard */}
        <View style={styles.leaderboardSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Rankings
          </ThemedText>
          {MOCK_LEADERBOARD.map((entry) => (
            <LeaderboardCard 
              key={entry.userId} 
              entry={entry} 
              isCurrentUser={entry.userId === CURRENT_USER.id}
            />
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statHighlight: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },
  yourPositionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  leaderboardSection: {
    marginBottom: 20,
  },
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  currentUserCard: {
    borderColor: '#0a7ea4',
    borderWidth: 2,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankEmoji: {
    fontSize: 18,
  },
  rankNumber: {
    fontSize: 13,
    fontWeight: 'bold',
    opacity: 0.7,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
  },
  youTag: {
    color: '#0a7ea4',
    fontWeight: 'normal',
  },
  userStats: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  hoursContainer: {
    alignItems: 'flex-end',
  },
  hoursValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a7ea4',
  },
  hoursLabel: {
    fontSize: 11,
    opacity: 0.5,
  },
});
