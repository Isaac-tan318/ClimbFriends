import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppColors } from '@/constants/theme';
import { getGymById } from '@/data';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Friend, User } from '@/types';

import { ThemedText } from '../themed-text';

const USER_AVATAR_SIZE = 72;

function Avatar({
  label,
  avatarUrl,
  size = 60,
}: {
  label: string;
  avatarUrl?: string;
  size?: number;
}) {
  const initials = useMemo(
    () =>
      label
        .split(' ')
        .map((word) => word[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    [label],
  );
  const fallbackBackgroundColor = useThemeColor(
    { light: AppColors.avatarFallbackBg, dark: '#312e81' },
    'background',
  );
  const fallbackTextColor = useThemeColor(
    { light: AppColors.avatarFallbackText, dark: '#c7d2fe' },
    'text',
  );

  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }

  return (
    <View
      style={[
        styles.avatarFallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: fallbackBackgroundColor,
        },
      ]}
    >
      <ThemedText style={[styles.avatarFallbackText, { color: fallbackTextColor }]}>
        {initials}
      </ThemedText>
    </View>
  );
}

function YourNoteCard({ user }: { user: User }) {
  const [note, setNote] = useState('');
  const cardBackground = useThemeColor({}, 'background');
  const bubbleBackground = useThemeColor(
    { light: '#ffffff', dark: AppColors.surface.dark },
    'background',
  );
  const bubbleBorderColor = useThemeColor(
    { light: '#dbe4f0', dark: AppColors.border.dark },
    'background',
  );
  const noteTextColor = useThemeColor(
    { light: AppColors.text.light, dark: AppColors.text.dark },
    'text',
  );
  const notePlaceholderColor = useThemeColor(
    { light: '#94a3b8', dark: '#64748b' },
    'text',
  );

  return (
    <View style={[styles.youCard, { backgroundColor: cardBackground }]}>
      <View style={styles.noteBubbleWrap}>
        <View
          style={[
            styles.noteBubble,
            {
              backgroundColor: bubbleBackground,
              borderColor: bubbleBorderColor,
            },
          ]}
        >
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Drop a note..."
            placeholderTextColor={notePlaceholderColor}
            style={[styles.noteInput, { color: noteTextColor }]}
            multiline
            maxLength={90}
          />
        </View>
        <View
          style={[
            styles.noteBubbleTail,
            {
              backgroundColor: bubbleBackground,
              borderColor: bubbleBorderColor,
            },
          ]}
        />
      </View>

      <View style={styles.youAvatarWrap}>
        <Avatar label={user.displayName} avatarUrl={user.avatarUrl} size={USER_AVATAR_SIZE} />
        <View style={[styles.youDot, { borderColor: cardBackground }]} />
      </View>
      <ThemedText style={styles.cardName}>Your note</ThemedText>
    </View>
  );
}

function ActiveFriendCard({ friend }: { friend: Friend }) {
  const cardBackground = useThemeColor(
    { light: '#eef6ff', dark: AppColors.surfaceContainer.dark },
    'background',
  );
  const mutedTextColor = useThemeColor(AppColors.textMuted, 'text');
  const gym = friend.currentGymId ? getGymById(friend.currentGymId) : null;
  const shortGym =
    gym?.name?.replace(
      /^(Boulder\+|Boulder Planet|Climb Central|FitBloc|BFF Climb|Lighthouse)\s*/i,
      '',
    ) ?? 'At the gym';

  return (
    <View style={[styles.friendCard, { backgroundColor: cardBackground }]}>
      <View style={styles.friendAvatarWrap}>
        <Avatar label={friend.displayName} avatarUrl={friend.avatarUrl} size={58} />
        <View style={[styles.friendOnlineDot, { borderColor: cardBackground }]} />
      </View>
      <ThemedText style={styles.cardName} numberOfLines={1}>
        {friend.displayName.split(' ')[0]}
      </ThemedText>
      <ThemedText style={[styles.cardSubtext, { color: mutedTextColor }]} numberOfLines={1}>
        {shortGym}
      </ThemedText>
    </View>
  );
}

export function ActiveFriendsSection({
  user,
  friendsAtGym,
}: {
  user: User;
  friendsAtGym: Friend[];
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle">Active Friends</ThemedText>
        <ThemedText style={styles.sectionCount}>{friendsAtGym.length + 1} live</ThemedText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <YourNoteCard user={user} />
        {friendsAtGym.map((friend) => (
          <ActiveFriendCard key={friend.id} friend={friend} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionCount: {
    fontSize: 13,
    color: AppColors.primary,
    fontWeight: '700',
  },
  row: {
    gap: 14,
    paddingRight: 20,
  },
  youCard: {
    width: USER_AVATAR_SIZE + 20,
    padding: 14,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    minHeight: 192,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  noteBubbleWrap: {
    position: 'absolute',
    top: 12,
    left: 14,
    width: USER_AVATAR_SIZE,
    alignItems: 'center',
    zIndex: 1,
  },
  noteBubble: {
    width: USER_AVATAR_SIZE + 20,
    minHeight: 45,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 2,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteBubbleTail: {
    marginTop: -1,
    width: 16,
    height: 16,
    backgroundColor: '#ffffff',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#dbe4f0',
    transform: [{ rotate: '-45deg' }],
    zIndex: 1,
  },
  noteInput: {
    padding: 0,
    fontSize: 11,
    width: '100%',
    justifyContent: 'center',
    minHeight: 40,
    // textAlignVertical: 'center',
    textAlign: 'center',
  },
  youAvatarWrap: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  youDot: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#f8fafc',
  },
  friendCard: {
    width: 112,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: '#eef6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  friendOnlineDot: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#eef6ff',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
  },
  cardSubtext: {
    marginTop: 4,
    fontSize: 12,
  },
});
