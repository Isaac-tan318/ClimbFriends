import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Platform,
  Alert,
  Keyboard,
  useColorScheme,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Link, useRouter } from 'expo-router';
import { AppColors, Colors } from '@/constants/theme';
import { useAuthStore } from '@/stores';

const TIMING_CONFIG = { duration: 300, easing: Easing.out(Easing.cubic) };

export default function LoginScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
  const inputBg = isDark ? AppColors.input.dark : AppColors.input.light;
  const borderColor = isDark ? AppColors.border.dark : AppColors.border.light;
  const placeholderColor = isDark ? '#6b7280' : '#9ca3af';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const signIn = useAuthStore((state) => state.signIn);
  const authLoading = useAuthStore((state) => state.loading);

  const canSubmit = email.trim().length > 0 && password.length >= 6;
  const router = useRouter();

  const translateY = useSharedValue(0);
  const mascotScale = useSharedValue(1);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const shift = Platform.OS === 'ios' ? e.endCoordinates.height * 0.35 : 40;
      translateY.value = withTiming(-shift, TIMING_CONFIG);
      mascotScale.value = withTiming(0.6, TIMING_CONFIG);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      translateY.value = withTiming(0, TIMING_CONFIG);
      mascotScale.value = withTiming(1, TIMING_CONFIG);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [translateY, mascotScale]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const mascotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mascotScale.value }],
  }));

  const handleLogin = async () => {
    const result = await signIn(email.trim(), password);
    if (!result.ok) {
      Alert.alert('Login failed', result.error.message);
      return;
    }

    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.inner, containerAnimatedStyle]}>
          {/* Mascot + Branding */}
          <View style={styles.brandSection}>
            <Animated.View style={mascotAnimatedStyle}>
              <Text style={styles.mascot}>🪨</Text>
            </Animated.View>
            <Text style={[styles.appName, { color: colors.text }]}>ClimbFriends</Text>
            <Text style={[styles.tagline, { color: isDark ? '#888' : '#666' }]}>
              Track climbs. Find friends. Send harder.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor }]}
              placeholder="Email"
              placeholderTextColor={placeholderColor}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor }]}
              placeholder="Password"
              placeholderTextColor={placeholderColor}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
            />

            <Pressable
              style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
              disabled={!canSubmit || authLoading}
              onPress={() => void handleLogin()}
            >
              <Text style={styles.primaryButtonText}>{authLoading ? 'Logging In...' : 'Log In'}</Text>
            </Pressable>

            <Pressable style={styles.forgotButton}>
              <Text style={[styles.forgotText, { color: AppColors.primary }]}>Forgot password?</Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: isDark ? '#888' : '#666' }]}>
              Don&apos;t have an account?{' '}
            </Text>
            <Link href="/(auth)/signup" asChild>
              <Pressable>
                <Text style={[styles.footerLink, { color: AppColors.primary }]}>Sign up</Text>
              </Pressable>
            </Link>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mascot: {
    fontSize: 80,
    marginBottom: 12,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    marginTop: 6,
  },
  form: {
    gap: 14,
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  primaryButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  forgotButton: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 15,
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '700',
  },
});
