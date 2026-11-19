import { ApiEnvironment } from '../../core/campus-api.service';

export type PeriodAvailability = 'available' | 'pending' | 'unavailable';

export interface AvailabilityPeriod {
  readonly startTime: string;
  readonly endTime: string;
  readonly availability: PeriodAvailability;
}

export type EnvironmentDetail = ApiEnvironment & { readonly buildingName: string; readonly buildingFullName: string };

export interface CalendarDay {
  readonly date: string;
  readonly dayNumber: number;
  readonly disabled: boolean;
}
