import { endOfWeek, format, formatDistanceToNow, isWithinInterval, startOfWeek } from 'date-fns';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppHeaderBanner } from '@/components/app-header-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getGymById } from '@/data';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSessionStore } from '@/stores';
import { ClimbingSession } from '@/types';

type FilterPeriod = 'all' | 'week' | 'month';

function SessionCard({ session }: { session: ClimbingSession }) {
  const cardBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');
  
  const gym = getGymById(session.gymId);
  const hours = Math.floor(session.durationMinutes / 60);
  const mins = session.durationMinutes % 60;
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  
  return (
    <View style={[styles.sessionCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.sessionHeader}>
        <View style={styles.dateContainer}>
          <ThemedText style={styles.sessionDay}>
            {format(session.startedAt, 'EEE')}
          </ThemedText>
          <ThemedText style={styles.sessionDate}>
            {format(session.startedAt, 'd')}
          </ThemedText>
          <ThemedText style={styles.sessionMonth}>
            {format(session.startedAt, 'MMM')}
          </ThemedText>
        </View>
        <View style={styles.sessionDetails}>
          <ThemedText style={styles.gymName}>{gym?.name || 'Unknown Gym'}</ThemedText>
          <ThemedText style={styles.sessionTime}>
            {format(session.startedAt, 'h:mm a')} - {session.endedAt ? format(session.endedAt, 'h:mm a') : 'ongoing'}
          </ThemedText>
          <ThemedText style={styles.sessionAgo}>
            {formatDistanceToNow(session.startedAt, { addSuffix: true })}
          </ThemedText>
        </View>
        <View style={styles.durationContainer}>
          <ThemedText style={styles.durationValue}>{durationStr}</ThemedText>
          <ThemedText style={styles.durationLabel}>duration</ThemedText>
        </View>
      </View>
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  const bgColor = useThemeColor({ light: '#f3f4f6', dark: '#262626' }, 'background');
  
  return (
    <View style={[styles.statBox, { backgroundColor: bgColor }]}>
      <ThemedText style={styles.statBoxValue}>{value}</ThemedText>
      <ThemedText style={styles.statBoxLabel}>{label}</ThemedText>
    </View>
  );
}

export default function HistoryScreen() {
  const [filter, setFilter] = useState<FilterPeriod>('all');
  const allSessions = useSessionStore((state) => state.sessions);
  const sessions = useMemo(
    () => allSessions.filter((s) => s.userId === 'user-1'),
    [allSessions]
  );
  
  const now = new Date();
  
  const filteredSessions = sessions.filter((session) => {
    if (filter === 'week') {
      return isWithinInterval(session.startedAt, {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      });
    }
    if (filter === 'month') {
      return session.startedAt.getMonth() === now.getMonth() &&
        session.startedAt.getFullYear() === now.getFullYear();
    }
    return true;
  }).sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  
  const totalMinutes = filteredSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
  const avgDuration = filteredSessions.length > 0 
    ? Math.round(totalMinutes / filteredSessions.length) 
    : 0;
  
  return (
    <ThemedView style={styles.container}>
      <AppHeaderBanner title="History" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title">History</ThemedText>
          <ThemedText style={styles.subtitle}>
            Your climbing journey
          </ThemedText>
        </View>
        
        {/* Period Filter */}
        <View style={styles.filterRow}>
          {(['all', 'week', 'month'] as FilterPeriod[]).map((period) => (
            <Pressable
              key={period}
              style={[
                styles.filterButton,
                filter === period && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(period)}
            >
              <ThemedText style={[
                styles.filterButtonText,
                filter === period && styles.filterButtonTextActive,
              ]}>
                {period === 'all' ? 'All Time' : period === 'week' ? 'This Week' : 'This Month'}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        
        {/* Stats Summary */}
        <View style={styles.statsRow}>
          <StatBox label="Sessions" value={String(filteredSessions.length)} />
          <StatBox label="Total Hours" value={`${totalHours}h`} />
          <StatBox label="Avg Session" value={`${avgDuration}m`} />
        </View>
        
        {/* Session List */}
        <View style={styles.sessionList}>
          {filteredSessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </View>
        
        {filteredSessions.length === 0 && (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyEmoji}>📭</ThemedText>
            <ThemedText style={styles.emptyText}>No sessions yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Your climbing sessions will appear here
            </ThemedText>
          </View>
        )}
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
    paddingTop: 24,
  },
  header: {
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#0a7ea4',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  statBoxValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  statBoxLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  sessionList: {
    gap: 12,
  },
  sessionCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateContainer: {
    alignItems: 'center',
    marginRight: 14,
    minWidth: 44,
  },
  sessionDay: {
    fontSize: 11,
    opacity: 0.6,
    textTransform: 'uppercase',
  },
  sessionDate: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sessionMonth: {
    fontSize: 11,
    opacity: 0.6,
    textTransform: 'uppercase',
  },
  sessionDetails: {
    flex: 1,
  },
  gymName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  sessionTime: {
    fontSize: 13,
    opacity: 0.7,
  },
  sessionAgo: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  durationContainer: {
    alignItems: 'flex-end',
  },
  durationValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a7ea4',
  },
  durationLabel: {
    fontSize: 11,
    opacity: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
  },
});
