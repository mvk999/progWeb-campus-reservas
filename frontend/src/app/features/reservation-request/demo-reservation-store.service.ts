import { Injectable } from '@angular/core';
import { DemonstrationReservation, ReservationDraft, ReservationStoreReadResult } from './reservation-request.models';
import { RESERVATION_STORAGE_KEY } from './reservation-request.fixtures';

/** The only persistence boundary for demonstration requests; no remote operation is made. */
@Injectable({ providedIn: 'root' })
export class DemoReservationStore {
  readAll(): ReservationStoreReadResult {
    let raw: string | null | undefined;
    try {
      raw = globalThis.localStorage?.getItem(RESERVATION_STORAGE_KEY);
    } catch {
      return { ok: false, reason: 'storage', message: 'Não foi possível ler os pedidos locais deste navegador.' };
    }
    if (raw == null || raw === '') return { ok: true, reservations: [] };

    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      return { ok: false, reason: 'invalid-data', message: 'Os dados locais dos pedidos estão inválidos e não podem ser exibidos.' };
    }
    if (!Array.isArray(value) || !value.every((record) => this.isReservation(record))) {
      return { ok: false, reason: 'invalid-data', message: 'Os dados locais dos pedidos têm um formato inválido e não podem ser exibidos.' };
    }
    return { ok: true, reservations: value };
  }

  getAll(): readonly DemonstrationReservation[] {
    const result = this.readAll();
    return result.ok ? result.reservations : [];
  }

  save(draft: ReservationDraft): DemonstrationReservation {
    const record: DemonstrationReservation = {
      ...draft,
      id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      source: 'demo-local',
    };
    const read = this.readAll();
    if (!read.ok) throw new Error(read.message);
    const records = [...read.reservations, record];
    globalThis.localStorage?.setItem(RESERVATION_STORAGE_KEY, JSON.stringify(records));
    return record;
  }

  private isReservation(value: unknown): value is DemonstrationReservation {
    if (!value || typeof value !== 'object') return false;
    const record = value as Partial<DemonstrationReservation>;
    return typeof record.id === 'string' &&
      typeof record.environmentCode === 'string' && record.environmentCode.length > 0 &&
      typeof record.date === 'string' && this.isValidDate(record.date) &&
      typeof record.startTime === 'string' && this.isValidTime(record.startTime) &&
      typeof record.endTime === 'string' && this.isValidTime(record.endTime) &&
      typeof record.purpose === 'string' &&
      typeof record.participants === 'number' && Number.isInteger(record.participants) && record.participants > 0 &&
      typeof record.observations === 'string' &&
      typeof record.acceptedRules === 'boolean' &&
      typeof record.createdAt === 'string' && !Number.isNaN(Date.parse(record.createdAt)) &&
      record.source === 'demo-local';
  }

  private isValidDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  private isValidTime(value: string): boolean {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) return false;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  }
}
