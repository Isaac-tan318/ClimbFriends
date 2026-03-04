import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDistanceToNow } from 'date-fns';
import { AppColors, Colors } from '@/constants/theme';
import { useSessionStore } from '@/stores/session-store';
import { SINGAPORE_GYMS, getGymById } from '@/data/gyms';
import {
  MOCK_BETA_POSTS,
  getBetaPostsForGym,
  getUniqueGradesForGym,
  getUniqueWallsForGym,
  BetaPost,
} from '@/data/mock-beta';

type ViewMode = 'all' | 'sessions' | 'sends';

export default function BetaScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];

  const activeSession = useSessionStore((s) => s.activeSession);
  const sessions = useSessionStore((s) => s.sessions);

  // ─── Determine default gym ──────────────────────────────────────────────
  const defaultGymId = useMemo(() => {
    // If there's an active session, use that gym
    if (activeSession?.gymId) return activeSession.gymId;

    // Otherwise pick the gym user-1 visits most
    const userSessions = sessions.filter((s) => s.oderId === 'user-1');
    const counts: Record<string, number> = {};
    userSessions.forEach((s) => {
      counts[s.gymId] = (counts[s.gymId] ?? 0) + 1;
    });
    let maxGymId = SINGAPORE_GYMS[0]?.id ?? '';
    let maxCount = 0;
    Object.entries(counts).forEach(([gid, c]) => {
      if (c > maxCount) {
        maxCount = c;
        maxGymId = gid;
      }
    });
    return maxGymId;
  }, [activeSession, sessions]);

  const [selectedGymId, setSelectedGymId] = useState(defaultGymId);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedWall, setSelectedWall] = useState<string | null>(null);
  const [showGymPicker, setShowGymPicker] = useState(false);

  const selectedGym = getGymById(selectedGymId);
  const gymName = selectedGym?.name ?? selectedGymId;

  // ─── Posts for selected gym, filtered ───────────────────────────────────
  const posts = useMemo(() => {
    let list = getBetaPostsForGym(selectedGymId);
    if (viewMode === 'sessions') list = list.filter((p) => p.type === 'session');
    if (viewMode === 'sends') list = list.filter((p) => p.type === 'send');
    if (selectedGrade) list = list.filter((p) => p.grade === selectedGrade);
    if (selectedWall) list = list.filter((p) => p.wall === selectedWall);
    return list;
  }, [selectedGymId, viewMode, selectedGrade, selectedWall]);

  const availableGrades = useMemo(() => getUniqueGradesForGym(selectedGymId), [selectedGymId]);
  const availableWalls = useMemo(() => getUniqueWallsForGym(selectedGymId), [selectedGymId]);

  // ─── Gyms sorted: active first, then most-visited, then rest ────────────
  const sortedGyms = useMemo(() => {
    const userSessions = sessions.filter((s) => s.oderId === 'user-1');
    const counts: Record<string, number> = {};
    userSessions.forEach((s) => {
      counts[s.gymId] = (counts[s.gymId] ?? 0) + 1;
    });
    return [...SINGAPORE_GYMS].sort((a, b) => {
      if (a.id === activeSession?.gymId) return -1;
      if (b.id === activeSession?.gymId) return 1;
      return (counts[b.id] ?? 0) - (counts[a.id] ?? 0);
    });
  }, [sessions, activeSession]);

  // ─── Colors ─────────────────────────────────────────────────────────────
  const cardBg = isDark ? '#1e1e1e' : '#fff';
  const cardBorder = isDark ? AppColors.border.dark : AppColors.border.light;
  const mutedText = isDark ? '#999' : '#666';
  const surfaceBg = isDark ? AppColors.surface.dark : AppColors.surface.light;
  const inputBg = isDark ? AppColors.input.dark : AppColors.input.light;

  // ─── Render helpers ─────────────────────────────────────────────────────
  const renderViewToggle = () => (
    <View style={[styles.toggleRow, { backgroundColor: inputBg }]}>
      {(['all', 'sessions', 'sends'] as ViewMode[]).map((mode) => (
        <TouchableOpacity
          key={mode}
          onPress={() => setViewMode(mode)}
          style={[
            styles.toggleBtn,
            viewMode === mode && { backgroundColor: AppColors.primary },
          ]}
        >
          <Text
            style={[
              styles.toggleText,
              { color: viewMode === mode ? '#fff' : mutedText },
            ]}
          >
            {mode === 'all' ? 'All' : mode === 'sessions' ? 'Sessions' : 'Sends'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderFilterChips = () => (
    <View style={styles.filtersContainer}>
      {/* Grade filter */}
      {availableGrades.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipScrollContent}
        >
          <Text style={[styles.filterLabel, { color: mutedText }]}>Grade</Text>
          <TouchableOpacity
            onPress={() => setSelectedGrade(null)}
            style={[
              styles.chip,
              { borderColor: cardBorder, backgroundColor: !selectedGrade ? AppColors.primary : inputBg },
            ]}
          >
            <Text style={{ color: !selectedGrade ? '#fff' : colors.text, fontSize: 13 }}>All</Text>
          </TouchableOpacity>
          {availableGrades.map((g) => (
            <TouchableOpacity
              key={g}
              onPress={() => setSelectedGrade(selectedGrade === g ? null : g)}
              style={[
                styles.chip,
                {
                  borderColor: cardBorder,
                  backgroundColor: selectedGrade === g ? AppColors.primary : inputBg,
                },
              ]}
            >
              <Text style={{ color: selectedGrade === g ? '#fff' : colors.text, fontSize: 13 }}>
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Wall filter */}
      {availableWalls.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipScrollContent}
        >
          <Text style={[styles.filterLabel, { color: mutedText }]}>Wall</Text>
          <TouchableOpacity
            onPress={() => setSelectedWall(null)}
            style={[
              styles.chip,
              { borderColor: cardBorder, backgroundColor: !selectedWall ? AppColors.primary : inputBg },
            ]}
          >
            <Text style={{ color: !selectedWall ? '#fff' : colors.text, fontSize: 13 }}>All</Text>
          </TouchableOpacity>
          {availableWalls.map((w) => (
            <TouchableOpacity
              key={w}
              onPress={() => setSelectedWall(selectedWall === w ? null : w)}
              style={[
                styles.chip,
                {
                  borderColor: cardBorder,
                  backgroundColor: selectedWall === w ? AppColors.primary : inputBg,
                },
              ]}
            >
              <Text style={{ color: selectedWall === w ? '#fff' : colors.text, fontSize: 13 }}>
                {w}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderPost = ({ item }: { item: BetaPost }) => {
    const initials = item.userName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
    const timeAgo = formatDistanceToNow(item.postedAt, { addSuffix: true });

    return (
      <View style={[styles.postCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        {/* Header */}
        <View style={styles.postHeader}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: AppColors.avatarFallbackBg },
            ]}
          >
            <Text style={[styles.avatarText, { color: AppColors.avatarFallbackText }]}>
              {initials}
            </Text>
          </View>
          <View style={styles.postHeaderText}>
            <Text style={[styles.postUserName, { color: colors.text }]}>{item.userName}</Text>
            <Text style={[styles.postTime, { color: mutedText }]}>{timeAgo}</Text>
          </View>
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor:
                  item.type === 'send'
                    ? AppColors.secondaryLight
                    : AppColors.tertiaryLight,
              },
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                {
                  color:
                    item.type === 'send'
                      ? AppColors.secondary
                      : AppColors.tertiary,
                },
              ]}
            >
              {item.type === 'send' ? 'Send' : 'Session'}
            </Text>
          </View>
        </View>

        {/* Body */}
        {item.type === 'session' ? (
          <View style={[styles.sessionBody, { backgroundColor: surfaceBg }]}>
            <View style={styles.sessionStat}>
              <Text style={[styles.sessionStatValue, { color: colors.text }]}>
                {item.sessionDurationMinutes}
              </Text>
              <Text style={[styles.sessionStatLabel, { color: mutedText }]}>minutes</Text>
            </View>
            <View style={[styles.sessionDivider, { backgroundColor: cardBorder }]} />
            <View style={styles.sessionStat}>
              <Text style={[styles.sessionStatValue, { color: colors.text }]}>
                {item.climbCount}
              </Text>
              <Text style={[styles.sessionStatLabel, { color: mutedText }]}>climbs</Text>
            </View>
          </View>
        ) : (
          <View>
            {/* Grade + Color + Wall row */}
            <View style={styles.sendDetails}>
              {item.grade && (
                <View style={[styles.sendTag, { backgroundColor: surfaceBg }]}>
                  <Text style={[styles.sendTagLabel, { color: mutedText }]}>Grade</Text>
                  <Text style={[styles.sendTagValue, { color: colors.text }]}>{item.grade}</Text>
                </View>
              )}
              {item.color && (
                <View style={[styles.sendTag, { backgroundColor: surfaceBg }]}>
                  <Text style={[styles.sendTagLabel, { color: mutedText }]}>Color</Text>
                  <View style={styles.sendColorRow}>
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: getColorHex(item.color) },
                      ]}
                    />
                    <Text style={[styles.sendTagValue, { color: colors.text }]}>{item.color}</Text>
                  </View>
                </View>
              )}
              {item.wall && (
                <View style={[styles.sendTag, { backgroundColor: surfaceBg }]}>
                  <Text style={[styles.sendTagLabel, { color: mutedText }]}>Wall</Text>
                  <Text style={[styles.sendTagValue, { color: colors.text }]}>{item.wall}</Text>
                </View>
              )}
            </View>

            {/* Instagram placeholder */}
            {item.instagramUrl ? (
              <View style={[styles.igPlaceholder, { backgroundColor: surfaceBg, borderColor: cardBorder }]}>
                <Text style={[styles.igIcon, { color: mutedText }]}>📷</Text>
                <Text style={[styles.igText, { color: mutedText }]}>
                  Instagram Reel
                </Text>
                <Text style={[styles.igUrl, { color: AppColors.primary }]} numberOfLines={1}>
                  {item.instagramUrl}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  // ─── Main render ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Title */}
      <Text style={[styles.title, { color: colors.text }]}>Beta</Text>

      {/* Gym selector */}
      <TouchableOpacity
        onPress={() => setShowGymPicker(!showGymPicker)}
        style={[styles.gymSelector, { backgroundColor: inputBg, borderColor: cardBorder }]}
      >
        <Text style={[styles.gymSelectorText, { color: colors.text }]} numberOfLines={1}>
          {gymName}
        </Text>
        <Text style={{ color: mutedText, fontSize: 14 }}>
          {showGymPicker ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* Gym dropdown */}
      {showGymPicker && (
        <View style={[styles.gymDropdown, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <FlatList
            data={sortedGyms}
            keyExtractor={(g) => g.id}
            style={styles.gymDropdownList}
            renderItem={({ item: gym }) => {
              const postCount = MOCK_BETA_POSTS.filter((p) => p.gymId === gym.id).length;
              const isActive = gym.id === activeSession?.gymId;
              return (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedGymId(gym.id);
                    setShowGymPicker(false);
                    setSelectedGrade(null);
                    setSelectedWall(null);
                  }}
                  style={[
                    styles.gymOption,
                    gym.id === selectedGymId && { backgroundColor: AppColors.primaryLight },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.gymOptionName, { color: colors.text }]}>
                      {gym.name}
                      {isActive ? '  🟢' : ''}
                    </Text>
                    <Text style={[styles.gymOptionBrand, { color: mutedText }]}>{gym.brand}</Text>
                  </View>
                  <Text style={[styles.gymOptionCount, { color: mutedText }]}>
                    {postCount} {postCount === 1 ? 'post' : 'posts'}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* View mode toggle */}
      {renderViewToggle()}

      {/* Filters */}
      {renderFilterChips()}

      {/* Feed */}
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={renderPost}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyIcon]}>🧗</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No posts yet</Text>
            <Text style={[styles.emptyBody, { color: mutedText }]}>
              {viewMode === 'sends'
                ? 'No sends logged at this gym yet.'
                : viewMode === 'sessions'
                ? 'No sessions recorded at this gym yet.'
                : 'Be the first to post at this gym!'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },

  // Gym selector
  gymSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  gymSelectorText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  gymDropdown: {
    marginHorizontal: 20,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 260,
    overflow: 'hidden',
  },
  gymDropdownList: {
    maxHeight: 260,
  },
  gymOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  gymOptionName: {
    fontSize: 14,
    fontWeight: '600',
  },
  gymOptionBrand: {
    fontSize: 12,
    marginTop: 1,
  },
  gymOptionCount: {
    fontSize: 12,
    marginLeft: 8,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Filters
  filtersContainer: {
    marginTop: 8,
  },
  chipScroll: {
    marginBottom: 4,
  },
  chipScrollContent: {
    paddingHorizontal: 20,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },

  // Feed
  feedContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 12,
  },

  // Post card
  postCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  postHeaderText: {
    flex: 1,
    marginLeft: 10,
  },
  postUserName: {
    fontSize: 14,
    fontWeight: '700',
  },
  postTime: {
    fontSize: 12,
    marginTop: 1,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Session body
  sessionBody: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  sessionStat: {
    flex: 1,
    alignItems: 'center',
  },
  sessionStatValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  sessionStatLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  sessionDivider: {
    width: 1,
    height: 32,
  },

  // Send body
  sendDetails: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  sendTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 70,
  },
  sendTagLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  sendTagValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  sendColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // Instagram placeholder
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

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
