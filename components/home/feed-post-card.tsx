import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { formatDistanceToNow } from 'date-fns';

import { AppColors } from '@/constants/theme';
import { getGymById } from '@/data';
import type { BetaPost } from '@/types';

type FeedPostCardProps = {
  item: BetaPost;
  isExpanded: boolean;
  sends: BetaPost[];
  textColor: string;
  mutedText: string;
  cardBorder: string;
  surfaceBg: string;
  onToggleExpanded: (postId: string) => void;
  getColorHex: (colorName: string) => string;
  description?: string;
};

function feedFormatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function FeedPostCardInner({
  item,
  isExpanded,
  sends,
  textColor,
  mutedText,
  cardBorder,
  surfaceBg,
  onToggleExpanded,
  getColorHex,
  description,
}: FeedPostCardProps) {
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

  return (
    <View style={styles.postCard}>
      <View style={styles.feedHeaderRow}>
        <View style={[styles.feedAvatar, { backgroundColor: AppColors.avatarFallbackBg }]}>
          <Text style={[styles.feedAvatarText, { color: AppColors.avatarFallbackText }]}>
            {initials}
          </Text>
        </View>
        <View style={styles.feedHeaderText}>
          <Text style={[styles.feedUserName, { color: textColor }]}>{item.userName}</Text>
          <Text style={[styles.feedMeta, { color: mutedText }]}>{gymLabel} · {timeAgo}</Text>
        </View>
      </View>

      <Text style={[styles.feedTitle, { color: textColor }]}>
        {description !== '' ? description : `I climbed for ${feedFormatDuration(item.sessionDurationMinutes ?? 0)}!`}
      </Text>

      <View style={styles.feedMetricsRow}>
        <View style={styles.feedMetric}>
          <Text style={[styles.feedMetricLabel, { color: mutedText }]}>Time</Text>
          <Text style={[styles.feedMetricValue, { color: textColor }]}>
            {feedFormatDuration(item.sessionDurationMinutes ?? 0)}
          </Text>
        </View>
        <View style={styles.feedMetric}>
          <Text style={[styles.feedMetricLabel, { color: mutedText }]}>Climbs logged</Text>
          <Text style={[styles.feedMetricValue, { color: textColor }]}>{item.climbCount ?? 0}</Text>
        </View>
      </View>

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

      {hasSends && sends.length > 0 && (
        <>
          <Pressable
            style={[styles.showSendsBtn, { borderColor: cardBorder }]}
            onPress={() => onToggleExpanded(item.id)}
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
                    <Text style={[styles.feedMetricValue, { color: textColor }]}>{send.grade}</Text>
                  </View>
                )}
                {send.color != null && (
                  <View style={styles.feedMetric}>
                    <Text style={[styles.feedMetricLabel, { color: mutedText }]}>Color</Text>
                    <View style={styles.feedColorRow}>
                      <View style={[styles.feedColorDot, { backgroundColor: getColorHex(send.color) }]} />
                      <Text style={[styles.feedMetricValue, { color: textColor }]}>{send.color}</Text>
                    </View>
                  </View>
                )}
                {send.wall != null && (
                  <View style={styles.feedMetric}>
                    <Text style={[styles.feedMetricLabel, { color: mutedText }]}>Wall</Text>
                    <Text style={[styles.feedMetricValue, { color: textColor }]}>{send.wall}</Text>
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
}

export const FeedPostCard = memo(FeedPostCardInner);

const styles = StyleSheet.create({
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
});
