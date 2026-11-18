import { Injectable, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CampusApiService } from '../../core/campus-api.service';
import { apiErrorMessage, loginRequired } from '../../core/api-error';
import { CAMPUS_MAP_LAYOUT } from '../campus-map/campus-map-layout';
import { AvailabilityByRoom, RoomAvailabilityStatus, RoomListItem } from './rooms.models';

@Injectable({ providedIn: 'root' })
export class RoomsService {
  private readonly api = inject(CampusApiService);
  readonly rooms = signal<readonly RoomListItem[]>([]);
  readonly categories = signal<readonly string[]>([]);
  readonly availability = signal<AvailabilityByRoom>({});
  readonly loading = signal(false);
  readonly availabilityLoading = signal(false);
  readonly error = signal('');
  readonly loginRequired = signal(false);

  loadRooms(): void {
    this.loading.set(true);
    this.error.set('');
    this.loginRequired.set(false);
    forkJoin({ environments: this.api.getEnvironments(), categories: this.api.getCategories() }).subscribe({
      next: ({ environments, categories }) => {
        this.rooms.set(environments.map(environment => ({
          ...environment,
          buildingName: CAMPUS_MAP_LAYOUT.buildings.find(building => building.code === environment.buildingCode)?.name ?? environment.buildingCode,
          campusName: 'UFLA',
        })));
        this.categories.set(categories.map(category => category.name));
        this.loading.set(false);
      },
      error: error => { this.error.set(apiErrorMessage(error)); this.loginRequired.set(loginRequired(error)); this.rooms.set([]); this.loading.set(false); },
    });
  }

  loadAvailability(rooms: readonly RoomListItem[], date: string): void {
    if (!rooms.length) { this.availability.set({}); return; }
    this.availabilityLoading.set(true);
    forkJoin(rooms.map(room => this.api.getAvailability(room.code, date))).subscribe({
      next: values => {
        this.availability.set(Object.fromEntries(values.map(value => [value.environmentCode, value.occupied])));
        this.availabilityLoading.set(false);
      },
      error: error => { this.availability.set({}); this.error.set(apiErrorMessage(error)); this.availabilityLoading.set(false); },
    });
  }

  getStatusForHour(roomCode: string, date: string, hour: number): RoomAvailabilityStatus {
    return this.getStatusForPeriod(roomCode, date, `${String(hour).padStart(2, '0')}:00`, `${String(hour + 1).padStart(2, '0')}:00`);
  }

  getStatusForPeriod(roomCode: string, _date: string, startTime: string, endTime: string): RoomAvailabilityStatus {
    const occupied = this.availability()[roomCode];
    if (!occupied) return 'Sem dados';
    const overlaps = occupied.filter(slot => startTime < slot.endTime && endTime > slot.startTime);
    if (overlaps.some(slot => slot.type === 'BLOQUEIO')) return 'Bloqueado';
    if (overlaps.some(slot => slot.type === 'APROVADA')) return 'Aprovado';
    if (overlaps.some(slot => slot.type === 'PENDENTE')) return 'Pendente';
    return 'Livre';
  }

  isFreeForPeriod(roomCode: string, date: string, startTime: string, endTime: string): boolean {
    const status = this.getStatusForPeriod(roomCode, date, startTime, endTime);
    return status === 'Livre' || status === 'Pendente';
  }
}
