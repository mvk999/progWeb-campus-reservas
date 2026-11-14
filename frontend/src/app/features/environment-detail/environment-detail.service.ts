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
    const modeledDate = this.hasModeledDate(date);
    const modeledEnvironment = code !== 'AMB-001' && !!this.getEnvironment(code);
    if (modeledDate && modeledEnvironment) {
      const occupied = AVAILABILITY_EXAMPLES.filter(slot => slot.roomCode === code && slot.date === date);
      const boundaries = [...new Set([
        '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00',
        ...occupied.flatMap(slot => [slot.startTime, slot.endTime]),
      ])].sort();
      return boundaries.slice(0, -1).map((startTime, index) => {
        const endTime = boundaries[index + 1];
        return {
          startTime, endTime,
          availability: this.rooms.getStatusForPeriod(code, date, startTime, endTime) === 'Livre'
            ? 'available' : 'unavailable',
        };
      });
    }
    return Array.from({ length: 6 }, (_, index) => ({
      startTime: `${`${8 + index * 2}`.padStart(2, '0')}:00`,
      endTime: `${`${10 + index * 2}`.padStart(2, '0')}:00`,
      availability: 'unknown' as PeriodAvailability,
    }));
  }

  hasModeledDate(date: string): boolean {
    return date === CAMPUS_MAP_FIXTURE.initialDate || AVAILABILITY_EXAMPLES.some(slot => slot.date === date);
  }

  getFreeWindows(periods: readonly DemonstrationPeriod[]): readonly DemonstrationPeriod[] {
    const windows: DemonstrationPeriod[] = [];
    for (const period of periods) {
      if (period.availability !== 'available') continue;
      const previous = windows.at(-1);
      if (previous?.endTime === period.startTime) {
        windows[windows.length - 1] = { ...previous, endTime: period.endTime };
      } else {
        windows.push(period);
      }
    }
    return windows;
  }

  isPeriodAvailable(code: string, date: string, startTime: string, endTime: string): boolean {
    return startTime < endTime && this.getFreeWindows(this.getPeriods(code, date))
      .some(window => window.startTime <= startTime && window.endTime >= endTime);
  }

  isObservedInitialDayDisabled(date: string): boolean {
    const value = new Date(`${date}T12:00:00`);
    return value.getFullYear() === INITIAL_DISABLED_DAYS.year &&
      value.getMonth() === INITIAL_DISABLED_DAYS.month &&
      value.getDate() <= INITIAL_DISABLED_DAYS.throughDay;
  }
}
