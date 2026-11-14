import { Injectable, inject } from '@angular/core';
import { RoomsService } from '../rooms/rooms.service';
import { AVAILABILITY_EXAMPLES, ROOM_FEATURE_EXAMPLES } from '../rooms/rooms.fixtures';
import { CAMPUS_MAP_FIXTURE } from '../campus-map/campus-map.fixtures';
import {
  ENVIRONMENT_AVAILABILITY_FIXTURES,
  ENVIRONMENT_DETAIL_FIXTURES,
  INITIAL_DISABLED_DAYS,
} from './environment-detail.fixtures';
import { DemonstrationPeriod, EnvironmentDetail, PeriodAvailability } from './environment-detail.models';

@Injectable({ providedIn: 'root' })
export class EnvironmentDetailService {
  private readonly rooms = inject(RoomsService);
  getEnvironment(code: string): EnvironmentDetail | null {
    const observed = ENVIRONMENT_DETAIL_FIXTURES.find((environment) => environment.code === code);
    if (observed) return observed;
    const room = this.rooms.getRooms().find(item => item.code === code);
    return room ? {
      code: room.code, name: room.name, category: room.category ?? 'Ambiente',
      buildingCode: room.buildingCode, buildingName: room.buildingName,
      location: `${room.campusName} · ${room.location}`, capacity: room.capacity,
      features: [...new Set([...(room.features ?? []), ...(ROOM_FEATURE_EXAMPLES.find(item => item.roomCode === code)?.features ?? [])])],
    } : null;
  }

  getPeriods(code: string, date: string): readonly DemonstrationPeriod[] {
    const fixture = ENVIRONMENT_AVAILABILITY_FIXTURES.find(
      (item) => item.environmentCode === code && item.date === date,
    );
    if (fixture) return fixture.periods;
    // Only the explicitly modeled demo dates have availability. AMB-001 keeps
    // its observed detailed fixture; arbitrary dates remain unverified.
    const modeledDate = date === CAMPUS_MAP_FIXTURE.initialDate || AVAILABILITY_EXAMPLES.some(slot => slot.date === date);
    const modeledEnvironment = code !== 'AMB-001' && !!this.getEnvironment(code);
    return Array.from({ length: 6 }, (_, index) => ({
      startTime: `${`${8 + index * 2}`.padStart(2, '0')}:00`,
      endTime: `${`${10 + index * 2}`.padStart(2, '0')}:00`,
      availability: modeledDate && modeledEnvironment
        ? this.rooms.getStatusForPeriod(code, date, `${`${8 + index * 2}`.padStart(2, '0')}:00`, `${`${10 + index * 2}`.padStart(2, '0')}:00`) === 'Livre' ? 'available' : 'unavailable'
        : 'unknown' as PeriodAvailability,
    }));
  }

  isObservedInitialDayDisabled(date: string): boolean {
    const value = new Date(`${date}T12:00:00`);
    return value.getFullYear() === INITIAL_DISABLED_DAYS.year &&
      value.getMonth() === INITIAL_DISABLED_DAYS.month &&
      value.getDate() <= INITIAL_DISABLED_DAYS.throughDay;
  }
}
