import { DemonstrationReservation, ReservationStoreReadResult } from '../reservation-request/reservation-request.models';

export type MyReservationsTab = 'upcoming' | 'history' | 'calendar';

export interface LocalReservationView extends DemonstrationReservation {
  readonly environmentName: string;
  readonly buildingName: string;
}

export interface PersonalCalendarDay {
  readonly date: string;
  readonly dayNumber: number;
  readonly hasReservation: boolean;
  readonly reservations: readonly LocalReservationView[];
}

export type MyReservationsReadResult =
  | { readonly ok: true; readonly reservations: readonly LocalReservationView[] }
  | Extract<ReservationStoreReadResult, { readonly ok: false }>;
