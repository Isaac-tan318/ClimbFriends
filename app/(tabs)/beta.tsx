import { AppHeaderBanner } from '@/components/app-header-banner';
import { AppColors, Colors } from '@/constants/theme';
import { SINGAPORE_GYMS, getGymById } from '@/data/gyms';
import {
    BetaPost,
    MOCK_BETA_POSTS,
    getBetaPostsForGym,
    getUniqueGradesForGym,
    getUniqueWallsForGym,
} from '@/data/mock-beta';
import { useSessionStore } from '@/stores/session-store';
import { formatDistanceToNow } from 'date-fns';
import React, { useMemo, useState } from 'react';
import {
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useColorScheme,
} from 'react-native';

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
    const userSessions = sessions.filter((s) => s.userId === 'user-1');
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
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedWall, setSelectedWall] = useState<string | null>(null);
  const [showGymPicker, setShowGymPicker] = useState(false);

  const selectedGym = getGymById(selectedGymId);
  const gymName = selectedGym?.name ?? selectedGymId;

  // ─── Posts for selected gym, filtered ───────────────────────────────────
  const posts = useMemo(() => {
    let list = getBetaPostsForGym(selectedGymId).filter((p) => p.type === 'send');
    if (selectedGrade) list = list.filter((p) => p.grade === selectedGrade);
    if (selectedWall) list = list.filter((p) => p.wall === selectedWall);
    return list;
  }, [selectedGymId, selectedGrade, selectedWall]);

  const availableGrades = useMemo(() => getUniqueGradesForGym(selectedGymId), [selectedGymId]);
  const availableWalls = useMemo(() => getUniqueWallsForGym(selectedGymId), [selectedGymId]);

  // ─── Gyms sorted: active first, then most-visited, then rest ────────────
  const sortedGyms = useMemo(() => {
    const userSessions = sessions.filter((s) => s.userId === 'user-1');
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
    const firstName = item.userName.split(' ')[0];

    return (
      <View style={styles.postCard}>
        {/* Header — avatar + name (like summary card gym logo + gym name) */}
        <View style={styles.summaryHeaderRow}>
          <View style={[styles.avatarCircle, { backgroundColor: AppColors.avatarFallbackBg }]}>
            <Text style={[styles.avatarInitials, { color: AppColors.avatarFallbackText }]}>
              {initials}
            </Text>
          </View>
          <View style={styles.summaryHeaderText}>
            <Text style={[styles.summaryName, { color: colors.text }]}>{item.userName}</Text>
            <Text style={[styles.summaryTime, { color: mutedText }]}>{timeAgo}</Text>
          </View>
        </View>

        {/* Title line */}
        <Text style={[styles.summaryTitle, { color: colors.text }]}>
          {`${firstName} sent a ${item.grade ?? ''} ${item.color ?? ''}!`}
        </Text>

        {/* Metrics row */}
        <View style={styles.summaryMetricsRow}>
          {item.grade != null && (
            <View style={styles.summaryMetric}>
              <Text style={[styles.metricLabel, { color: mutedText }]}>Grade</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{item.grade}</Text>
            </View>
          )}
          {item.color != null && (
            <View style={styles.summaryMetric}>
              <Text style={[styles.metricLabel, { color: mutedText }]}>Color</Text>
              <View style={styles.metricColorRow}>
                <View
                  style={[styles.colorDot, { backgroundColor: getColorHex(item.color) }]}
                />
                <Text style={[styles.metricValue, { color: colors.text }]}>{item.color}</Text>
              </View>
            </View>
          )}
          {item.wall != null && (
            <View style={styles.summaryMetric}>
              <Text style={[styles.metricLabel, { color: mutedText }]}>Wall</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{item.wall}</Text>
            </View>
          )}
        </View>

        {/* Instagram placeholder */}
        {item.instagramUrl ? (
          <View style={[styles.igPlaceholder, { backgroundColor: surfaceBg, borderColor: cardBorder }]}>
            <Text style={styles.igIcon}>📷</Text>
            <Text style={[styles.igText, { color: mutedText }]}>Instagram Reel</Text>
            <Text style={[styles.igUrl, { color: AppColors.primary }]} numberOfLines={1}>
              {item.instagramUrl}
            </Text>
          </View>
        ) : null}

        {/* Divider */}
        <View style={[styles.postDivider, { backgroundColor: cardBorder }]} />
      </View>
    );
  };

  // ─── Main render ────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeaderBanner title="Beta" />

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
              No sends logged at this gym yet.
            </Text>
          </View>
        }
      />
    </View>
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
    paddingTop: 12,
    paddingBottom: 32,
  },

  // Post card — matches home summary card style
  postCard: {
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryHeaderText: {
    flex: 1,
  },
  summaryName: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
  },
  summaryTime: {
    fontSize: 13,
    marginLeft: 8,
    marginTop: 1,
    opacity: 0.8,
  },
  summaryTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 4,
  },
  summaryMetricsRow: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: 48,
    marginBottom: 12,
  },
  summaryMetric: {
    alignItems: 'flex-start',
  },
  metricLabel: {
    fontSize: 13,
    opacity: 0.9,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  metricColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  postDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 8,
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
