import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Pressable, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { SINGAPORE_GYMS } from '@/data';
import { Gym } from '@/types';

function GymCard({ gym, onPress }: { gym: Gym; onPress: () => void }) {
  const cardBg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');
  const brandColors: Record<string, string> = {
    'Boulder+': '#f97316',
    'Boulder Planet': '#8b5cf6',
    'Climb Central': '#3b82f6',
    'BFF Climb': '#ec4899',
    'FitBloc': '#10b981',
    'Lighthouse': '#f59e0b',
    'Outpost': '#6366f1',
    'Climba': '#14b8a6',
    'Oyeyo': '#ef4444',
    'Z-Vertigo': '#8b5cf6',
  };
  
  const brandColor = brandColors[gym.brand] || '#6b7280';
  
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

export default function GymsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  
  const inputBg = useThemeColor({ light: '#f5f5f5', dark: '#262626' }, 'background');
  const textColor = useThemeColor({}, 'text');
  
  const brands = [...new Set(SINGAPORE_GYMS.map((g) => g.brand))];
  
  const filteredGyms = SINGAPORE_GYMS.filter((gym) => {
    const matchesSearch = gym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gym.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gym.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBrand = !selectedBrand || gym.brand === selectedBrand;
    return matchesSearch && matchesBrand;
  });
  
  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title">Gyms</ThemedText>
          <ThemedText style={styles.subtitle}>
            {SINGAPORE_GYMS.length} climbing gyms in Singapore
          </ThemedText>
        </View>
        
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
            style={[
              styles.filterChip,
              !selectedBrand && styles.filterChipActive,
            ]}
            onPress={() => setSelectedBrand(null)}
          >
            <ThemedText style={[
              styles.filterChipText,
              !selectedBrand && styles.filterChipTextActive,
            ]}>All</ThemedText>
          </Pressable>
          {brands.map((brand) => (
            <Pressable
              key={brand}
              style={[
                styles.filterChip,
                selectedBrand === brand && styles.filterChipActive,
              ]}
              onPress={() => setSelectedBrand(selectedBrand === brand ? null : brand)}
            >
              <ThemedText style={[
                styles.filterChipText,
                selectedBrand === brand && styles.filterChipTextActive,
              ]}>{brand}</ThemedText>
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
                // TODO: Navigate to gym detail
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
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 4,
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
    backgroundColor: '#0a7ea4',
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
