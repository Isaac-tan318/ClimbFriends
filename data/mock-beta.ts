import { LoggedClimb, ClimbingSession } from '@/types';

// Helper to create dates in the past
const daysAgo = (days: number, hours = 0, minutes = 0): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

// ─── Beta feed types ────────────────────────────────────────────────────────

export interface BetaPost {
  id: string;
  type: 'session' | 'send';
  userId: string;
  userName: string;
  gymId: string;
  postedAt: Date;
  // Session fields (when type === 'session')
  sessionDurationMinutes?: number;
  climbCount?: number;
  climbedWithNames?: string[];
  // Send fields (when type === 'send')
  grade?: string;
  color?: string;
  wall?: string;
  instagramUrl?: string;
}

// ─── Mock beta posts ────────────────────────────────────────────────────────

export const MOCK_BETA_POSTS: BetaPost[] = [
  // Boulder+ Aperia posts
  {
    id: 'beta-1',
    type: 'send',
    userId: 'user-1',
    userName: 'Isaac Tan',
    gymId: 'boulder-plus-aperia',
    postedAt: daysAgo(0, 14, 30),
    grade: 'Purple',
    color: 'Purple',
    wall: 'Slab',
    instagramUrl: 'https://www.instagram.com/reel/example1',
  },
  {
    id: 'beta-2',
    type: 'session',
    userId: 'user-2',
    userName: 'Sarah Tan',
    gymId: 'boulder-plus-aperia',
    postedAt: daysAgo(0, 12, 0),
    sessionDurationMinutes: 95,
    climbCount: 8,
    climbedWithNames: ['Isaac Tan', 'Mike Lim'],
  },
  {
    id: 'beta-2a',
    type: 'send',
    userId: 'user-2',
    userName: 'Sarah Tan',
    gymId: 'boulder-plus-aperia',
    postedAt: daysAgo(0, 12, 15),
    grade: 'Green',
    color: 'Green',
    wall: 'Slab',
  },
  {
    id: 'beta-2b',
    type: 'send',
    userId: 'user-2',
    userName: 'Sarah Tan',
    gymId: 'boulder-plus-aperia',
    postedAt: daysAgo(0, 12, 45),
    grade: 'Yellow',
    color: 'Yellow',
    wall: 'Overhang',
    instagramUrl: 'https://www.instagram.com/reel/sarah-send1',
  },
  {
    id: 'beta-3',
    type: 'send',
    userId: 'user-3',
    userName: 'Mike Lim',
    gymId: 'boulder-plus-aperia',
    postedAt: daysAgo(1, 19, 0),
    grade: 'Black',
    color: 'Black',
    wall: 'Overhang',
    instagramUrl: 'https://www.instagram.com/reel/example2',
  },
  {
    id: 'beta-4',
    type: 'send',
    userId: 'user-4',
    userName: 'Jessica Ng',
    gymId: 'boulder-plus-aperia',
    postedAt: daysAgo(1, 18, 0),
    grade: 'Red',
    color: 'Red',
    wall: 'Cave',
  },
  {
    id: 'beta-5',
    type: 'session',
    userId: 'user-1',
    userName: 'Isaac Tan',
    gymId: 'boulder-plus-aperia',
    postedAt: daysAgo(1, 18, 0),
    sessionDurationMinutes: 90,
    climbCount: 12,
    climbedWithNames: ['Sarah Tan', 'Jessica Ng'],
  },

  // Boulder Planet Tai Seng posts
  {
    id: 'beta-6',
    type: 'send',
    userId: 'user-2',
    userName: 'Sarah Tan',
    gymId: 'boulder-planet-taiseng',
    postedAt: daysAgo(0, 20, 0),
    grade: '8',
    color: 'Red',
    wall: 'Main Wall',
  },
  {
    id: 'beta-7',
    type: 'send',
    userId: 'user-5',
    userName: 'Ryan Lee',
    gymId: 'boulder-planet-taiseng',
    postedAt: daysAgo(0, 18, 30),
    grade: '10',
    color: 'Blue',
    wall: 'Competition Wall',
    instagramUrl: 'https://www.instagram.com/reel/example3',
  },
  {
    id: 'beta-8',
    type: 'session',
    userId: 'user-3',
    userName: 'Mike Lim',
    gymId: 'boulder-planet-taiseng',
    postedAt: daysAgo(1, 17, 0),
    sessionDurationMinutes: 120,
    climbCount: 15,
    climbedWithNames: ['Ryan Lee'],
  },
  {
    id: 'beta-8a',
    type: 'send',
    userId: 'user-3',
    userName: 'Mike Lim',
    gymId: 'boulder-planet-taiseng',
    postedAt: daysAgo(1, 17, 20),
    grade: '9',
    color: 'Black',
    wall: 'Main Wall',
  },
  {
    id: 'beta-8b',
    type: 'send',
    userId: 'user-3',
    userName: 'Mike Lim',
    gymId: 'boulder-planet-taiseng',
    postedAt: daysAgo(1, 17, 50),
    grade: '7',
    color: 'Red',
    wall: 'Competition Wall',
    instagramUrl: 'https://www.instagram.com/reel/mike-send1',
  },
  {
    id: 'beta-9',
    type: 'send',
    userId: 'user-6',
    userName: 'Lisa Chen',
    gymId: 'boulder-planet-taiseng',
    postedAt: daysAgo(2, 19, 0),
    grade: 'Wild',
    color: 'Green',
    wall: 'Slab',
  },

  // Climb Central Kallang posts
  {
    id: 'beta-10',
    type: 'session',
    userId: 'user-1',
    userName: 'Isaac Tan',
    gymId: 'climb-central-kallang',
    postedAt: daysAgo(0, 21, 0),
    sessionDurationMinutes: 110,
    climbCount: 10,
    climbedWithNames: ['Daniel Ong', 'Emily Koh'],
  },
  {
    id: 'beta-10a',
    type: 'send',
    userId: 'user-1',
    userName: 'Isaac Tan',
    gymId: 'climb-central-kallang',
    postedAt: daysAgo(0, 21, 15),
    grade: '6b',
    color: 'Blue',
    wall: 'Lead Wall',
  },
  {
    id: 'beta-10b',
    type: 'send',
    userId: 'user-1',
    userName: 'Isaac Tan',
    gymId: 'climb-central-kallang',
    postedAt: daysAgo(0, 21, 40),
    grade: '6c+',
    color: 'Orange',
    wall: 'Bouldering',
    instagramUrl: 'https://www.instagram.com/reel/isaac-send2',
  },
  {
    id: 'beta-11',
    type: 'send',
    userId: 'user-7',
    userName: 'Daniel Ong',
    gymId: 'climb-central-kallang',
    postedAt: daysAgo(1, 20, 0),
    grade: '6b+',
    color: 'Yellow',
    wall: 'Lead Wall',
    instagramUrl: 'https://www.instagram.com/reel/example4',
  },
  {
    id: 'beta-12',
    type: 'send',
    userId: 'user-8',
    userName: 'Emily Koh',
    gymId: 'climb-central-kallang',
    postedAt: daysAgo(2, 18, 0),
    grade: '5c',
    color: 'Orange',
    wall: 'Bouldering',
  },

  // FitBloc Depot posts
  {
    id: 'beta-13',
    type: 'send',
    userId: 'user-4',
    userName: 'Jessica Ng',
    gymId: 'fitbloc-depot',
    postedAt: daysAgo(0, 11, 0),
    grade: '6',
    color: 'Pink',
    wall: 'Slab',
    instagramUrl: 'https://www.instagram.com/reel/example5',
  },
  {
    id: 'beta-14',
    type: 'session',
    userId: 'user-5',
    userName: 'Ryan Lee',
    gymId: 'fitbloc-depot',
    postedAt: daysAgo(1, 19, 30),
    sessionDurationMinutes: 85,
    climbCount: 7,
  },
  {
    id: 'beta-14a',
    type: 'send',
    userId: 'user-5',
    userName: 'Ryan Lee',
    gymId: 'fitbloc-depot',
    postedAt: daysAgo(1, 19, 45),
    grade: '6',
    color: 'Green',
    wall: 'Slab',
  },
  {
    id: 'beta-15',
    type: 'send',
    userId: 'user-1',
    userName: 'Isaac Tan',
    gymId: 'fitbloc-depot',
    postedAt: daysAgo(2, 17, 0),
    grade: '8',
    color: 'Black',
    wall: 'Overhang',
  },
  {
    id: 'beta-16',
    type: 'send',
    userId: 'user-6',
    userName: 'Lisa Chen',
    gymId: 'fitbloc-depot',
    postedAt: daysAgo(3, 10, 0),
    grade: 'Supercharged',
    color: 'Red',
    wall: 'Competition',
    instagramUrl: 'https://www.instagram.com/reel/example6',
  },

  // Boulder Planet Sembawang
  {
    id: 'beta-17',
    type: 'session',
    userId: 'user-7',
    userName: 'Daniel Ong',
    gymId: 'boulder-planet-sembawang',
    postedAt: daysAgo(0, 16, 0),
    sessionDurationMinutes: 100,
    climbCount: 11,
    climbedWithNames: ['Emily Koh', 'Lisa Chen'],
  },
  {
    id: 'beta-17a',
    type: 'send',
    userId: 'user-7',
    userName: 'Daniel Ong',
    gymId: 'boulder-planet-sembawang',
    postedAt: daysAgo(0, 16, 30),
    grade: '7',
    color: 'Purple',
    wall: 'Main Wall',
  },
  {
    id: 'beta-18',
    type: 'send',
    userId: 'user-8',
    userName: 'Emily Koh',
    gymId: 'boulder-planet-sembawang',
    postedAt: daysAgo(1, 15, 0),
    grade: '5',
    color: 'Green',
    wall: 'Main Wall',
  },

  // FitBloc Maxwell
  {
    id: 'beta-19',
    type: 'send',
    userId: 'user-2',
    userName: 'Sarah Tan',
    gymId: 'fitbloc-maxwell',
    postedAt: daysAgo(0, 13, 0),
    grade: '4',
    color: 'Blue',
    wall: 'Slab',
  },
  {
    id: 'beta-20',
    type: 'session',
    userId: 'user-3',
    userName: 'Mike Lim',
    gymId: 'fitbloc-maxwell',
    postedAt: daysAgo(1, 12, 0),
    sessionDurationMinutes: 75,
    climbCount: 6,
  },
  {
    id: 'beta-20a',
    type: 'send',
    userId: 'user-3',
    userName: 'Mike Lim',
    gymId: 'fitbloc-maxwell',
    postedAt: daysAgo(1, 12, 20),
    grade: '5',
    color: 'Blue',
    wall: 'Slab',
  },

  // Lighthouse
  {
    id: 'beta-21',
    type: 'send',
    userId: 'user-5',
    userName: 'Ryan Lee',
    gymId: 'lighthouse-climbing',
    postedAt: daysAgo(0, 17, 0),
    grade: 'V5',
    color: 'Purple',
    wall: 'Cave',
    instagramUrl: 'https://www.instagram.com/reel/example7',
  },

  // BFF Climb
  {
    id: 'beta-22',
    type: 'session',
    userId: 'user-4',
    userName: 'Jessica Ng',
    gymId: 'bff-climb-bendemeer',
    postedAt: daysAgo(1, 9, 0),
    sessionDurationMinutes: 100,
    climbCount: 9,
    climbedWithNames: ['Isaac Tan'],
  },
  {
    id: 'beta-22a',
    type: 'send',
    userId: 'user-4',
    userName: 'Jessica Ng',
    gymId: 'bff-climb-bendemeer',
    postedAt: daysAgo(1, 9, 25),
    grade: 'Red',
    color: 'Red',
    wall: 'Overhang',
  },
  {
    id: 'beta-22b',
    type: 'send',
    userId: 'user-4',
    userName: 'Jessica Ng',
    gymId: 'bff-climb-bendemeer',
    postedAt: daysAgo(1, 9, 50),
    grade: 'Yellow',
    color: 'Yellow',
    wall: 'Slab',
    instagramUrl: 'https://www.instagram.com/reel/jessica-send1',
  },
];

export const getBetaPostsForGym = (gymId: string): BetaPost[] => {
  return MOCK_BETA_POSTS
    .filter((p) => p.gymId === gymId)
    .sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime());
};

export const getUniqueGradesForGym = (gymId: string): string[] => {
  const grades = MOCK_BETA_POSTS
    .filter((p) => p.gymId === gymId && p.grade)
    .map((p) => p.grade!);
  return [...new Set(grades)];
};

export const getUniqueWallsForGym = (gymId: string): string[] => {
  const walls = MOCK_BETA_POSTS
    .filter((p) => p.gymId === gymId && p.wall)
    .map((p) => p.wall!);
  return [...new Set(walls)];
};

export const getAllRecentBetaPosts = (limit = 30): BetaPost[] => {
  return [...MOCK_BETA_POSTS]
    .sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime())
    .slice(0, limit);
};
