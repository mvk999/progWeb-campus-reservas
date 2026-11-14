import { DemonstrationManagementRequest } from './reservation-management.models';

/** Synthetic examples for UI coverage only; not real users or reservations. */
export const MANAGEMENT_REQUEST_FIXTURES: readonly DemonstrationManagementRequest[] = [
  {
    id: 'RES-001', requesterLabel: 'Solicitante demo 01', environmentCode: 'AMB-001', environmentName: 'Sala 101', buildingCode: 'PV4',
    date: '2026-10-22', startTime: '08:00', endTime: '10:00', status: 'Pendente',
    purpose: 'Atividade acadêmica demonstrativa', participants: 18, observations: 'Observação local de demonstração.', hasConflictNotice: true,
  },
  {
    id: 'RES-002', requesterLabel: 'Solicitante demo 02', environmentCode: 'AMB-002', environmentName: 'Laboratório 101', buildingCode: 'DCC',
    date: '2026-10-22', startTime: '10:00', endTime: '12:00', status: 'Aprovada',
    purpose: 'Atividade de laboratório demonstrativa', participants: 24, observations: 'Sem observações demonstrativas.', hasConflictNotice: false,
  },
  {
    id: 'RES-003', requesterLabel: 'Solicitante demo 03', environmentCode: 'AMB-003', environmentName: 'Sala 101', buildingCode: 'PV1',
    date: '2026-10-23', startTime: '08:00', endTime: '10:00', status: 'Pendente',
    purpose: 'Reunião acadêmica demonstrativa', participants: 12, observations: 'Solicitação sintética para exibir o estado pendente.', hasConflictNotice: false,
  },
  {
    id: 'RES-004', requesterLabel: 'Solicitante demo 04', environmentCode: 'AMB-004', environmentName: 'Sala 101', buildingCode: 'PV2',
    date: '2026-10-23', startTime: '14:00', endTime: '16:00', status: 'Aprovada',
    purpose: 'Aula de demonstração', participants: 30, observations: '', hasConflictNotice: false,
  },
  {
    id: 'RES-005', requesterLabel: 'Solicitante demo 05', environmentCode: 'AMB-006', environmentName: 'Sala 102', buildingCode: 'DCC',
    date: '2026-10-23', startTime: '10:00', endTime: '12:00', status: 'Rejeitada',
    purpose: 'Atividade demonstrativa', participants: 16, observations: '', hasConflictNotice: false,
  },
  {
    id: 'RES-006', requesterLabel: 'Solicitante demo 06', environmentCode: 'AMB-014', environmentName: 'Sala 102', buildingCode: 'PV4',
    date: '2026-10-24', startTime: '16:00', endTime: '18:00', status: 'Cancelada',
    purpose: 'Uso demonstrativo do ambiente', participants: 20, observations: '', hasConflictNotice: false,
  },
];

export const MANAGEMENT_DECISIONS_STORAGE_KEY = 'campus-reservas:demo:management-decisions';
export const MANAGED_RESOURCE_COUNT = 12;
