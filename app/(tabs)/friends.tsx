import React from 'react';
import { StyleSheet, ScrollView, View, Pressable, Image } from 'react-native';
import { formatDistanceToNow } from 'date-fns';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSocialStore } from '@/stores';
import { getGymById } from '@/data';
import { Friend } from '@/types';

function FriendCard({ friend }: { friend: Friend }) {
  const cardBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');
  const gym = friend.currentGymId ? getGymById(friend.currentGymId) : null;
  
  return (
    <View style={[styles.friendCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, { backgroundColor: friend.isAtGym ? '#22c55e' : '#9ca3af' }]}>
          <ThemedText style={styles.avatarText}>
            {friend.displayName[0]}
          </ThemedText>
        </View>
        {friend.isAtGym && <View style={styles.onlineIndicator} />}
      </View>
      
      <View style={styles.friendInfo}>
        <ThemedText style={styles.friendName}>{friend.displayName}</ThemedText>
        {friend.isAtGym && gym ? (
          <View style={styles.atGymBadge}>
            <ThemedText style={styles.atGymText}>🧗 {gym.name}</ThemedText>
          </View>
        ) : (
          <ThemedText style={styles.lastSeenText}>
            Last seen {friend.lastSeenAt ? formatDistanceToNow(friend.lastSeenAt, { addSuffix: true }) : 'recently'}
          </ThemedText>
        )}
      </View>
      
      <Pressable style={styles.messageButton}>
        <ThemedText style={styles.messageButtonText}>💬</ThemedText>
      </Pressable>
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
      {friends.map((friend) => (
        <FriendCard key={friend.id} friend={friend} />
      ))}
    </View>
  );
}

function OfflineSection({ friends }: { friends: Friend[] }) {
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
        <FriendCard key={friend.id} friend={friend} />
      ))}
    </View>
  );
}

export default function FriendsScreen() {
  const friends = useSocialStore((state) => state.friends);
  
  const friendsAtGym = friends.filter((f) => f.isAtGym);
  const friendsOffline = friends.filter((f) => !f.isAtGym);
  
  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title">Friends</ThemedText>
          <ThemedText style={styles.subtitle}>
            {friends.length} friends • {friendsAtGym.length} climbing now
          </ThemedText>
        </View>
        
        {/* Add Friend Button */}
        <Pressable style={styles.addFriendButton}>
          <ThemedText style={styles.addFriendText}>+ Add Friend</ThemedText>
        </Pressable>
        
        {/* Friends at Gym */}
        <AtGymSection friends={friendsAtGym} />
        
        {/* Offline Friends */}
        <OfflineSection friends={friendsOffline} />
        
        {friends.length === 0 && (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyEmoji}>👋</ThemedText>
            <ThemedText style={styles.emptyText}>No friends yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Add friends to see when they're climbing
            </ThemedText>
          </View>
        )}
      </ScrollView>
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
    paddingTop: 60,
  },
  header: {
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 4,
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
  messageButton: {
    padding: 8,
  },
  messageButtonText: {
    fontSize: 20,
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
});
