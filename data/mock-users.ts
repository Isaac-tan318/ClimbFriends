import { User, Friend, UserSettings } from '@/types';

export const MOCK_USERS: User[] = [
  {
    id: 'user-1',
    email: 'alex@climbfriend.sg',
    displayName: 'Alex Climber',
    createdAt: new Date('2024-06-01'),
  },
  {
    id: 'user-2',
    email: 'sarah@climbfriend.sg',
    displayName: 'Sarah Tan',
    createdAt: new Date('2024-07-15'),
  },
  {
    id: 'user-3',
    email: 'mike@climbfriend.sg',
    displayName: 'Mike Lim',
    createdAt: new Date('2024-08-10'),
  },
  {
    id: 'user-4',
    email: 'jess@climbfriend.sg',
    displayName: 'Jessica Ng',
    createdAt: new Date('2024-05-20'),
  },
  {
    id: 'user-5',
    email: 'ryan@climbfriend.sg',
    displayName: 'Ryan Lee',
    createdAt: new Date('2024-09-01'),
  },
  {
    id: 'user-6',
    email: 'lisa@climbfriend.sg',
    displayName: 'Lisa Chen',
    createdAt: new Date('2024-07-22'),
  },
  {
    id: 'user-7',
    email: 'dan@climbfriend.sg',
    displayName: 'Daniel Ong',
    createdAt: new Date('2024-06-15'),
  },
  {
    id: 'user-8',
    email: 'emily@climbfriend.sg',
    displayName: 'Emily Koh',
    createdAt: new Date('2024-10-01'),
  },
];

export const CURRENT_USER = MOCK_USERS[0]; // Alex Climber

export const CURRENT_USER_SETTINGS: UserSettings = {
  userId: CURRENT_USER.id,
  locationEnabled: true,
  friendVisibilityEnabled: true,
  notificationsEnabled: true,
};

export const MOCK_FRIENDS: Friend[] = [
  {
    ...MOCK_USERS[1], // Sarah Tan
    currentGymId: 'boulder-plus-aperia',
    lastSeenAt: new Date(),
    isAtGym: true,
  },
  {
    ...MOCK_USERS[2], // Mike Lim
    currentGymId: 'climb-central-kallang',
    lastSeenAt: new Date(),
    isAtGym: true,
  },
  {
    ...MOCK_USERS[3], // Jessica Ng
    currentGymId: null,
    lastSeenAt: new Date(Date.now() - 3600000 * 5),
    isAtGym: false,
  },
  {
    ...MOCK_USERS[4], // Ryan Lee
    currentGymId: null,
    lastSeenAt: new Date(Date.now() - 3600000 * 24),
    isAtGym: false,
  },
  {
    ...MOCK_USERS[5], // Lisa Chen
    currentGymId: null,
    lastSeenAt: new Date(Date.now() - 3600000 * 48),
    isAtGym: false,
  },
];
