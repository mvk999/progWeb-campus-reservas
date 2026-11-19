import { Injectable, inject, signal } from '@angular/core';
import { CampusApiService } from '../../core/campus-api.service';
import { apiErrorMessage } from '../../core/api-error';
import { OccupancyItem, OccupancyWeek } from './occupancy-calendar.models';

@Injectable({ providedIn: 'root' })
export class OccupancyCalendarService {
  private readonly api = inject(CampusApiService);
  readonly week = signal<OccupancyWeek>({ startDate: '', endDate: '', items: [] });
  readonly loading = signal(false);
  readonly error = signal('');
  readonly timeSlots = ['08:00', '10:00', '12:00', '14:00', '16:00'] as const;

  loadWeek(startDate: string, endDate: string): void {
    this.loading.set(true); this.error.set('');
    this.api.getOccupancy(startDate, endDate).subscribe({
      next: response => {
        const items: OccupancyItem[] = response.items.map(item => ({
          ...item,
          status: item.type === 'BLOQUEIO' ? 'Bloqueado' : item.type === 'APROVADA' ? 'Aprovada' : 'Pendente',
        }));
        this.week.set({ startDate: response.start, endDate: response.end, items });
        this.loading.set(false);
      },
      error: error => { this.week.set({ startDate, endDate, items: [] }); this.error.set(apiErrorMessage(error)); this.loading.set(false); },
    });
  }

  getItem(date: string, startTime: string, endTime: string): OccupancyItem | undefined {
    return this.week().items.find(item => item.date === date && item.startTime < endTime && item.endTime > startTime);
  }
}
