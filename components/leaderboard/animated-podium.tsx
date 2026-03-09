import React, { memo, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppColors } from '@/constants/theme';
import { LeaderboardEntry } from '@/types';

type AnimatedPodiumProps = {
  entries: LeaderboardEntry[];
  currentUserId: string;
};

function AnimatedPodiumInner({ entries, currentUserId }: AnimatedPodiumProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const textColor = colorScheme === 'dark' ? '#f1f1f1' : '#111';
  const mutedColor = colorScheme === 'dark' ? '#aaa' : '#666';
  const top3 = entries.slice(0, 3);
  const thirdAnim = useRef(new Animated.Value(0)).current;
  const secondAnim = useRef(new Animated.Value(0)).current;
  const firstAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    thirdAnim.setValue(0);
    secondAnim.setValue(0);
    firstAnim.setValue(0);
    Animated.stagger(200, [
      Animated.spring(thirdAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.spring(secondAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.spring(firstAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
    ]).start();
  }, [entries, firstAnim, secondAnim, thirdAnim]);

  const podiumColors = ['#fbbf24', '#d1d5db', '#cd7f32'];
  const podiumHeights = [120, 90, 70];
  const animRefs = [firstAnim, secondAnim, thirdAnim];
  const displayOrder = [2, 0, 1];

  if (top3.length < 3) return null;

  return (
    <View style={styles.podiumContainer}>
      {displayOrder.map((idx) => {
        const entry = top3[idx];
        const anim = animRefs[idx];
        const isUser = entry.userId === currentUserId;
        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [60, 0],
        });

        return (
          <Animated.View
            key={entry.userId}
            style={[
              styles.podiumSlot,
              {
                opacity: anim,
                transform: [{ translateY }],
              },
            ]}
          >
            <View
              style={[
                styles.podiumAvatar,
                { backgroundColor: isUser ? AppColors.primary : '#9ca3af' },
                idx === 0 && styles.podiumAvatarFirst,
              ]}
            >
              <Text style={styles.podiumAvatarText}>{entry.user.displayName[0]}</Text>
            </View>
            <Text
              style={[
                styles.podiumName,
                { color: isUser ? AppColors.primary : textColor },
                isUser && { fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {entry.user.displayName.split(' ')[0]}
            </Text>
            <Text style={[styles.podiumHours, { color: mutedColor }]}>
              {Math.round(entry.totalMinutes / 6) / 10}h
            </Text>
            <View
              style={[
                styles.podiumPedestal,
                {
                  height: podiumHeights[idx],
                  backgroundColor: podiumColors[idx],
                },
              ]}
            >
              <ThemedText style={styles.podiumRank}>#{idx + 1}</ThemedText>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

export const AnimatedPodium = memo(AnimatedPodiumInner);

const styles = StyleSheet.create({
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 24,
    paddingTop: 16,
    gap: 6,
  },
  podiumSlot: {
    flex: 1,
    alignItems: 'center',
  },
  podiumAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  podiumAvatarFirst: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  podiumAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  podiumName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  podiumHours: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 6,
  },
  podiumPedestal: {
    width: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  podiumRank: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgba(0,0,0,0.5)',
  },
});
