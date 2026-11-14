import { DemonstrationAvailability, EnvironmentDetail } from './environment-detail.models';

export const ENVIRONMENT_DETAIL_FIXTURES: readonly EnvironmentDetail[] = [
  {
    code: 'AMB-001',
    name: 'Sala 101',
    category: 'Sala de aula',
    buildingCode: 'PV4',
    buildingName: 'Pavilhão 4',
    location: 'UFLA · Campus sede · Lavras, MG',
    capacity: 40,
    features: ['Quadro branco', 'Projetor', 'Wi-Fi'],
  },
];

/** Local examples from the observed October 2026 calendar; not real availability. */
export const ENVIRONMENT_AVAILABILITY_FIXTURES: readonly DemonstrationAvailability[] = [
  {
    environmentCode: 'AMB-001',
    date: '2026-10-22',
    periods: [
      { startTime: '08:00', endTime: '10:00', availability: 'available' },
      { startTime: '10:00', endTime: '12:00', availability: 'available' },
      { startTime: '12:00', endTime: '14:00', availability: 'unavailable' },
      { startTime: '14:00', endTime: '16:00', availability: 'unavailable' },
      { startTime: '16:00', endTime: '18:00', availability: 'available' },
      { startTime: '18:00', endTime: '20:00', availability: 'available' },
    ],
  },
];

/** The initial observed calendar disabled these dates in October 2026. */
export const INITIAL_DISABLED_DAYS = {
  year: 2026,
  month: 9,
  throughDay: 18,
} as const;
