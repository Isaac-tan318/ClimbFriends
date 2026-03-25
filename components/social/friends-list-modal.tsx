import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { useSocialStore } from '@/stores';
import { Friend } from '@/types';

import {
  AtGymSection,
  OfflineSection,
  RequestSection,
  SearchResultRow,
} from './friends-sections';
import { AppHeaderBanner } from '../app-header-banner';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';

export function FriendsListModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
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

  const pendingFriendRequests = friendRequests.filter((request) => request.status === 'pending');
  const friendsAtGym = friends.filter((friend) => friend.isAtGym);
  const friendsOffline = friends.filter((friend) => !friend.isAtGym);

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
    Alert.alert('Remove friend?', `Remove ${friend.displayName} from your friends list?`, [
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
    ]);
  };

  const handleRespondToRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    const result = await respondToFriendRequest(requestId, status);
    if (!result.ok) {
      Alert.alert('Unable to update request', result.error.message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <AppHeaderBanner
          title="Friends"
          rightContent={
            <Pressable onPress={onClose} style={styles.headerButton}>
              <ThemedText style={styles.headerButtonText}>Close</ThemedText>
            </Pressable>
          }
        />

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
              <ThemedText style={styles.emptySubtext}>
                Add friends to see when they are climbing
              </ThemedText>
            </View>
          )}
        </ScrollView>

        <Modal
          visible={showSearchModal}
          animationType="slide"
          onRequestClose={() => setShowSearchModal(false)}
        >
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 32,
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
  searchEmptyText: {
    fontSize: 13,
    opacity: 0.6,
  },
});
