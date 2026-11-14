import { Injectable } from '@angular/core';
import { CAMPUS_MAP_FIXTURE } from '../campus-map/campus-map.fixtures';
import { AdministrationEnvironment } from './administration-demo.models';

/** Read-only administration view assembled from existing local map fixtures. */
@Injectable({ providedIn: 'root' })
export class AdministrationDemoService {
  getEnvironments(): readonly AdministrationEnvironment[] {
    return CAMPUS_MAP_FIXTURE.buildings.flatMap((building) => building.rooms.map((room) => ({
      code: room.code,
      name: room.name,
      location: `${building.code} · ${building.name}`,
      responsible: 'Não informado na demonstração',
    })));
  }
}
