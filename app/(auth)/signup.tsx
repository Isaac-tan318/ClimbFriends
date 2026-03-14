import { AppColors, Colors } from '@/constants/theme';
import { useAuthStore } from '@/stores';
import { Link, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const TIMING_CONFIG = { duration: 300, easing: Easing.out(Easing.cubic) };

export default function SignupScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
  const inputBg = isDark ? AppColors.input.dark : AppColors.input.light;
  const borderColor = isDark ? AppColors.border.dark : AppColors.border.light;
  const placeholderColor = isDark ? '#6b7280' : '#9ca3af';

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const signUp = useAuthStore((state) => state.signUp);
  const authLoading = useAuthStore((state) => state.loading);
  const authInitialized = useAuthStore((state) => state.initialized);
  const authUser = useAuthStore((state) => state.user);
  const router = useRouter();

  const canSubmit =
    displayName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    password === confirmPassword;

  const translateY = useSharedValue(0);
  const mascotScale = useSharedValue(1);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const shift = Platform.OS === 'ios' ? e.endCoordinates.height * 0.4 : 50;
      translateY.value = withTiming(-shift, TIMING_CONFIG);
      mascotScale.value = withTiming(0.5, TIMING_CONFIG);
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

  const handleSignup = async () => {
    const result = await signUp(email.trim(), password, displayName.trim());
    if (!result.ok) {
      Alert.alert('Sign up failed', result.error.message);
      return;
    }

    if (result.data.requiresEmailConfirmation) {
      Alert.alert(
        'Check your email',
        'Your account was created. Confirm your email first, then log in.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
      );
      return;
    }

  };

  if (!authInitialized || authUser) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={AppColors.primary} />
      </View>
    );
  }

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
            <Text style={[styles.appName, { color: colors.text }]}>Create Account</Text>
            <Text style={[styles.tagline, { color: isDark ? '#888' : '#666' }]}>
              Join the climbing community
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor }]}
              placeholder="Display name"
              placeholderTextColor={placeholderColor}
              value={displayName}
              onChangeText={setDisplayName}
              autoCorrect={false}
              textContentType="name"
            />
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
              textContentType="newPassword"
            />
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor }]}
              placeholder="Confirm password"
              placeholderTextColor={placeholderColor}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              textContentType="newPassword"
            />

            {password.length > 0 && password.length < 6 && (
              <Text style={styles.hintText}>Password must be at least 6 characters</Text>
            )}
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <Text style={styles.hintText}>Passwords do not match</Text>
            )}

            <Pressable
              style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
              disabled={!canSubmit || authLoading}
              onPress={() => void handleSignup()}
            >
              {authLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign Up</Text>
              )}
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: isDark ? '#888' : '#666' }]}>
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={[styles.footerLink, { color: AppColors.primary }]}>Log in</Text>
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
    marginBottom: 32,
  },
  mascot: {
    fontSize: 80,
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
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
  hintText: {
    fontSize: 13,
    color: AppColors.danger,
    paddingHorizontal: 4,
    marginTop: -6,
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
