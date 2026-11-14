import { Injectable } from '@angular/core';
import { LEGACY_ROOM_FIXTURES } from './legacy-rooms.fixtures';
import { LegacyAvailability, LegacyRoom } from './legacy-rooms.models';

/** Local demo data boundary for the previous interface route. */
@Injectable({ providedIn: 'root' })
export class LegacyRoomsService {
  getRooms(): readonly LegacyRoom[] { return LEGACY_ROOM_FIXTURES; }

  statusAt(room: LegacyRoom, date: string, hour: number): LegacyAvailability {
    return room.samples.find((sample) => sample.date === date && sample.hour === hour)?.status ?? 'Livre';
  }

  statusForPeriod(room: LegacyRoom, date: string, startTime: string, endTime: string): LegacyAvailability {
    const start = Number(startTime.slice(0, 2));
    const end = Number(endTime.slice(0, 2));
    const statuses = room.samples.filter((sample) => sample.date === date && sample.hour >= start && sample.hour < end).map((sample) => sample.status);
    if (statuses.includes('Bloqueado')) return 'Bloqueado';
    if (statuses.includes('Pendente')) return 'Pendente';
    if (statuses.includes('Aprovado')) return 'Aprovado';
    return 'Livre';
  }
}
