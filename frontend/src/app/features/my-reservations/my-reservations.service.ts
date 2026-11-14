import { Injectable, inject } from '@angular/core';
import { EnvironmentDetailService } from '../environment-detail/environment-detail.service';
import { DemoReservationStore } from '../reservation-request/demo-reservation-store.service';
import { LocalReservationView, MyReservationsReadResult } from './my-reservations.models';

@Injectable({ providedIn: 'root' })
export class MyReservationsService {
  private readonly store = inject(DemoReservationStore);
  private readonly environments = inject(EnvironmentDetailService);

  getLocalReservations(): MyReservationsReadResult {
    const read = this.store.readAll();
    if (!read.ok) return read;
    const reservations = [...read.reservations]
      .map((reservation) => {
        const environment = this.environments.getEnvironment(reservation.environmentCode);
        return {
          ...reservation,
          environmentName: environment?.name ?? `Ambiente ${reservation.environmentCode}`,
          buildingName: environment?.buildingName ?? 'Local demonstrativo',
        };
      })
      .sort((left, right) => left.date.localeCompare(right.date) || left.startTime.localeCompare(right.startTime));
    return { ok: true, reservations };
  }
}
