export type OccupancyStatus = 'Aprovada' | 'Pendente' | 'Bloqueado';

export interface DemonstrationOccupancyItem {
  readonly id: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly status: OccupancyStatus;
  readonly environmentCode: string;
  readonly environmentName: string;
  readonly buildingCode: string;
}

export interface OccupancyWeek {
  readonly startDate: string;
  readonly endDate: string;
  readonly items: readonly DemonstrationOccupancyItem[];
}
