import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, ScrollView, View, Pressable, Modal, FlatList, Image, TextInput, Animated, PanResponder, useColorScheme, Text, Alert, Switch } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { format, formatDistanceToNow } from 'date-fns';
import {Device} from '@/constants/device';
import { AppColors, Colors } from '@/constants/theme';

import { AppHeaderBanner } from '@/components/app-header-banner';
import { LogClimbModal } from '@/components/log-climb-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSessionStore } from '@/stores';
import { useSocialStore } from '@/stores';
import { getGymById, SINGAPORE_GYMS, MOCK_LEADERBOARD, CURRENT_USER } from '@/data';
import { ClimbingSession, Friend, LoggedClimb, LeaderboardEntry } from '@/types';
import {
  getAllRecentBetaPosts,
  BetaPost,
} from '@/data/mock-beta';

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
  onLogClimb,
  session,
}: {
  gymName: string;
  elapsed: number;
  onEnd: () => void;
  onLogClimb: () => void;
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
      {/* Climb count */}
      {(session.climbs?.length ?? 0) > 0 && (
        <ThemedText style={{ fontSize: 13, opacity: 0.6, textAlign: 'center', marginBottom: 8 }}>
          {session.climbs!.length} climb{session.climbs!.length !== 1 ? 's' : ''} logged
        </ThemedText>
      )}

      <View style={styles.activeActions}>
        <Pressable style={styles.logClimbButton} onPress={onLogClimb}>
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
  const climbsLogged = session.climbs?.length ?? 0;

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

type HomeTab = 'tracker' | 'feed' | 'ranks';

function RankLeaderboardCard({ entry, isCurrentUser }: { entry: LeaderboardEntry; isCurrentUser: boolean }) {
  const cardBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');
  const highlightBg = useThemeColor({ light: '#eff6ff', dark: '#1e3a5f' }, 'background');

  const hours = Math.round(entry.totalMinutes / 60 * 10) / 10;

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return { backgroundColor: '#fef3c7', emoji: '\u{1F947}' };
      case 2:
        return { backgroundColor: '#f3f4f6', emoji: '\u{1F948}' };
      case 3:
        return { backgroundColor: '#fef3c7', emoji: '\u{1F949}' };
      default:
        return { backgroundColor: '#f3f4f6', emoji: null };
    }
  };

  const rankStyle = getRankStyle(entry.rank);

  return (
    <View style={[
      styles.lbCard,
      { backgroundColor: isCurrentUser ? highlightBg : cardBg, borderColor },
      isCurrentUser && styles.lbCurrentUserCard,
    ]}>
      <View style={[styles.lbRankBadge, { backgroundColor: rankStyle.backgroundColor }]}>
        {rankStyle.emoji ? (
          <ThemedText style={styles.lbRankEmoji}>{rankStyle.emoji}</ThemedText>
        ) : (
          <ThemedText style={styles.lbRankNumber}>#{entry.rank}</ThemedText>
        )}
      </View>

      <View style={[styles.lbAvatar, { backgroundColor: isCurrentUser ? '#0a7ea4' : '#9ca3af' }]}>
        <ThemedText style={styles.lbAvatarText}>
          {entry.user.displayName[0]}
        </ThemedText>
      </View>

      <View style={styles.lbUserInfo}>
        <ThemedText style={styles.lbUserName}>
          {entry.user.displayName}
          {isCurrentUser && <ThemedText style={styles.lbYouTag}> (You)</ThemedText>}
        </ThemedText>
        <ThemedText style={styles.lbUserStats}>
          {entry.totalSessions} sessions
        </ThemedText>
      </View>

      <View style={styles.lbHoursContainer}>
        <ThemedText style={styles.lbHoursValue}>{hours}</ThemedText>
        <ThemedText style={styles.lbHoursLabel}>hours</ThemedText>
      </View>
    </View>
  );
}

function RankStatHighlight({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  const bgColor = useThemeColor({ light: '#f3f4f6', dark: '#262626' }, 'background');

  return (
    <View style={[styles.lbStatHighlight, { backgroundColor: bgColor }]}>
      <ThemedText style={styles.lbStatEmoji}>{emoji}</ThemedText>
      <ThemedText style={styles.lbStatValue}>{value}</ThemedText>
      <ThemedText style={styles.lbStatLabel}>{label}</ThemedText>
    </View>
  );
}

export default function HomeScreen() {
  const stats = useSessionStore((state) => state.stats);
  const activeSession = useSessionStore((state) => state.activeSession);
  const startSession = useSessionStore((state) => state.startSession);
  const endSession = useSessionStore((state) => state.endSession);
  const logClimb = useSessionStore((state) => state.logClimb);
  const allSessions = useSessionStore((state) => state.sessions);
  const plannedVisits = useSocialStore((state) => state.plannedVisits);
  const friends = useSocialStore((state) => state.friends);

  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];

  const [homeTab, setHomeTab] = useState<HomeTab>('tracker');
  const [gymPickerVisible, setGymPickerVisible] = useState(false);
  const [lastEndedSession, setLastEndedSession] = useState<ClimbingSession | null>(null);
  const previousActiveSessionRef = useRef<ClimbingSession | null>(null);
  const [inviteFlow, setInviteFlow] = useState<'none' | 'invite-now' | 'make-plan'>('none');
  const [inviteGymId, setInviteGymId] = useState<string | null>(null);
  const [friendPickerVisible, setFriendPickerVisible] = useState(false);
  const [logClimbVisible, setLogClimbVisible] = useState(false);
  const [logClimbSessionId, setLogClimbSessionId] = useState<string | null>(null);
  const [logClimbGymId, setLogClimbGymId] = useState<string | null>(null);

  // Publish session state
  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [publishDescription, setPublishDescription] = useState('');
  const [publishClimbedWith, setPublishClimbedWith] = useState<boolean>(false);
  const [hasPublished, setHasPublished] = useState(false);

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
    if (lastEndedSession && !hasPublished) {
      Alert.alert(
        'Start new session without publishing?',
        'Your session will still be stored privately.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Anyway',
            onPress: () => setGymPickerVisible(true),
          },
        ],
      );
    } else {
      setGymPickerVisible(true);
    }
  }, [lastEndedSession, hasPublished]);

  const handleGymSelect = useCallback(
    (gymId: string) => {
      setGymPickerVisible(false);
      if (inviteFlow !== 'none') {
        setInviteGymId(gymId);
        setFriendPickerVisible(true);
      } else {
        startSession(gymId);
        setLastEndedSession(null);
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
    // Reset publish state for the new ended session
    setHasPublished(false);
    setPublishDescription('');
    setPublishClimbedWith(false);
  }, [endSession, activeSession]);

  const handleLogClimbOpen = useCallback((sessionId: string, gymId: string) => {
    setLogClimbSessionId(sessionId);
    setLogClimbGymId(gymId);
    setLogClimbVisible(true);
  }, []);

  const handleLogClimbSubmit = useCallback(
    (climb: Omit<LoggedClimb, 'id' | 'loggedAt'>) => {
      logClimb(climb);
      // Update the lastEndedSession if logging for it
      if (lastEndedSession && climb.sessionId === lastEndedSession.id) {
        setLastEndedSession((prev) =>
          prev
            ? {
                ...prev,
                climbs: [
                  ...(prev.climbs ?? []),
                  { ...climb, id: `climb-${Date.now()}`, loggedAt: new Date() },
                ],
              }
            : prev,
        );
      }
    },
    [logClimb, lastEndedSession],
  );

  const handleInviteNow = useCallback(() => {
    setInviteFlow('invite-now');
    setGymPickerVisible(true);
  }, []);

  const handleMakePlan = useCallback(() => {
    setInviteFlow('make-plan');
    setGymPickerVisible(true);
  }, []);

  // Publish modal animated values
  const publishTranslateY = useRef(new Animated.Value(800)).current;
  const publishBackdropOpacity = useRef(new Animated.Value(0)).current;

  const dismissPublishModal = useCallback(() => {
    Animated.parallel([
      Animated.spring(publishTranslateY, { toValue: 800, overshootClamping: true, useNativeDriver: true }),
      Animated.timing(publishBackdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setPublishModalVisible(false);
    });
  }, [publishTranslateY, publishBackdropOpacity]);

  const publishPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
        onPanResponderMove: (_, gs) => {
          if (gs.dy > 0) publishTranslateY.setValue(gs.dy);
        },
        onPanResponderRelease: (_, gs) => {
          if (gs.dy > 100 || gs.vy > 0.5) {
            dismissPublishModal();
          } else {
            Animated.spring(publishTranslateY, { toValue: 0, useNativeDriver: true }).start();
          }
        },
      }),
    [publishTranslateY, dismissPublishModal],
  );

  const handleOpenPublish = useCallback(() => {
    if (lastEndedSession) {
      const gym = getGymById(lastEndedSession.gymId);
      const duration = formatDurationMinutes(lastEndedSession.durationMinutes);
      setPublishDescription(`Climbed for ${duration} at ${gym?.name ?? 'the gym'}!`);
      setPublishClimbedWith(false);
      setPublishModalVisible(true);
    }
  }, [lastEndedSession]);

  useEffect(() => {
    if (publishModalVisible) {
      publishTranslateY.setValue(800);
      publishBackdropOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(publishTranslateY, { toValue: 0, overshootClamping: true, useNativeDriver: true }),
        Animated.timing(publishBackdropOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [publishModalVisible, publishTranslateY, publishBackdropOpacity]);

  const handlePublishSubmit = useCallback(() => {
    // In a real app, this would post to the backend / feed
    setHasPublished(true);
    Animated.parallel([
      Animated.spring(publishTranslateY, { toValue: 800, overshootClamping: true, useNativeDriver: true }),
      Animated.timing(publishBackdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setPublishModalVisible(false);
      Alert.alert('Published!', 'Your session has been shared to the feed.');
    });
  }, [publishTranslateY, publishBackdropOpacity]);

  const handleFriendPickerClose = useCallback(() => {
    setFriendPickerVisible(false);
    setInviteFlow('none');
    setInviteGymId(null);
  }, []);

  const inviteGymName = inviteGymId ? getGymById(inviteGymId)?.name || 'the gym' : 'the gym';
  const inviteDefaultMessage = inviteFlow === 'invite-now'
    ? `Come climb with me at ${inviteGymName} right now!`
    : `Come climb with me at ${inviteGymName}`;

  const recentPosts = useMemo(() => getAllRecentBetaPosts(60).filter((p) => p.type === 'session'), []);

  // Build a lookup of sends grouped by userId + gymId
  const sendsLookup = useMemo(() => {
    const allPosts = getAllRecentBetaPosts(100);
    const map = new Map<string, BetaPost[]>();
    for (const p of allPosts) {
      if (p.type !== 'send') continue;
      const key = `${p.userId}__${p.gymId}`;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return map;
  }, []);

  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());

  const togglePostExpanded = useCallback((postId: string) => {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }, []);

  const mutedText = isDark ? '#999' : '#666';
  const cardBorder = isDark ? AppColors.border.dark : AppColors.border.light;
  const surfaceBg = isDark ? AppColors.surface.dark : AppColors.surface.light;

  const feedFormatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  };

  const renderFeedPost = ({ item }: { item: BetaPost }) => {
    const initials = item.userName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
    const timeAgo = formatDistanceToNow(item.postedAt, { addSuffix: true });
    const firstName = item.userName.split(' ')[0];
    const gym = getGymById(item.gymId);
    const gymLabel = gym?.name ?? item.gymId;

    const hasSends = (item.climbCount ?? 0) > 0;
    const isExpanded = expandedPosts.has(item.id);
    const sends = hasSends ? (sendsLookup.get(`${item.userId}__${item.gymId}`) ?? []) : [];

    return (
      <View style={styles.postCard}>
        {/* Header */}
        <View style={styles.feedHeaderRow}>
          <View style={[styles.feedAvatar, { backgroundColor: AppColors.avatarFallbackBg }]}>
            <Text style={[styles.feedAvatarText, { color: AppColors.avatarFallbackText }]}>
              {initials}
            </Text>
          </View>
          <View style={styles.feedHeaderText}>
            <Text style={[styles.feedUserName, { color: colors.text }]}>{item.userName}</Text>
            <Text style={[styles.feedMeta, { color: mutedText }]}>{gymLabel} · {timeAgo}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.feedTitle, { color: colors.text }]}>
          {`${firstName} climbed for ${feedFormatDuration(item.sessionDurationMinutes ?? 0)}!`}
        </Text>

        {/* Metrics */}
        <View style={styles.feedMetricsRow}>
          <View style={styles.feedMetric}>
            <Text style={[styles.feedMetricLabel, { color: mutedText }]}>Time</Text>
            <Text style={[styles.feedMetricValue, { color: colors.text }]}>
              {feedFormatDuration(item.sessionDurationMinutes ?? 0)}
            </Text>
          </View>
          <View style={styles.feedMetric}>
            <Text style={[styles.feedMetricLabel, { color: mutedText }]}>Climbs logged</Text>
            <Text style={[styles.feedMetricValue, { color: colors.text }]}>
              {item.climbCount ?? 0}
            </Text>
          </View>
        </View>

        {/* Climbed with */}
        {item.climbedWithNames && item.climbedWithNames.length > 0 && (
          <View style={styles.feedClimbedWithRow}>
            <View style={styles.feedClimbedWithAvatars}>
              {item.climbedWithNames.map((name, i) => (
                <View
                  key={name}
                  style={[
                    styles.feedClimbedWithCircle,
                    { marginLeft: i > 0 ? -8 : 0, backgroundColor: AppColors.avatarFallbackBg },
                  ]}
                >
                  <Text style={[styles.feedClimbedWithInitial, { color: AppColors.avatarFallbackText }]}>
                    {name[0]}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={[styles.feedClimbedWithText, { color: mutedText }]}>
              with {item.climbedWithNames.map((n) => n.split(' ')[0]).join(', ')}
            </Text>
          </View>
        )}

        {/* Show Sends button */}
        {hasSends && sends.length > 0 && (
          <>
            <Pressable
              style={[styles.showSendsBtn, { borderColor: cardBorder }]}
              onPress={() => togglePostExpanded(item.id)}
            >
              <Text style={[styles.showSendsBtnText, { color: AppColors.primary }]}>
                {isExpanded ? 'Hide Sends' : `Show Sends (${sends.length})`}
              </Text>
              <MaterialIcons
                name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={18}
                color={AppColors.primary}
              />
            </Pressable>

            {isExpanded && sends.map((send) => (
              <View key={send.id} style={[styles.sendCard, { backgroundColor: surfaceBg, borderColor: cardBorder }]}>
                <View style={styles.sendRow}>
                  {send.grade != null && (
                    <View style={styles.feedMetric}>
                      <Text style={[styles.feedMetricLabel, { color: mutedText }]}>Grade</Text>
                      <Text style={[styles.feedMetricValue, { color: colors.text }]}>{send.grade}</Text>
                    </View>
                  )}
                  {send.color != null && (
                    <View style={styles.feedMetric}>
                      <Text style={[styles.feedMetricLabel, { color: mutedText }]}>Color</Text>
                      <View style={styles.feedColorRow}>
                        <View style={[styles.feedColorDot, { backgroundColor: getColorHex(send.color) }]} />
                        <Text style={[styles.feedMetricValue, { color: colors.text }]}>{send.color}</Text>
                      </View>
                    </View>
                  )}
                  {send.wall != null && (
                    <View style={styles.feedMetric}>
                      <Text style={[styles.feedMetricLabel, { color: mutedText }]}>Wall</Text>
                      <Text style={[styles.feedMetricValue, { color: colors.text }]}>{send.wall}</Text>
                    </View>
                  )}
                </View>
                {send.instagramUrl ? (
                  <View style={[styles.igPlaceholder, { backgroundColor: surfaceBg, borderColor: cardBorder }]}>
                    <Text style={styles.igIcon}>📷</Text>
                    <Text style={[styles.igText, { color: mutedText }]}>Instagram Reel</Text>
                    <Text style={[styles.igUrl, { color: AppColors.primary }]} numberOfLines={1}>
                      {send.instagramUrl}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </>
        )}

        <View style={[styles.postDivider, { backgroundColor: cardBorder }]} />
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <AppHeaderBanner title="Home" />

      {/* Top Tab Switcher */}
      <View style={styles.topTabRow}>
        {(['tracker', 'feed', 'ranks'] as HomeTab[]).map((tab) => (
          <Pressable
            key={tab}
            style={[
              styles.topTabButton,
              homeTab === tab && styles.topTabButtonActive,
            ]}
            onPress={() => setHomeTab(tab)}
          >
            <Text
              style={[
                styles.topTabLabel,
                { color: homeTab === tab ? AppColors.primary : (isDark ? '#888' : '#999') },
              ]}
            >
              {tab === 'tracker' ? 'Tracker' : tab === 'feed' ? 'Feed' : 'Ranks'}
            </Text>
          </Pressable>
        ))}
      </View>

      {homeTab === 'tracker' ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Current Session */}
        <View style={styles.section}>
          {activeSession ? (
            <ActiveSessionCard
              gymName={activeGym?.name || 'Unknown Gym'}
              elapsed={elapsed}
              onEnd={handleEndSession}
              onLogClimb={() => handleLogClimbOpen(activeSession.id, activeSession.gymId)}
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
                <Pressable
                  style={styles.summaryLogClimbButton}
                  onPress={() => handleLogClimbOpen(lastEndedSession.id, lastEndedSession.gymId)}
                >
                  <ThemedText style={styles.summaryLogClimbButtonText}>Log Climb</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.publishButton, hasPublished && styles.publishButtonDone]}
                  onPress={hasPublished ? undefined : handleOpenPublish}
                >
                  <ThemedText style={styles.publishButtonText}>
                    {hasPublished ? '✓ Published' : 'Publish'}
                  </ThemedText>
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
      ) : homeTab === 'feed' ? (
        <FlatList
          data={recentPosts}
          keyExtractor={(p) => p.id}
          renderItem={renderFeedPost}
          contentContainerStyle={styles.feedListContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.feedEmptyState}>
              <ThemedText style={styles.feedEmptyEmoji}>🧗</ThemedText>
              <ThemedText style={styles.feedEmptyText}>No posts yet</ThemedText>
              <ThemedText style={styles.feedEmptySubtext}>
                Recent activity from the community will show up here.
              </ThemedText>
            </View>
          }
        />
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.lbScrollContent}>
          {/* Community Stats */}
          <View style={styles.lbStatsRow}>
            <RankStatHighlight
              emoji="👑"
              label="Top Climber"
              value={MOCK_LEADERBOARD[0].user.displayName.split(' ')[0]}
            />
            <RankStatHighlight
              emoji="⏱️"
              label="Total Hours"
              value={`${Math.round(MOCK_LEADERBOARD.reduce((sum, e) => sum + e.totalMinutes, 0) / 60)}h`}
            />
            <RankStatHighlight
              emoji="🧗"
              label="Sessions"
              value={String(MOCK_LEADERBOARD.reduce((sum, e) => sum + e.totalSessions, 0))}
            />
          </View>

          {/* Your Position */}
          {(() => {
            const currentUserEntry = MOCK_LEADERBOARD.find((e) => e.userId === CURRENT_USER.id);
            return currentUserEntry ? (
              <View style={styles.lbYourPositionSection}>
                <ThemedText type="subtitle" style={styles.lbSectionTitle}>
                  Your Position
                </ThemedText>
                <RankLeaderboardCard entry={currentUserEntry} isCurrentUser={true} />
              </View>
            ) : null;
          })()}

          {/* Full Leaderboard */}
          <View style={styles.lbLeaderboardSection}>
            <ThemedText type="subtitle" style={styles.lbSectionTitle}>
              Rankings
            </ThemedText>
            {MOCK_LEADERBOARD.map((entry) => (
              <RankLeaderboardCard
                key={entry.userId}
                entry={entry}
                isCurrentUser={entry.userId === CURRENT_USER.id}
              />
            ))}
          </View>
        </ScrollView>
      )}

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

      {/* Log Climb Modal */}
      {logClimbSessionId && logClimbGymId && (
        <LogClimbModal
          visible={logClimbVisible}
          onClose={() => setLogClimbVisible(false)}
          onSubmit={handleLogClimbSubmit}
          sessionId={logClimbSessionId}
          gymId={logClimbGymId}
        />
      )}

      {/* Publish Session Modal */}
      <Modal
        visible={publishModalVisible}
        animationType="none"
        transparent
        onRequestClose={dismissPublishModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalBackdrop, { opacity: publishBackdropOpacity }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={dismissPublishModal} />
          </Animated.View>
          <Animated.View style={[styles.modalContent, { backgroundColor: isDark ? '#1c1c1e' : '#fff', transform: [{ translateY: publishTranslateY }] }]}>  
            <View {...publishPanResponder.panHandlers}>
              <View style={styles.bottomSheetHandle} />
            </View>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Publish Session</ThemedText>
              <Pressable onPress={dismissPublishModal}>
                <ThemedText style={styles.modalClose}>✕</ThemedText>
              </Pressable>
            </View>

            {/* Description */}
            <ThemedText style={styles.publishLabel}>Description</ThemedText>
            <TextInput
              style={[
                styles.publishInput,
                {
                  color: colors.text,
                  backgroundColor: isDark ? '#2a2a2a' : '#f3f4f6',
                  borderColor: cardBorder,
                },
              ]}
              value={publishDescription}
              onChangeText={setPublishDescription}
              placeholder="What was your session like?"
              placeholderTextColor={mutedText}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Climbed With */}
            <View style={styles.publishToggleRow}>
              <ThemedText style={{ fontSize: 14, fontWeight: '600' }}>Include Climbed With</ThemedText>
              <Switch
                value={publishClimbedWith}
                onValueChange={setPublishClimbedWith}
                trackColor={{ false: isDark ? '#555' : '#ddd', true: AppColors.primary }}
                thumbColor="white"
              />
            </View>

            {/* Submit */}
            <Pressable style={styles.publishSubmitBtn} onPress={handlePublishSubmit}>
              <ThemedText style={styles.publishSubmitText}>Publish to Feed</ThemedText>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </ThemedView>
  );
}

function getColorHex(colorName: string): string {
  const map: Record<string, string> = {
    White: '#e5e7eb',
    Yellow: '#eab308',
    Red: '#ef4444',
    Blue: '#3b82f6',
    Purple: '#8b5cf6',
    Green: '#22c55e',
    Pink: '#ec4899',
    Black: '#111',
    Orange: '#f97316',
  };
  return map[colorName] ?? '#999';
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
    gap: 8,
  },
  publishButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishButtonDone: {
    backgroundColor: '#86efac',
  },
  publishButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
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

  /* ── Top tab switcher ── */
  topTabRow: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingBottom: 4,
  },
  topTabButton: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  topTabButtonActive: {
    borderBottomColor: AppColors.primary,
  },
  topTabLabel: {
    fontSize: 18,
    fontWeight: '700',
  },

  /* ── Feed styles ── */
  feedListContent: {
    paddingTop: 4,
    paddingBottom: 32,
  },
  postCard: {
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  feedAvatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  feedHeaderText: {
    flex: 1,
  },
  feedUserName: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  feedMeta: {
    fontSize: 13,
    marginLeft: 8,
    marginTop: 1,
    opacity: 0.8,
  },
  feedTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 4,
  },
  feedMetricsRow: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: 48,
    marginBottom: 12,
  },
  feedMetric: {
    alignItems: 'flex-start',
  },
  feedMetricLabel: {
    fontSize: 13,
    opacity: 0.9,
    marginBottom: 2,
  },
  feedMetricValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  feedColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  postDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  feedClimbedWithRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  feedClimbedWithAvatars: {
    flexDirection: 'row',
  },
  feedClimbedWithCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  feedClimbedWithInitial: {
    fontSize: 11,
    fontWeight: '700',
  },
  feedClimbedWithText: {
    fontSize: 13,
  },
  showSendsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 4,
    gap: 4,
  },
  showSendsBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sendCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginTop: 6,
  },
  sendRow: {
    flexDirection: 'row',
    gap: 32,
  },
  igPlaceholder: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  igIcon: {
    fontSize: 28,
  },
  igText: {
    fontSize: 13,
    fontWeight: '600',
  },
  igUrl: {
    fontSize: 11,
  },
  feedEmptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  feedEmptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  feedEmptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  feedEmptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },

  /* ── Ranks / Leaderboard styles ── */
  lbScrollContent: {
    padding: 20,
    paddingTop: 16,
  },
  lbStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  lbStatHighlight: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
  },
  lbStatEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  lbStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  lbStatLabel: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },
  lbYourPositionSection: {
    marginBottom: 24,
  },
  lbSectionTitle: {
    marginBottom: 12,
  },
  lbLeaderboardSection: {
    marginBottom: 20,
  },
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
  lbRankEmoji: {
    fontSize: 18,
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

  /* ── Publish modal ── */
  publishLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  publishInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
  },
  publishToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 4,
  },
  publishSubmitBtn: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  publishSubmitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

