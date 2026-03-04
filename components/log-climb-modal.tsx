import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Pressable,
    Modal,
    TextInput,
    ScrollView,
    Animated,
    PanResponder,
    KeyboardAvoidingView,
    Platform,
    Switch,
} from 'react-native';

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
// GradeSlider – horizontal discrete step slider
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
    const thumbX = useRef(new Animated.Value(0)).current;
    const startX = useRef(0);
    const isDragging = useRef(false);

    // Keep refs in sync so the stable panResponder closure always reads latest values
    const trackWidthRef = useRef(trackWidth);
    trackWidthRef.current = trackWidth;
    const gradesRef = useRef(grades);
    gradesRef.current = grades;
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const valueRef = useRef(value);
    valueRef.current = value;

    const indexOfValue = useMemo(() => {
        const i = grades.indexOf(value);
        return i >= 0 ? i : 0;
    }, [grades, value]);

    // Thumb center position for a given step index (0 → trackWidth)
    const xForIndex = useCallback(
        (i: number, tw?: number) => {
            const w = tw ?? trackWidthRef.current;
            const len = gradesRef.current.length;
            if (len <= 1 || w === 0) return 0;
            return (i / (len - 1)) * w;
        },
        [],
    );

    // Sync thumb position when value or trackWidth changes (skip during drag)
    useEffect(() => {
        if (trackWidth > 0 && !isDragging.current) {
            Animated.spring(thumbX, {
                toValue: xForIndex(indexOfValue, trackWidth),
                useNativeDriver: false,
                overshootClamping: true,
            }).start();
        }
    }, [indexOfValue, trackWidth, xForIndex, thumbX]);

    const snapToNearest = useCallback(
        (rawX: number) => {
            const tw = trackWidthRef.current;
            const g = gradesRef.current;
            if (tw === 0) return;
            const clamped = Math.max(0, Math.min(tw, rawX));
            const step = tw / (g.length - 1);
            const idx = Math.max(0, Math.min(g.length - 1, Math.round(clamped / step)));
            onChangeRef.current(g[idx]);
            Animated.spring(thumbX, {
                toValue: xForIndex(idx, tw),
                useNativeDriver: false,
                overshootClamping: true,
            }).start();
        },
        [thumbX, xForIndex],
    );

    // Stable panResponder — never recreated during drag
    // Attached to the outer track wrapper so dragging anywhere on the track works
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (e) => {
                isDragging.current = true;
                // Jump thumb to touch location immediately
                const touchX = e.nativeEvent.locationX - THUMB_SIZE / 2; // offset for outer padding
                const tw = trackWidthRef.current;
                const clamped = Math.max(0, Math.min(tw, touchX));
                startX.current = clamped;
                thumbX.setValue(clamped);
                const g = gradesRef.current;
                const step = tw / (g.length - 1);
                const idx = Math.max(0, Math.min(g.length - 1, Math.round(clamped / step)));
                onChangeRef.current(g[idx]);
            },
            onPanResponderMove: (_, gs) => {
                const tw = trackWidthRef.current;
                const g = gradesRef.current;
                const rawX = Math.max(0, Math.min(tw, startX.current + gs.dx));
                thumbX.setValue(rawX);
                const step = tw / (g.length - 1);
                const idx = Math.max(0, Math.min(g.length - 1, Math.round(rawX / step)));
                onChangeRef.current(g[idx]);
            },
            onPanResponderRelease: (_, gs) => {
                isDragging.current = false;
                const tw = trackWidthRef.current;
                const g = gradesRef.current;
                const rawX = Math.max(0, Math.min(tw, startX.current + gs.dx));
                const step = tw / (g.length - 1);
                const idx = Math.max(0, Math.min(g.length - 1, Math.round(rawX / step)));
                onChangeRef.current(g[idx]);
                Animated.spring(thumbX, {
                    toValue: xForIndex(idx, tw),
                    useNativeDriver: false,
                    overshootClamping: true,
                }).start();
            },
        }),
    ).current;

    const filledWidth = thumbX.interpolate({
        inputRange: [0, Math.max(1, trackWidth)],
        outputRange: [0, trackWidth],
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.sliderContainer}>
            {/* Current grade label */}
            <View style={styles.sliderValueRow}>
                <ThemedText style={styles.sliderValueText}>{value || grades[0]}</ThemedText>
            </View>

            {/* Outer wrapper — pan responder on entire track area for drag anywhere */}
            <View
                style={styles.sliderOuter}
                {...panResponder.panHandlers}
            >
                {/* Track */}
                <View
                    pointerEvents="none"
                    style={[styles.sliderTrack, { backgroundColor: trackBg }]}
                    onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
                >
                    {/* Filled portion */}
                    <Animated.View style={[styles.sliderFilled, { width: filledWidth }]} />

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
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.sliderThumb,
                            { transform: [{ translateX: thumbX }] },
                        ]}
                    />
                </View>
            </View>

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

    const translateY = useRef(new Animated.Value(800)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

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
            translateY.setValue(800);
            backdropOpacity.setValue(0);
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    overshootClamping: true,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, sliderGrades, translateY, backdropOpacity]);

    const dismissModal = useCallback(() => {
        Animated.parallel([
            Animated.spring(translateY, {
                toValue: 800,
                overshootClamping: true,
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onCloseRef.current();
        });
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
                        dismissModal();
                    } else {
                        Animated.spring(translateY, {
                            toValue: 0,
                            useNativeDriver: true,
                        }).start();
                    }
                },
            }),
        [translateY, dismissModal],
    );

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
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={dismissModal} />
                </Animated.View>

                <Animated.View
                    style={[styles.sheet, { backgroundColor: modalBg, transform: [{ translateY }] }]}
                >
                    <View {...panResponder.panHandlers}>
                        <View style={styles.handle} />
                    </View>

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
                    >
                        {/* Grade */}
                        <View style={styles.fieldGroup}>
                            <ThemedText style={styles.label}>Grade *</ThemedText>

                            {/* Wild toggle (Boulder Planet only) */}
                            {hasWild && (
                                <View style={[styles.wildRow, { borderColor }]}>
                                    <View>
                                        <ThemedText style={styles.wildLabel}>Wild</ThemedText>
                                        <ThemedText style={styles.wildSub}>Ungraded / setter's choice</ThemedText>
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
                </Animated.View>
            </KeyboardAvoidingView>
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
