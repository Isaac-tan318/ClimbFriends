import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, ScrollView, View, Pressable, FlatList, Image, TextInput, Animated, useColorScheme, Text, Alert, Switch } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { runOnJS, useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { format } from 'date-fns';
import { AppColors, Colors } from '@/constants/theme';
import { Device } from '@/constants/device';

import { AppHeaderBanner } from '@/components/app-header-banner';
import { ActiveSessionCard } from '@/components/home/active-session-card';
import { FeedPostCard } from '@/components/home/feed-post-card';
import { IdleSessionCard } from '@/components/home/idle-session-card';
import { AnimatedPodium } from '@/components/leaderboard/animated-podium';
import { RankLeaderboardCard } from '@/components/leaderboard/rank-leaderboard-card';
import { LogClimbModal } from '@/components/log-climb-modal';
import { BottomSheetDismiss, BottomSheetModal } from '@/components/shared/bottom-sheet-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuthStore, useSessionStore, useSocialStore } from '@/stores';
import { getGymById, SINGAPORE_GYMS, MOCK_LEADERBOARD, MOCK_NATIONAL_LEADERBOARD, MOCK_GYM_LEADERBOARD, CURRENT_USER } from '@/data';
import { getAllRecentBetaPosts } from '@/data/mock-beta';
import type { BetaPost, ClimbingSession, Friend, GymLeaderboardEntry, LoggedClimb } from '@/types';
import { feedService } from '@/services/feed/feed-service';
import { leaderboardService } from '@/services/leaderboard/leaderboard-service';

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

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      backgroundColor={modalBg}
      contentStyle={styles.modalContent}
      dismissThreshold={500}
      openBackdropDuration={100}
    >
      {({ dismiss, dragGesture, onBodyScroll }) => (
        <>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => dismiss()} style={styles.backButton}>
              <ThemedText style={styles.backButtonText}>‹</ThemedText>
            </Pressable>
            <GestureDetector gesture={dragGesture}>
              <View style={styles.modalHeaderTitleDragZone}>
                <ThemedText type="subtitle" style={styles.modalHeaderTitle}>Select Gym</ThemedText>
              </View>
            </GestureDetector>
            <View style={styles.backButtonSpacer} />
          </View>
          <FlatList
            data={SINGAPORE_GYMS}
            keyExtractor={(item) => item.id}
            onScroll={onBodyScroll}
            scrollEventThrottle={16}
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
        </>
      )}
    </BottomSheetModal>
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

  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setSelectedIds(new Set());
      setMessage(defaultMessage);
      setPlanDate(null);
      setPlanTime(null);
    }
  }, [visible, defaultMessage]);

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

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      backgroundColor={modalBg}
      contentStyle={styles.friendPickerContent}
      dismissThreshold={400}
      openBackdropDuration={300}
    >
      {({ dismiss, onBodyScroll }) => (
        <>
          {/* Search bar */}
          <View style={styles.friendPickerSearchRow}>
            <Pressable onPress={() => dismiss()} style={styles.backButton}>
              <ThemedText style={styles.backButtonText}>‹</ThemedText>
            </Pressable>
            <View style={[styles.friendPickerSearchBar, { backgroundColor: inputBg }]}>
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
            onScroll={onBodyScroll}
            scrollEventThrottle={16}
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
            onPress={() => dismiss()}
            disabled={selectedIds.size === 0}
          >
            <ThemedText style={styles.sendButtonText}>Send separately</ThemedText>
          </Pressable>
        </>
      )}
    </BottomSheetModal>
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
type RankCategory = 'friends' | 'gyms' | 'national';
const HOME_TABS: HomeTab[] = ['tracker', 'feed', 'ranks'];
const SWIPE_TIMING = { duration: 250, easing: Easing.out(Easing.cubic) };

/* Gym Podium (top 3 gyms) */
function AnimatedGymPodium({ entries }: { entries: GymLeaderboardEntry[] }) {
  const colorScheme = useColorScheme() ?? 'light';
  const textColor = colorScheme === 'dark' ? '#f1f1f1' : '#111';
  const mutedColor = colorScheme === 'dark' ? '#aaa' : '#666';
  const top3 = entries.slice(0, 3);
  const thirdAnim = useRef(new Animated.Value(0)).current;
  const secondAnim = useRef(new Animated.Value(0)).current;
  const firstAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    thirdAnim.setValue(0);
    secondAnim.setValue(0);
    firstAnim.setValue(0);
    Animated.stagger(200, [
      Animated.spring(thirdAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.spring(secondAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.spring(firstAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
    ]).start();
  }, [entries, firstAnim, secondAnim, thirdAnim]);

  const podiumColors = ['#fbbf24', '#d1d5db', '#cd7f32'];
  const podiumHeights = [120, 90, 70];
  const animRefs = [firstAnim, secondAnim, thirdAnim];
  const displayOrder = [2, 0, 1];

  if (top3.length < 3) return null;

  return (
    <View style={styles.podiumContainer}>
      {displayOrder.map((idx) => {
        const entry = top3[idx];
        const anim = animRefs[idx];
        const shortGymName = entry.gymName.replace(/^(Boulder\+|Climb Central|BFF Climb|Boulder Planet|Fitbloc|Lighthouse)\s*/i, '').trim();
        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [60, 0],
        });

        return (
          <Animated.View
            key={entry.gymId}
            style={[
              styles.podiumSlot,
              {
                opacity: anim,
                transform: [{ translateY }],
              },
            ]}
          >
            {/* Gym icon */}
            <View
              style={[
                styles.podiumAvatar,
                { backgroundColor: '#6366f1' },
                idx === 0 && styles.podiumAvatarFirst,
              ]}
            >
              <Text style={styles.podiumAvatarText}>{shortGymName.charAt(0).toUpperCase()}</Text>
            </View>

            {/* Name */}
            <Text style={[styles.podiumName, { color: textColor }]} numberOfLines={1}>
              {shortGymName}
            </Text>

            {/* Hours */}
            <Text style={[styles.podiumHours, { color: mutedColor }]}>
              {Math.round(entry.totalMinutes / 60)}h
            </Text>

            {/* Pedestal */}
            <View
              style={[
                styles.podiumPedestal,
                {
                  height: podiumHeights[idx],
                  backgroundColor: podiumColors[idx],
                },
              ]}
            >
              <Text style={styles.podiumRank}>#{idx + 1}</Text>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

/* ── Leaderboard card (ranks 4+) ── */
function GymLeaderboardCard({ entry }: { entry: GymLeaderboardEntry }) {
  const cardBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');
  const hours = Math.round(entry.totalMinutes / 60);

  return (
    <View style={[styles.lbCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={[styles.lbRankBadge, { backgroundColor: '#f3f4f6' }]}>
        <ThemedText style={styles.lbRankNumber}>#{entry.rank}</ThemedText>
      </View>

      <View style={[styles.lbAvatar, { backgroundColor: '#6366f1' }]}>
        <ThemedText style={styles.lbAvatarText}>{entry.gymName.charAt(0).toUpperCase()}</ThemedText>
      </View>

      <View style={styles.lbUserInfo}>
        <ThemedText style={styles.lbUserName}>{entry.gymName}</ThemedText>
        <ThemedText style={styles.lbUserStats}>
          {entry.activeMembersCount} climbers · {entry.totalSessions} sessions
        </ThemedText>
      </View>

      <View style={styles.lbHoursContainer}>
        <ThemedText style={styles.lbHoursValue}>{hours}</ThemedText>
        <ThemedText style={styles.lbHoursLabel}>hours</ThemedText>
      </View>
    </View>
  );
}

function RankStatHighlight({ label, value }: { label: string; value: string }) {
  const bgColor = useThemeColor({ light: '#f3f4f6', dark: '#262626' }, 'background');

  return (
    <View style={[styles.lbStatHighlight, { backgroundColor: bgColor }]}>
      <ThemedText style={styles.lbStatValue}>{value}</ThemedText>
      <ThemedText style={styles.lbStatLabel}>{label}</ThemedText>
    </View>
  );
}

export default function HomeScreen() {
  const authUser = useAuthStore((state) => state.user);
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
  const tabIndex = useSharedValue(0);
  const tabOffset = useSharedValue(0);

  const changeHomeTab = useCallback((index: number) => {
    setHomeTab(HOME_TABS[index]);
  }, [setHomeTab]);

  const homeTabSwipe = useMemo(() =>
    Gesture.Pan()
      .activeOffsetX([-15, 15])
      .failOffsetY([-10, 10])
      .onUpdate((e) => {
        tabOffset.value = -tabIndex.value * Device.SCREEN_WIDTH + e.translationX;
      })
      .onEnd((e) => {
        let target = tabIndex.value;
        if ((e.translationX < -150 || e.velocityX < -500) && target < HOME_TABS.length - 1) {
          target++;
        } else if ((e.translationX > 150 || e.velocityX > 500) && target > 0) {
          target--;
        }
        tabIndex.value = target;
        tabOffset.value = withTiming(-target * Device.SCREEN_WIDTH, SWIPE_TIMING);
        runOnJS(changeHomeTab)(target);
      }),
  [changeHomeTab, tabIndex, tabOffset]);

  const animatedTabStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabOffset.value }],
  }));

  const handleTabPress = useCallback((tab: HomeTab) => {
    const index = HOME_TABS.indexOf(tab);
    tabIndex.value = index;
    tabOffset.value = withTiming(-index * Device.SCREEN_WIDTH, SWIPE_TIMING);
    setHomeTab(tab);
  }, [tabIndex, tabOffset]);
  const [rankCategory, setRankCategory] = useState<RankCategory>('friends');
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
  const [friendsLeaderboard, setFriendsLeaderboard] = useState(MOCK_LEADERBOARD);
  const [nationalLeaderboard, setNationalLeaderboard] = useState(MOCK_NATIONAL_LEADERBOARD);
  const [gymLeaderboard, setGymLeaderboard] = useState(MOCK_GYM_LEADERBOARD);

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

  const handleClosePublishModal = useCallback(() => {
    setPublishModalVisible(false);
  }, []);

  const handleOpenPublish = useCallback(() => {
    if (lastEndedSession) {
      const gym = getGymById(lastEndedSession.gymId);
      const duration = formatDurationMinutes(lastEndedSession.durationMinutes);
      setPublishDescription(`Climbed for ${duration} at ${gym?.name ?? 'the gym'}!`);
      setPublishClimbedWith(false);
      setPublishModalVisible(true);
    }
  }, [lastEndedSession]);

  const handlePublishSubmit = useCallback((dismiss: BottomSheetDismiss) => {
    const publish = async () => {
      if (lastEndedSession) {
        const publishResult = await feedService.publishSession({
          userId: authUser?.id ?? CURRENT_USER.id,
          sessionId: lastEndedSession.id,
          gymId: lastEndedSession.gymId,
          sessionDurationMinutes: lastEndedSession.durationMinutes,
          climbCount: lastEndedSession.climbs?.length ?? 0,
          description: publishDescription,
          climbedWithUserIds: publishClimbedWith ? friends.slice(0, 3).map((friend) => friend.id) : [],
        });

        if (!publishResult.ok) {
          Alert.alert('Publish failed', publishResult.error.message);
          return;
        }

        setAllFeedPosts((prev) => [publishResult.data, ...prev]);
      }

      setHasPublished(true);
      dismiss(() => {
        Alert.alert('Published!', 'Your session has been shared to the feed.');
      });
    };

    void publish();
  }, [lastEndedSession, authUser?.id, publishDescription, publishClimbedWith, friends]);

  const handleFriendPickerClose = useCallback(() => {
    setFriendPickerVisible(false);
    setInviteFlow('none');
    setInviteGymId(null);
  }, []);

  const inviteGymName = inviteGymId ? getGymById(inviteGymId)?.name || 'the gym' : 'the gym';
  const inviteDefaultMessage = inviteFlow === 'invite-now'
    ? `Come climb with me at ${inviteGymName} right now!`
    : `Come climb with me at ${inviteGymName}`;

  const [allFeedPosts, setAllFeedPosts] = useState<BetaPost[]>(() => getAllRecentBetaPosts(100));

  useEffect(() => {
    let mounted = true;

    const loadFeed = async () => {
      const result = await feedService.getFeedPosts({ limit: 100 });
      if (mounted && result.ok) {
        setAllFeedPosts(result.data);
      }
    };

    void loadFeed();

    return () => {
      mounted = false;
    };
  }, []);

  const recentPosts = useMemo(
    () => allFeedPosts.filter((post) => post.type === 'session').slice(0, 60),
    [allFeedPosts],
  );

  // Build a lookup of sends grouped by userId + gymId
  const sendsLookup = useMemo(() => {
    const map = new Map<string, BetaPost[]>();
    for (const p of allFeedPosts) {
      if (p.type !== 'send') continue;
      const key = `${p.userId}__${p.gymId}`;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return map;
  }, [allFeedPosts]);

  useEffect(() => {
    let mounted = true;

    const loadLeaderboards = async () => {
      const [friendsResult, nationalResult, gymsResult] = await Promise.all([
        leaderboardService.getFriendsLeaderboard(authUser?.id ?? CURRENT_USER.id),
        leaderboardService.getNationalLeaderboard(100, 0),
        leaderboardService.getGymLeaderboard(20),
      ]);

      if (!mounted) return;

      if (friendsResult.ok && friendsResult.data.length > 0) {
        setFriendsLeaderboard(friendsResult.data);
      }
      if (nationalResult.ok && nationalResult.data.length > 0) {
        setNationalLeaderboard(nationalResult.data);
      }
      if (gymsResult.ok && gymsResult.data.length > 0) {
        setGymLeaderboard(gymsResult.data);
      }
    };

    void loadLeaderboards();

    return () => {
      mounted = false;
    };
  }, [authUser?.id]);

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

  const renderFeedPostItem = useCallback(
    ({ item }: { item: BetaPost }) => {
      const sends = sendsLookup.get(`${item.userId}__${item.gymId}`) ?? [];
      return (
        <FeedPostCard
          item={item}
          isExpanded={expandedPosts.has(item.id)}
          sends={sends}
          textColor={colors.text}
          mutedText={mutedText}
          cardBorder={cardBorder}
          surfaceBg={surfaceBg}
          onToggleExpanded={togglePostExpanded}
          getColorHex={getColorHex}
        />
      );
    },
    [expandedPosts, sendsLookup, colors.text, mutedText, cardBorder, surfaceBg, togglePostExpanded],
  );

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
            onPress={() => handleTabPress(tab)}
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

      <GestureDetector gesture={homeTabSwipe}>
      <View style={{flex: 1, overflow: 'hidden'}}>
      <Reanimated.View style={[{flexDirection: 'row', width: Device.SCREEN_WIDTH * 3, height: '100%'}, animatedTabStyle]}>
      <View style={{width: Device.SCREEN_WIDTH}}>
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
      </View>

      <View style={{width: Device.SCREEN_WIDTH}}>
        <FlatList
          data={recentPosts}
          keyExtractor={(p) => p.id}
          renderItem={renderFeedPostItem}
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
      </View>

      <View style={{width: Device.SCREEN_WIDTH}}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.lbScrollContent}>
          {/* Category Toggle */}
          <View style={styles.rankCategoryRow}>
            {(['friends', 'gyms', 'national'] as RankCategory[]).map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.rankCategoryBtn,
                  rankCategory === cat && styles.rankCategoryBtnActive,
                ]}
                onPress={() => setRankCategory(cat)}
              >
                <Text
                  style={[
                    styles.rankCategoryLabel,
                    { color: rankCategory === cat ? '#fff' : (isDark ? '#aaa' : '#666') },
                  ]}
                >
                  {cat === 'friends' ? 'Friends' : cat === 'gyms' ? 'Gyms' : 'National'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Podium */}
          {rankCategory === 'gyms' ? (
            <AnimatedGymPodium entries={gymLeaderboard} />
          ) : (
            <AnimatedPodium
              entries={rankCategory === 'friends' ? friendsLeaderboard : nationalLeaderboard}
              currentUserId={CURRENT_USER.id}
            />
          )}

          {/* Community Stats */}
          {rankCategory !== 'gyms' && (() => {
            const data = rankCategory === 'friends' ? friendsLeaderboard : nationalLeaderboard;
            if (data.length === 0) return null;
            return (
              <View style={styles.lbStatsRow}>
                <RankStatHighlight
                  label="Top Climber"
                  value={data[0].user.displayName.split(' ')[0]}
                />
                <RankStatHighlight
                  label="Total Hours"
                  value={`${Math.round(data.reduce((sum, e) => sum + e.totalMinutes, 0) / 60)}h`}
                />
                <RankStatHighlight
                  label="Sessions"
                  value={String(data.reduce((sum, e) => sum + e.totalSessions, 0))}
                />
              </View>
            );
          })()}

          {rankCategory === 'gyms' && (
            <View style={styles.lbStatsRow}>
              <RankStatHighlight
                label="Top Gym"
                value={(gymLeaderboard[0]?.gymName ?? 'N/A').replace(/^(Boulder\+|Climb Central|BFF Climb|Boulder Planet|Fitbloc|Lighthouse)\s*/i, '')}
              />
              <RankStatHighlight
                label="Total Hours"
                value={`${Math.round(gymLeaderboard.reduce((sum, e) => sum + e.totalMinutes, 0) / 60)}h`}
              />
              <RankStatHighlight
                label="Climbers"
                value={String(gymLeaderboard.reduce((sum, e) => sum + e.activeMembersCount, 0))}
              />
            </View>
          )}

          {/* Your Position (people categories only) */}
          {rankCategory !== 'gyms' && (() => {
            const data = rankCategory === 'friends' ? friendsLeaderboard : nationalLeaderboard;
            const currentUserEntry = data.find((e) => e.userId === CURRENT_USER.id);
            return currentUserEntry && currentUserEntry.rank > 3 ? (
              <View style={styles.lbYourPositionSection}>
                <ThemedText type="subtitle" style={styles.lbSectionTitle}>
                  Your Position
                </ThemedText>
                <RankLeaderboardCard entry={currentUserEntry} isCurrentUser={true} />
              </View>
            ) : null;
          })()}

          {/* Full Leaderboard (4th place onwards — top 3 shown in podium) */}
          <View style={styles.lbLeaderboardSection}>
            <ThemedText type="subtitle" style={styles.lbSectionTitle}>
              Rankings
            </ThemedText>
            {rankCategory === 'gyms'
              ? gymLeaderboard.slice(3).map((entry) => (
                  <GymLeaderboardCard key={entry.gymId} entry={entry} />
                ))
              : (rankCategory === 'friends' ? friendsLeaderboard : nationalLeaderboard)
                  .slice(3)
                  .map((entry) => (
                    <RankLeaderboardCard
                      key={entry.userId}
                      entry={entry}
                      isCurrentUser={entry.userId === CURRENT_USER.id}
                    />
                  ))}
          </View>
        </ScrollView>
      </View>
      </Reanimated.View>
      </View>
      </GestureDetector>

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
      <BottomSheetModal
        visible={publishModalVisible}
        onClose={handleClosePublishModal}
        backgroundColor={isDark ? '#1c1c1e' : '#fff'}
        contentStyle={styles.modalContent}
        dismissThreshold={100}
        openBackdropDuration={100}
      >
        {({ dismiss, dragGesture }) => (
          <>
            <View style={styles.modalHeader}>
              <GestureDetector gesture={dragGesture}>
                <View style={styles.modalHeaderTitleDragZone}>
                  <ThemedText type="subtitle">Publish Session</ThemedText>
                </View>
              </GestureDetector>
              <Pressable onPress={() => dismiss()}>
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
            <Pressable style={styles.publishSubmitBtn} onPress={() => handlePublishSubmit(dismiss)}>
              <ThemedText style={styles.publishSubmitText}>Publish to Feed</ThemedText>
            </Pressable>
          </>
        )}
      </BottomSheetModal>
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
  modalSheetBase: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalContent: {
    maxHeight: '70%',
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
  bottomSheetDragHandleArea: {
    minHeight: 48,
    paddingTop: 22,
    paddingBottom: 10,
    justifyContent: 'flex-start',
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#666',
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: 0,
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
  modalHeaderTitleDragZone: {
    flex: 1,
    minHeight: 32,
    justifyContent: 'center',
  },
  modalHeaderTitle: {
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

  /* ── Rank category toggle ── */
  rankCategoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  rankCategoryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(150,150,150,0.12)',
  },
  rankCategoryBtnActive: {
    backgroundColor: AppColors.primary,
  },
  rankCategoryLabel: {
    fontSize: 14,
    fontWeight: '600',
  },

  /* ── Podium ── */
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 24,
    paddingTop: 16,
    gap: 6,
  },
  podiumSlot: {
    flex: 1,
    alignItems: 'center',
  },
  podiumAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  podiumAvatarFirst: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  podiumAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  podiumName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  podiumHours: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 6,
  },
  podiumPedestal: {
    width: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  podiumRank: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgba(0,0,0,0.5)',
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
