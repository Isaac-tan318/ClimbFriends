import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AppHeaderBanner } from '@/components/app-header-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSocialStore } from '@/stores';
import { SINGAPORE_GYMS } from '@/data';
import { Gym, Friend } from '@/types';
import { AppColors } from '@/constants/theme';
import { GymMapTab } from '@/components/gym-map-tab';
import { GymDrawer, BRAND_COLORS } from '@/components/gym-drawer';

// ─── Gym Card ─────────────────────────────────────────────────────────────────

function GymCard({ gym, onPress }: { gym: Gym; onPress: () => void }) {
  const cardBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');
  const brandColor = BRAND_COLORS[gym.brand] ?? '#6b7280';

  return (
    <Pressable onPress={onPress}>
      <View style={[styles.gymCard, { backgroundColor: cardBg, borderColor }]}>
        <View style={[styles.brandTag, { backgroundColor: brandColor }]}>
          <ThemedText style={styles.brandTagText}>{gym.brand}</ThemedText>
        </View>
        <ThemedText style={styles.gymName}>{gym.name}</ThemedText>
        <ThemedText style={styles.gymAddress}>{gym.address}</ThemedText>
        <View style={styles.gymFooter}>
          <View style={styles.distanceBadge}>
            <ThemedText style={styles.distanceText}>📍 {(Math.random() * 10 + 1).toFixed(1)} km</ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Gyms Tab ─────────────────────────────────────────────────────────────────

function GymsTab({ friends }: { friends: Friend[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const inputBg = useThemeColor({ light: '#f5f5f5', dark: '#262626' }, 'background');
  const textColor = useThemeColor({}, 'text');

  const brands = [...new Set(SINGAPORE_GYMS.map((g) => g.brand))];

  const filteredGyms = SINGAPORE_GYMS.filter((gym) => {
    const matchesSearch =
      gym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gym.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gym.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBrand = !selectedBrand || gym.brand === selectedBrand;
    return matchesSearch && matchesBrand;
  });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: inputBg }]}>
          <ThemedText style={styles.searchIcon}>🔍</ThemedText>
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Search gyms..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Brand Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          <Pressable
            style={[styles.filterChip, !selectedBrand && styles.filterChipActive]}
            onPress={() => setSelectedBrand(null)}
          >
            <ThemedText style={[styles.filterChipText, !selectedBrand && styles.filterChipTextActive]}>
              All
            </ThemedText>
          </Pressable>
          {brands.map((brand) => (
            <Pressable
              key={brand}
              style={[styles.filterChip, selectedBrand === brand && styles.filterChipActive]}
              onPress={() => setSelectedBrand(selectedBrand === brand ? null : brand)}
            >
              <ThemedText style={[styles.filterChipText, selectedBrand === brand && styles.filterChipTextActive]}>
                {brand}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {/* Gym List */}
        <View style={styles.gymList}>
          {filteredGyms.map((gym) => (
            <GymCard
              key={gym.id}
              gym={gym}
              onPress={() => {
                setSelectedGym(gym);
                setDrawerVisible(true);
              }}
            />
          ))}
        </View>

        {filteredGyms.length === 0 && (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyEmoji}>🔍</ThemedText>
            <ThemedText style={styles.emptyText}>No gyms found</ThemedText>
          </View>
        )}
      </ScrollView>

      <GymDrawer
        gym={selectedGym}
        friends={friends}
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GymsScreen() {
  const [activeTab, setActiveTab] = useState<'map' | 'gyms'>('map');
  const friends = useSocialStore((state) => state.friends);
  const tabBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#2a2a2a' }, 'background');

  return (
    <ThemedView style={styles.container}>
      <AppHeaderBanner title="Gyms" />

      {/* Top Tabs */}
      <View style={[styles.topTabs, { backgroundColor: tabBg, borderBottomColor: borderColor }]}>
        {(['map', 'gyms'] as const).map((tab) => (
          <Pressable key={tab} style={styles.topTab} onPress={() => setActiveTab(tab)}>
            <ThemedText style={[styles.topTabText, activeTab === tab && styles.topTabTextActive]}>
              {tab === 'map' ? 'Map' : 'Gyms'}
            </ThemedText>
            {activeTab === tab && <View style={styles.topTabIndicator} />}
          </Pressable>
        ))}
      </View>

      {activeTab === 'map' ? <GymMapTab friends={friends} /> : <GymsTab friends={friends} />}
    </ThemedView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* Top tabs */
  topTabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  topTabText: {
    fontSize: 15,
    fontWeight: '500',
    opacity: 0.45,
  },
  topTabTextActive: {
    opacity: 1,
    fontWeight: '700',
    color: AppColors.primary,
  },
  topTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2.5,
    borderRadius: 2,
    backgroundColor: AppColors.primary,
  },

  /* Gyms list tab */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filterScroll: {
    marginBottom: 16,
    marginHorizontal: -20,
  },
  filterContainer: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  filterChipActive: {
    backgroundColor: AppColors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: 'white',
  },
  gymList: {
    gap: 12,
  },
  gymCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  brandTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  brandTagText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  gymName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  gymAddress: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 12,
  },
  gymFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 13,
    opacity: 0.7,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
  },
});
