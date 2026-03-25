import { formatDistanceToNow } from 'date-fns';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getGymById } from '@/data';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Friend, FriendRequest, User } from '@/types';

import { ThemedText } from '../themed-text';

const getDisplayInitial = (displayName: string) => displayName.trim().charAt(0).toUpperCase() || '?';
const getFallbackUserLabel = (userId: string) => `User ${userId.slice(0, 8)}`;

function FriendCard({
  friend,
  onRemove,
}: {
  friend: Friend;
  onRemove: (friend: Friend) => void;
}) {
  const cardBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');
  const gym = friend.currentGymId ? getGymById(friend.currentGymId) : null;

  return (
    <View style={[styles.friendCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, { backgroundColor: friend.isAtGym ? '#22c55e' : '#9ca3af' }]}>
          <ThemedText style={styles.avatarText}>{getDisplayInitial(friend.displayName)}</ThemedText>
        </View>
        {friend.isAtGym && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.friendInfo}>
        <ThemedText style={styles.friendName}>{friend.displayName}</ThemedText>
        {friend.isAtGym && gym ? (
          <View style={styles.atGymBadge}>
            <ThemedText style={styles.atGymText}>Climbing at {gym.name}</ThemedText>
          </View>
        ) : (
          <ThemedText style={styles.lastSeenText}>
            Last seen{' '}
            {friend.lastSeenAt
              ? formatDistanceToNow(friend.lastSeenAt, { addSuffix: true })
              : 'recently'}
          </ThemedText>
        )}
      </View>

      {!friend.isAtGym && (
        <Pressable style={styles.removeButton} onPress={() => onRemove(friend)}>
          <ThemedText style={styles.removeButtonText}>Remove</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

export function AtGymSection({ friends }: { friends: Friend[] }) {
  if (friends.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle">Climbing Now</ThemedText>
        <View style={styles.countBadge}>
          <ThemedText style={styles.countText}>{friends.length}</ThemedText>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.climbingNowRow}>
        {friends.map((friend) => {
          const gym = friend.currentGymId ? getGymById(friend.currentGymId) : null;
          const gymShort =
            gym?.name?.replace(
              /^(Boulder\+|Boulder Planet|Climb Central|FitBloc|BFF Climb|Lighthouse)\s*/i,
              '',
            ) ?? '';

          return (
            <View key={friend.id} style={styles.climbingNowItem}>
              <View style={styles.climbingNowAvatar}>
                <ThemedText style={styles.climbingNowInitial}>
                  {getDisplayInitial(friend.displayName)}
                </ThemedText>
                <View style={styles.climbingNowDot} />
              </View>
              <ThemedText style={styles.climbingNowName} numberOfLines={1}>
                {friend.displayName.split(' ')[0]}
              </ThemedText>
              <ThemedText style={styles.climbingNowGym} numberOfLines={1}>
                {gymShort}
              </ThemedText>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function OfflineSection({
  friends,
  onRemove,
}: {
  friends: Friend[];
  onRemove: (friend: Friend) => void;
}) {
  if (friends.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle">Friends</ThemedText>
        <View style={[styles.countBadge, styles.countBadgeOffline]}>
          <ThemedText style={styles.countTextOffline}>{friends.length}</ThemedText>
        </View>
      </View>
      {friends.map((friend) => (
        <FriendCard key={friend.id} friend={friend} onRemove={onRemove} />
      ))}
    </View>
  );
}

export function SearchResultRow({
  user,
  onSend,
  loading,
}: {
  user: User;
  onSend: (userId: string) => void;
  loading: boolean;
}) {
  const cardBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');

  return (
    <View style={[styles.searchResultRow, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.searchResultInfo}>
        <ThemedText style={styles.searchResultName}>{user.displayName}</ThemedText>
        <ThemedText style={styles.searchResultEmail}>{user.email}</ThemedText>
      </View>
      <Pressable style={styles.searchResultAction} onPress={() => onSend(user.id)} disabled={loading}>
        <ThemedText style={styles.searchResultActionText}>
          {loading ? 'Sending...' : 'Add'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

export function RequestSection({
  title,
  requests,
  variant,
  onRespond,
}: {
  title: string;
  requests: FriendRequest[];
  variant: 'incoming' | 'outgoing';
  onRespond: (requestId: string, status: 'accepted' | 'rejected') => void;
}) {
  if (requests.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle">{title}</ThemedText>
        <View style={[styles.countBadge, styles.countBadgeOffline]}>
          <ThemedText style={styles.countTextOffline}>{requests.length}</ThemedText>
        </View>
      </View>
      {requests.map((request) => (
        <View key={request.id} style={styles.requestRow}>
          <View style={styles.requestInfo}>
            <ThemedText style={styles.requestTitle}>
              {variant === 'incoming'
                ? request.requester?.displayName ?? getFallbackUserLabel(request.requesterId)
                : request.addressee?.displayName ?? getFallbackUserLabel(request.addresseeId)}
            </ThemedText>
            <ThemedText style={styles.requestSub}>
              {variant === 'incoming'
                ? request.requester?.email ?? getFallbackUserLabel(request.requesterId)
                : request.addressee?.email ?? getFallbackUserLabel(request.addresseeId)}
            </ThemedText>
          </View>
          {variant === 'incoming' ? (
            <View style={styles.requestActions}>
              <Pressable
                style={[styles.requestActionBtn, styles.requestActionAccept]}
                onPress={() => onRespond(request.id, 'accepted')}
              >
                <ThemedText style={styles.requestActionText}>Accept</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.requestActionBtn, styles.requestActionReject]}
                onPress={() => onRespond(request.id, 'rejected')}
              >
                <ThemedText style={styles.requestActionText}>Reject</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.requestSentBadge}>
              <ThemedText style={styles.requestSentText}>Sent</ThemedText>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  countBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  countBadgeOffline: {
    backgroundColor: '#9ca3af',
  },
  countText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  countTextOffline: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  climbingNowRow: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 4,
  },
  climbingNowItem: {
    alignItems: 'center',
    width: 64,
  },
  climbingNowAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  climbingNowInitial: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  climbingNowDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: 'white',
  },
  climbingNowName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  climbingNowGym: {
    fontSize: 10,
    opacity: 0.55,
    textAlign: 'center',
    marginTop: 1,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: 'white',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  atGymBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  atGymText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '500',
  },
  lastSeenText: {
    fontSize: 13,
    opacity: 0.6,
  },
  removeButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  removeButtonText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700',
  },
  requestRow: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  requestSub: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 6,
  },
  requestActionBtn: {
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  requestActionAccept: {
    backgroundColor: '#16a34a',
  },
  requestActionReject: {
    backgroundColor: '#dc2626',
  },
  requestActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  requestSentBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  requestSentText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  searchResultRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
  },
  searchResultEmail: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  searchResultAction: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  searchResultActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
});
