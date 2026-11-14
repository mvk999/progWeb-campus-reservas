import { Injectable } from '@angular/core';
import {
  OCCUPANCY_CALENDAR_FIXTURES,
  OCCUPANCY_CALENDAR_MANAGED_RESOURCES,
  OCCUPANCY_CALENDAR_TIME_SLOTS,
} from './occupancy-calendar.fixtures';
import { DemonstrationOccupancyItem, OccupancyWeek } from './occupancy-calendar.models';

/** Local demonstration data boundary; replace with an authorized API source when available. */
@Injectable({ providedIn: 'root' })
export class OccupancyCalendarService {
  readonly managedResourceCount = OCCUPANCY_CALENDAR_MANAGED_RESOURCES;
  readonly timeSlots = OCCUPANCY_CALENDAR_TIME_SLOTS;

  getWeek(startDate: string): OccupancyWeek {
    const start = new Date(`${startDate}T12:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 4);
    const endDate = this.toIsoDate(end);
    return {
      startDate,
      endDate,
      items: OCCUPANCY_CALENDAR_FIXTURES.filter((item) => item.date >= startDate && item.date <= endDate),
    };
  }

  getItem(startDate: string, date: string, startTime: string): DemonstrationOccupancyItem | undefined {
    return this.getWeek(startDate).items.find((item) => item.date === date && item.startTime === startTime);
  }

  private toIsoDate(value: Date): string {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
}
