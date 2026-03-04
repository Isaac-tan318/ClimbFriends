import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, ScrollView, View, Pressable, Modal, FlatList, Image, TextInput, Animated, PanResponder, useColorScheme } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { format, formatDistanceToNow } from 'date-fns';
import {Device} from '@/constants/device';
import { AppColors } from '@/constants/theme';

import { AppHeaderBanner } from '@/components/app-header-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSessionStore } from '@/stores';
import { useSocialStore } from '@/stores';
import { getGymById, SINGAPORE_GYMS } from '@/data';
import { ClimbingSession, Friend } from '@/types';

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

function formatDurationMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatClock(value: Date): string {
  return format(value, 'h:mm a').toLowerCase();
}

function formatOrdinal(value: number): string {
  const tens = value % 100;
  if (tens >= 11 && tens <= 13) return `${value}th`;
  const ones = value % 10;
  if (ones === 1) return `${value}st`;
  if (ones === 2) return `${value}nd`;
  if (ones === 3) return `${value}rd`;
  return `${value}th`;
}

function ActiveSessionCard({
  gymName,
  elapsed,
  onEnd,
  session,
}: {
  gymName: string;
  elapsed: number;
  onEnd: () => void;
  session: ClimbingSession;
}) {
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
      {/* Live indicator */}
      <View style={styles.liveIndicator}>
        <View style={styles.liveDot} />
        <ThemedText style={styles.liveText}>Live Session</ThemedText>
      </View>

      {/* Gym Info */}
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

      {/* Timer */}
      <View style={[styles.activeInfoBox, styles.timerBox, { borderColor, borderWidth: 0, padding: 24 }]}>
        <ThemedText style={styles.timerText}>{formatElapsed(elapsed)}</ThemedText>
      </View>

      {/* End Session + Log Climb buttons */}
      <View style={styles.activeActions}>
        <Pressable style={styles.logClimbButton}>
          <ThemedText style={styles.logClimbButtonText}>Log Climb</ThemedText>
        </Pressable>
        <Pressable style={[styles.endButton, { backgroundColor: '#fff', flexDirection: 'row', gap: 6 }]} onPress={onEnd}>
          <View style={{ width: 14, height: 14, borderRadius: 2, backgroundColor: 'black' }} />
          <ThemedText style={[styles.endButtonText, { color: 'black' }]}>End Session</ThemedText>
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
        <ThemedText style={styles.startButtonText}>Start Climbing!</ThemedText>
      </Pressable>
    </View>
  );
}

function SessionSummaryCard({
  session,
  sessionsThisWeek,
  climbedWith,
}: {
  session: ClimbingSession;
  sessionsThisWeek: number;
  climbedWith: Friend[];
}) {
  const gym = getGymById(session.gymId);
  const startedTime = formatClock(session.startedAt);
  const endedTime = session.endedAt ? formatClock(session.endedAt) : '-';
  const location = gym?.name || 'Unknown location';
  const gymLogoText = (gym?.brand || gym?.name || 'Gym')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const climbsLogged = 0;

  return (
    <View style={styles.summaryCard}>
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
            {location}
          </ThemedText>
        </View>
      </View>
      <ThemedText style={styles.summaryTitle}>
        You climbed from {startedTime} to {endedTime}!
      </ThemedText>
      <View style={styles.summaryMetricsRow}>
        <View style={styles.summaryMetric}>
          <ThemedText style={styles.summaryMetricLabel}>Time</ThemedText>
          <ThemedText style={styles.summaryMetricValue}>
            {formatDurationMinutes(session.durationMinutes)}
          </ThemedText>
        </View>
        <View style={styles.summaryMetric}>
          <ThemedText style={styles.summaryMetricLabel} numberOfLines={1}>
            Climb this week
          </ThemedText>
          <ThemedText style={styles.summaryMetricValue}>{formatOrdinal(sessionsThisWeek)}</ThemedText>
        </View>
        <View style={styles.summaryMetric}>
          <ThemedText style={styles.summaryMetricLabel}>Climbs logged</ThemedText>
          <ThemedText style={styles.summaryMetricValue}>{climbsLogged}</ThemedText>
        </View>
      </View>
      {climbedWith.length > 0 && (
        <View style={styles.climbedWithRow}>
          <ThemedText style={styles.climbedWithLabel}>Climbed with</ThemedText>
          <View style={styles.climbedWithFriends}>
            {climbedWith.map((friend) => (
              <View key={friend.id} style={styles.climbedWithFriend}>
                {friend.avatarUrl ? (
                  <Image source={{ uri: friend.avatarUrl }} style={styles.climbedWithAvatar} />
                ) : (
                  <View style={styles.climbedWithAvatarFallback}>
                    <ThemedText style={styles.climbedWithAvatarText}>
                      {friend.displayName
                        .split(' ')
                        .map((w) => w[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </ThemedText>
                  </View>
                )}
                <ThemedText style={styles.climbedWithName} numberOfLines={1}>
                  {friend.displayName.split(' ')[0]}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      )}
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
  const translateY = useRef(new Animated.Value(800)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) {
      translateY.setValue(800);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0,  overshootClamping: true,
 useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  const dismissModal = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 800, overshootClamping: true, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      onCloseRef.current();
    });
  }, [translateY, backdropOpacity]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
        onPanResponderMove: (_, gs) => {
          if (gs.dy > 0) translateY.setValue(gs.dy);
        },
        onPanResponderRelease: (_, gs) => {
          if (gs.dy > 500 || gs.vy > 0.5) {
            dismissModal();
          } else {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
          }
        },
      }),
    [translateY, dismissModal],
  );

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={dismissModal}>
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalBackdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismissModal} />
        </Animated.View>
        <Animated.View style={[styles.modalContent, { backgroundColor: modalBg, transform: [{ translateY }] }]}>
          <View {...panResponder.panHandlers}>
            <View style={styles.bottomSheetHandle} />
          </View>
          <View style={styles.modalHeader}>
            <Pressable onPress={dismissModal} style={styles.backButton}>
              <ThemedText style={styles.backButtonText}>‹</ThemedText>
            </Pressable>
            <ThemedText type="subtitle" style={styles.modalHeaderTitle}>Select Gym</ThemedText>
            <View style={styles.backButtonSpacer} />
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
        </Animated.View>

      </View>
    </Modal>
  );
}

function UpcomingPlanCard({ gymName, date, inviteeCount }: { gymName: string; date: Date; inviteeCount: number }) {
  const cardBg = useThemeColor({ light: '#f9fafb', dark: '#1a1a1a' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');

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

function FriendPickerModal({
  visible,
  onClose,
  friends,
  defaultMessage,
  mode,
}: {
  visible: boolean;
  onClose: () => void;
  friends: Friend[];
  defaultMessage: string;
  mode: 'invite-now' | 'make-plan';
}) {
  const modalBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');
  const inputBg = useThemeColor({ light: '#f3f4f6', dark: '#2a2a2a' }, 'background');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState(defaultMessage);
  const [planDate, setPlanDate] = useState<Date | null>(null);
  const [planTime, setPlanTime] = useState<string | null>(null);
  const translateY = useRef(new Animated.Value(800)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setSelectedIds(new Set());
      setMessage(defaultMessage);
      setPlanDate(null);
      setPlanTime(null);
      translateY.setValue(800);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, overshootClamping: true, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, defaultMessage, translateY, backdropOpacity]);

  const dismissModal = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 800, overshootClamping: true, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      onCloseRef.current();
    });
  }, [translateY, backdropOpacity]);

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase();
    return friends.filter((f) => f.displayName.toLowerCase().includes(q));
  }, [friends, searchQuery]);

  const toggleFriend = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSend = useCallback(() => {
    onClose();
  }, [onClose]);

  const dateOptions = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  const timeSlots = useMemo(
    () => [
      '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
      '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
      '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM',
    ],
    [],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
        onPanResponderMove: (_, gs) => {
          if (gs.dy > 0) translateY.setValue(gs.dy);
        },
        onPanResponderRelease: (_, gs) => {
          if (gs.dy > 400 || gs.vy > 0.5) {
            dismissModal();
          } else {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
          }
        },
      }),
    [translateY, dismissModal],
  );

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={dismissModal}>
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalBackdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismissModal} />
        </Animated.View>
        <Animated.View style={[styles.friendPickerContent, { backgroundColor: modalBg, transform: [{ translateY }] }]}>
          {/* Handle bar */}
          <View {...panResponder.panHandlers}>
            <View style={styles.bottomSheetHandle} />
          </View>

          {/* Search bar */}
          <View style={styles.friendPickerSearchRow}>
            <Pressable onPress={dismissModal} style={styles.backButton}>
              <ThemedText style={styles.backButtonText}>‹</ThemedText>
            </Pressable>
            <View style={[styles.friendPickerSearchBar, { backgroundColor: inputBg }]}>
              <ThemedText style={styles.friendPickerSearchIcon}>🔍</ThemedText>
              <TextInput
                style={[styles.friendPickerSearchInput, { color: textColor }]}
                placeholder="Search"
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Friend Grid */}
          <FlatList
            data={filteredFriends}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.friendGrid}
            ListFooterComponent={
              <>
                {/* Date/Time picker for Plan mode */}
                {mode === 'make-plan' && (
                  <View style={styles.dateTimeSection}>
                    <ThemedText style={styles.dateTimeSectionLabel}>Pick a date</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                      {dateOptions.map((d, i) => {
                        const isToday = i === 0;
                        const isDateSelected = planDate !== null && d.toDateString() === planDate.toDateString();
                        return (
                          <Pressable
                            key={i}
                            style={[styles.dateChip, isDateSelected && styles.dateChipSelected]}
                            onPress={() => setPlanDate(d)}
                          >
                            <ThemedText style={[styles.dateChipText, isDateSelected && styles.dateChipTextSelected]}>
                              {isToday ? 'Today' : format(d, 'EEE, MMM d')}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                    <ThemedText style={[styles.dateTimeSectionLabel, { marginTop: 12 }]}>Pick a time</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
                      {timeSlots.map((t) => {
                        const isTimeSelected = planTime === t;
                        return (
                          <Pressable
                            key={t}
                            style={[styles.timeChip, isTimeSelected && styles.timeChipSelected]}
                            onPress={() => setPlanTime(t)}
                          >
                            <ThemedText style={[styles.timeChipText, isTimeSelected && styles.timeChipTextSelected]}>
                              {t}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </>
            }
            renderItem={({ item }) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <Pressable style={styles.friendGridItem} onPress={() => toggleFriend(item.id)}>
                  <View style={styles.friendGridAvatarWrap}>
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} style={styles.friendGridAvatar} />
                    ) : (
                      <View style={styles.friendGridAvatarFallback}>
                        <ThemedText style={styles.friendGridAvatarText}>
                          {item.displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                        </ThemedText>
                      </View>
                    )}
                    {item.isAtGym && !isSelected && (
                      <View style={styles.friendGridOnlineDot} />
                    )}
                    {isSelected && (
                      <View style={styles.friendGridCheck}>
                        <ThemedText style={styles.friendGridCheckText}>✓</ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText style={styles.friendGridName} numberOfLines={1}>
                    {item.displayName.split(' ')[0]}
                  </ThemedText>
                </Pressable>
              );
            }}
          />

          {/* Message input */}
          <View style={[styles.messageInputRow, { borderColor }]}>
            <TextInput
              style={[styles.messageInput, { color: textColor }]}
              placeholder="Write a message..."
              placeholderTextColor="#888"
              value={message}
              onChangeText={setMessage}
            />
          </View>

          {/* Send button */}
          <Pressable
            style={[styles.sendButton, selectedIds.size === 0 && { opacity: 0.5 }]}
            onPress={handleSend}
            disabled={selectedIds.size === 0}
          >
            <ThemedText style={styles.sendButtonText}>Send separately</ThemedText>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function InviteBoxes({ onInviteNow, onMakePlan }: { onInviteNow: () => void; onMakePlan: () => void }) {
  const scheme = useColorScheme();
  const surfaceBg = scheme === 'dark' ? AppColors.surfaceContainer.dark : AppColors.surfaceContainer.light;

  return (
    <View style={styles.inviteButtonsRow}>
      <Pressable style={[styles.inviteBox, { backgroundColor: surfaceBg }]} onPress={onInviteNow}>
        <MaterialIcons name="bolt" size={32} color={AppColors.primary} />
        <ThemedText style={styles.inviteBoxText}>Invite Now</ThemedText>
      </Pressable>
      <Pressable style={[styles.inviteBox, { backgroundColor: surfaceBg }]} onPress={onMakePlan}>
        <MaterialIcons name="event" size={32} color={AppColors.primary} />
        <ThemedText style={styles.inviteBoxText}>Make a Plan</ThemedText>
      </Pressable>
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
  const friends = useSocialStore((state) => state.friends);

  const [gymPickerVisible, setGymPickerVisible] = useState(false);
  const [lastEndedSession, setLastEndedSession] = useState<ClimbingSession | null>(null);
  const previousActiveSessionRef = useRef<ClimbingSession | null>(null);
  const [inviteFlow, setInviteFlow] = useState<'none' | 'invite-now' | 'make-plan'>('none');
  const [inviteGymId, setInviteGymId] = useState<string | null>(null);
  const [friendPickerVisible, setFriendPickerVisible] = useState(false);

  const displayedSummarySession = lastEndedSession;

  const elapsed = useElapsedTime(activeSession?.startedAt ?? null);

  const activeGym = activeSession?.gymId ? getGymById(activeSession.gymId) : null;

  const upcomingPlans = useMemo(() => {
    const now = new Date();
    return plannedVisits
      .filter((p) => p.plannedDate > now)
      .sort((a, b) => a.plannedDate.getTime() - b.plannedDate.getTime())
      .slice(0, 3);
  }, [plannedVisits]);

  useEffect(() => {
    if (previousActiveSessionRef.current && !activeSession) {
      const endedSession = allSessions.find(
        (session) =>
          session.id === previousActiveSessionRef.current?.id && !session.isActive,
      );

      if (endedSession) {
        setLastEndedSession(endedSession);
      }
    }

    previousActiveSessionRef.current = activeSession;
  }, [activeSession, allSessions]);

  const handleStartSession = useCallback(() => {
    setGymPickerVisible(true);
  }, []);

  const handleGymSelect = useCallback(
    (gymId: string) => {
      setGymPickerVisible(false);
      if (inviteFlow !== 'none') {
        setInviteGymId(gymId);
        setFriendPickerVisible(true);
      } else {
        setLastEndedSession(null);
        startSession(gymId);
      }
    },
    [startSession, inviteFlow],
  );

  const handleEndSession = useCallback(() => {
    if (activeSession) {
      // Set the summary session immediately to prevent flashing
      const endedSession = { ...activeSession, isActive: false, endedAt: new Date() };
      setLastEndedSession(endedSession);
    }
    endSession();
  }, [endSession, activeSession]);

  const handleInviteNow = useCallback(() => {
    setInviteFlow('invite-now');
    setGymPickerVisible(true);
  }, []);

  const handleMakePlan = useCallback(() => {
    setInviteFlow('make-plan');
    setGymPickerVisible(true);
  }, []);

  const handleFriendPickerClose = useCallback(() => {
    setFriendPickerVisible(false);
    setInviteFlow('none');
    setInviteGymId(null);
  }, []);

  const inviteGymName = inviteGymId ? getGymById(inviteGymId)?.name || 'the gym' : 'the gym';
  const inviteDefaultMessage = inviteFlow === 'invite-now'
    ? `Come climb with me at ${inviteGymName} right now!`
    : `Come climb with me at ${inviteGymName}`;

  return (
    <ThemedView style={styles.container}>
      <AppHeaderBanner title="Home" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Current Session */}
        <View style={styles.section}>
          {activeSession ? (
            <ActiveSessionCard
              gymName={activeGym?.name || 'Unknown Gym'}
              elapsed={elapsed}
              onEnd={handleEndSession}
              session={activeSession}
            />
          ) : lastEndedSession ? (
            <>
              <SessionSummaryCard
                session={lastEndedSession}
                sessionsThisWeek={stats.sessionsThisWeek}
                climbedWith={friends.slice(0, 3)}
              />
              <View style={styles.summaryActionsRow}>
                <Pressable style={styles.summaryLogClimbButton}>
                  <ThemedText style={styles.summaryLogClimbButtonText}>Log Climb</ThemedText>
                </Pressable>
                <Pressable style={styles.newSessionButton} onPress={handleStartSession}>
                  <ThemedText style={styles.newSessionButtonText}>New Session</ThemedText>
                </Pressable>
              </View>
            </>
          ) : (
            <IdleSessionCard onStart={handleStartSession} />
          )}
        </View>

        <View style={styles.sectionDivider} />

        {/* Invite Friends */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Invite Friends to Climb
          </ThemedText>
          <InviteBoxes onInviteNow={handleInviteNow} onMakePlan={handleMakePlan} />

          {/* Upcoming Plans */}
          {upcomingPlans.length > 0 && (
            <View style={styles.upcomingPlansContainer}>
              <ThemedText style={styles.upcomingPlansLabel}>Upcoming Plans</ThemedText>
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
        </View>
      </ScrollView>

      {/* Gym Picker Modal */}
      <GymPickerModal
        visible={gymPickerVisible}
        onClose={() => {
          setGymPickerVisible(false);
          setInviteFlow('none');
        }}
        onSelect={handleGymSelect}
      />

      {/* Friend Picker Modal */}
      <FriendPickerModal
        visible={friendPickerVisible}
        onClose={handleFriendPickerClose}
        friends={friends}
        defaultMessage={inviteDefaultMessage}
        mode={inviteFlow === 'none' ? 'invite-now' : inviteFlow}
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
    paddingTop: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth * 10,
    backgroundColor: '#000000',
    marginTop: 16,
    marginBottom: 32,
    marginHorizontal: -20,
  },
  sectionTitle: {
    marginBottom: 24,
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
    fontSize: 40,
    lineHeight: 44,
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
  endButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
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
  summaryCard: {
    marginTop: 8,
    marginBottom: 24,
    marginLeft: 8,
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
  summaryMetricsRow: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: 48,
    marginBottom: 32,
  },
  summaryMetric: {
    alignItems: 'flex-start',
  },
  summaryMetricLabel: {
    fontSize: 13,
    opacity: 0.9,
    marginBottom: 2,
  },
  summaryMetricValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  climbedWithRow: {
    marginTop: 24,
  },
  climbedWithLabel: {
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 8,
  },
  climbedWithFriends: {
    flexDirection: 'row',
    gap: 16,
  },
  climbedWithFriend: {
    alignItems: 'center',
    gap: 5,
  },
  climbedWithAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  climbedWithAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  climbedWithAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4338ca',
  },
  climbedWithName: {
    fontSize: 13,
    fontWeight: '500',
    maxWidth: 64,
    textAlign: 'center',
  },
  summaryLogClimbButton: {
    flex: 1,
    backgroundColor: '#0a7ea4',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newSessionButton: {
    flex: 1,
    backgroundColor: AppColors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  newSessionButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  summaryLogClimbButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  summaryTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 4,
  },

  /* Gym picker modal */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#666',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  backButtonSpacer: {
    width: 32,
  },
  modalHeaderTitle: {
    flex: 1,
    textAlign: 'center',
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

  /* Invite buttons */
  inviteButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inviteBox: {
    flex: 1,
    height: 110,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.15)',
  },
  inviteBoxText: {
    fontSize: 14,
    fontWeight: '600',
  },

  /* Friend picker modal */
  friendPickerContent: {
    maxHeight: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 24,
  },
  friendPickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#666',
    alignSelf: 'center',
    marginBottom: 16,
  },
  friendPickerSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  friendPickerSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  friendPickerSearchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  friendPickerSearchInput: {
    flex: 1,
    fontSize: 16,
  },
  friendGrid: {
    paddingTop: 8,
  },
  friendGridItem: {
    flex: 1 / 3,
    alignItems: 'center',
    marginBottom: 20,
  },
  friendGridAvatarWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  friendGridAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  friendGridAvatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendGridAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4338ca',
  },
  friendGridOnlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#1c1c1e',
  },
  friendGridCheck: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1c1c1e',
  },
  friendGridCheckText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  friendGridName: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 90,
  },
  messageInputRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 8,
  },
  messageInput: {
    fontSize: 16,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  dateTimeSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  dateTimeSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
    marginBottom: 8,
  },
  dateScroll: {
    marginBottom: 4,
  },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    marginRight: 8,
  },
  dateChipSelected: {
    backgroundColor: '#6366f1',
  },
  dateChipText: {
    fontSize: 13,
    color: '#ccc',
  },
  dateChipTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  timeScroll: {
    marginBottom: 4,
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    marginRight: 8,
  },
  timeChipSelected: {
    backgroundColor: '#6366f1',
  },
  timeChipText: {
    fontSize: 13,
    color: '#ccc',
  },
  timeChipTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  upcomingPlansContainer: {
    marginTop: 4,
  },
  upcomingPlansLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    opacity: 0.8,
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

