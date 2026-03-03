import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Animated,
  PanResponder,
  Image,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Gym, Friend } from '@/types';
import { AppColors } from '@/constants/theme';

export const BRAND_COLORS: Record<string, string> = {
  'Boulder+': '#f97316',
  'Boulder Planet': '#8b5cf6',
  'Climb Central': '#3b82f6',
  'BFF Climb': '#ec4899',
  FitBloc: '#10b981',
  Lighthouse: '#f59e0b',
  Outpost: '#6366f1',
  Climba: '#14b8a6',
  Oyeyo: '#ef4444',
  'Z-Vertigo': '#8b5cf6',
};

export function GymDrawer({
  gym,
  friends,
  visible,
  onClose,
}: {
  gym: Gym | null;
  friends: Friend[];
  visible: boolean;
  onClose: () => void;
}) {
  const modalBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');
  const translateY = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) {
      translateY.setValue(600);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, overshootClamping: true, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 600, overshootClamping: true, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onCloseRef.current());
  }, [translateY, backdropOpacity]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
        onPanResponderMove: (_, gs) => {
          if (gs.dy > 0) translateY.setValue(gs.dy);
        },
        onPanResponderRelease: (_, gs) => {
          if (gs.dy > 100 || gs.vy > 0.5) {
            dismiss();
          } else {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
          }
        },
      }),
    [translateY, dismiss],
  );

  if (!visible && !gym) return null;

  const brandColor = gym ? (BRAND_COLORS[gym.brand] ?? '#6b7280') : '#6b7280';
  const friendsHere = gym ? friends.filter((f) => f.currentGymId === gym.id && f.isAtGym) : [];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Backdrop */}
      <Animated.View style={[styles.drawerBackdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.drawer, { backgroundColor: modalBg, transform: [{ translateY }] }]}>
        {/* Drag handle */}
        <View {...panResponder.panHandlers} style={styles.drawerHandleArea}>
          <View style={styles.drawerHandle} />
        </View>

        {/* Gym header */}
        <View style={styles.drawerHeader}>
          <View style={[styles.gymBrandBadge, { backgroundColor: brandColor }]}>
            <ThemedText style={styles.gymBrandBadgeText}>{gym?.brand}</ThemedText>
          </View>
          <ThemedText style={styles.drawerGymName}>{gym?.name}</ThemedText>
          <View style={styles.drawerAddressRow}>
            <MaterialIcons name="place" size={14} color="#9ca3af" style={{ marginRight: 4 }} />
            <ThemedText style={styles.drawerGymAddress} numberOfLines={2}>
              {gym?.address}
            </ThemedText>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.drawerDivider, { backgroundColor: borderColor }]} />

        {/* Who's here */}
        <View style={styles.drawerSection}>
          <ThemedText style={styles.drawerSectionLabel}>
            {friendsHere.length > 0
              ? `${friendsHere.length} friend${friendsHere.length > 1 ? 's' : ''} climbing here`
              : 'No friends here right now'}
          </ThemedText>
          {friendsHere.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.friendsAtGymRow}
            >
              {friendsHere.map((friend) => (
                <View key={friend.id} style={styles.friendAtGymItem}>
                  <View style={styles.friendAtGymAvatarWrap}>
                    {friend.avatarUrl ? (
                      <Image source={{ uri: friend.avatarUrl }} style={styles.friendAtGymAvatar} />
                    ) : (
                      <View style={styles.friendAtGymAvatarFallback}>
                        <ThemedText style={styles.friendAtGymAvatarText}>
                          {friend.displayName
                            .split(' ')
                            .map((w) => w[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </ThemedText>
                      </View>
                    )}
                    <View style={styles.friendAtGymOnlineDot} />
                  </View>
                  <ThemedText style={styles.friendAtGymName} numberOfLines={1}>
                    {friend.displayName.split(' ')[0]}
                  </ThemedText>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  drawerHandleArea: {
    paddingTop: 10,
    paddingBottom: 6,
    alignItems: 'center',
  },
  drawerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9ca3af',
  },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  gymBrandBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  gymBrandBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  drawerGymName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  drawerAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  drawerGymAddress: {
    fontSize: 13,
    opacity: 0.6,
    flex: 1,
  },
  drawerDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  drawerSection: {
    paddingHorizontal: 20,
  },
  drawerSectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 14,
  },
  friendsAtGymRow: {
    gap: 16,
    paddingBottom: 4,
  },
  friendAtGymItem: {
    alignItems: 'center',
    gap: 6,
  },
  friendAtGymAvatarWrap: {
    position: 'relative',
  },
  friendAtGymAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  friendAtGymAvatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppColors.avatarFallbackBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendAtGymAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.avatarFallbackText,
  },
  friendAtGymOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: 'white',
  },
  friendAtGymName: {
    fontSize: 13,
    fontWeight: '500',
    maxWidth: 64,
    textAlign: 'center',
  },
});
