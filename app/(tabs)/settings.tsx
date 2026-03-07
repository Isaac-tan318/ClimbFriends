import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  Pressable,
  useColorScheme,
} from 'react-native';
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
import { ClimbingSession } from '@/types';

// ─── Constants ──────────────────────────────────────────────────────────────

const BANNER_COLOR = '#7dd3c4';

// ─── Achievement badges ─────────────────────────────────────────────────────

const ACHIEVEMENTS = [
  { id: 'first-session', emoji: '🧗', label: 'First Session', unlocked: true },
  { id: 'streak-3', emoji: '🔥', label: '3-Day Streak', unlocked: true },
  { id: 'send-10', emoji: '💪', label: '10 Sends', unlocked: true },
  { id: 'early-bird', emoji: '🌅', label: 'Early Bird', unlocked: false },
  { id: 'social-climber', emoji: '👥', label: 'Social Climber', unlocked: false },
];

// ─── Level system ───────────────────────────────────────────────────────────

function getLevelInfo(totalMinutes: number, totalSessions: number) {
  const xp = totalMinutes + totalSessions * 50;
  if (xp >= 5000) return { level: 10, tier: 'Legend', xp, nextXp: 5000, progress: 1 };
  if (xp >= 4000) return { level: 9, tier: 'Master', xp, nextXp: 5000, progress: (xp - 4000) / 1000 };
  if (xp >= 3200) return { level: 8, tier: 'Expert', xp, nextXp: 4000, progress: (xp - 3200) / 800 };
  if (xp >= 2500) return { level: 7, tier: 'Advanced', xp, nextXp: 3200, progress: (xp - 2500) / 700 };
  if (xp >= 1900) return { level: 6, tier: 'Experienced', xp, nextXp: 2500, progress: (xp - 1900) / 600 };
  if (xp >= 1400) return { level: 5, tier: 'Intermediate', xp, nextXp: 1900, progress: (xp - 1400) / 500 };
  if (xp >= 1000) return { level: 4, tier: 'Developing', xp, nextXp: 1400, progress: (xp - 1000) / 400 };
  if (xp >= 650) return { level: 3, tier: 'Beginner', xp, nextXp: 1000, progress: (xp - 650) / 350 };
  if (xp >= 300) return { level: 2, tier: 'Newbie', xp, nextXp: 650, progress: (xp - 300) / 350 };
  return { level: 1, tier: 'Noob', xp, nextXp: 300, progress: xp / 300 };
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

  const mySessions = useMemo(
    () =>
      allSessions
        .filter((s) => s.oderId === 'user-1')
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

  const unlockedCount = ACHIEVEMENTS.filter((a) => a.unlocked).length;

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
              {ACHIEVEMENTS.filter((a) => a.unlocked).map((ach) => (
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
                onPress={() => setProfileTab(t)}
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
          <View style={styles.tabContent}>
            {profileTab === 'insights' && (
              <>
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
              </>
            )}

            {profileTab === 'activities' && (
              <>
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
              </>
            )}

            {profileTab === 'progression' && (
              <>
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
                  Achievements ({unlockedCount}/{ACHIEVEMENTS.length})
                </ThemedText>

                {ACHIEVEMENTS.map((ach) => (
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
                      <ThemedText style={styles.achievementLabel}>{ach.label}</ThemedText>
                      <ThemedText style={styles.achievementStatus}>
                        {ach.unlocked ? 'Unlocked' : 'Locked'}
                      </ThemedText>
                    </View>
                    {ach.unlocked && <Text style={styles.achievementCheck}>✓</Text>}
                  </View>
                ))}
              </>
            )}
          </View>
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
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  achievementLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  achievementStatus: { fontSize: 12, opacity: 0.5 },
  achievementCheck: { fontSize: 18, color: '#22c55e', fontWeight: 'bold' },

  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 44, marginBottom: 10 },
  emptyText: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  emptySubtext: { fontSize: 13, opacity: 0.5, textAlign: 'center' },
});