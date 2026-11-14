export interface MapPosition {
  readonly x: number;
  readonly y: number;
}

export interface CampusBuilding {
  readonly code: string;
  readonly name: string;
  readonly fullName: string;
  readonly position: MapPosition;
  readonly rooms: readonly DemonstrationRoom[];
}

export interface DemonstrationRoom {
  readonly code: string;
  readonly name: string;
  readonly availability: 'Livre' | 'Ocupada';
  readonly capacity: number;
  readonly category?: string;
  readonly features?: readonly string[];
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
