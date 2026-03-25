import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { format } from 'date-fns';
import React from 'react';
import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';

import { AppColors } from '@/constants/theme';
import { getGymById } from '@/data';
import { useThemeColor } from '@/hooks/use-theme-color';
import { PlannedVisit } from '@/types';

import { ThemedText } from '../themed-text';

function UpcomingPlanCard({
  gymName,
  date,
  inviteeCount,
}: {
  gymName: string;
  date: Date;
  inviteeCount: number;
}) {
  const cardBg = useThemeColor({ light: '#f9fafb', dark: '#1a1a1a' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e5e5', dark: '#333' }, 'background');

  return (
    <View style={[styles.planCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.planInfo}>
        <ThemedText style={styles.planGym}>{gymName}</ThemedText>
        <ThemedText style={styles.planDate}>
          {format(date, 'EEE, MMM d')} at {format(date, 'h:mm a')}
        </ThemedText>
      </View>
      {inviteeCount > 0 && (
        <ThemedText style={styles.inviteeCount}>
          {inviteeCount} {inviteeCount === 1 ? 'friend' : 'friends'}
        </ThemedText>
      )}
    </View>
  );
}

function InviteBoxes({
  onInviteNow,
  onMakePlan,
}: {
  onInviteNow: () => void;
  onMakePlan: () => void;
}) {
  const scheme = useColorScheme();
  const surfaceBg =
    scheme === 'dark' ? AppColors.surfaceContainer.dark : AppColors.surfaceContainer.light;

  return (
    <View style={styles.inviteButtonsRow}>
      <Pressable style={[styles.inviteBox, { backgroundColor: surfaceBg }]} onPress={onInviteNow}>
        <MaterialIcons name="bolt" size={32} color={AppColors.primary} />
        <ThemedText style={styles.inviteBoxText}>Invite Now</ThemedText>
      </Pressable>
      <Pressable style={[styles.inviteBox, { backgroundColor: surfaceBg }]} onPress={onMakePlan}>
        <MaterialIcons name="event" size={32} color={AppColors.primary} />
        <ThemedText style={styles.inviteBoxText}>Make a Plan</ThemedText>
      </Pressable>
    </View>
  );
}

export function InvitePlansSection({
  upcomingPlans,
  onInviteNow,
  onMakePlan,
}: {
  upcomingPlans: PlannedVisit[];
  onInviteNow: () => void;
  onMakePlan: () => void;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Invite Friends to Climb
      </ThemedText>
      <InviteBoxes onInviteNow={onInviteNow} onMakePlan={onMakePlan} />

      {upcomingPlans.length > 0 && (
        <View style={styles.upcomingPlansContainer}>
          <ThemedText style={styles.upcomingPlansLabel}>Upcoming Plans</ThemedText>
          {upcomingPlans.map((plan) => {
            const gym = getGymById(plan.gymId);
            return (
              <UpcomingPlanCard
                key={plan.id}
                gymName={gym?.name || 'Unknown Gym'}
                date={plan.plannedDate}
                inviteeCount={plan.invitees.length}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 14,
  },
  inviteButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inviteBox: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 112,
    gap: 10,
  },
  inviteBoxText: {
    fontSize: 15,
    fontWeight: '700',
  },
  upcomingPlansContainer: {
    marginTop: 16,
    gap: 10,
  },
  upcomingPlansLabel: {
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.75,
  },
  planCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  planInfo: {
    flex: 1,
  },
  planGym: {
    fontSize: 15,
    fontWeight: '700',
  },
  planDate: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 4,
  },
  inviteeCount: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.primary,
  },
});
