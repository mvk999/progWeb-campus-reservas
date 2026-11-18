import { ApiReservation } from '../../core/campus-api.service';

export type MyReservationsTab = 'upcoming' | 'history' | 'calendar';

export type LocalReservationView = ApiReservation;

export interface PersonalCalendarDay {
  readonly date: string;
  readonly dayNumber: number;
  readonly hasReservation: boolean;
  readonly reservations: readonly LocalReservationView[];
}
