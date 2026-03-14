import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { CURRENT_USER, SINGAPORE_GYMS } from '@/data';
import { hasSupabaseConfig } from '@/lib/supabase';
import { leaderboardService } from '@/services/leaderboard/leaderboard-service';
import { useAuthStore } from '@/stores';
import type { LeaderboardEntry } from '@/types';

export type RankingCategory = 'friends' | 'gym' | 'national';

type LoadingByCategory = Record<RankingCategory, boolean>;
type ErrorByCategory = Record<RankingCategory, string | null>;

const EMPTY_LOADING_STATE: LoadingByCategory = {
  friends: false,
  gym: false,
  national: false,
};

const EMPTY_ERROR_STATE: ErrorByCategory = {
  friends: null,
  gym: null,
  national: null,
};

type FetchCategoryOptions = {
  force?: boolean;
};

export function useRankings(initialGymId?: string) {
  const authUser = useAuthStore((state) => state.user);
  const useMockAuthUser = !hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseAuth;
  const viewerUserId = authUser?.id ?? (useMockAuthUser ? CURRENT_USER.id : null);

  const [category, setCategory] = useState<RankingCategory>('friends');
  const [selectedGymId, setSelectedGymId] = useState<string>(initialGymId ?? SINGAPORE_GYMS[0]?.id ?? '');
  const [friendsEntries, setFriendsEntries] = useState<LeaderboardEntry[]>([]);
  const [nationalEntries, setNationalEntries] = useState<LeaderboardEntry[]>([]);
  const [gymEntriesByGymId, setGymEntriesByGymId] = useState<Record<string, LeaderboardEntry[]>>({});
  const [loadingByCategory, setLoadingByCategory] = useState<LoadingByCategory>(EMPTY_LOADING_STATE);
  const [errorByCategory, setErrorByCategory] = useState<ErrorByCategory>(EMPTY_ERROR_STATE);

  const selectedGymRef = useRef(selectedGymId);
  const latestGymRequestIdRef = useRef(0);

  useEffect(() => {
    selectedGymRef.current = selectedGymId;
  }, [selectedGymId]);

  useEffect(() => {
    if (!selectedGymId) {
      setSelectedGymId(initialGymId ?? SINGAPORE_GYMS[0]?.id ?? '');
    }
  }, [initialGymId, selectedGymId]);

  const fetchFriendsEntries = useCallback(async () => {
    setLoadingByCategory((prev) => ({ ...prev, friends: true }));
    setErrorByCategory((prev) => ({ ...prev, friends: null }));

    if (!viewerUserId) {
      setFriendsEntries([]);
      setLoadingByCategory((prev) => ({ ...prev, friends: false }));
      return;
    }

    const result = await leaderboardService.getFriendsLeaderboard(viewerUserId);

    if (result.ok) {
      setFriendsEntries(result.data);
      setErrorByCategory((prev) => ({ ...prev, friends: null }));
    } else {
      setErrorByCategory((prev) => ({ ...prev, friends: result.error.message }));
    }

    setLoadingByCategory((prev) => ({ ...prev, friends: false }));
  }, [viewerUserId]);

  const fetchNationalEntries = useCallback(async () => {
    setLoadingByCategory((prev) => ({ ...prev, national: true }));
    setErrorByCategory((prev) => ({ ...prev, national: null }));

    const result = await leaderboardService.getNationalLeaderboard(100, 0);

    if (result.ok) {
      setNationalEntries(result.data);
      setErrorByCategory((prev) => ({ ...prev, national: null }));
    } else {
      setErrorByCategory((prev) => ({ ...prev, national: result.error.message }));
    }

    setLoadingByCategory((prev) => ({ ...prev, national: false }));
  }, []);

  const fetchGymEntries = useCallback(
    async (gymId: string, options?: FetchCategoryOptions) => {
      if (!gymId) return;

      if (!options?.force && gymEntriesByGymId[gymId]) {
        setErrorByCategory((prev) => ({ ...prev, gym: null }));
        return;
      }

      const requestId = latestGymRequestIdRef.current + 1;
      latestGymRequestIdRef.current = requestId;

      if (selectedGymRef.current === gymId) {
        setLoadingByCategory((prev) => ({ ...prev, gym: true }));
        setErrorByCategory((prev) => ({ ...prev, gym: null }));
      }

      const result = await leaderboardService.getGymUsersLeaderboard(gymId, 100);

      if (result.ok) {
        setGymEntriesByGymId((prev) => ({
          ...prev,
          [gymId]: result.data,
        }));

        if (requestId === latestGymRequestIdRef.current && selectedGymRef.current === gymId) {
          setErrorByCategory((prev) => ({ ...prev, gym: null }));
        }
      } else if (requestId === latestGymRequestIdRef.current && selectedGymRef.current === gymId) {
        setErrorByCategory((prev) => ({ ...prev, gym: result.error.message }));
      }

      if (requestId === latestGymRequestIdRef.current && selectedGymRef.current === gymId) {
        setLoadingByCategory((prev) => ({ ...prev, gym: false }));
      }
    },
    [gymEntriesByGymId],
  );

  useEffect(() => {
    void fetchFriendsEntries();
    void fetchNationalEntries();
  }, [fetchFriendsEntries, fetchNationalEntries]);

  useEffect(() => {
    if (category !== 'gym' || !selectedGymId || gymEntriesByGymId[selectedGymId]) return;
    void fetchGymEntries(selectedGymId);
  }, [category, fetchGymEntries, gymEntriesByGymId, selectedGymId]);

  const refreshCategory = useCallback(
    async (targetCategory: RankingCategory) => {
      if (targetCategory === 'friends') {
        await fetchFriendsEntries();
        return;
      }

      if (targetCategory === 'national') {
        await fetchNationalEntries();
        return;
      }

      if (selectedGymId) {
        await fetchGymEntries(selectedGymId, { force: true });
      }
    },
    [fetchFriendsEntries, fetchGymEntries, fetchNationalEntries, selectedGymId],
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchFriendsEntries(),
      fetchNationalEntries(),
      selectedGymId ? fetchGymEntries(selectedGymId, { force: true }) : Promise.resolve(),
    ]);
  }, [fetchFriendsEntries, fetchGymEntries, fetchNationalEntries, selectedGymId]);

  const gymEntries = useMemo(
    () => (selectedGymId ? gymEntriesByGymId[selectedGymId] ?? [] : []),
    [gymEntriesByGymId, selectedGymId],
  );

  return {
    category,
    setCategory,
    selectedGymId,
    setSelectedGymId,
    friendsEntries,
    gymEntries,
    nationalEntries,
    loadingByCategory,
    errorByCategory,
    refreshCategory,
    refreshAll,
  };
}
