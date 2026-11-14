import { DemonstrationOccupancyItem } from './occupancy-calendar.models';

/** Synthetic visual examples for the captured week only; schedule details are approximate. */
export const OCCUPANCY_CALENDAR_FIXTURES: readonly DemonstrationOccupancyItem[] = [
  {
    id: 'OCC-DEMO-001', date: '2026-10-19', startTime: '10:00', endTime: '12:00',
    status: 'Aprovada', environmentCode: 'AMB-001', environmentName: 'Sala 101', buildingCode: 'PV4',
  },
  {
    id: 'OCC-DEMO-002', date: '2026-10-20', startTime: '14:00', endTime: '16:00',
    status: 'Pendente', environmentCode: 'AMB-003', environmentName: 'Sala 101', buildingCode: 'PV1',
  },
  {
    id: 'OCC-DEMO-003', date: '2026-10-21', startTime: '08:00', endTime: '10:00',
    status: 'Bloqueado', environmentCode: 'AMB-002', environmentName: 'Laboratório 101', buildingCode: 'DCC',
  },
  {
    id: 'OCC-DEMO-004', date: '2026-10-23', startTime: '16:00', endTime: '18:00',
    status: 'Aprovada', environmentCode: 'AMB-004', environmentName: 'Sala 101', buildingCode: 'PV2',
  },
];

export const OCCUPANCY_CALENDAR_INITIAL_WEEK = '2026-10-19';
export const OCCUPANCY_CALENDAR_MANAGED_RESOURCES = 12;
export const OCCUPANCY_CALENDAR_TIME_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00'] as const;
