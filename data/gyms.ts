import { Gym } from '@/types';

// Grade systems per brand
export const BRAND_GRADES: Record<string, string[]> = {
  'Boulder Planet': ['Wild', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
  'Boulder+': ['White', 'Yellow', 'Red', 'Blue', 'Purple', 'Green', 'Pink', 'Black'],
  'FitBloc': ['0', '1', '2', '3', '4', '5', '6', '7', '8', 'Supercharged'],
};

export const getGradesForGym = (gym: Gym): string[] | null => {
  return gym.grades ?? BRAND_GRADES[gym.brand] ?? null;
};

export const SINGAPORE_GYMS: Gym[] = [
  // Boulder+ Gyms
  {
    id: 'boulder-plus-aperia',
    name: 'Boulder+ Aperia',
    brand: 'Boulder+',
    latitude: 1.3099,
    longitude: 103.8642,
    radiusMeters: 100,
    address: '12 Kallang Ave, #03-17 Aperia Mall, Singapore 339511',
  },
  {
    id: 'boulder-plus-chevrons',
    name: 'Boulder+ The Chevrons',
    brand: 'Boulder+',
    latitude: 1.3310,
    longitude: 103.7483,
    radiusMeters: 100,
    address: '48 Boon Lay Way, #04-01 The Chevrons, Singapore 609961',
  },

  // Boulder Planet Gyms
  {
    id: 'boulder-planet-sembawang',
    name: 'Boulder Planet Sembawang',
    brand: 'Boulder Planet',
    latitude: 1.4420,
    longitude: 103.8251,
    radiusMeters: 100,
    address: '604 Sembawang Rd, #B1-22/23 Sembawang Shopping Centre, Singapore 758459',
  },
  {
    id: 'boulder-planet-taiseng',
    name: 'Boulder Planet Tai Seng',
    brand: 'Boulder Planet',
    latitude: 1.3340,
    longitude: 103.8884,
    radiusMeters: 100,
    address: '601 MacPherson Rd, #02-07 Grantral Mall, Singapore 368242',
  },

  // Climb Central Gyms
  {
    id: 'climb-central-kallang',
    name: 'Climb Central Kallang',
    brand: 'Climb Central',
    latitude: 1.3027,
    longitude: 103.8735,
    radiusMeters: 100,
    address: '1 Stadium Pl, #B1-01 Kallang Wave Mall, Singapore 397628',
  },
  {
    id: 'climb-central-funan',
    name: 'Climb Central Funan',
    brand: 'Climb Central',
    latitude: 1.2914,
    longitude: 103.8499,
    radiusMeters: 100,
    address: '107 North Bridge Rd, #B2-19/21 Funan, Singapore 179105',
  },
  {
    id: 'climb-central-novena',
    name: 'Climb Central Novena',
    brand: 'Climb Central',
    latitude: 1.3204,
    longitude: 103.8437,
    radiusMeters: 100,
    address: '238 Thomson Rd, #03-23/25 Velocity @ Novena Square, Singapore 307683',
  },
  {
    id: 'climb-central-cck',
    name: 'Climb Central SAFRA Choa Chu Kang',
    brand: 'Climb Central',
    latitude: 1.3887,
    longitude: 103.7473,
    radiusMeters: 100,
    address: '28 Choa Chu Kang Dr, #03-02A SAFRA, Singapore 689964',
  },

  // BFF Climb Gyms
  {
    id: 'bff-climb-bendemeer',
    name: 'BFF Climb Bendemeer',
    brand: 'BFF Climb',
    latitude: 1.3123,
    longitude: 103.8632,
    radiusMeters: 100,
    address: '2 Kallang Ave, #01-20 CT Hub, Singapore 339407',
  },
  {
    id: 'bff-climb-tampines-yoha',
    name: 'BFF Climb Tampines Yoha',
    brand: 'BFF Climb',
    latitude: 1.3434,
    longitude: 103.9416,
    radiusMeters: 100,
    address: '6 Tampines St 92, #03-06 yo:HA Commercial, Singapore 528893',
  },
  {
    id: 'bff-climb-tampines',
    name: 'BFF Climb Tampines Hub',
    brand: 'BFF Climb',
    latitude: 1.3540,
    longitude: 103.9403,
    radiusMeters: 100,
    address: '1 Tampines Walk, #02-81 Our Tampines Hub, Singapore 528523',
  },

  // FitBloc Gyms
  {
    id: 'fitbloc-depot',
    name: 'FitBloc Depot',
    brand: 'FitBloc',
    latitude: 1.2813,
    longitude: 103.8101,
    radiusMeters: 100,
    address: '108 Depot Rd, #02-01 Depot Heights Shopping Centre, Singapore 109670',
  },
  {
    id: 'fitbloc-sciencepark',
    name: 'FitBloc Science Park',
    brand: 'FitBloc',
    latitude: 1.2878,
    longitude: 103.7905,
    radiusMeters: 100,
    address: '87 Science Park Dr, #03-02 The Oasis, Singapore 118260',
  },
  {
    id: 'fitbloc-maxwell',
    name: 'FitBloc Maxwell',
    brand: 'FitBloc',
    latitude: 1.2794,
    longitude: 103.8467,
    radiusMeters: 100,
    address: '7 Maxwell Rd, #06-01 MND Building Annexe B, Singapore 069111',
  },

  // Other Gyms
  {
    id: 'lighthouse-climbing',
    name: 'Lighthouse Climbing',
    brand: 'Lighthouse',
    latitude: 1.2750,
    longitude: 103.7943,
    radiusMeters: 100,
    address: '44 Pasir Panjang Rd, #B-02, Singapore 118504',
  },
  {
    id: 'outpost-climbing',
    name: 'Outpost Climbing',
    brand: 'Outpost',
    latitude: 1.3047,
    longitude: 103.8622,
    radiusMeters: 100,
    address: '464 Crawford Ln, #01-464, Singapore 190464',
  },
  {
    id: 'climba-gym',
    name: 'Climba Gym',
    brand: 'Climba',
    latitude: 1.2792,
    longitude: 103.8493,
    radiusMeters: 100,
    address: '61 Robinson Rd, #05-03/04, Singapore 068893',
  },
  {
    id: 'oyeyo',
    name: 'OYEYO Boulder Home',
    brand: 'Oyeyo',
    latitude: 1.3072,
    longitude: 103.8468,
    radiusMeters: 100,
    address: '148 Mackenzie Rd, Singapore 228724',
  },
  {
    id: 'z-vertigo',
    name: 'Z-Vertigo Boulder Gym',
    brand: 'Z-Vertigo',
    latitude: 1.3429,
    longitude: 103.7762,
    radiusMeters: 100,
    address: '170 Upper Bukit Timah Rd, #B2-20B Bukit Timah Shopping Centre, Singapore 588179',
  },
];

export const getGymById = (id: string): Gym | undefined => {
  return SINGAPORE_GYMS.find((gym) => gym.id === id);
};

export const getGymsByBrand = (brand: string): Gym[] => {
  return SINGAPORE_GYMS.filter((gym) => gym.brand === brand);
};
