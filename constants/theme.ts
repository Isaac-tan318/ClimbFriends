/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

/**
 * App brand colors derived from current design usage:
 * - Primary (teal): Main CTAs — Log Climb, Start Climbing, tint
 * - Secondary (green): Live/active states — Live Session, New Session, Invite Now, online dots
 * - Tertiary (indigo): Social features — Make a Plan, Send, selected chips, checkmarks
 */
export const AppColors = {
  primary:  '#6366f1',
  primaryLight: '#e0f2fe',
  secondary: '#22c55e',
  secondaryLight: '#dcfce7',
  tertiary: '#4f46e5',
  tertiaryLight: '#e0e7ff',
  danger: '#dc2626',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  warningDark: '#92400e',
  surface: {
    light: '#f9fafb',
    dark: '#1a1a1a',
  },
  border: {
    light: '#e5e5e5',
    dark: '#333333',
  },
  input: {
    light: '#f3f4f6',
    dark: '#2a2a2a',
  },
  banner: '#1c1c1e',
  avatarFallbackBg: '#e0e7ff',
  avatarFallbackText: '#4338ca',
  textMuted: {
    light: '#374151',
    dark: '#e5e7eb',
  },
};

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
