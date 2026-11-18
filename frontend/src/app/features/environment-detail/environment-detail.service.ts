import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { ApiAvailability, CampusApiService } from '../../core/campus-api.service';
import { CAMPUS_MAP_LAYOUT } from '../campus-map/campus-map-layout';
import { AvailabilityPeriod, EnvironmentDetail, PeriodAvailability } from './environment-detail.models';

@Injectable({ providedIn: 'root' })
export class EnvironmentDetailService {
  private readonly api = inject(CampusApiService);

  getEnvironment(code: string) {
    return this.api.getEnvironment(code).pipe(map(environment => ({
      ...environment,
      buildingName: CAMPUS_MAP_LAYOUT.buildings.find(building => building.code === environment.buildingCode)?.name ?? environment.buildingCode,
      buildingFullName: CAMPUS_MAP_LAYOUT.buildings.find(building => building.code === environment.buildingCode)?.fullName ?? environment.buildingCode,
    } satisfies EnvironmentDetail)));
  }

  getAvailability(code: string, date: string) { return this.api.getAvailability(code, date); }
  getPeriods(data: ApiAvailability): AvailabilityPeriod[] { return this.toPeriods(data); }

  statusForPeriod(availability: ApiAvailability | null, startTime: string, endTime: string): PeriodAvailability {
    if (!availability) return 'unavailable';
    const overlaps = availability.occupied.filter(slot => startTime < slot.endTime && endTime > slot.startTime);
    if (overlaps.some(slot => slot.type === 'BLOQUEIO' || slot.type === 'APROVADA')) return 'unavailable';
    return overlaps.some(slot => slot.type === 'PENDENTE') ? 'pending' : 'available';
  }

  isPastDate(date: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(`${date}T12:00:00`) < today;
  }

  private toPeriods(data: ApiAvailability): AvailabilityPeriod[] {
    return Array.from({ length: 6 }, (_, index) => {
      const startTime = `${String(8 + index * 2).padStart(2, '0')}:00`;
      const endTime = `${String(10 + index * 2).padStart(2, '0')}:00`;
      return { startTime, endTime, availability: this.statusForPeriod(data, startTime, endTime) };
    });
  }
}
