export interface MapPosition {
  readonly x: number;
  readonly y: number;
}

export interface CampusBuilding {
  readonly code: string;
  readonly name: string;
  readonly fullName: string;
  readonly position: MapPosition;
  readonly rooms: readonly CampusRoom[];
}

export interface CampusRoom {
  readonly code: string;
  readonly name: string;
  readonly capacity: number;
  readonly category?: string;
  readonly features?: readonly string[];
  readonly location?: string;
  readonly responsible?: string;
  readonly occupied: readonly {
    readonly startTime: string;
    readonly endTime: string;
    readonly type: 'APROVADA' | 'PENDENTE' | 'BLOQUEIO';
  }[];
}

export interface CampusMapData {
  readonly campusName: string;
  readonly location: string;
  readonly initialDate: string;
  readonly initialStartTime: string;
  readonly initialEndTime: string;
  readonly buildings: readonly CampusBuilding[];
}

export interface CampusMapPeriod {
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
}

export interface CampusMapSnapshot {
  readonly map: CampusMapData;
  readonly period: CampusMapPeriod;
}
