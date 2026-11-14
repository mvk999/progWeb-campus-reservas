import { Injectable } from '@angular/core';
import { CAMPUS_MAP_FIXTURE } from './campus-map.fixtures';
import { CampusMapPeriod, CampusMapSnapshot } from './campus-map.models';

/** Data boundary for the campus map; replace the fixture source when an API exists. */
@Injectable({ providedIn: 'root' })
export class CampusMapService {
  getMapForPeriod(period?: CampusMapPeriod): CampusMapSnapshot {
    return {
      map: CAMPUS_MAP_FIXTURE,
      period: period ?? {
        date: CAMPUS_MAP_FIXTURE.initialDate,
        startTime: CAMPUS_MAP_FIXTURE.initialStartTime,
        endTime: CAMPUS_MAP_FIXTURE.initialEndTime,
      },
    };
  }
}
