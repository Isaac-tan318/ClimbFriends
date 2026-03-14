import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { formatDistanceToNow } from 'date-fns';

import { AppHeaderBanner } from '@/components/app-header-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSocialStore } from '@/stores';
import { getGymById } from '@/data';
import { Friend, FriendRequest, User } from '@/types';

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
            Last seen {friend.lastSeenAt ? formatDistanceToNow(friend.lastSeenAt, { addSuffix: true }) : 'recently'}
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

function AtGymSection({ friends }: { friends: Friend[] }) {
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
          const gymShort = gym?.name?.replace(/^(Boulder\+|Boulder Planet|Climb Central|FitBloc|BFF Climb|Lighthouse)\s*/i, '') ?? '';
          return (
            <View key={friend.id} style={styles.climbingNowItem}>
              <View style={styles.climbingNowAvatar}>
                <ThemedText style={styles.climbingNowInitial}>{getDisplayInitial(friend.displayName)}</ThemedText>
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

function OfflineSection({
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

function SearchResultRow({
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
        <ThemedText style={styles.searchResultActionText}>{loading ? 'Sending...' : 'Add'}</ThemedText>
      </Pressable>
    </View>
  ); 
}

function RequestSection({
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

export default function FriendsScreen() {
  const searchInputTextColor = useThemeColor({ light: '#11181C', dark: '#ECEDEE' }, 'text');
  const friends = useSocialStore((state) => state.friends);
  const friendRequests = useSocialStore((state) => state.friendRequests);
  const searchResults = useSocialStore((state) => state.searchResults);
  const searchUsers = useSocialStore((state) => state.searchUsers);
  const sendFriendRequest = useSocialStore((state) => state.sendFriendRequest);
  const respondToFriendRequest = useSocialStore((state) => state.respondToFriendRequest);
  const removeFriend = useSocialStore((state) => state.removeFriend);

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [submittingUserId, setSubmittingUserId] = useState<string | null>(null);

  const pendingFriendRequests = React.useMemo(
    () => friendRequests.filter((request) => request.status === 'pending'),
    [friendRequests],
  );
  const friendsAtGym = friends.filter((f) => f.isAtGym);
  const friendsOffline = friends.filter((f) => !f.isAtGym);

  const handleSearch = async () => {
    setSearching(true);
    const result = await searchUsers(searchQuery);
    setSearching(false);

    if (!result.ok) {
      Alert.alert('Search failed', result.error.message);
    }
  };

  const handleSendRequest = async (userId: string) => {
    setSubmittingUserId(userId);
    const result = await sendFriendRequest(userId);
    setSubmittingUserId(null);

    if (!result.ok) {
      Alert.alert('Request failed', result.error.message);
      return;
    }

    Alert.alert('Request sent', 'Friend request has been sent.');
  };

  const handleRemoveFriend = (friend: Friend) => {
    Alert.alert(
      'Remove friend?',
      `Remove ${friend.displayName} from your friends list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await removeFriend(friend.id);
            if (!result.ok) {
              Alert.alert('Unable to remove friend', result.error.message);
            }
          },
        },
      ],
    );
  };

  const handleRespondToRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    const result = await respondToFriendRequest(requestId, status);
    if (!result.ok) {
      Alert.alert('Unable to update request', result.error.message);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <AppHeaderBanner title="Friends" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Pressable style={styles.addFriendButton} onPress={() => setShowSearchModal(true)}>
          <ThemedText style={styles.addFriendText}>+ Add Friend</ThemedText>
        </Pressable>

        <RequestSection
          title="Pending Requests"
          requests={pendingFriendRequests}
          variant="incoming"
          onRespond={handleRespondToRequest}
        />

        <AtGymSection friends={friendsAtGym} />
        <OfflineSection friends={friendsOffline} onRemove={handleRemoveFriend} />

        {friends.length === 0 && (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyEmoji}>+</ThemedText>
            <ThemedText style={styles.emptyText}>No friends yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>Add friends to see when they are climbing</ThemedText>
          </View>
        )}
      </ScrollView>

      <Modal visible={showSearchModal} animationType="slide" onRequestClose={() => setShowSearchModal(false)}>
        <ThemedView style={styles.searchModalContainer}>
          <View style={styles.searchModalHeader}>
            <ThemedText type="subtitle">Add Friends</ThemedText>
            <Pressable onPress={() => setShowSearchModal(false)}>
              <ThemedText style={styles.searchCloseBtn}>Close</ThemedText>
            </Pressable>
          </View>

          <View style={styles.searchControls}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or email"
              placeholderTextColor="#9ca3af"
              style={[styles.searchInput, { color: searchInputTextColor }]}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => void handleSearch()}
            />
            <Pressable style={styles.searchBtn} onPress={() => void handleSearch()}>
              <ThemedText style={styles.searchBtnText}>Search</ThemedText>
            </Pressable>
          </View>

          {searching ? (
            <View style={styles.searchLoading}>
              <ActivityIndicator size="small" color="#0a7ea4" />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.searchResultsContainer}>
              {searchResults.map((user) => (
                <SearchResultRow
                  key={user.id}
                  user={user}
                  onSend={handleSendRequest}
                  loading={submittingUserId === user.id}
                />
              ))}
              {searchResults.length === 0 && (
                <ThemedText style={styles.searchEmptyText}>No matching users yet.</ThemedText>
              )}
            </ScrollView>
          )}
        </ThemedView>
      </Modal>
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
    paddingTop: 12,
  },
  addFriendButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 24,
  },
  addFriendText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
  searchModalContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 36,
  },
  searchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchCloseBtn: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
  searchControls: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: '#0a7ea4',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: 'white',
    fontWeight: '700',
  },
  searchLoading: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  searchResultsContainer: {
    gap: 8,
    paddingBottom: 24,
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
  searchEmptyText: {
    fontSize: 13,
    opacity: 0.6,
  },
});
