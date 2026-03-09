import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export type BottomSheetDismiss = (afterClose?: () => void) => void;
export type BottomSheetDragGesture = ReturnType<typeof Gesture.Pan>;

export type BottomSheetModalProps = {
  visible: boolean;
  onClose: () => void;
  backgroundColor: string;
  contentStyle?: StyleProp<ViewStyle>;
  dismissThreshold?: number;
  openBackdropDuration?: number;
  children: ({
    dismiss,
    dragGesture,
    onBodyScroll,
    setBodyAtTop,
  }: {
    dismiss: BottomSheetDismiss;
    dragGesture: BottomSheetDragGesture;
    onBodyScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    setBodyAtTop: (atTop: boolean) => void;
  }) => React.ReactNode;
};

export function BottomSheetModal({
  visible,
  onClose,
  backgroundColor,
  contentStyle,
  dismissThreshold = 400,
  openBackdropDuration = 100,
  children,
}: BottomSheetModalProps) {
  const translateY = useSharedValue(800);
  const backdropOpacity = useSharedValue(0);
  const [isBodyAtTop, setIsBodyAtTop] = useState(true);
  const onCloseRef = useRef(onClose);
  const dismissAfterCloseRef = useRef<(() => void) | null>(null);
  onCloseRef.current = onClose;

  const handleDismissComplete = useCallback(() => {
    onCloseRef.current();
    dismissAfterCloseRef.current?.();
    dismissAfterCloseRef.current = null;
  }, []);

  const dismiss = useCallback(
    (afterClose?: () => void) => {
      dismissAfterCloseRef.current = afterClose ?? null;
      translateY.value = withSpring(800, { overshootClamping: true });
      backdropOpacity.value = withTiming(0, { duration: 250 }, (finished) => {
        if (finished) {
          runOnJS(handleDismissComplete)();
        }
      });
    },
    [translateY, backdropOpacity, handleDismissComplete],
  );

  useEffect(() => {
    if (visible) {
      translateY.value = 800;
      backdropOpacity.value = 0;
      translateY.value = withSpring(0, { overshootClamping: true });
      backdropOpacity.value = withTiming(1, { duration: openBackdropDuration });
      setIsBodyAtTop(true);
    }
  }, [visible, translateY, backdropOpacity, openBackdropDuration]);

  const handleBodyScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIsBodyAtTop(event.nativeEvent.contentOffset.y <= 0);
  }, []);

  const createDragGesture = useCallback(
    (enabled: boolean) =>
      Gesture.Pan()
        .enabled(enabled)
        .activeOffsetY(5)
        .onUpdate((event) => {
          if (event.translationY > 0 && Math.abs(event.translationY) > Math.abs(event.translationX)) {
            translateY.value = event.translationY;
          }
        })
        .onEnd((event) => {
          const isVerticalDrag = Math.abs(event.translationY) > Math.abs(event.translationX);
          if (isVerticalDrag && (event.translationY > dismissThreshold || event.velocityY > 500)) {
            runOnJS(dismiss)();
          } else {
            translateY.value = withSpring(0, { overshootClamping: true });
          }
        }),
    [translateY, dismissThreshold, dismiss],
  );

  const sheetDragGesture = useMemo(() => createDragGesture(isBodyAtTop), [createDragGesture, isBodyAtTop]);
  const titleDragGesture = useMemo(() => createDragGesture(true), [createDragGesture]);
  const backdropAnimatedStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const sheetAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={() => dismiss()}>
      <GestureHandlerRootView style={styles.modalOverlay}>
        <Reanimated.View style={[styles.modalBackdrop, backdropAnimatedStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => dismiss()} />
        </Reanimated.View>
        <GestureDetector gesture={sheetDragGesture}>
          <Reanimated.View style={[styles.modalSheetBase, { backgroundColor }, sheetAnimatedStyle, contentStyle]}>
            <View style={styles.bottomSheetDragHandleArea}>
              <View style={styles.bottomSheetHandle} />
            </View>
            {children({
              dismiss,
              dragGesture: titleDragGesture,
              onBodyScroll: handleBodyScroll,
              setBodyAtTop: setIsBodyAtTop,
            })}
          </Reanimated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheetBase: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetDragHandleArea: {
    minHeight: 48,
    paddingTop: 22,
    paddingBottom: 10,
    justifyContent: 'flex-start',
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#666',
    alignSelf: 'center',
  },
});
