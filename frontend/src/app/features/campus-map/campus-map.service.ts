import { Injectable, inject } from '@angular/core';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { CampusApiService } from '../../core/campus-api.service';
import { CampusMapData, CampusMapPeriod, CampusMapSnapshot } from './campus-map.models';
import { CAMPUS_MAP_LAYOUT } from './campus-map-layout';

@Injectable({ providedIn: 'root' })
export class CampusMapService {
  private readonly api = inject(CampusApiService);

  emptyMap(): CampusMapData { return CAMPUS_MAP_LAYOUT; }

  getMapForPeriod(period: CampusMapPeriod) {
    return this.api.getEnvironments().pipe(switchMap(environments => {
      const visibleEnvironments = environments.filter(environment => !!environment.buildingCode);
      if (!visibleEnvironments.length) {
        return of({ map: { ...CAMPUS_MAP_LAYOUT, buildings: [] }, period });
      }
      return forkJoin(visibleEnvironments.map(environment =>
        this.api.getAvailability(environment.code, period.date).pipe(map(availability => ({ environment, availability }))),
      )).pipe(map(records => {
        const buildings = CAMPUS_MAP_LAYOUT.buildings.map(building => ({
          ...building,
          rooms: records.filter(({ environment }) => environment.buildingCode.trim().toUpperCase() === building.code).map(({ environment, availability }) => ({
            code: environment.code,
            name: environment.name,
            category: environment.category,
            capacity: environment.capacity,
            features: environment.features,
            location: environment.location,
            responsible: environment.responsible,
            occupied: availability.occupied,
          })),
        })).filter(building => building.rooms.length > 0);
        return { map: { ...CAMPUS_MAP_LAYOUT, buildings }, period } satisfies CampusMapSnapshot;
      }));
    }));
  }
}
