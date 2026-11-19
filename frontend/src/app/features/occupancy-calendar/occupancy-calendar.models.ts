import { ApiOccupancyItem } from '../../core/campus-api.service';

export type OccupancyStatus = 'Aprovada' | 'Pendente' | 'Bloqueado';
export type OccupancyItem = ApiOccupancyItem & { readonly status: OccupancyStatus };

export interface OccupancyWeek {
  readonly startDate: string;
  readonly endDate: string;
  readonly items: readonly OccupancyItem[];
}
