import { ThemedText } from '@/components/themed-text';
import { AppColors } from '@/constants/theme';
import { LeaderboardEntry } from '@/types';
import { useIsFocused } from '@react-navigation/native';
import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

type AnimatedPodiumProps = {
  entries: LeaderboardEntry[];
  currentUserId: string;
  shouldAnimate?: boolean;
};

// 1. The actual animated content
function PodiumContent({
  entries,
  currentUserId,
  shouldAnimate = true,
  isFocused,
}: AnimatedPodiumProps & { isFocused: boolean }) {
  const colorScheme = useColorScheme() ?? 'light';
  const textColor = colorScheme === 'dark' ? '#f1f1f1' : '#111';
  const mutedColor = colorScheme === 'dark' ? '#aaa' : '#666';

  const topEntries = entries.slice(0, 3);

  // Default to 0 if animating, 1 if we shouldn't animate at all
  const anim0 = useSharedValue(shouldAnimate ? 0 : 1); 
  const anim1 = useSharedValue(shouldAnimate ? 0 : 1); 
  const anim2 = useSharedValue(shouldAnimate ? 0 : 1);

  const podiumColors = ['#fbbf24', '#d1d5db', '#cd7f32'];
  const podiumHeights = [120, 90, 70];

  const slotOrder =
    topEntries.length >= 3
      ? [2, 0, 1]
      : topEntries.length === 2
        ? [1, 0, null]
        : topEntries.length === 1
          ? [null, 0, null]
          : [];

  useEffect(() => {
    if (!isFocused || !shouldAnimate || topEntries.length === 0) return;

    const timingConfig = {
      duration: 500, 
      easing: Easing.out(Easing.cubic), 
    };

    if (topEntries.length > 2) {
      anim2.value = withDelay(0, withTiming(1, timingConfig));
    }
    if (topEntries.length > 1) {
      anim1.value = withDelay(150, withTiming(1, timingConfig));
    }
    if (topEntries.length > 0) {
      anim0.value = withDelay(300, withTiming(1, timingConfig));
    }
  }, [isFocused, shouldAnimate, topEntries.length, anim0, anim1, anim2]);

  const style0 = useAnimatedStyle(() => ({
    opacity: anim0.value,
    transform: [{ translateY: interpolate(anim0.value, [0, 1], [60, 0]) }],
  }));

  const style1 = useAnimatedStyle(() => ({
    opacity: anim1.value,
    transform: [{ translateY: interpolate(anim1.value, [0, 1], [60, 0]) }],
  }));

  const style2 = useAnimatedStyle(() => ({
    opacity: anim2.value,
    transform: [{ translateY: interpolate(anim2.value, [0, 1], [60, 0]) }],
  }));

  const animStyles = [style0, style1, style2];

  // THE FIX: Hardcode the initial un-animated state.
  // This guarantees the very first Native paint is hidden before Reanimated boots up.
  const initialHiddenStyle = shouldAnimate 
    ? { opacity: 0, transform: [{ translateY: 60 }] }
    : { opacity: 1, transform: [{ translateY: 0 }] };

  if (topEntries.length === 0) return null;

  return (
    <View style={styles.podiumContainer}>
      {slotOrder.map((idx, slotIndex) => {
        if (idx == null) {
          return <View key={`podium-slot-empty-${slotIndex}`} style={styles.podiumSlot} />;
        }

        const entry = topEntries[idx];
        const isUser = entry.userId === currentUserId;
        const animatedStyle = animStyles[idx];

        return (
          <Animated.View
            key={`podium-entry-${entry.userId}`}
            style={[
              styles.podiumSlot,
              initialHiddenStyle, // Inserted here to prevent the frame mismatch
              animatedStyle,      // Reanimated overrides this seamlessly
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

// 2. The Parent Wrapper
function AnimatedPodiumInner(props: AnimatedPodiumProps) {
  const isFocused = useIsFocused();

  return <PodiumContent key={isFocused ? 'focused' : 'blurred'} isFocused={isFocused} {...props} />;
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