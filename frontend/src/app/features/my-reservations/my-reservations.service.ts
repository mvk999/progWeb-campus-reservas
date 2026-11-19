import { Injectable, inject, signal } from '@angular/core';
import { forkJoin, map } from 'rxjs';
import { CampusApiService } from '../../core/campus-api.service';
import { apiErrorMessage } from '../../core/api-error';
import { LocalReservationView, MyReservationsTab } from './my-reservations.models';

@Injectable({ providedIn: 'root' })
export class MyReservationsService {
  private readonly api = inject(CampusApiService);
  readonly reservations = signal<readonly LocalReservationView[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly actionError = signal('');
  readonly cancellingId = signal<number | null>(null);

  load(tab: MyReservationsTab): void {
    this.loading.set(true); this.error.set('');
    const request = tab === 'calendar'
      ? forkJoin({ upcoming: this.api.getMyReservations('upcoming'), history: this.api.getMyReservations('history') }).pipe(
        map(data => [...data.upcoming, ...data.history]),
      )
      : this.api.getMyReservations(tab);
    request.subscribe({
      next: data => {
        this.reservations.set(data);
        this.loading.set(false);
      },
      error: error => { this.reservations.set([]); this.error.set(apiErrorMessage(error)); this.loading.set(false); },
    });
  }

  cancel(id: number, reloadTab: MyReservationsTab): void {
    this.cancellingId.set(id); this.actionError.set('');
    this.api.cancelReservation(id).subscribe({
      next: () => { this.cancellingId.set(null); this.load(reloadTab); },
      error: error => { this.cancellingId.set(null); this.actionError.set(apiErrorMessage(error)); },
    });
  }
}
