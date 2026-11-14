import { Injectable } from '@angular/core';
import { DemonstrationReservation, ReservationDraft } from './reservation-request.models';
import { RESERVATION_STORAGE_KEY } from './reservation-request.fixtures';

/** The only persistence boundary for demonstration requests; no remote operation is made. */
@Injectable({ providedIn: 'root' })
export class DemoReservationStore {
  getAll(): readonly DemonstrationReservation[] {
    try {
      const raw = globalThis.localStorage?.getItem(RESERVATION_STORAGE_KEY);
      if (!raw) return [];
      const value: unknown = JSON.parse(raw);
      return Array.isArray(value) ? value as DemonstrationReservation[] : [];
    } catch {
      return [];
    }
  }

  save(draft: ReservationDraft): DemonstrationReservation {
    const record: DemonstrationReservation = {
      ...draft,
      id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      source: 'demo-local',
    };
    const records = [...this.getAll(), record];
    globalThis.localStorage?.setItem(RESERVATION_STORAGE_KEY, JSON.stringify(records));
    return record;
  }
}
