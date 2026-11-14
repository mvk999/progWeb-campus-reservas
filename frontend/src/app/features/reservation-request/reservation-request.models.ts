export interface ReservationDraft {
  readonly environmentCode: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly purpose: string;
  readonly participants: number;
  readonly observations: string;
  readonly acceptedRules: boolean;
}

export interface DemonstrationReservation extends ReservationDraft {
  readonly id: string;
  readonly createdAt: string;
  readonly source: 'demo-local';
}

export interface ReservationSummaryFixture {
  readonly environmentCode: string;
  readonly responsible: string;
  readonly approvalForecast: string;
}

export interface ReservationFormErrors {
  readonly purpose: string;
  readonly participants: string;
  readonly period: string;
  readonly acceptedRules: string;
}
