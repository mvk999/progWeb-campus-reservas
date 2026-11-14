import { Injectable } from '@angular/core';
import {
  ENVIRONMENT_AVAILABILITY_FIXTURES,
  ENVIRONMENT_DETAIL_FIXTURES,
  INITIAL_DISABLED_DAYS,
} from './environment-detail.fixtures';
import { DemonstrationPeriod, EnvironmentDetail, PeriodAvailability } from './environment-detail.models';

@Injectable({ providedIn: 'root' })
export class EnvironmentDetailService {
  getEnvironment(code: string): EnvironmentDetail | null {
    return ENVIRONMENT_DETAIL_FIXTURES.find((environment) => environment.code === code) ?? null;
  }

  getPeriods(code: string, date: string): readonly DemonstrationPeriod[] {
    const fixture = ENVIRONMENT_AVAILABILITY_FIXTURES.find(
      (item) => item.environmentCode === code && item.date === date,
    );
    if (fixture) return fixture.periods;
    return Array.from({ length: 6 }, (_, index) => ({
      startTime: `${`${8 + index * 2}`.padStart(2, '0')}:00`,
      endTime: `${`${10 + index * 2}`.padStart(2, '0')}:00`,
      availability: 'unknown' as PeriodAvailability,
    }));
  }

  isObservedInitialDayDisabled(date: string): boolean {
    const value = new Date(`${date}T12:00:00`);
    return value.getFullYear() === INITIAL_DISABLED_DAYS.year &&
      value.getMonth() === INITIAL_DISABLED_DAYS.month &&
      value.getDate() <= INITIAL_DISABLED_DAYS.throughDay;
  }
}
