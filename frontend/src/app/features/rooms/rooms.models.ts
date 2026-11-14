import { DemonstrationRoom } from '../campus-map/campus-map.models';

export type RoomAvailabilityStatus = 'Livre' | 'Pendente' | 'Aprovado' | 'Bloqueado';
export type RoomsViewMode = 'agenda' | 'lista' | 'cards';
export type RoomSortOrder = 'nome' | 'capacidade';

export interface RoomListItem extends DemonstrationRoom {
  readonly buildingCode: string;
  readonly buildingName: string;
  readonly campusName: string;
  readonly location: string;
}

export interface AvailabilityExample {
  readonly roomCode: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly status: Exclude<RoomAvailabilityStatus, 'Livre'>;
}

export interface RoomFeatureExample {
  readonly roomCode: string;
  readonly features: readonly string[];
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
