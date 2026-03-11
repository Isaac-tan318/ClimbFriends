import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Pressable,
    Modal,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Switch,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { AppColors } from '@/constants/theme';
import { getGymById, getGradesForGym } from '@/data';
import { LoggedClimb } from '@/types';

// Common hold / tape colors used across gyms
const CLIMB_COLORS = [
    'Red',
    'Blue',
    'Green',
    'Yellow',
    'Orange',
    'Purple',
    'Pink',
    'Black',
    'White',
    'Grey',
];

// ---------------------------------------------------------------------------
// GradeSlider - horizontal discrete step slider
// ---------------------------------------------------------------------------
const THUMB_SIZE = 24;

function GradeSlider({
    grades,
    value,
    onChange,
}: {
    grades: string[];
    value: string;
    onChange: (g: string) => void;
}) {
    const trackBg = useThemeColor({ light: '#e5e7eb', dark: '#3a3a3a' }, 'background');
    const [trackWidth, setTrackWidth] = useState(0);
    const thumbX = useSharedValue(0);
    const startX = useSharedValue(0);
    const isDragging = useRef(false);
    const lastIdx = useSharedValue(0);
    const trackWidthSV = useSharedValue(0);
    const gradeCountSV = useSharedValue(grades.length);

    useEffect(() => {
        gradeCountSV.value = grades.length;
    }, [grades.length, gradeCountSV]);

    const handleTrackLayout = useCallback((e: any) => {
        const w = e.nativeEvent.layout.width;
        setTrackWidth(w);
        trackWidthSV.value = w;
    }, [trackWidthSV]);

    const indexOfValue = useMemo(() => {
        const i = grades.indexOf(value);
        return i >= 0 ? i : 0;
    }, [grades, value]);

    // Thumb center position for a given step index (0 -> trackWidth)
    const xForIndex = useCallback(
        (i: number, tw?: number) => {
            const w = tw ?? trackWidth;
            const len = grades.length;
            if (len <= 1 || w === 0) return 0;
            return (i / (len - 1)) * w;
        },
        [trackWidth, grades.length],
    );

    const setDragging = useCallback((next: boolean) => {
        isDragging.current = next;
    }, []);

    const emitIndexChange = useCallback(
        (idx: number) => {
            const next = grades[idx];
            if (next !== undefined) onChange(next);
        },
        [grades, onChange],
    );

    // Sync thumb position when value or trackWidth changes (skip during drag)
    useEffect(() => {
        if (trackWidth > 0 && !isDragging.current) {
            thumbX.value = withSpring(xForIndex(indexOfValue, trackWidth), {
                overshootClamping: true,
            });
        }
        lastIdx.value = indexOfValue;
    }, [indexOfValue, trackWidth, xForIndex, thumbX, lastIdx]);

    // Stable pan gesture that supports dragging from anywhere on the track.
    const sliderGesture = useMemo(
        () =>
            Gesture.Pan()
                .minDistance(0)
                .onBegin((event) => {
                    runOnJS(setDragging)(true);
                    const gradeCount = gradeCountSV.value;
                    const tw = trackWidthSV.value;
                    if (tw <= 0 || gradeCount === 0) return;

                    // Jump thumb to touch location immediately.
                    const touchX = event.x - THUMB_SIZE / 2; // offset for outer padding
                    const clamped = Math.max(0, Math.min(tw, touchX));
                    startX.value = clamped;
                    thumbX.value = clamped;

                    const idx = gradeCount <= 1
                        ? 0
                        : Math.max(0, Math.min(gradeCount - 1, Math.round(clamped / (tw / (gradeCount - 1)))));
                    if (idx !== lastIdx.value) {
                        lastIdx.value = idx;
                        runOnJS(emitIndexChange)(idx);
                    }
                })
                .onUpdate((event) => {
                    const gradeCount = gradeCountSV.value;
                    const tw = trackWidthSV.value;
                    if (tw <= 0 || gradeCount === 0) return;

                    const rawX = Math.max(0, Math.min(tw, startX.value + event.translationX));
                    thumbX.value = rawX;

                    const idx = gradeCount <= 1
                        ? 0
                        : Math.max(0, Math.min(tw, rawX));
                    const snappedIdx = gradeCount <= 1
                        ? 0
                        : Math.max(0, Math.min(gradeCount - 1, Math.round(rawX / (tw / (gradeCount - 1)))));
                    if (snappedIdx !== lastIdx.value) {
                        lastIdx.value = snappedIdx;
                        runOnJS(emitIndexChange)(snappedIdx);
                    }
                })
                .onEnd((event) => {
                    runOnJS(setDragging)(false);
                    const gradeCount = gradeCountSV.value;
                    const tw = trackWidthSV.value;
                    if (tw <= 0 || gradeCount === 0) return;

                    const rawX = Math.max(0, Math.min(tw, startX.value + event.translationX));
                    const idx = gradeCount <= 1
                        ? 0
                        : Math.max(0, Math.min(gradeCount - 1, Math.round(rawX / (tw / (gradeCount - 1)))));
                    if (idx !== lastIdx.value) {
                        lastIdx.value = idx;
                        runOnJS(emitIndexChange)(idx);
                    }
                    const snapX = gradeCount <= 1 ? 0 : (idx / (gradeCount - 1)) * tw;
                    thumbX.value = withSpring(snapX, {
                        overshootClamping: true,
                    });
                })
                .onFinalize(() => {
                    runOnJS(setDragging)(false);
                }),
        [trackWidthSV, gradeCountSV, thumbX, startX, lastIdx, emitIndexChange, setDragging],
    );

    const filledAnimatedStyle = useAnimatedStyle(() => ({
        width: Math.max(0, Math.min(trackWidthSV.value, thumbX.value)),
    }));

    const thumbAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: thumbX.value }],
    }));

    return (
        <View style={styles.sliderContainer}>
            {/* Current grade label */}
            <View style={styles.sliderValueRow}>
                <ThemedText style={styles.sliderValueText}>{value || grades[0]}</ThemedText>
            </View>

            {/* Outer wrapper - drag anywhere on track */}
            <GestureDetector gesture={sliderGesture}>
                <View style={styles.sliderOuter}>
                    {/* Track */}
                    <View
                        pointerEvents="none"
                        style={[styles.sliderTrack, { backgroundColor: trackBg }]}
                        onLayout={handleTrackLayout}
                    >
                        {/* Filled portion */}
                        <Reanimated.View style={[styles.sliderFilled, filledAnimatedStyle]} />

                        {/* Tick marks */}
                        {trackWidth > 0 &&
                            grades.map((g, i) => {
                                const tickX = xForIndex(i);
                                return (
                                    <View
                                        key={g}
                                        style={[
                                            styles.tick,
                                            {
                                                left: tickX - 1,
                                                backgroundColor: i <= indexOfValue ? '#fff' : trackBg,
                                            },
                                        ]}
                                    />
                                );
                            })}

                        {/* Thumb */}
                        <Reanimated.View
                            pointerEvents="none"
                            style={[
                                styles.sliderThumb,
                                thumbAnimatedStyle,
                            ]}
                        />
                    </View>
                </View>
            </GestureDetector>

            {/* Min / max labels */}
            <View style={styles.sliderEndLabels}>
                <ThemedText style={styles.sliderEndLabel}>{grades[0]}</ThemedText>
                <ThemedText style={styles.sliderEndLabel}>{grades[grades.length - 1]}</ThemedText>
            </View>
        </View>
    );
}

interface LogClimbModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (climb: Omit<LoggedClimb, 'id' | 'loggedAt'>) => void;
    sessionId: string;
    gymId: string;
}

export function LogClimbModal({ visible, onClose, onSubmit, sessionId, gymId }: LogClimbModalProps) {
    const modalBg = useThemeColor({}, 'background');
    const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');
    const inputBg = useThemeColor({ light: '#f3f4f6', dark: '#2a2a2a' }, 'background');
    const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
    const placeholderColor = useThemeColor({ light: '#9ca3af', dark: '#6b7280' }, 'text');

    const [grade, setGrade] = useState('');
    const [isWild, setIsWild] = useState(false);
    const [color, setColor] = useState('');
    const [wall, setWall] = useState('');
    const [instagramUrl, setInstagramUrl] = useState('');
    const [isBodyAtTop, setIsBodyAtTop] = useState(true);

    const translateY = useSharedValue(800);
    const backdropOpacity = useSharedValue(0);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const handleDismissComplete = useCallback(() => {
        onCloseRef.current();
    }, []);

    const gym = getGymById(gymId);
    const allGrades = gym ? getGradesForGym(gym) : null;
    const walls = gym?.walls ?? null;

    // Separate "Wild" from the numeric/ordinal grades
    const hasWild = allGrades?.includes('Wild') ?? false;
    const sliderGrades = useMemo(
        () => allGrades?.filter((g) => g !== 'Wild') ?? null,
        [allGrades],
    );

    // The effective grade submitted
    const effectiveGrade = isWild ? 'Wild' : grade;

    useEffect(() => {
        if (visible) {
            setGrade(sliderGrades ? sliderGrades[0] : '');
            setIsWild(false);
            setColor('');
            setWall('');
            setInstagramUrl('');
            setIsBodyAtTop(true);
            translateY.value = 800;
            backdropOpacity.value = 0;
            translateY.value = withSpring(0, { overshootClamping: true });
            backdropOpacity.value = withTiming(1, { duration: 100 });
        }
    }, [visible, sliderGrades, translateY, backdropOpacity]);

    const dismissModal = useCallback(() => {
        translateY.value = withSpring(800, { overshootClamping: true });
        backdropOpacity.value = withTiming(0, { duration: 250 }, (finished) => {
            if (finished) {
                runOnJS(handleDismissComplete)();
            }
        });
    }, [translateY, backdropOpacity, handleDismissComplete]);

    const createDragGesture = useCallback(
        (enabled: boolean) =>
            Gesture.Pan()
                .enabled(enabled)
                .activeOffsetY(5)
                .onUpdate((event) => {
                    if (event.translationY > 0) {
                        translateY.value = event.translationY;
                    }
                })
                .onEnd((event) => {
                    if (event.translationY > 100 || event.velocityY > 500) {
                        runOnJS(dismissModal)();
                    } else {
                        translateY.value = withSpring(0, { overshootClamping: true });
                    }
                }),
        [translateY, dismissModal],
    );

    const dragGesture = useMemo(
        () => createDragGesture(isBodyAtTop),
        [createDragGesture, isBodyAtTop],
    );
    const handleDragGesture = useMemo(
        () => createDragGesture(true),
        [createDragGesture],
    );

    const backdropAnimatedStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));

    const sheetAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const handleSubmit = useCallback(() => {
        if (!effectiveGrade) return;
        onSubmit({
            sessionId,
            gymId,
            grade: effectiveGrade,
            color,
            wall,
            instagramUrl,
        });
        dismissModal();
    }, [effectiveGrade, color, wall, instagramUrl, sessionId, gymId, onSubmit, dismissModal]);

    const canSubmit = effectiveGrade.trim().length > 0;

    return (
        <Modal visible={visible} animationType="none" transparent onRequestClose={dismissModal}>
            <GestureHandlerRootView style={styles.overlay}>
                <KeyboardAvoidingView
                    style={styles.overlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <Reanimated.View style={[styles.backdrop, backdropAnimatedStyle]}>
                        <Pressable style={StyleSheet.absoluteFill} onPress={dismissModal} />
                    </Reanimated.View>

                    <GestureDetector gesture={dragGesture}>
                        <Reanimated.View
                            style={[styles.sheet, { backgroundColor: modalBg }, sheetAnimatedStyle]}
                        >
                            <GestureDetector gesture={handleDragGesture}>
                                <View>
                                    <View style={styles.handle} />
                                </View>
                            </GestureDetector>

                        {/* Header */}
                        <View style={styles.header}>
                            <Pressable onPress={dismissModal} style={styles.headerBtn}>
                                <ThemedText style={styles.headerBtnText}>Cancel</ThemedText>
                            </Pressable>
                            <ThemedText type="subtitle" style={styles.headerTitle}>
                                Log Climb
                            </ThemedText>
                            <Pressable
                                onPress={handleSubmit}
                                disabled={!canSubmit}
                                style={[styles.headerBtn, { opacity: canSubmit ? 1 : 0.35 }]}
                            >
                                <ThemedText style={[styles.headerBtnText, { color: AppColors.primary }]}>
                                    Save
                                </ThemedText>
                            </Pressable>
                        </View>

                        <ScrollView
                            style={styles.body}
                            contentContainerStyle={styles.bodyContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            onScroll={(e) => setIsBodyAtTop(e.nativeEvent.contentOffset.y <= 0)}
                            scrollEventThrottle={16}
                        >
                            {/* Grade */}
                            <View style={styles.fieldGroup}>
                                <ThemedText style={styles.label}>Grade *</ThemedText>

                                {/* Wild toggle (Boulder Planet only) */}
                                {hasWild && (
                                    <View style={[styles.wildRow, { borderColor }]}>
                                        <View>
                                            <ThemedText style={styles.wildLabel}>Wild</ThemedText>
                                            <ThemedText style={styles.wildSub}>Ungraded / setter&apos;s choice</ThemedText>
                                        </View>
                                        <Switch
                                            value={isWild}
                                            onValueChange={setIsWild}
                                            trackColor={{ false: '#e5e7eb', true: AppColors.primary }}
                                        />
                                    </View>
                                )}

                                {/* Slider for numeric grades */}
                                {sliderGrades && (
                                    <View style={{ opacity: isWild ? 0.35 : 1 }} pointerEvents={isWild ? 'none' : 'auto'}>
                                        <GradeSlider
                                            grades={sliderGrades}
                                            value={grade || sliderGrades[0]}
                                            onChange={setGrade}
                                        />
                                    </View>
                                )}

                                {/* Free text for gyms with no grade system */}
                                {!allGrades && (
                                    <TextInput
                                        style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
                                        value={grade}
                                        onChangeText={setGrade}
                                        placeholder="e.g. V4, 6a+"
                                        placeholderTextColor={placeholderColor}
                                    />
                                )}
                            </View>

                        {/* Color */}
                        <View style={styles.fieldGroup}>
                            <ThemedText style={styles.label}>Color</ThemedText>
                            <View style={styles.chipRow}>
                                {CLIMB_COLORS.map((c) => {
                                    const selected = color === c;
                                    return (
                                        <Pressable
                                            key={c}
                                            onPress={() => setColor(selected ? '' : c)}
                                            style={[
                                                styles.chip,
                                                { borderColor },
                                                selected && styles.chipSelected,
                                            ]}
                                        >
                                            <View
                                                style={[
                                                    styles.colorDot,
                                                    { backgroundColor: c.toLowerCase() === 'white' ? '#e5e5e5' : c.toLowerCase() },
                                                ]}
                                            />
                                            <ThemedText
                                                style={[styles.chipText, selected && styles.chipTextSelected]}
                                            >
                                                {c}
                                            </ThemedText>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Wall */}
                        <View style={styles.fieldGroup}>
                            <ThemedText style={styles.label}>Wall</ThemedText>
                            {walls ? (
                                <View style={styles.chipRow}>
                                    {walls.map((w) => {
                                        const selected = wall === w;
                                        return (
                                            <Pressable
                                                key={w}
                                                onPress={() => setWall(selected ? '' : w)}
                                                style={[
                                                    styles.chip,
                                                    { borderColor },
                                                    selected && styles.chipSelected,
                                                ]}
                                            >
                                                <ThemedText
                                                    style={[styles.chipText, selected && styles.chipTextSelected]}
                                                >
                                                    {w}
                                                </ThemedText>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            ) : (
                                <TextInput
                                    style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
                                    value={wall}
                                    onChangeText={setWall}
                                    placeholder="e.g. Slab, Overhang, Cave"
                                    placeholderTextColor={placeholderColor}
                                />
                            )}
                        </View>

                        {/* Instagram Link */}
                        <View style={styles.fieldGroup}>
                            <ThemedText style={styles.label}>Instagram Video</ThemedText>
                            <TextInput
                                style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
                                value={instagramUrl}
                                onChangeText={setInstagramUrl}
                                placeholder="https://www.instagram.com/reel/..."
                                placeholderTextColor={placeholderColor}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="url"
                            />
                        </View>
                        </ScrollView>
                        </Reanimated.View>
                    </GestureDetector>
                </KeyboardAvoidingView>
            </GestureHandlerRootView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        maxHeight: '85%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingBottom: 32,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#666',
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerBtn: {
        minWidth: 56,
    },
    headerBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
    },
    body: {
        flexGrow: 0,
    },
    bodyContent: {
        paddingBottom: 16,
    },
    fieldGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    // Wild toggle
    wildRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 16,
    },
    wildLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    wildSub: {
        fontSize: 12,
        opacity: 0.5,
        marginTop: 1,
    },
    // Slider
    sliderContainer: {
        paddingTop: 4,
    },
    sliderValueRow: {
        alignItems: 'center',
        marginBottom: 20,
    },
    sliderValueText: {
        fontSize: 28,
        fontWeight: '700',
        color: AppColors.primary,
    },
    sliderOuter: {
        paddingHorizontal: THUMB_SIZE / 2,
        paddingVertical: 12,
    },
    sliderTrack: {
        height: 6,
        borderRadius: 3,
        position: 'relative',
        justifyContent: 'center',
    },
    sliderFilled: {
        position: 'absolute',
        left: 0,
        height: 6,
        borderRadius: 3,
        backgroundColor: AppColors.primary,
    },
    tick: {
        width: 2,
        height: 12,
        borderRadius: 1,
        position: 'absolute',
        top: -3,
    },
    sliderThumb: {
        position: 'absolute',
        left: -(THUMB_SIZE / 2),
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        backgroundColor: AppColors.primary,
        top: -(THUMB_SIZE / 2 - 3),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
    },
    sliderEndLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: THUMB_SIZE / 2,
        marginTop: 4,
    },
    sliderEndLabel: {
        fontSize: 12,
        opacity: 0.5,
    },
    // Chips
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    chipSelected: {
        backgroundColor: AppColors.primary,
        borderColor: AppColors.primary,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    chipTextSelected: {
        color: '#fff',
    },
    colorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.15)',
    },
    input: {
        height: 44,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 14,
        fontSize: 15,
    },
});

