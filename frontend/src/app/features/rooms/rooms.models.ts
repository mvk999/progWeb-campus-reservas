import { ApiAvailability, ApiEnvironment } from '../../core/campus-api.service';

export type RoomAvailabilityStatus = 'Livre' | 'Pendente' | 'Aprovado' | 'Bloqueado' | 'Sem dados';
export type RoomsViewMode = 'agenda' | 'lista' | 'cards';
export type RoomSortOrder = 'nome' | 'capacidade';

export interface RoomListItem extends ApiEnvironment {
  readonly buildingName: string;
  readonly campusName: string;
}

export interface RoomsFilterState {
  readonly campus: string;
  readonly building: string;
  readonly category: string;
  readonly minimumCapacity: number | null;
}

export interface WeekDay {
  readonly date: string;
  readonly shortName: string;
  readonly dayNumber: string;
}

export type AvailabilityByRoom = Readonly<Record<string, ApiAvailability['occupied']>>;
