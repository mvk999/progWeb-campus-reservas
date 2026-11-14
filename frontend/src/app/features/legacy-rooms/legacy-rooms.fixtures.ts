import { LegacyRoom } from './legacy-rooms.models';

export const LEGACY_CAMPUS = 'UFLA · Campus sede';
export const LEGACY_INITIAL_DATE = '2026-10-23';
export const LEGACY_INITIAL_WEEK = '2026-10-19';
export const LEGACY_TIME_HOURS = Array.from({ length: 15 }, (_, index) => index + 7);
export const LEGACY_FEATURE_OPTIONS = ['Projetor', 'Ar-condicionado', 'Wi-Fi', 'Acessibilidade'] as const;

/** Six clearly synthetic rows. Two intentionally carry Laboratório in name/category for the observed search. */
export const LEGACY_ROOM_FIXTURES: readonly LegacyRoom[] = [
  {
    code: 'AMB-001', name: 'Sala 101', campus: LEGACY_CAMPUS, buildingCode: 'PV4', buildingName: 'Pavilhão 4',
    location: 'PV4 · Pavilhão 4 · Campus sede', category: 'Sala de aula', capacity: 40,
    features: ['Projetor', 'Wi-Fi', 'Acessibilidade'], samples: [],
  },
  {
    code: 'AMB-002', name: 'Laboratório 101', campus: LEGACY_CAMPUS, buildingCode: 'DCC', buildingName: 'Ciência da Computação',
    location: 'DCC · Ciência da Computação · Campus sede', category: 'Laboratório', capacity: 30,
    features: ['Computadores', 'Projetor', 'Wi-Fi'], samples: [
      { date: '2026-10-23', hour: 10, status: 'Aprovado' }, { date: '2026-10-23', hour: 11, status: 'Aprovado' },
    ],
  },
  {
    code: 'AMB-003', name: 'Sala 101', campus: LEGACY_CAMPUS, buildingCode: 'PV1', buildingName: 'Pavilhão 1',
    location: 'PV1 · Pavilhão 1 · Campus sede', category: 'Sala de aula', capacity: 40,
    features: ['Projetor', 'Ar-condicionado', 'Wi-Fi'], samples: [{ date: '2026-10-23', hour: 13, status: 'Pendente' }],
  },
  {
    code: 'DEMO-004', name: 'Laboratório de demonstração', campus: LEGACY_CAMPUS, buildingCode: 'PV3', buildingName: 'Pavilhão 3',
    location: 'Laboratório · PV3 · Pavilhão 3 · Campus sede', category: 'Laboratório', capacity: 24,
    features: ['Projetor', 'Ar-condicionado', 'Acessibilidade'], samples: [{ date: '2026-10-23', hour: 15, status: 'Bloqueado' }],
  },
  {
    code: 'AMB-005', name: 'Sala de estudo 101', campus: LEGACY_CAMPUS, buildingCode: 'BU', buildingName: 'Biblioteca',
    location: 'BU · Biblioteca · Campus sede', category: 'Sala de estudo', capacity: 12,
    features: ['Wi-Fi', 'Acessibilidade'], samples: [],
  },
  {
    code: 'AMB-006', name: 'Sala 102', campus: LEGACY_CAMPUS, buildingCode: 'DCC', buildingName: 'Ciência da Computação',
    location: 'DCC · Ciência da Computação · Campus sede', category: 'Sala de reunião', capacity: 16,
    features: ['Ar-condicionado', 'Wi-Fi'], samples: [],
  },
];
