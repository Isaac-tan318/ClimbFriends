import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { format } from 'date-fns';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppColors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Friend } from '@/types';

import { BottomSheetModal } from '../shared/bottom-sheet-modal';
import { ThemedText } from '../themed-text';

export function FriendPickerModal({
  visible,
  onClose,
  friends,
  defaultMessage,
  mode,
  submitting,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  friends: Friend[];
  defaultMessage: string;
  mode: 'invite-now' | 'make-plan';
  submitting: boolean;
  onSubmit: (input: {
    selectedFriendIds: string[];
    message: string;
    planDate: Date | null;
    planTime: string | null;
  }) => Promise<boolean>;
}) {
  const modalBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');
  const inputBg = useThemeColor({ light: '#f3f4f6', dark: '#2a2a2a' }, 'background');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState(defaultMessage);
  const [planDate, setPlanDate] = useState<Date | null>(null);
  const [planTime, setPlanTime] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    setSearchQuery('');
    setSelectedIds(new Set());
    setMessage(defaultMessage);
    setPlanDate(null);
    setPlanTime(null);
  }, [visible, defaultMessage]);

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase();
    return friends.filter((friend) => friend.displayName.toLowerCase().includes(q));
  }, [friends, searchQuery]);

  const toggleFriend = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const dateOptions = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i += 1) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      dates.push(nextDate);
    }
    return dates;
  }, []);

  const timeSlots = useMemo(
    () => [
      '6:00 AM',
      '7:00 AM',
      '8:00 AM',
      '9:00 AM',
      '10:00 AM',
      '11:00 AM',
      '12:00 PM',
      '1:00 PM',
      '2:00 PM',
      '3:00 PM',
      '4:00 PM',
      '5:00 PM',
      '6:00 PM',
      '7:00 PM',
      '8:00 PM',
      '9:00 PM',
      '10:00 PM',
    ],
    [],
  );

  const canSubmit =
    selectedIds.size > 0 && (mode === 'invite-now' || (planDate !== null && planTime !== null));

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      backgroundColor={modalBg}
      contentStyle={styles.friendPickerContent}
      dismissThreshold={400}
      openBackdropDuration={300}
    >
      {({ dismiss, onBodyScroll }) => (
        <>
          <View style={styles.friendPickerSearchRow}>
            <Pressable onPress={() => dismiss()} style={styles.backButton}>
              <MaterialIcons name="chevron-left" size={28} color={textColor} />
            </Pressable>
            <View style={[styles.friendPickerSearchBar, { backgroundColor: inputBg }]}>
              <TextInput
                style={[styles.friendPickerSearchInput, { color: textColor }]}
                placeholder="Search"
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          <FlatList
            data={filteredFriends}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.friendGrid}
            onScroll={onBodyScroll}
            scrollEventThrottle={16}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyText}>No friends match your search.</ThemedText>
              </View>
            }
            ListFooterComponent={
              <>
                {mode === 'make-plan' && (
                  <View style={styles.dateTimeSection}>
                    <ThemedText style={styles.dateTimeSectionLabel}>Pick a date</ThemedText>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.dateScroll}
                    >
                      {dateOptions.map((optionDate, index) => {
                        const isToday = index === 0;
                        const isSelected =
                          planDate !== null &&
                          optionDate.toDateString() === planDate.toDateString();

                        return (
                          <Pressable
                            key={optionDate.toISOString()}
                            style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                            onPress={() => setPlanDate(optionDate)}
                          >
                            <ThemedText
                              style={[
                                styles.dateChipText,
                                isSelected && styles.dateChipTextSelected,
                              ]}
                            >
                              {isToday ? 'Today' : format(optionDate, 'EEE, MMM d')}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </ScrollView>

                    <ThemedText style={[styles.dateTimeSectionLabel, styles.timeLabel]}>
                      Pick a time
                    </ThemedText>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.timeScroll}
                    >
                      {timeSlots.map((slot) => {
                        const isSelected = planTime === slot;
                        return (
                          <Pressable
                            key={slot}
                            style={[styles.timeChip, isSelected && styles.timeChipSelected]}
                            onPress={() => setPlanTime(slot)}
                          >
                            <ThemedText
                              style={[
                                styles.timeChipText,
                                isSelected && styles.timeChipTextSelected,
                              ]}
                            >
                              {slot}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </>
            }
            renderItem={({ item }) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <Pressable style={styles.friendGridItem} onPress={() => toggleFriend(item.id)}>
                  <View style={styles.friendGridAvatarWrap}>
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} style={styles.friendGridAvatar} />
                    ) : (
                      <View style={styles.friendGridAvatarFallback}>
                        <ThemedText style={styles.friendGridAvatarText}>
                          {item.displayName
                            .split(' ')
                            .map((word) => word[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </ThemedText>
                      </View>
                    )}
                    {item.isAtGym && !isSelected && <View style={styles.friendGridOnlineDot} />}
                    {isSelected && (
                      <View style={styles.friendGridCheck}>
                        <MaterialIcons name="check" size={14} color="#fff" />
                      </View>
                    )}
                  </View>
                  <ThemedText style={styles.friendGridName} numberOfLines={1}>
                    {item.displayName.split(' ')[0]}
                  </ThemedText>
                </Pressable>
              );
            }}
          />

          <View style={[styles.messageInputRow, { borderColor }]}>
            <TextInput
              style={[styles.messageInput, { color: textColor }]}
              placeholder="Write a message..."
              placeholderTextColor="#888"
              value={message}
              onChangeText={setMessage}
            />
          </View>

          <Pressable
            style={[styles.sendButton, !canSubmit && styles.sendButtonDisabled]}
            onPress={async () => {
              const submitted = await onSubmit({
                selectedFriendIds: Array.from(selectedIds),
                message,
                planDate,
                planTime,
              });

              if (submitted) dismiss();
            }}
            disabled={!canSubmit || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.sendButtonText}>
                {mode === 'invite-now' ? 'Send Invite' : 'Create Plan'}
              </ThemedText>
            )}
          </Pressable>
        </>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  friendPickerContent: {
    maxHeight: '85%',
    padding: 16,
    paddingBottom: 24,
  },
  friendPickerSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendPickerSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  friendPickerSearchInput: {
    flex: 1,
    fontSize: 16,
  },
  friendGrid: {
    paddingTop: 8,
  },
  friendGridItem: {
    flex: 1 / 3,
    alignItems: 'center',
    marginBottom: 20,
  },
  friendGridAvatarWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  friendGridAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  friendGridAvatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendGridAvatarText: {
    color: '#4338ca',
    fontSize: 24,
    fontWeight: '700',
  },
  friendGridOnlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#1c1c1e',
  },
  friendGridCheck: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1c1c1e',
  },
  friendGridName: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 90,
  },
  emptyState: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    opacity: 0.6,
  },
  messageInputRow: {
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 12,
  },
  messageInput: {
    fontSize: 16,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: AppColors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  dateTimeSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  dateTimeSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
    marginBottom: 8,
  },
  timeLabel: {
    marginTop: 12,
  },
  dateScroll: {
    marginBottom: 4,
  },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    marginRight: 8,
  },
  dateChipSelected: {
    backgroundColor: AppColors.primary,
  },
  dateChipText: {
    fontSize: 13,
    color: '#ccc',
  },
  dateChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  timeScroll: {
    marginBottom: 4,
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    marginRight: 8,
  },
  timeChipSelected: {
    backgroundColor: AppColors.primary,
  },
  timeChipText: {
    fontSize: 13,
    color: '#ccc',
  },
  timeChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
});

