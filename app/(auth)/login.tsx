import { AppColors, Colors } from '@/constants/theme';
import { useAuthStore } from '@/stores';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link } from 'expo-router';
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
const LAST_LOGIN_EMAIL_KEY = 'auth:last-login-email';

type LoginFormProps = {
  authLoading: boolean;
  borderColor: string;
  colors: { text: string };
  initialEmail: string;
  inputBg: string;
  onLogin: (email: string, password: string) => Promise<void>;
  placeholderColor: string;
};

const LoginForm = React.memo(function LoginForm({
  authLoading,
  borderColor,
  colors,
  initialEmail,
  inputBg,
  onLogin,
  placeholderColor,
}: LoginFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const canSubmit = email.trim().length > 0 && password.length >= 6;

  useEffect(() => {
    if (initialEmail && email.trim().length === 0) {
      setEmail(initialEmail);
    }
  }, [email, initialEmail]);

  return (
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
        onChangeText={setPassword}
        secureTextEntry
        textContentType="password"
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
      />

      <Pressable
        style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
        disabled={!canSubmit || authLoading}
        onPress={() => void onLogin(email, password)}
      >
        {authLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Log In</Text>
        )}
      </Pressable>

      <Pressable style={styles.forgotButton}>
        <Text style={[styles.forgotText, { color: AppColors.primary }]}>Forgot password?</Text>
      </Pressable>
    </View>
  );
});

export default function LoginScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
  const inputBg = isDark ? AppColors.input.dark : AppColors.input.light;
  const borderColor = isDark ? AppColors.border.dark : AppColors.border.light;
  const placeholderColor = isDark ? '#6b7280' : '#9ca3af';

  const [storedEmail, setStoredEmail] = useState('');
  const signIn = useAuthStore((state) => state.signIn);
  const authLoading = useAuthStore((state) => state.loading);

  const translateY = useSharedValue(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const keyboardHeight = e.endCoordinates.height;
      const shift = Math.max(
        keyboardHeight * (Platform.OS === 'ios' ? 0.48 : 0.38),
        120,
      );
      translateY.value = withTiming(-shift, TIMING_CONFIG);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      translateY.value = withTiming(0, TIMING_CONFIG);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [translateY]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    let mounted = true;

    const loadStoredEmail = async () => {
      const storedEmail = await AsyncStorage.getItem(LAST_LOGIN_EMAIL_KEY);
      if (mounted && storedEmail) {
        setStoredEmail(storedEmail);
      }
    };

    void loadStoredEmail();

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const result = await signIn(email.trim(), password);
    if (!result.ok) {
      Alert.alert('Login failed', result.error.message);
      return;
    }

    await AsyncStorage.setItem(LAST_LOGIN_EMAIL_KEY, email.trim());
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
            <Text style={styles.mascot}>🪨</Text>
            <Text style={[styles.appName, { color: colors.text }]}>ClimbFriends</Text>
            <Text style={[styles.tagline, { color: isDark ? '#888' : '#666' }]}>
              Track climbs. Find friends. Send harder, Together.
            </Text>
          </View>

          <LoginForm
            authLoading={authLoading}
            borderColor={borderColor}
            colors={colors}
            initialEmail={storedEmail}
            inputBg={inputBg}
            onLogin={handleLogin}
            placeholderColor={placeholderColor}
          />

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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
