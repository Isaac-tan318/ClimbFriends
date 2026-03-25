import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ActiveFriendsSection } from '@/components/social/active-friends-section';
import { FriendPickerModal } from '@/components/social/friend-picker-modal';
import { FriendsListModal } from '@/components/social/friends-list-modal';
import { InvitePlansSection } from '@/components/social/invite-plans-section';
import { AppHeaderBanner } from '@/components/app-header-banner';
import { GymPickerModal } from '@/components/shared/gym-picker-modal';
import { ThemedView } from '@/components/themed-view';
import { CURRENT_USER, getGymById } from '@/data';
import { useAuthStore, useSocialStore } from '@/stores';

function combineDateAndTime(date: Date, timeLabel: string) {
  const [time, meridiem] = timeLabel.split(' ');
  const [rawHours, minutes] = time.split(':').map(Number);
  let hours = rawHours;

  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export default function SocialScreen() {
  const authUser = useAuthStore((state) => state.user);
  const friends = useSocialStore((state) => state.friends);
  const plannedVisits = useSocialStore((state) => state.plannedVisits);
  const createPlannedVisit = useSocialStore((state) => state.createPlannedVisit);
  const inviteFriend = useSocialStore((state) => state.inviteFriend);

  const [gymPickerVisible, setGymPickerVisible] = useState(false);
  const [friendPickerVisible, setFriendPickerVisible] = useState(false);
  const [inviteFlow, setInviteFlow] = useState<'none' | 'invite-now' | 'make-plan'>('none');
  const [inviteGymId, setInviteGymId] = useState<string | null>(null);
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);

  const currentUser = authUser ?? CURRENT_USER;
  const friendsAtGym = useMemo(
    () => friends.filter((friend) => friend.isAtGym),
    [friends],
  );
  const upcomingPlans = useMemo(() => {
    const now = new Date();
    return plannedVisits
      .filter((plan) => plan.plannedDate > now)
      .sort((a, b) => a.plannedDate.getTime() - b.plannedDate.getTime())
      .slice(0, 3);
  }, [plannedVisits]);

  const handleInviteNow = useCallback(() => {
    setInviteFlow('invite-now');
    setGymPickerVisible(true);
  }, []);

  const handleMakePlan = useCallback(() => {
    setInviteFlow('make-plan');
    setGymPickerVisible(true);
  }, []);

  const handleGymSelect = useCallback((gymId: string) => {
    setInviteGymId(gymId);
    setGymPickerVisible(false);
    setFriendPickerVisible(true);
  }, []);

  const resetInviteFlow = useCallback(() => {
    setGymPickerVisible(false);
    setFriendPickerVisible(false);
    setInviteGymId(null);
    setInviteFlow('none');
    setSubmittingInvite(false);
  }, []);

  const handleInviteSubmit = useCallback(
    async ({
      selectedFriendIds,
      message,
      planDate,
      planTime,
    }: {
      selectedFriendIds: string[];
      message: string;
      planDate: Date | null;
      planTime: string | null;
    }) => {
      if (!inviteGymId || inviteFlow === 'none') return false;

      const plannedDate =
        inviteFlow === 'make-plan'
          ? planDate && planTime
            ? combineDateAndTime(planDate, planTime)
            : null
          : new Date();

      if (!plannedDate) {
        Alert.alert('Select a time', 'Choose a date and time for your climb plan.');
        return false;
      }

      setSubmittingInvite(true);

      const createResult = await createPlannedVisit(
        inviteGymId,
        plannedDate,
        message.trim() ? message.trim() : undefined,
      );

      if (!createResult.ok) {
        setSubmittingInvite(false);
        Alert.alert('Unable to create plan', createResult.error.message);
        return false;
      }

      const failedInvites: string[] = [];
      for (const friendId of selectedFriendIds) {
        const inviteResult = await inviteFriend(createResult.data.id, friendId);
        if (!inviteResult.ok) failedInvites.push(friendId);
      }

      setSubmittingInvite(false);

      if (failedInvites.length > 0) {
        Alert.alert(
          'Plan created with errors',
          'Your plan was saved, but some invites could not be sent.',
        );
      } else if (inviteFlow === 'invite-now') {
        Alert.alert('Invite sent', 'Your friends have been invited to climb.');
      } else {
        Alert.alert('Plan created', 'Your climb plan is now in Social.');
      }

      resetInviteFlow();
      return true;
    },
    [createPlannedVisit, inviteFriend, inviteFlow, inviteGymId, resetInviteFlow],
  );

  const inviteGymName = inviteGymId ? getGymById(inviteGymId)?.name || 'the gym' : 'the gym';
  const inviteDefaultMessage =
    inviteFlow === 'invite-now'
      ? `Come climb with me at ${inviteGymName} right now!`
      : `Come climb with me at ${inviteGymName}`;

  return (
    <ThemedView style={styles.container}>
      <AppHeaderBanner
        title="Social"
        rightContent={
          <Pressable
            onPress={() => setFriendsModalVisible(true)}
            style={styles.headerIconButton}
            accessibilityLabel="Open friends list"
          >
            <MaterialIcons name="groups" size={24} color="#fff" />
          </Pressable>
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <ActiveFriendsSection user={currentUser} friendsAtGym={friendsAtGym} />
        <InvitePlansSection
          upcomingPlans={upcomingPlans}
          onInviteNow={handleInviteNow}
          onMakePlan={handleMakePlan}
        />
      </ScrollView>

      <GymPickerModal
        visible={gymPickerVisible}
        onClose={resetInviteFlow}
        onSelect={handleGymSelect}
      />

      <FriendPickerModal
        visible={friendPickerVisible}
        onClose={resetInviteFlow}
        friends={friends}
        defaultMessage={inviteDefaultMessage}
        mode={inviteFlow === 'none' ? 'invite-now' : inviteFlow}
        submitting={submittingInvite}
        onSubmit={handleInviteSubmit}
      />

      <FriendsListModal
        visible={friendsModalVisible}
        onClose={() => setFriendsModalVisible(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
});
