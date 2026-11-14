export interface EnvironmentDetail {
  readonly code: string;
  readonly name: string;
  readonly category: string;
  readonly buildingCode: string;
  readonly buildingName: string;
  readonly location: string;
  readonly capacity: number;
  readonly features: readonly string[];
}

export type PeriodAvailability = 'available' | 'unavailable' | 'unknown';

export interface DemonstrationPeriod {
  readonly startTime: string;
  readonly endTime: string;
  readonly availability: PeriodAvailability;
}

export interface DemonstrationAvailability {
  readonly environmentCode: string;
  readonly date: string;
  readonly periods: readonly DemonstrationPeriod[];
}

export interface CalendarDay {
  readonly date: string;
  readonly dayNumber: number;
  readonly disabled: boolean;
}
