import { CampusMapData, DemonstrationRoom } from './campus-map.models';

const freeRoom = (
  code: string,
  name: string,
  capacity: number,
  category?: string,
  features?: readonly string[],
): DemonstrationRoom => ({
  code,
  name,
  availability: 'Livre',
  capacity,
  category,
  features,
});

/** Local demonstration records observed in the prototype, not production data. */
export const CAMPUS_MAP_FIXTURE: CampusMapData = {
  campusName: 'UFLA',
  location: 'Campus sede · Lavras, MG',
  initialDate: '2026-10-22',
  initialStartTime: '08:00',
  initialEndTime: '10:00',
  buildings: [
    {
      code: 'PV1',
      name: 'Centro de Eventos',
      fullName: 'PV1 - Centro de Eventos',
      position: { x: 61, y: 19 },
      rooms: [
        freeRoom('AMB-003', 'Sala 101', 40, 'Sala de aula'),
        freeRoom('AMB-007', 'Sala 102', 60),
        freeRoom('AMB-008', 'Sala 103', 16, 'Sala de reunião'),
      ],
    },
    {
      code: 'PV2',
      name: 'Pavilhão 2',
      fullName: 'Pavilhão de Aulas 2',
      position: { x: 15, y: 54 },
      rooms: [
        freeRoom('AMB-004', 'Sala 101', 40),
        freeRoom('AMB-009', 'Sala 102', 60),
        freeRoom('AMB-010', 'Sala 103', 16, 'Sala de reunião'),
      ],
    },
    {
      code: 'PV3',
      name: 'Pavilhão 3',
      fullName: 'Pavilhão de Aulas 3',
      position: { x: 37, y: 78 },
      rooms: [
        freeRoom('AMB-011', 'Sala 101', 40),
        freeRoom('AMB-012', 'Sala 102', 60),
        freeRoom('AMB-013', 'Sala 103', 16, 'Sala de reunião'),
      ],
    },
    {
      code: 'PV4',
      name: 'Pavilhão 4',
      fullName: 'Pavilhão de Aulas 4',
      position: { x: 43, y: 67 },
      rooms: [
        freeRoom('AMB-001', 'Sala 101', 40, 'Sala de aula', ['Quadro branco', 'Projetor']),
        freeRoom('AMB-014', 'Sala 102', 60, 'Sala de aula', ['Quadro branco', 'Projetor']),
        freeRoom('AMB-015', 'Sala 103', 16, 'Sala de reunião', ['Quadro branco', 'Projetor']),
      ],
    },
    {
      code: 'PV5',
      name: 'Pavilhão 5',
      fullName: 'Pavilhão de Aulas 5 (Nave 2)',
      position: { x: 35, y: 61 },
      rooms: [
        freeRoom('AMB-016', 'Sala 101', 40),
        freeRoom('AMB-017', 'Sala 102', 60),
        freeRoom('AMB-018', 'Sala 103', 16, 'Sala de reunião'),
      ],
    },
    {
      code: 'PV6',
      name: 'Pavilhão 6',
      fullName: 'Pavilhão de Aulas 6',
      position: { x: 65, y: 69 },
      rooms: [
        freeRoom('AMB-019', 'Sala 101', 40),
        freeRoom('AMB-020', 'Sala 102', 60),
        freeRoom('AMB-021', 'Sala 103', 16, 'Sala de reunião'),
      ],
    },
    {
      code: 'DCC',
      name: 'Ciência da Computação',
      fullName: 'DCC - Departamento de Ciência da Computação',
      position: { x: 77, y: 74 },
      rooms: [
        {
          code: 'AMB-002',
          name: 'Laboratório 101',
          availability: 'Ocupada',
          capacity: 30,
          category: 'Laboratório',
          features: ['Computadores', 'Projetor'],
        },
        freeRoom('AMB-006', 'Sala 102', 60),
        freeRoom('AMB-022', 'Sala 103', 16, 'Sala de reunião'),
      ],
    },
  ],
};
