import React from 'react';
import { StyleSheet, ScrollView, View, Switch, Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSettingsStore } from '@/stores';
import { CURRENT_USER } from '@/data';

function SettingToggle({ 
  title, 
  description, 
  value, 
  onValueChange 
}: { 
  title: string; 
  description: string; 
  value: boolean; 
  onValueChange: (value: boolean) => void;
}) {
  const cardBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');
  
  return (
    <View style={[styles.settingCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.settingInfo}>
        <ThemedText style={styles.settingTitle}>{title}</ThemedText>
        <ThemedText style={styles.settingDescription}>{description}</ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#767577', true: '#0a7ea4' }}
        thumbColor={value ? '#fff' : '#f4f3f4'}
      />
    </View>
  );
}

function SettingButton({ title, description, emoji, onPress }: { 
  title: string; 
  description: string; 
  emoji: string;
  onPress: () => void;
}) {
  const cardBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');
  
  return (
    <Pressable onPress={onPress}>
      <View style={[styles.settingCard, { backgroundColor: cardBg, borderColor }]}>
        <ThemedText style={styles.settingEmoji}>{emoji}</ThemedText>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingTitle}>{title}</ThemedText>
          <ThemedText style={styles.settingDescription}>{description}</ThemedText>
        </View>
        <ThemedText style={styles.chevron}>›</ThemedText>
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const settings = useSettingsStore((state) => state.settings);
  const setLocationEnabled = useSettingsStore((state) => state.setLocationEnabled);
  const setFriendVisibilityEnabled = useSettingsStore((state) => state.setFriendVisibilityEnabled);
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled);
  
  const bgColor = useThemeColor({}, 'background');
  
  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title">Settings</ThemedText>
        </View>
        
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: bgColor }]}>
          <View style={styles.profileAvatar}>
            <ThemedText style={styles.profileAvatarText}>
              {CURRENT_USER.displayName[0]}
            </ThemedText>
          </View>
          <View style={styles.profileInfo}>
            <ThemedText style={styles.profileName}>{CURRENT_USER.displayName}</ThemedText>
            <ThemedText style={styles.profileEmail}>{CURRENT_USER.email}</ThemedText>
          </View>
          <Pressable style={styles.editButton}>
            <ThemedText style={styles.editButtonText}>Edit</ThemedText>
          </Pressable>
        </View>
        
        {/* Location Settings */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionHeader}>LOCATION & PRIVACY</ThemedText>
          
          <SettingToggle
            title="Location Tracking"
            description="Automatically detect when you're at a climbing gym"
            value={settings.locationEnabled}
            onValueChange={setLocationEnabled}
          />
          
          <SettingToggle
            title="Show Me at Gym"
            description="Let friends see when you're climbing (only shows gym, not other locations)"
            value={settings.friendVisibilityEnabled}
            onValueChange={setFriendVisibilityEnabled}
          />
        </View>
        
        {/* Notification Settings */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionHeader}>NOTIFICATIONS</ThemedText>
          
          <SettingToggle
            title="Push Notifications"
            description="Get notified when friends arrive at gyms or invite you"
            value={settings.notificationsEnabled}
            onValueChange={setNotificationsEnabled}
          />
        </View>
        
        {/* Account Settings */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionHeader}>ACCOUNT</ThemedText>
          
          <SettingButton
            title="Export Data"
            description="Download all your climbing data"
            emoji="📊"
            onPress={() => {}}
          />
          
          <SettingButton
            title="Privacy Policy"
            description="Read our privacy policy"
            emoji="🔒"
            onPress={() => {}}
          />
          
          <SettingButton
            title="Help & Support"
            description="Get help or report issues"
            emoji="❓"
            onPress={() => {}}
          />
        </View>
        
        {/* Danger Zone */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionHeader}>DANGER ZONE</ThemedText>
          
          <Pressable style={styles.dangerButton}>
            <ThemedText style={styles.dangerButtonText}>Log Out</ThemedText>
          </Pressable>
          
          <Pressable style={[styles.dangerButton, styles.deleteButton]}>
            <ThemedText style={styles.deleteButtonText}>Delete Account</ThemedText>
          </Pressable>
        </View>
        
        {/* App Version */}
        <View style={styles.versionContainer}>
          <ThemedText style={styles.versionText}>ClimbFriend v1.0.0</ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  profileAvatarText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    opacity: 0.6,
  },
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.5,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  settingEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    opacity: 0.6,
  },
  chevron: {
    fontSize: 24,
    opacity: 0.4,
  },
  dangerButton: {
    backgroundColor: '#f3f4f6',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#dc2626',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 12,
    opacity: 0.4,
  },
});
