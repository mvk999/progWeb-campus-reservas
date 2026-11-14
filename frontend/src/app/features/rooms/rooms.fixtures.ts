import { AvailabilityExample, RoomFeatureExample } from './rooms.models';

/** Representative local demo states; these are not production availability. */
export const AVAILABILITY_EXAMPLES: readonly AvailabilityExample[] = [
  {
    roomCode: 'AMB-015',
    date: '2026-10-22',
    startTime: '14:30',
    endTime: '16:00',
    status: 'Aprovado',
  },
  {
    roomCode: 'AMB-002',
    date: '2026-10-23',
    startTime: '10:00',
    endTime: '12:00',
    status: 'Aprovado',
  },
  {
    roomCode: 'AMB-001',
    date: '2026-10-23',
    startTime: '12:00',
    endTime: '14:00',
    status: 'Pendente',
  },
  {
    roomCode: 'AMB-004',
    date: '2026-10-23',
    startTime: '14:00',
    endTime: '16:00',
    status: 'Bloqueado',
  },
];

export const ADVANCED_ROOM_FEATURES = [
  'Projetor',
  'Ar-condicionado',
  'Wi-Fi',
  'Acessibilidade',
] as const;

/** Small representative feature data for local demos where map records have no such metadata. */
export const ROOM_FEATURE_EXAMPLES: readonly RoomFeatureExample[] = [
  { roomCode: 'AMB-002', features: ['Ar-condicionado', 'Wi-Fi'] },
  { roomCode: 'AMB-006', features: ['Acessibilidade', 'Wi-Fi'] },
  { roomCode: 'AMB-001', features: ['Ar-condicionado', 'Wi-Fi'] },
  { roomCode: 'AMB-014', features: ['Acessibilidade'] },
];
