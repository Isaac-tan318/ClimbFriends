import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  Pressable,
  useColorScheme,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { runOnJS, useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  format,
  formatDistanceToNow,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  subDays,
  subMonths,
} from 'date-fns';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSessionStore, useSocialStore } from '@/stores';
import { CURRENT_USER, getGymById } from '@/data';
import { AppColors, Colors } from '@/constants/theme';
import { Device } from '@/constants/device';
import { ClimbingSession } from '@/types';

// ─── Constants ──────────────────────────────────────────────────────────────

const BANNER_COLOR = '#7dd3c4';

// ─── Achievement badges ─────────────────────────────────────────────────────

type Achievement = {
  id: string;
  emoji: string;
  label: string;
  description: string;
  xp?: number;
  unlocked: boolean;
};

type AchievementCategory = {
  id: string;
  title: string;
  hideDescription?: boolean;
  achievements: Achievement[];
};

const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
  {
    id: 'exploration',
    title: 'Exploration',
    achievements: [
      {
        id: 'first-contact',
        emoji: '🧭',
        label: 'First Contact',
        xp: 50,
        description: 'Log your very first gym session on the app.',
        unlocked: true,
      },
      {
        id: 'east-coast-plan',
        emoji: '🌅',
        label: 'East Coast Plan',
        xp: 150,
        description: 'Visit three different gyms in the East (BFF Tampines OTH, BFF Yoha, Climb@T3, Upwall Climbing).',
        unlocked: false,
      },
      {
        id: 'journey-to-the-west',
        emoji: '🌄',
        label: 'Journey to the west',
        xp: 150,
        description: 'Visit three different gyms in the West (Boulder+ Chervons, Climb Central Chua Chu Kang, Fitbloc Depot Heights, Fitbloc Kent Ridge, Lighthouse Climbing, Z-Vertigo Boulder Gym).',
        unlocked: false,
      },
      {
        id: 'northern-attitude',
        emoji: '❄️',
        label: 'Northern attitude',
        description: 'Visit three different gyms in the North/North East (Boulder Planet Sembawang, Boulder Planet Taiseng, Boulder Movement Taiseng, Ark Bloc).',
        unlocked: false,
      },
      {
        id: 'sendtral',
        emoji: '🏙️',
        label: 'Sendtral',
        xp: 150,
        description: 'Visit three different gyms in Central Singapore (Kinetics Climbing, Ground Up Climbing, OYEYO Boulder Home, Boulder Movement Rochor, Climb Central Kallang, Outpost Climbing).',
        unlocked: false,
      },
      {
        id: 'south',
        emoji: '🌴',
        label: 'South',
        xp: 150,
        description: 'Visit three different gyms in the South/CBD area (Climba, Boulder Movement Downtown, Boulder Movement Bugis, Climb Central Funan).',
        unlocked: false,
      },
      {
        id: 'island-hopper',
        emoji: '🗺️',
        label: 'Island Hopper',
        xp: 150,
        description: 'Visit at least one gym in the North, South, East, West, and Central regions.',
        unlocked: false,
      },
      {
        id: 'how-did-we-get-here',
        emoji: '🧗‍♂️',
        label: 'How did we get here?',
        xp: 1000,
        description: 'Visit every single climbing gym in Singapore.',
        unlocked: false,
      },
    ],
  },
  {
    id: 'grind-badges',
    title: 'Grind Badges',
    achievements: [
      {
        id: 'dawn-patrol',
        emoji: '🌤️',
        label: 'Dawn Patrol',
        xp: 100,
        description: 'Enter a gym before 10:30 AM.',
        unlocked: true,
      },
      {
        id: 'night-owl',
        emoji: '🌙',
        label: 'Night Owl',
        xp: 100,
        description: 'Stay at a gym till late (after 10:00 PM).',
        unlocked: false,
      },
      {
        id: 'weekend-warrior',
        emoji: '📅',
        label: 'Weekend Warrior',
        xp: 100,
        description: 'Log a session on both Saturday and Sunday in the same weekend.',
        unlocked: false,
      },
      {
        id: 'regular-showerf',
        emoji: '🫧',
        label: 'Regular showerf',
        xp: 500,
        description: 'Climb at least 3 days a week for 4 weeks in a row.',
        unlocked: false,
      },
      {
        id: 'well-hydrated',
        emoji: '💧',
        label: 'Well hydrated',
        xp: 500,
        description: 'Log 100 or more total hours of climbing.',
        unlocked: false,
      },
      {
        id: 'extraterrestrial',
        emoji: '👽',
        label: 'Extraterrestrial',
        xp: 1500,
        description: 'Log 100 sessions in a single Boulder Planet outlet.',
        unlocked: false,
      },
      {
        id: 'umai',
        emoji: '🍜',
        label: 'Umai!',
        xp: 1500,
        description: 'Log 100 sessions in a single Climba outlet.',
        unlocked: false,
      },
      {
        id: 'jiggle-jiggle-jiggle',
        emoji: '🪩',
        label: 'Jiggle Jiggle Jiggle',
        xp: 1500,
        description: 'Log 100 sessions in a single Boulder Movement outlet.',
        unlocked: false,
      },
      {
        id: 'illuminator',
        emoji: '💡',
        label: 'The Illuminator',
        xp: 1500,
        description: 'Log 100 sessions in a single Lighthouse Climbing outlet.',
        unlocked: false,
      },
      {
        id: 'center-stage',
        emoji: '🎭',
        label: 'Center Stage',
        xp: 1500,
        description: 'Log 100 sessions in a single Climb Central outlet.',
        unlocked: false,
      },
    ],
  },
  {
    id: 'community',
    title: 'Community',
    achievements: [
      {
        id: 'climbfriend',
        emoji: '🤝',
        label: 'ClimbFriend',
        xp: 50,
        description: 'Add your first friend on the app.',
        unlocked: true,
      },
      {
        id: 'buddy-climbs',
        emoji: '👯',
        label: 'Buddy climbs',
        xp: 100,
        description: 'Climb at the same gym with a friend for at least 2 hours.',
        unlocked: false,
      },
      {
        id: 'squads',
        emoji: '🫂',
        label: 'Squads',
        xp: 200,
        description: 'Have a session where 4 or more mutual friends are at the same gym at the same time.',
        unlocked: false,
      },
      {
        id: 'five-stack',
        emoji: '🖐️',
        label: 'Five stack',
        xp: 300,
        description: 'Send out a session invite that 4 or more people accept and actually attend.',
        unlocked: false,
      },
      {
        id: 'full-lobby',
        emoji: '🎮',
        label: 'Full lobby',
        xp: 1000,
        description: 'Send out a session invite that 10 or more people accept and actually attend.',
        unlocked: false,
      },
      {
        id: 'last-warning',
        emoji: '📣',
        label: 'Last warning',
        xp: 1500,
        description: 'Send out a session invite that 25 or more people accept and actually attend.',
        unlocked: false,
      },
      {
        id: 'fifty-plus',
        emoji: '❓',
        label: '?????????????',
        xp: 5000,
        description: 'Send out a session invite that 50 or more people accept and actually attend.',
        unlocked: false,
      },
      {
        id: 'where-have-you-been',
        emoji: '📩',
        label: 'Where have you been?',
        description: 'Invite a friend that you have not climbed with for at least 3 months, and actually attend.',
        unlocked: false,
      },
    ],
  },
  {
    id: 'progression-badges',
    title: 'Progression Badges',
    achievements: [
      {
        id: 'breaking-the-plateau',
        emoji: '📈',
        label: 'Breaking the Plateau',
        xp: 100,
        description: 'Manually log a new max grade for the first time (e.g., moving from BM3 to BM4, or V3 to V4).',
        unlocked: false,
      },
      {
        id: 'stoned',
        emoji: '🪨',
        label: 'Stoned',
        xp: 500,
        description: 'Log 42 hours specifically at high-wall gyms (like Climb Central Sports Hub or Ground Up).',
        unlocked: false,
      },
      {
        id: 'flash-master',
        emoji: '⚡',
        label: 'Flash Master',
        xp: 250,
        description: 'Log a session where you flashed a route at your max grade.',
        unlocked: false,
      },
      {
        id: 'system-calibrator',
        emoji: '🎛️',
        label: 'System Calibrator',
        description: 'Log 10 benchmark problems on a system board of your choice.',
        unlocked: false,
      },
      {
        id: 'creative-space',
        emoji: '🎨',
        label: 'Creative Space',
        description: 'Set and log 5 custom boulder problems on the spray wall.',
        unlocked: false,
      },
      {
        id: 'rock-solid',
        emoji: '🧱',
        label: 'Rock Solid',
        description: 'Do 50 consecutive moves on the endurance wall/spray wall.',
        unlocked: false,
      },
      {
        id: 'strong-contender',
        emoji: '🏆',
        label: 'Strong Contender',
        description: 'Complete a competition style boulder on the comp wall.',
        unlocked: false,
      },
    ],
  },
  {
    id: 'fun-hidden',
    title: 'Fun / Easter Eggs (Hidden Badges)',
    hideDescription: true,
    achievements: [
      {
        id: 'crowd-surfer',
        emoji: '🌊',
        label: 'Crowd Surfer',
        xp: 100,
        description: 'Enter a gym when the app live map marks it as Very Crowded.',
        unlocked: false,
      },
      {
        id: 'ghost-town',
        emoji: '👻',
        label: 'Ghost Town',
        xp: 100,
        description: 'Enter a gym when you are the only person using the app there.',
        unlocked: false,
      },
      {
        id: 'rest-days-are-a-myth',
        emoji: '🩹',
        label: 'Rest Days Are A Myth',
        xp: 200,
        description: 'Log a gym session 7 days in a row.',
        unlocked: false,
      },
      {
        id: 'the-end-question',
        emoji: '🔚',
        label: 'The End?',
        description: 'Climb at least one highest graded route in every gym in Singapore.',
        unlocked: false,
      },
      {
        id: 'the-beginning-question',
        emoji: '🚩',
        label: 'The beginning?',
        description: 'Enter a local comp for the first time in any category (Novice-open).',
        unlocked: false,
      },
      {
        id: 'the-beginning',
        emoji: '🥇',
        label: 'The beginning',
        description: 'Win a local comp for the first time in any category (Novice-open).',
        unlocked: false,
      },
      {
        id: 'the-end',
        emoji: '🏁',
        label: 'The End',
        description: 'Win a local comp for the first time in open category.',
        unlocked: false,
      },
      {
        id: 'top-of-the-world',
        emoji: '🌍',
        label: 'Top of the world',
        description: 'Enter and win an international comp of any discipline (boulder, lead, speed climb).',
        unlocked: false,
      },
      {
        id: 'overkill',
        emoji: '💥',
        label: 'Overkill',
        description: 'Flash all the routes in a local comp for bouldering in any category.',
        unlocked: false,
      },
      {
        id: 'over-overkill',
        emoji: '☄️',
        label: 'Over-Overkill',
        description: 'Flash all the routes in an international comp for bouldering.',
        unlocked: false,
      },
    ],
  },
];

const ALL_ACHIEVEMENTS = ACHIEVEMENT_CATEGORIES.flatMap((category) => category.achievements);

// ─── Level system ───────────────────────────────────────────────────────────

function getLevelInfo(totalMinutes: number, totalSessions: number) {
  const xp = totalMinutes + totalSessions * 50;
  return { level: 4, tier: 'Noob', xp, nextXp: 1400, progress: (xp - 1000) / 400 };
}

// ─── Mock graph data generators ─────────────────────────────────────────────

function generateWeeklyHoursData(sessions: ClimbingSession[]) {
  const weeks: { label: string; hours: number }[] = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const weekStart = startOfWeek(subDays(now, i * 7), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(subDays(now, i * 7), { weekStartsOn: 1 });
    const weekSessions = sessions.filter((s) =>
      isWithinInterval(s.startedAt, { start: weekStart, end: weekEnd }),
    );
    const totalMins = weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    weeks.push({
      label: format(weekStart, 'd MMM'),
      hours: Math.round((totalMins / 60) * 10) / 10,
    });
  }
  return weeks;
}

function generateMonthlySendsData(sessions: ClimbingSession[]) {
  const months: { label: string; sends: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const month = subMonths(now, i);
    const monthSessions = sessions.filter(
      (s) =>
        s.startedAt.getMonth() === month.getMonth() &&
        s.startedAt.getFullYear() === month.getFullYear(),
    );
    const sends = monthSessions.reduce(
      (sum, s) => sum + (s.climbs?.length ?? Math.floor(Math.random() * 3) + 3),
      0,
    );
    months.push({ label: format(month, 'MMM'), sends });
  }
  return months;
}

// ─── Bar Chart Component ────────────────────────────────────────────────────

function BarChart({
  data,
  valueKey,
  labelKey,
  color,
  unit,
}: {
  data: Record<string, any>[];
  valueKey: string;
  labelKey: string;
  color: string;
  unit: string;
}) {
  const textColor = useThemeColor({ light: '#333', dark: '#ddd' }, 'text');
  const mutedColor = useThemeColor({ light: '#999', dark: '#777' }, 'text');
  const maxVal = Math.max(...data.map((d) => d[valueKey]), 1);

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.barsRow}>
        {data.map((item, i) => {
          const barHeight = (item[valueKey] / maxVal) * 100;
          return (
            <View key={i} style={chartStyles.barSlot}>
              <Text style={[chartStyles.barValue, { color: textColor }]}>
                {item[valueKey]}{unit}
              </Text>
              <View style={chartStyles.barTrack}>
                <View
                  style={[
                    chartStyles.bar,
                    { height: `${Math.max(barHeight, 4)}%`, backgroundColor: color },
                  ]}
                />
              </View>
              <Text style={[chartStyles.barLabel, { color: mutedColor }]}>
                {item[labelKey]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { marginTop: 8 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 160 },
  barSlot: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barValue: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
  barTrack: { width: '70%', height: '70%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, marginTop: 6 },
});

// ─── Session Card ───────────────────────────────────────────────────────────

function SessionCard({ session }: { session: ClimbingSession }) {
  const cardBg = useThemeColor({ light: '#fff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');

  const gym = getGymById(session.gymId);
  const hours = Math.floor(session.durationMinutes / 60);
  const mins = session.durationMinutes % 60;
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <View style={[actStyles.sessionCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={actStyles.sessionRow}>
        <View style={actStyles.dateBox}>
          <Text style={[actStyles.dateDay, { color: AppColors.primary }]}>
            {format(session.startedAt, 'EEE')}
          </Text>
          <Text style={[actStyles.dateNum, { color: AppColors.primary }]}>
            {format(session.startedAt, 'd')}
          </Text>
        </View>
        <View style={actStyles.sessionInfo}>
          <ThemedText style={actStyles.sessionGym}>{gym?.name || 'Unknown Gym'}</ThemedText>
          <ThemedText style={actStyles.sessionTime}>
            {format(session.startedAt, 'h:mm a')} • {formatDistanceToNow(session.startedAt, { addSuffix: true })}
          </ThemedText>
        </View>
        <View style={actStyles.durationBox}>
          <ThemedText style={actStyles.durationVal}>{durationStr}</ThemedText>
        </View>
      </View>
    </View>
  );
}

const actStyles = StyleSheet.create({
  sessionCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  sessionRow: { flexDirection: 'row', alignItems: 'center' },
  dateBox: { alignItems: 'center', marginRight: 14, minWidth: 40 },
  dateDay: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  dateNum: { fontSize: 22, fontWeight: 'bold' },
  sessionInfo: { flex: 1 },
  sessionGym: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  sessionTime: { fontSize: 12, opacity: 0.6 },
  durationBox: { alignItems: 'flex-end' },
  durationVal: { fontSize: 16, fontWeight: 'bold', color: AppColors.primary },
});

// ─── Types ──────────────────────────────────────────────────────────────────

type ProfileTab = 'insights' | 'activities' | 'progression';

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const stats = useSessionStore((state) => state.stats);
  const allSessions = useSessionStore((state) => state.sessions);
  const friends = useSocialStore((state) => state.friends);

  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
  const cardBg = useThemeColor({ light: '#fff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');
  const surfaceBg = useThemeColor({ light: '#f3f4f6', dark: '#262626' }, 'background');

  const [profileTab, setProfileTab] = useState<ProfileTab>('insights');
  const PROFILE_TABS: ProfileTab[] = ['insights', 'activities', 'progression'];
  const profileTabIndex = useSharedValue(0);
  const profileTabOffset = useSharedValue(0);
  const SWIPE_TIMING = { duration: 250, easing: Easing.out(Easing.cubic) };

  const changeProfileTab = useCallback((index: number) => {
    setProfileTab(PROFILE_TABS[index]);
  }, []);

  const profileTabSwipe = useMemo(() =>
    Gesture.Pan()
      .activeOffsetX([-15, 15])
      .failOffsetY([-10, 10])
      .onUpdate((e) => {
        profileTabOffset.value = -profileTabIndex.value * Device.SCREEN_WIDTH + e.translationX;
      })
      .onEnd((e) => {
        let target = profileTabIndex.value;
        if ((e.translationX < -400 || e.velocityX < -500) && target < PROFILE_TABS.length - 1) {
          target++;
        } else if ((e.translationX > 400 || e.velocityX > 500) && target > 0) {
          target--;
        }
        profileTabIndex.value = target;
        profileTabOffset.value = withTiming(-target * Device.SCREEN_WIDTH, SWIPE_TIMING);
        runOnJS(changeProfileTab)(target);
      }),
  [changeProfileTab]);

  const animatedProfileTabStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: profileTabOffset.value }],
  }));

  const handleProfileTabPress = useCallback((tab: ProfileTab) => {
    const index = PROFILE_TABS.indexOf(tab);
    profileTabIndex.value = index;
    profileTabOffset.value = withTiming(-index * Device.SCREEN_WIDTH, SWIPE_TIMING);
    setProfileTab(tab);
  }, []);

  const mySessions = useMemo(
    () =>
      allSessions
        .filter((s) => s.userId === 'user-1')
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()),
    [allSessions],
  );
  const totalHours = Math.round((stats.totalMinutes / 60) * 10) / 10;
  const levelInfo = getLevelInfo(stats.totalMinutes, stats.totalSessions);

  const favGym = useMemo(() => {
    const gymCounts: Record<string, number> = {};
    mySessions.forEach((s) => { gymCounts[s.gymId] = (gymCounts[s.gymId] || 0) + 1; });
    const topGymId = Object.entries(gymCounts).sort(([, a], [, b]) => b - a)[0]?.[0];
    return topGymId ? getGymById(topGymId) : null;
  }, [mySessions]);

  const weeklyHours = useMemo(() => generateWeeklyHoursData(mySessions), [mySessions]);
  const monthlySends = useMemo(() => generateMonthlySendsData(mySessions), [mySessions]);

  const unlockedAchievements = ALL_ACHIEVEMENTS.filter((a) => a.unlocked);
  const unlockedCount = unlockedAchievements.length;

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} bounces={false}>
        {/* ── Banner ── */}
        <View style={styles.banner}>
          <View style={styles.bannerTopRow}>
            <Pressable style={styles.bannerIcon}>
              <MaterialIcons name="edit" size={22} color="#fff" />
            </Pressable>
            <Pressable style={styles.bannerIcon}>
              <MaterialIcons name="settings" size={22} color="#fff" />
            </Pressable>
          </View>
          <Text style={styles.mascot}>🪨</Text>
        </View>

        {/* ── Profile section overlapping banner ── */}
        <View style={[styles.profileSection, { backgroundColor: colors.background }]}>
          {/* Avatar + Badges row */}
          <View style={styles.avatarBadgesRow}>
            <View style={[styles.profilePic, { borderColor: colors.background }]}>
              <View style={styles.profilePicInner}>
                <Text style={styles.profilePicText}>{CURRENT_USER.displayName[0]}</Text>
              </View>
            </View>
            <View style={styles.badgesRow}>
              {unlockedAchievements.slice(0, 5).map((ach) => (
                <View key={ach.id} style={[styles.badge, { backgroundColor: '#7c3aed' }]}>
                  <Text style={styles.badgeEmoji}>{ach.emoji}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Name & Meta */}
          <View style={styles.nameRow}>
            <ThemedText style={styles.profileName}>{CURRENT_USER.displayName}</ThemedText>
            <View style={styles.levelCircle}>
              <Text style={styles.levelCircleText}>{levelInfo.level}</Text>
            </View>
          </View>
          <ThemedText style={styles.profileMeta}>
            @{CURRENT_USER.email.split('@')[0]}  •  <Text style={styles.friendCount}>{friends.length}</Text> friends
          </ThemedText>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCell, { backgroundColor: surfaceBg }]}>
              <ThemedText style={styles.statLabel}>Climbed</ThemedText>
              <ThemedText style={styles.statValue}>{totalHours}h</ThemedText>
            </View>
            <View style={[styles.statCell, { backgroundColor: surfaceBg }]}>
              <ThemedText style={styles.statLabel}>Streak</ThemedText>
              <ThemedText style={styles.statValue}>🔥 {stats.currentStreak}</ThemedText>
            </View>
            <View style={[styles.statCell, { backgroundColor: surfaceBg }]}>
              <ThemedText style={styles.statLabel}>Tier</ThemedText>
              <ThemedText style={styles.statValue}>{levelInfo.tier}</ThemedText>
            </View>
            <View style={[styles.statCell, { backgroundColor: surfaceBg }]}>
              <ThemedText style={styles.statLabel}>Favourite gym</ThemedText>
              <View style={[styles.favGymDot, { backgroundColor: AppColors.primary }]}>
                <Text style={styles.favGymDotText}>{favGym ? favGym.name[0] : '?'}</Text>
              </View>
            </View>
          </View>

          {/* ── Tab Switcher ── */}
          <View style={[styles.tabRow, { borderColor }]}>
            {(['insights', 'activities', 'progression'] as ProfileTab[]).map((t) => (
              <Pressable
                key={t}
                style={[styles.tabBtn, profileTab === t && styles.tabBtnActive]}
                onPress={() => handleProfileTabPress(t)}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    { color: profileTab === t ? AppColors.primary : (isDark ? '#888' : '#999') },
                  ]}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* ── Tab Content ── */}
          <GestureDetector gesture={profileTabSwipe}>
          <View style={[styles.tabContent, {overflow: 'hidden', marginHorizontal: -20}]}>
          <Reanimated.View style={[{flexDirection: 'row', width: Device.SCREEN_WIDTH * 3}, animatedProfileTabStyle]}>
            <View style={{width: Device.SCREEN_WIDTH, paddingHorizontal: 20}}>
              <View style={[styles.chartCard, { backgroundColor: cardBg, borderColor }]}>
                <ThemedText style={styles.chartTitle}>Climbing Hours</ThemedText>
                <ThemedText style={styles.chartSubtitle}>Last 8 weeks</ThemedText>
                <BarChart data={weeklyHours} valueKey="hours" labelKey="label" color={AppColors.primary} unit="h" />
              </View>

              <View style={[styles.chartCard, { backgroundColor: cardBg, borderColor }]}>
                <ThemedText style={styles.chartTitle}>Sends</ThemedText>
                <ThemedText style={styles.chartSubtitle}>Last 6 months</ThemedText>
                <BarChart data={monthlySends} valueKey="sends" labelKey="label" color="#22c55e" unit="" />
              </View>

              <View style={styles.insightStatsRow}>
                <View style={[styles.insightStatCard, { backgroundColor: surfaceBg }]}>
                  <Text style={styles.insightStatEmoji}>🔥</Text>
                  <ThemedText style={styles.insightStatVal}>{stats.currentStreak}</ThemedText>
                  <ThemedText style={styles.insightStatLabel}>Current Streak</ThemedText>
                </View>
                <View style={[styles.insightStatCard, { backgroundColor: surfaceBg }]}>
                  <Text style={styles.insightStatEmoji}>⚡</Text>
                  <ThemedText style={styles.insightStatVal}>{stats.longestStreak}</ThemedText>
                  <ThemedText style={styles.insightStatLabel}>Longest Streak</ThemedText>
                </View>
                <View style={[styles.insightStatCard, { backgroundColor: surfaceBg }]}>
                  <Text style={styles.insightStatEmoji}>📅</Text>
                  <ThemedText style={styles.insightStatVal}>{stats.sessionsThisWeek}</ThemedText>
                  <ThemedText style={styles.insightStatLabel}>This Week</ThemedText>
                </View>
              </View>
            </View>

            <View style={{width: Device.SCREEN_WIDTH, paddingHorizontal: 20}}>
              <View style={styles.insightStatsRow}>
                <View style={[styles.insightStatCard, { backgroundColor: surfaceBg }]}>
                  <ThemedText style={styles.insightStatVal}>{mySessions.length}</ThemedText>
                  <ThemedText style={styles.insightStatLabel}>Sessions</ThemedText>
                </View>
                <View style={[styles.insightStatCard, { backgroundColor: surfaceBg }]}>
                  <ThemedText style={styles.insightStatVal}>{totalHours}h</ThemedText>
                  <ThemedText style={styles.insightStatLabel}>Total Time</ThemedText>
                </View>
                <View style={[styles.insightStatCard, { backgroundColor: surfaceBg }]}>
                  <ThemedText style={styles.insightStatVal}>
                    {mySessions.length > 0 ? `${Math.round(stats.totalMinutes / mySessions.length)}m` : '0m'}
                  </ThemedText>
                  <ThemedText style={styles.insightStatLabel}>Avg Session</ThemedText>
                </View>
              </View>

              {mySessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}

              {mySessions.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>📭</Text>
                  <ThemedText style={styles.emptyText}>No sessions yet</ThemedText>
                  <ThemedText style={styles.emptySubtext}>Your climbing sessions will appear here</ThemedText>
                </View>
              )}
            </View>

            <View style={{width: Device.SCREEN_WIDTH, paddingHorizontal: 20}}>
              {/* Level Card */}
              <View style={[styles.levelCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.levelHeader}>
                  <View>
                    <ThemedText style={styles.levelTierLabel}>{levelInfo.tier}</ThemedText>
                    <ThemedText style={styles.levelNumber}>Level {levelInfo.level}</ThemedText>
                  </View>
                  <View style={styles.xpBadge}>
                    <Text style={styles.xpBadgeText}>{levelInfo.xp} XP</Text>
                  </View>
                </View>

                <View style={styles.xpBarContainer}>
                  <View style={[styles.xpBarTrack, { backgroundColor: isDark ? '#333' : '#e5e7eb' }]}>
                    <View
                      style={[styles.xpBarFill, { width: `${Math.min(levelInfo.progress * 100, 100)}%`, backgroundColor: AppColors.primary }]}
                    />
                  </View>
                  <ThemedText style={styles.xpBarLabel}>
                    {levelInfo.xp} / {levelInfo.nextXp} XP to next level
                  </ThemedText>
                </View>

                <View style={styles.xpBreakdown}>
                  <View style={styles.xpRow}>
                    <ThemedText style={styles.xpRowLabel}>⏱️ Climbing time</ThemedText>
                    <ThemedText style={styles.xpRowVal}>{stats.totalMinutes} XP</ThemedText>
                  </View>
                  <View style={styles.xpRow}>
                    <ThemedText style={styles.xpRowLabel}>🧗 Sessions bonus</ThemedText>
                    <ThemedText style={styles.xpRowVal}>{stats.totalSessions * 50} XP</ThemedText>
                  </View>
                </View>
              </View>

              {/* Achievements */}
              <ThemedText style={styles.achievementsTitle}>
                Achievements ({unlockedCount}/{ALL_ACHIEVEMENTS.length})
              </ThemedText>

              {ACHIEVEMENT_CATEGORIES.map((category) => {
                const categoryUnlocked = category.achievements.filter((ach) => ach.unlocked).length;
                return (
                  <View key={category.id} style={styles.achievementCategorySection}>
                    <View style={styles.achievementCategoryHeader}>
                      <ThemedText style={styles.achievementCategoryTitle}>{category.title}</ThemedText>
                      <ThemedText style={styles.achievementCategoryCount}>
                        {categoryUnlocked}/{category.achievements.length}
                      </ThemedText>
                    </View>

                    {category.achievements.map((ach) => (
                      <View
                        key={ach.id}
                        style={[
                          styles.achievementCard,
                          { backgroundColor: cardBg, borderColor, opacity: ach.unlocked ? 1 : 0.45 },
                        ]}
                      >
                        <View
                          style={[
                            styles.achievementIcon,
                            { backgroundColor: ach.unlocked ? '#7c3aed' : (isDark ? '#333' : '#d1d5db') },
                          ]}
                        >
                          <Text style={styles.achievementEmoji}>{ach.emoji}</Text>
                        </View>
                        <View style={styles.achievementInfo}>
                          <View style={styles.achievementHeadingRow}>
                            <ThemedText style={styles.achievementLabel}>{ach.label}</ThemedText>
                            {typeof ach.xp === 'number' && (
                              <View
                                style={[
                                  styles.achievementXpChip,
                                  { backgroundColor: ach.unlocked ? '#ede9fe' : (isDark ? '#333' : '#f3f4f6') },
                                ]}
                              >
                                <Text style={styles.achievementXpText}>{ach.xp.toLocaleString()} XP</Text>
                              </View>
                            )}
                          </View>
                          <ThemedText style={styles.achievementStatus}>
                            {ach.unlocked ? 'Unlocked' : 'Locked'}
                          </ThemedText>
                          <ThemedText style={styles.achievementDescription}>
                            {category.hideDescription ? 'Hidden badge. Unlock condition is secret.' : ach.description}
                          </ThemedText>
                        </View>
                        {ach.unlocked && <Text style={styles.achievementCheck}>✓</Text>}
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          </Reanimated.View>
          </View>
          </GestureDetector>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },

  banner: {
    height: 200,
    backgroundColor: BANNER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 30,
  },
  bannerTopRow: {
    position: 'absolute',
    top: 48,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascot: { fontSize: 60 },

  profileSection: {
    marginTop: -30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    flex: 1,
  },

  avatarBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -32,
    marginBottom: 12,
  },
  profilePic: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicText: { color: 'white', fontSize: 26, fontWeight: 'bold' },
  badgesRow: { flexDirection: 'row', marginLeft: 'auto', gap: 8, alignItems: 'center' },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeEmoji: { fontSize: 22 },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  profileName: { fontSize: 22, fontWeight: 'bold' },
  levelCircle: {
    width: 35,
    height: 35,
    marginLeft: 16,
    borderRadius: 99,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelCircleText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  profileMeta: { fontSize: 14, opacity: 0.6, marginBottom: 20 },
  friendCount: { fontWeight: '700' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20, gap: 8 },
  statCell: { width: '47%', height: 85, alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 10, borderRadius: 12, overflow: 'hidden' },
  statLabel: { fontSize: 13, opacity: 0.5,  marginTop: 6 },
  statValue: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  favGymDot: {
    width: 40,
    height: 40,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  favGymDotText: { color: 'white', fontSize: 13, fontWeight: 'bold' },
  favGymName: { fontSize: 11, opacity: 0.6, marginTop: 4 },

  tabRow: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 4 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: AppColors.primary },
  tabLabel: { fontSize: 14, fontWeight: '600' },

  tabContent: { paddingTop: 16, paddingBottom: 40 },

  chartCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16 },
  chartTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  chartSubtitle: { fontSize: 12, opacity: 0.5, marginBottom: 8 },

  insightStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  insightStatCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  insightStatEmoji: { fontSize: 20, marginBottom: 4 },
  insightStatVal: { fontSize: 20, fontWeight: 'bold' },
  insightStatLabel: { fontSize: 11, opacity: 0.5, marginTop: 2, textAlign: 'center' },

  levelCard: { borderRadius: 14, borderWidth: 1, padding: 18, marginBottom: 20 },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  levelTierLabel: {
    fontSize: 13,
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  levelNumber: { fontSize: 26, fontWeight: 'bold' },
  xpBadge: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  xpBadgeText: { color: 'white', fontSize: 14, fontWeight: '700' },
  xpBarContainer: { marginBottom: 16 },
  xpBarTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: 5 },
  xpBarLabel: { fontSize: 11, opacity: 0.5, marginTop: 6 },
  xpBreakdown: { gap: 8 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpRowLabel: { fontSize: 14, opacity: 0.7 },
  xpRowVal: { fontSize: 14, fontWeight: '600' },

  achievementsTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  achievementCategorySection: { marginBottom: 14 },
  achievementCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementCategoryTitle: { fontSize: 15, fontWeight: '700' },
  achievementCategoryCount: { fontSize: 12, opacity: 0.55 },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  achievementIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  achievementEmoji: { fontSize: 20 },
  achievementInfo: { flex: 1 },
  achievementHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  achievementXpChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  achievementXpText: { fontSize: 11, fontWeight: '700', color: AppColors.primary },
  achievementLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  achievementStatus: { fontSize: 12, opacity: 0.5, marginBottom: 4 },
  achievementDescription: { fontSize: 12, opacity: 0.72, lineHeight: 17 },
  achievementCheck: { fontSize: 18, color: '#22c55e', fontWeight: 'bold', marginLeft: 8, marginTop: 2 },

  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 44, marginBottom: 10 },
  emptyText: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  emptySubtext: { fontSize: 13, opacity: 0.5, textAlign: 'center' },
});
