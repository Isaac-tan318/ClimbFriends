import { Gym } from '@/types';

export const SINGAPORE_GYMS: Gym[] = [
  // Boulder+ Gyms
  {
    id: 'boulder-plus-aperia',
    name: 'Boulder+ Aperia',
    brand: 'Boulder+',
    latitude: 1.3138,
    longitude: 103.8630,
    radiusMeters: 100,
    address: '12 Kallang Ave, #02-02 Aperia Mall, Singapore 339511',
  },
  {
    id: 'boulder-plus-chevrons',
    name: 'Boulder+ The Chevrons',
    brand: 'Boulder+',
    latitude: 1.3258,
    longitude: 103.7867,
    radiusMeters: 100,
    address: '48 Boon Lay Way, Singapore 609961',
  },

  // Boulder Planet Gyms
  {
    id: 'boulder-planet-sembawang',
    name: 'Boulder Planet Sembawang',
    brand: 'Boulder Planet',
    latitude: 1.4491,
    longitude: 103.8185,
    radiusMeters: 100,
    address: '86 Sembawang Rd, Singapore 779249',
  },
  {
    id: 'boulder-planet-taiseng',
    name: 'Boulder Planet Tai Seng',
    brand: 'Boulder Planet',
    latitude: 1.3378,
    longitude: 103.8878,
    radiusMeters: 100,
    address: '18 Tai Seng St, Singapore 539775',
  },

  // Climb Central Gyms
  {
    id: 'climb-central-kallang',
    name: 'Climb Central Kallang',
    brand: 'Climb Central',
    latitude: 1.3016,
    longitude: 103.8713,
    radiusMeters: 100,
    address: '52 Stadium Rd, Kallang Wave Mall, Singapore 397724',
  },
  {
    id: 'climb-central-funan',
    name: 'Climb Central Funan',
    brand: 'Climb Central',
    latitude: 1.2915,
    longitude: 103.8499,
    radiusMeters: 100,
    address: '107 North Bridge Rd, #B2-24/25 Funan, Singapore 179105',
  },
  {
    id: 'climb-central-novena',
    name: 'Climb Central Novena',
    brand: 'Climb Central',
    latitude: 1.3204,
    longitude: 103.8438,
    radiusMeters: 100,
    address: '238 Thomson Rd, Velocity @ Novena Square, Singapore 307684',
  },
  {
    id: 'climb-central-yck',
    name: 'Climb Central Yio Chu Kang',
    brand: 'Climb Central',
    latitude: 1.3817,
    longitude: 103.8448,
    radiusMeters: 100,
    address: '200 Yio Chu Kang Rd, Singapore 545649',
  },

  // BFF Climb Gyms
  {
    id: 'bff-climb-bendemeer',
    name: 'BFF Climb Bendemeer',
    brand: 'BFF Climb',
    latitude: 1.3216,
    longitude: 103.8631,
    radiusMeters: 100,
    address: '28 Bendemeer Rd, Singapore 339909',
  },
  {
    id: 'bff-climb-yishun',
    name: 'BFF Climb Yoha',
    brand: 'BFF Climb',
    latitude: 1.4295,
    longitude: 103.8353,
    radiusMeters: 100,
    address: '1 Yishun Close, Singapore 767832',
  },
  {
    id: 'bff-climb-tampines',
    name: 'BFF Climb Tampines Hub',
    brand: 'BFF Climb',
    latitude: 1.3525,
    longitude: 103.9397,
    radiusMeters: 100,
    address: '1 Tampines Walk, Our Tampines Hub, Singapore 528523',
  },

  // FitBloc Gyms
  {
    id: 'fitbloc-kentridge',
    name: 'FitBloc Kent Ridge',
    brand: 'FitBloc',
    latitude: 1.2927,
    longitude: 103.7842,
    radiusMeters: 100,
    address: '1 Lower Kent Ridge Rd, Singapore 119082',
  },
  {
    id: 'fitbloc-sciencepark',
    name: 'FitBloc Science Park',
    brand: 'FitBloc',
    latitude: 1.2935,
    longitude: 103.7888,
    radiusMeters: 100,
    address: '1 Science Park Dr, Singapore 118221',
  },
  {
    id: 'fitbloc-telokayer',
    name: 'FitBloc Telok Ayer',
    brand: 'FitBloc',
    latitude: 1.2812,
    longitude: 103.8485,
    radiusMeters: 100,
    address: '137 Telok Ayer St, Singapore 068602',
  },

  // Other Gyms
  {
    id: 'lighthouse-climbing',
    name: 'Lighthouse Climbing',
    brand: 'Lighthouse',
    latitude: 1.3267,
    longitude: 103.9335,
    radiusMeters: 100,
    address: '2 Changi Business Park Ave 1, Singapore 486015',
  },
  {
    id: 'outpost-climbing',
    name: 'Outpost Climbing',
    brand: 'Outpost',
    latitude: 1.3156,
    longitude: 103.7653,
    radiusMeters: 100,
    address: '511 Clementi Rd, Singapore 599489',
  },
  {
    id: 'climba-gym',
    name: 'Climba Gym',
    brand: 'Climba',
    latitude: 1.3341,
    longitude: 103.7468,
    radiusMeters: 100,
    address: '21 Bukit Batok Cres, Singapore 658065',
  },
  {
    id: 'oyeyo',
    name: 'Oyeyo',
    brand: 'Oyeyo',
    latitude: 1.3186,
    longitude: 103.8890,
    radiusMeters: 100,
    address: '1 Kaki Bukit Ave 1, Singapore 417938',
  },
  {
    id: 'z-vertigo',
    name: 'Z-Vertigo',
    brand: 'Z-Vertigo',
    latitude: 1.2973,
    longitude: 103.7867,
    radiusMeters: 100,
    address: '10 Science Centre Rd, Singapore 609079',
  },
];

export const getGymById = (id: string): Gym | undefined => {
  return SINGAPORE_GYMS.find((gym) => gym.id === id);
};

export const getGymsByBrand = (brand: string): Gym[] => {
  return SINGAPORE_GYMS.filter((gym) => gym.brand === brand);
};
