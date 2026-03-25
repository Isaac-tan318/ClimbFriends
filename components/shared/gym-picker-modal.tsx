import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { SINGAPORE_GYMS } from '@/data';
import { useThemeColor } from '@/hooks/use-theme-color';

import { BottomSheetModal } from './bottom-sheet-modal';
import { ThemedText } from '../themed-text';

export function GymPickerModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (gymId: string) => void;
}) {
  const modalBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');
  const textColor = useThemeColor({}, 'text');

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      backgroundColor={modalBg}
      contentStyle={styles.modalContent}
      dismissThreshold={500}
      openBackdropDuration={100}
    >
      {({ dismiss, dragGesture, onBodyScroll }) => (
        <>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => dismiss()} style={styles.backButton}>
              <MaterialIcons name="chevron-left" size={28} color={textColor} />
            </Pressable>
            <GestureDetector gesture={dragGesture}>
              <View style={styles.modalHeaderTitleDragZone}>
                <ThemedText type="subtitle" style={styles.modalHeaderTitle}>
                  Select Gym
                </ThemedText>
              </View>
            </GestureDetector>
            <View style={styles.backButtonSpacer} />
          </View>
          <FlatList
            data={SINGAPORE_GYMS}
            keyExtractor={(item) => item.id}
            onScroll={onBodyScroll}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.gymPickerItem, { borderColor }]}
                onPress={() => onSelect(item.id)}
              >
                <ThemedText style={styles.gymPickerName}>{item.name}</ThemedText>
                <ThemedText style={styles.gymPickerBrand}>{item.brand}</ThemedText>
              </Pressable>
            )}
          />
        </>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  modalHeaderTitleDragZone: {
    flex: 1,
    minHeight: 32,
    justifyContent: 'center',
  },
  modalHeaderTitle: {
    textAlign: 'center',
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonSpacer: {
    width: 32,
  },
  gymPickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  gymPickerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  gymPickerBrand: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 2,
  },
});

