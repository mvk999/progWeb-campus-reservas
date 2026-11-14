export type LegacyAvailability = 'Livre' | 'Pendente' | 'Aprovado' | 'Bloqueado';

export interface LegacyAvailabilitySample {
  readonly date: string;
  readonly hour: number;
  readonly status: Exclude<LegacyAvailability, 'Livre'>;
}

export interface LegacyRoom {
  readonly code: string;
  readonly name: string;
  readonly campus: string;
  readonly buildingCode: string;
  readonly buildingName: string;
  readonly location: string;
  readonly category: string;
  readonly capacity: number;
  readonly features: readonly string[];
  readonly samples: readonly LegacyAvailabilitySample[];
}

export interface LegacyRoomFilters {
  readonly date: string;
  readonly campus: string;
  readonly building: string;
  readonly category: string;
  readonly minimumCapacity: number | null;
  readonly onlyAvailable: boolean;
  readonly features: readonly string[];
  readonly startTime: string;
  readonly endTime: string;
}
