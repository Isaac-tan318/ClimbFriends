import React, { useState, useMemo } from 'react';
import { StyleSheet, ScrollView, View, Switch, Pressable } from 'react-native';
import { format, formatDistanceToNow, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

import { AppHeaderBanner } from '@/components/app-header-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSettingsStore, useSessionStore } from '@/stores';
import { CURRENT_USER, getGymById } from '@/data';
import { AppColors } from '@/constants/theme';
import { ClimbingSession } from '@/types';

// ─── Sub-components ─────────────────────────────────────────────────────────

function SettingToggle({
  title,
  description,
  value,
  onValueChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const cardBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');

  return (
    <View style={[styles.settingCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.settingInfo}>
        <ThemedText style={styles.settingTitle}>{title}</ThemedText>
        <ThemedText style={styles.settingDescription}>{description}</ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#767577', true: AppColors.primary }}
        thumbColor={value ? '#fff' : '#f4f3f4'}
      />
    </View>
  );
}

function SettingButton({
  title,
  description,
  emoji,
  onPress,
}: {
  title: string;
  description: string;
  emoji: string;
  onPress: () => void;
}) {
  const cardBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');

  return (
    <Pressable onPress={onPress}>
      <View style={[styles.settingCard, { backgroundColor: cardBg, borderColor }]}>
        <ThemedText style={styles.settingEmoji}>{emoji}</ThemedText>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingTitle}>{title}</ThemedText>
          <ThemedText style={styles.settingDescription}>{description}</ThemedText>
        </View>
        <ThemedText style={styles.chevron}>›</ThemedText>
      </View>
    </Pressable>
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
          <ThemedText style={styles.sessionDay}>{format(session.startedAt, 'EEE')}</ThemedText>
          <ThemedText style={styles.sessionDate}>{format(session.startedAt, 'd')}</ThemedText>
          <ThemedText style={styles.sessionMonth}>{format(session.startedAt, 'MMM')}</ThemedText>
        </View>
        <View style={styles.sessionDetails}>
          <ThemedText style={styles.gymName}>{gym?.name || 'Unknown Gym'}</ThemedText>
          <ThemedText style={styles.sessionTime}>
            {format(session.startedAt, 'h:mm a')} -{' '}
            {session.endedAt ? format(session.endedAt, 'h:mm a') : 'ongoing'}
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

// ─── Filter types ───────────────────────────────────────────────────────────

type FilterPeriod = 'all' | 'week' | 'month';
type ProfileTab = 'profile' | 'history';

// ─── Main screen ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const settings = useSettingsStore((state) => state.settings);
  const setLocationEnabled = useSettingsStore((state) => state.setLocationEnabled);
  const setFriendVisibilityEnabled = useSettingsStore((state) => state.setFriendVisibilityEnabled);
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled);
  const allSessions = useSessionStore((state) => state.sessions);

  const bgColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');

  const [tab, setTab] = useState<ProfileTab>('profile');
  const [historyFilter, setHistoryFilter] = useState<FilterPeriod>('all');

  // ── History logic ───────────────────────────────────────────────────────
  const mySessions = useMemo(
    () => allSessions.filter((s) => s.oderId === 'user-1'),
    [allSessions],
  );

  const now = new Date();

  const filteredSessions = useMemo(() => {
    return mySessions
      .filter((session) => {
        if (historyFilter === 'week') {
          return isWithinInterval(session.startedAt, {
            start: startOfWeek(now, { weekStartsOn: 1 }),
            end: endOfWeek(now, { weekStartsOn: 1 }),
          });
        }
        if (historyFilter === 'month') {
          return (
            session.startedAt.getMonth() === now.getMonth() &&
            session.startedAt.getFullYear() === now.getFullYear()
          );
        }
        return true;
      })
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }, [mySessions, historyFilter]);

  const totalMinutes = filteredSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const avgDuration =
    filteredSessions.length > 0 ? Math.round(totalMinutes / filteredSessions.length) : 0;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <ThemedView style={styles.container}>
      <AppHeaderBanner title="Profile" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: bgColor, borderColor }]}>
          <View style={styles.profileAvatar}>
            <ThemedText style={styles.profileAvatarText}>
              {CURRENT_USER.displayName[0]}
            </ThemedText>
          </View>
          <View style={styles.profileInfo}>
            <ThemedText style={styles.profileName}>{CURRENT_USER.displayName}</ThemedText>
            <ThemedText style={styles.profileEmail}>{CURRENT_USER.email}</ThemedText>
          </View>
          <Pressable style={styles.editButton}>
            <ThemedText style={styles.editButtonText}>Edit</ThemedText>
          </Pressable>
        </View>

        {/* Tab switcher */}
        <View style={[styles.tabRow, { borderColor }]}>
          {(['profile', 'history'] as ProfileTab[]).map((t) => (
            <Pressable
              key={t}
              style={[styles.tabButton, tab === t && styles.tabButtonActive]}
              onPress={() => setTab(t)}
            >
              <ThemedText
                style={[styles.tabButtonText, tab === t && styles.tabButtonTextActive]}
              >
                {t === 'profile' ? 'Settings' : 'History'}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {tab === 'profile' ? (
          <>
            {/* Location Settings */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionHeader}>LOCATION & PRIVACY</ThemedText>

              <SettingToggle
                title="Location Tracking"
                description="Automatically detect when you're at a climbing gym"
                value={settings.locationEnabled}
                onValueChange={setLocationEnabled}
              />
              <SettingToggle
                title="Show Me at Gym"
                description="Let friends see when you're climbing"
                value={settings.friendVisibilityEnabled}
                onValueChange={setFriendVisibilityEnabled}
              />
            </View>

            {/* Notification Settings */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionHeader}>NOTIFICATIONS</ThemedText>

              <SettingToggle
                title="Push Notifications"
                description="Get notified when friends arrive at gyms or invite you"
                value={settings.notificationsEnabled}
                onValueChange={setNotificationsEnabled}
              />
            </View>

            {/* Account */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionHeader}>ACCOUNT</ThemedText>

              <SettingButton
                title="Export Data"
                description="Download all your climbing data"
                emoji="📊"
                onPress={() => {}}
              />
              <SettingButton
                title="Privacy Policy"
                description="Read our privacy policy"
                emoji="🔒"
                onPress={() => {}}
              />
              <SettingButton
                title="Help & Support"
                description="Get help or report issues"
                emoji="❓"
                onPress={() => {}}
              />
            </View>

            {/* Danger zone */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionHeader}>DANGER ZONE</ThemedText>
              <Pressable style={styles.dangerButton}>
                <ThemedText style={styles.dangerButtonText}>Log Out</ThemedText>
              </Pressable>
              <Pressable style={[styles.dangerButton, styles.deleteButton]}>
                <ThemedText style={styles.deleteButtonText}>Delete Account</ThemedText>
              </Pressable>
            </View>

            <View style={styles.versionContainer}>
              <ThemedText style={styles.versionText}>ClimbFriend v1.0.0</ThemedText>
            </View>
          </>
        ) : (
          <>
            {/* History tab */}
            {/* Period filter */}
            <View style={styles.filterRow}>
              {(['all', 'week', 'month'] as FilterPeriod[]).map((period) => (
                <Pressable
                  key={period}
                  style={[
                    styles.filterButton,
                    historyFilter === period && styles.filterButtonActive,
                  ]}
                  onPress={() => setHistoryFilter(period)}
                >
                  <ThemedText
                    style={[
                      styles.filterButtonText,
                      historyFilter === period && styles.filterButtonTextActive,
                    ]}
                  >
                    {period === 'all'
                      ? 'All Time'
                      : period === 'week'
                      ? 'This Week'
                      : 'This Month'}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <StatBox label="Sessions" value={String(filteredSessions.length)} />
              <StatBox label="Total Hours" value={`${totalHours}h`} />
              <StatBox label="Avg Session" value={`${avgDuration}m`} />
            </View>

            {/* Session list */}
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
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 24 },

  // Profile card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  profileAvatarText: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '600', marginBottom: 2 },
  profileEmail: { fontSize: 14, opacity: 0.6 },
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  editButtonText: { fontSize: 14, fontWeight: '600', color: AppColors.primary },

  // Tab switcher
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: AppColors.primary,
  },
  tabButtonText: { fontSize: 14, fontWeight: '600', opacity: 0.5 },
  tabButtonTextActive: { opacity: 1, color: AppColors.primary },

  // Settings
  section: { marginBottom: 24 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.5,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  settingEmoji: { fontSize: 24, marginRight: 12 },
  settingInfo: { flex: 1, marginRight: 12 },
  settingTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  settingDescription: { fontSize: 13, opacity: 0.6 },
  chevron: { fontSize: 24, opacity: 0.4 },
  dangerButton: {
    backgroundColor: '#f3f4f6',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  dangerButtonText: { fontSize: 15, fontWeight: '600', color: AppColors.primary },
  deleteButton: { backgroundColor: '#fef2f2' },
  deleteButtonText: { fontSize: 15, fontWeight: '600', color: '#dc2626' },
  versionContainer: { alignItems: 'center', paddingVertical: 20 },
  versionText: { fontSize: 12, opacity: 0.4 },

  // History
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  filterButtonActive: { backgroundColor: AppColors.primary },
  filterButtonText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  filterButtonTextActive: { color: 'white' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  statBoxValue: { fontSize: 22, fontWeight: 'bold' },
  statBoxLabel: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  sessionList: { gap: 12 },
  sessionCard: { padding: 14, borderRadius: 12, borderWidth: 1 },
  sessionHeader: { flexDirection: 'row', alignItems: 'center' },
  dateContainer: { alignItems: 'center', marginRight: 14, minWidth: 44 },
  sessionDay: { fontSize: 11, opacity: 0.6, textTransform: 'uppercase' },
  sessionDate: { fontSize: 24, fontWeight: 'bold' },
  sessionMonth: { fontSize: 11, opacity: 0.6, textTransform: 'uppercase' },
  sessionDetails: { flex: 1 },
  gymName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  sessionTime: { fontSize: 13, opacity: 0.7 },
  sessionAgo: { fontSize: 12, opacity: 0.5, marginTop: 2 },
  durationContainer: { alignItems: 'flex-end' },
  durationValue: { fontSize: 18, fontWeight: 'bold', color: AppColors.primary },
  durationLabel: { fontSize: 11, opacity: 0.5 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  emptySubtext: { fontSize: 14, opacity: 0.6 },
});
