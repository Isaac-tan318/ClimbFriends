import { PlannedVisit } from '@/types';

// Helper to create dates relative to today
const daysFromNow = (days: number, hours = 0, minutes = 0): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const MOCK_PLANNED_VISITS: PlannedVisit[] = [
  {
    id: 'plan-1',
    userId: 'user-1',
    gymId: 'boulder-plus-aperia',
    plannedDate: daysFromNow(2, 18, 0), // 2 days from now at 6pm
    createdAt: new Date(),
    invitees: [
      {
        id: 'invite-1',
        plannedVisitId: 'plan-1',
        inviteeId: 'user-2',
        status: 'accepted',
      },
      {
        id: 'invite-2',
        plannedVisitId: 'plan-1',
        inviteeId: 'user-3',
        status: 'pending',
      },
    ],
  },
  {
    id: 'plan-2',
    userId: 'user-2',
    gymId: 'climb-central-kallang',
    plannedDate: daysFromNow(5, 19, 0), // 5 days from now at 7pm
    createdAt: new Date(),
    invitees: [
      {
        id: 'invite-3',
        plannedVisitId: 'plan-2',
        inviteeId: 'user-1',
        status: 'pending',
      },
    ],
  },
  {
    id: 'plan-3',
    userId: 'user-1',
    gymId: 'fitbloc-kentridge',
    plannedDate: daysFromNow(7, 10, 0), // 1 week from now at 10am
    createdAt: new Date(),
    invitees: [],
  },
];

export const getPlannedVisitsForUser = (userId: string): PlannedVisit[] => {
  return MOCK_PLANNED_VISITS.filter(
    (plan) =>
      plan.userId === userId ||
      plan.invitees.some((invite) => invite.inviteeId === userId)
  );
};

export const getUpcomingPlans = (userId: string): PlannedVisit[] => {
  const now = new Date();
  return getPlannedVisitsForUser(userId)
    .filter((plan) => plan.plannedDate > now)
    .sort((a, b) => a.plannedDate.getTime() - b.plannedDate.getTime());
};
