import { ReservationSummaryFixture } from './reservation-request.models';

/** Generic summary labels used by the local demonstration flow. */
export const RESERVATION_SUMMARY_FIXTURES: readonly ReservationSummaryFixture[] = [
  {
    environmentCode: 'AMB-001',
    responsible: 'Informação demonstrativa do ambiente',
    approvalForecast: 'Sujeita à análise do responsável',
  },
];

export const RESERVATION_STORAGE_KEY = 'campus-reservas:demo:reservations';
