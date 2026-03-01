import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, ScrollView, View, Pressable, Modal, FlatList } from 'react-native';
import { format, formatDistanceToNow } from 'date-fns';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSessionStore } from '@/stores';
import { useSocialStore } from '@/stores';
import { getGymById, SINGAPORE_GYMS } from '@/data';
import { CURRENT_USER } from '@/data';

function useElapsedTime(startedAt: Date | null) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0);
      return;
    }

    const tick = () => {
      setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt]);

  return elapsed;
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function ActiveSessionCard({
  gymName,
  elapsed,
  onEnd,
}: {
  gymName: string;
  elapsed: number;
  onEnd: () => void;
}) {
  const boxBg = useThemeColor({ light: '#eff6ff', dark: '#1e3a5f' }, 'background');
  const borderColor = useThemeColor({ light: '#93c5fd', dark: '#3b82f6' }, 'background');

  return (
    <View style={[styles.activeCardContainer, { borderColor }]}>
      {/* Live indicator */}
      <View style={styles.liveIndicator}>
        <View style={styles.liveDot} />
        <ThemedText style={styles.liveText}>Live Session</ThemedText>
      </View>

      {/* Timer + Location boxes */}
      <View style={styles.activeInfoRow}>
        <View style={[styles.activeInfoBox, styles.timerBox, { backgroundColor: boxBg, borderColor }]}>
          <ThemedText style={styles.timerText}>{formatElapsed(elapsed)}</ThemedText>
        </View>
        <View style={[styles.activeInfoBox, { backgroundColor: boxBg, borderColor }]}>
          <View style={styles.locationContent}>
            <View style={styles.locationIcon}>
              <ThemedText style={styles.locationIconText}>📍</ThemedText>
            </View>
            <ThemedText style={styles.activeGymName} numberOfLines={2}>{gymName}</ThemedText>
          </View>
        </View>
      </View>

      {/* End Session + Log Climb buttons */}
      <View style={styles.activeActions}>
        <Pressable style={styles.endButton} onPress={onEnd}>
          <ThemedText style={styles.endButtonText}>End Session</ThemedText>
        </Pressable>
        <Pressable style={styles.logClimbButton}>
          <ThemedText style={styles.logClimbButtonText}>Log Climb</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function IdleSessionCard({ onStart }: { onStart: () => void }) {
  const cardBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');

  return (
    <View style={[styles.idleCard, { backgroundColor: cardBg, borderColor }]}>
      <ThemedText style={styles.idleTitle}>Not climbing currently</ThemedText>
      <ThemedText style={styles.idleSubtitle}>
        Start a session manually or let auto-detect find your gym
      </ThemedText>
      <Pressable style={styles.startButton} onPress={onStart}>
        <ThemedText style={styles.startButtonText}>Start Session</ThemedText>
      </Pressable>
    </View>
  );
}

function GymPickerModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (gymId: string) => void;
}) {
  const modalBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: modalBg }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle">Select Gym</ThemedText>
            <Pressable onPress={onClose}>
              <ThemedText style={styles.modalClose}>✕</ThemedText>
            </Pressable>
          </View>
          <FlatList
            data={SINGAPORE_GYMS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.gymPickerItem, { borderColor }]}
                onPress={() => onSelect(item.id)}
              >
                <ThemedText style={styles.gymPickerName}>{item.name}</ThemedText>
                <ThemedText style={styles.gymPickerBrand}>{item.brand}</ThemedText>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

function RecentSessionCard({ gymName, date, duration }: { gymName: string; date: Date; duration: number }) {
  const cardBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');

  const hours = Math.floor(duration / 60);
  const mins = duration % 60;
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <View style={[styles.sessionCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.sessionInfo}>
        <ThemedText style={styles.sessionGym}>{gymName}</ThemedText>
        <ThemedText style={styles.sessionDate}>
          {formatDistanceToNow(date, { addSuffix: true })}
        </ThemedText>
      </View>
      <ThemedText style={styles.sessionDuration}>{durationStr}</ThemedText>
    </View>
  );
}

function UpcomingPlanCard({ gymName, date, inviteeCount }: { gymName: string; date: Date; inviteeCount: number }) {
  const cardBg = useThemeColor({ light: '#eff6ff', dark: '#1e3a5f' }, 'background');
  const borderColor = useThemeColor({ light: '#93c5fd', dark: '#3b82f6' }, 'background');

  return (
    <View style={[styles.planCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.planInfo}>
        <ThemedText style={styles.planGym}>{gymName}</ThemedText>
        <ThemedText style={styles.planDate}>
          {format(date, 'EEE, MMM d')} at {format(date, 'h:mm a')}
        </ThemedText>
      </View>
      {inviteeCount > 0 && (
        <ThemedText style={styles.inviteeCount}>
          👥 {inviteeCount} {inviteeCount === 1 ? 'friend' : 'friends'}
        </ThemedText>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const stats = useSessionStore((state) => state.stats);
  const activeSession = useSessionStore((state) => state.activeSession);
  const startSession = useSessionStore((state) => state.startSession);
  const endSession = useSessionStore((state) => state.endSession);
  const allSessions = useSessionStore((state) => state.sessions);
  const plannedVisits = useSocialStore((state) => state.plannedVisits);

  const [gymPickerVisible, setGymPickerVisible] = useState(false);

  const elapsed = useElapsedTime(activeSession?.startedAt ?? null);

  const activeGym = activeSession?.gymId ? getGymById(activeSession.gymId) : null;

  const recentSessions = useMemo(
    () =>
      allSessions
        .filter((s) => s.oderId === 'user-1')
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
        .slice(0, 3),
    [allSessions],
  );

  const upcomingPlans = useMemo(() => {
    const now = new Date();
    return plannedVisits
      .filter((p) => p.plannedDate > now)
      .sort((a, b) => a.plannedDate.getTime() - b.plannedDate.getTime())
      .slice(0, 2);
  }, [plannedVisits]);

  const handleStartSession = useCallback(() => {
    setGymPickerVisible(true);
  }, []);

  const handleGymSelect = useCallback(
    (gymId: string) => {
      startSession(gymId);
      setGymPickerVisible(false);
    },
    [startSession],
  );

  const handleEndSession = useCallback(() => {
    endSession();
  }, [endSession]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.greeting}>Welcome back,</ThemedText>
            <ThemedText type="title">{CURRENT_USER.displayName.split(' ')[0]}</ThemedText>
          </View>
          <View style={styles.streakBadge}>
            <ThemedText style={styles.streakEmoji}>🔥</ThemedText>
            <ThemedText style={styles.streakText}>{stats.currentStreak}w streak</ThemedText>
          </View>
        </View>

        {/* Current Session */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Current Session
          </ThemedText>
          {activeSession ? (
            <ActiveSessionCard
              gymName={activeGym?.name || 'Unknown Gym'}
              elapsed={elapsed}
              onEnd={handleEndSession}
            />
          ) : (
            <IdleSessionCard onStart={handleStartSession} />
          )}
        </View>

        {/* Upcoming Plans */}
        {upcomingPlans.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Upcoming Plans
            </ThemedText>
            {upcomingPlans.map((plan) => {
              const gym = getGymById(plan.gymId);
              return (
                <UpcomingPlanCard
                  key={plan.id}
                  gymName={gym?.name || 'Unknown Gym'}
                  date={plan.plannedDate}
                  inviteeCount={plan.invitees.length}
                />
              );
            })}
          </View>
        )}

        {/* Recent Sessions */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Recent Sessions
          </ThemedText>
          {recentSessions.map((session) => {
            const gym = getGymById(session.gymId);
            return (
              <RecentSessionCard
                key={session.id}
                gymName={gym?.name || 'Unknown Gym'}
                date={session.startedAt}
                duration={session.durationMinutes}
              />
            );
          })}
        </View>
      </ScrollView>

      {/* Gym Picker Modal */}
      <GymPickerModal
        visible={gymPickerVisible}
        onClose={() => setGymPickerVisible(false)}
        onSelect={handleGymSelect}
      />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 4,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },

  /* Active session */
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
  activeInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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
    fontSize: 28,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  locationIconText: {
    fontSize: 18,
  },
  activeGymName: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  activeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  endButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  endButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  logClimbButton: {
    flex: 1,
    backgroundColor: '#0a7ea4',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  logClimbButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },

  /* Idle session */
  idleCard: {
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  idleEmoji: {
    fontSize: 40,
    marginBottom: 12,
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
    backgroundColor: '#0a7ea4',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  startButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },

  /* Gym picker modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalClose: {
    fontSize: 22,
    opacity: 0.5,
    padding: 4,
  },
  gymPickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  gymPickerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  gymPickerBrand: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 2,
  },

  /* Recent sessions */
  sessionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionGym: {
    fontWeight: '600',
    fontSize: 15,
  },
  sessionDate: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 2,
  },
  sessionDuration: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a7ea4',
  },

  /* Upcoming plans */
  planCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  planInfo: {
    flex: 1,
  },
  planGym: {
    fontWeight: '600',
    fontSize: 15,
  },
  planDate: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 2,
  },
  inviteeCount: {
    fontSize: 13,
  },
});
