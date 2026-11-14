import { Injectable, inject } from '@angular/core';
import { CampusMapService } from '../campus-map/campus-map.service';
import { AVAILABILITY_EXAMPLES } from './rooms.fixtures';
import { RoomAvailabilityStatus, RoomListItem } from './rooms.models';

/** Local data boundary built on the campus map fixtures; replace with API later. */
@Injectable({ providedIn: 'root' })
export class RoomsService {
  private readonly campusMap = inject(CampusMapService);

  getRooms(): readonly RoomListItem[] {
    const { map } = this.campusMap.getMapForPeriod();
    return map.buildings.flatMap((building) =>
      building.rooms.map((room) => ({
        ...room,
        buildingCode: building.code,
        buildingName: building.name,
        campusName: map.campusName,
        location: map.location,
      })),
    );
  }

  getStatusForHour(roomCode: string, date: string, hour: number): RoomAvailabilityStatus {
    const minute = hour * 60;
    const example = AVAILABILITY_EXAMPLES.find((slot) => {
      const start = this.toMinutes(slot.startTime);
      const end = this.toMinutes(slot.endTime);
      return slot.roomCode === roomCode && slot.date === date && minute >= start && minute < end;
    });
    return example?.status ?? 'Livre';
  }

  getStatusForPeriod(
    roomCode: string,
    date: string,
    startTime: string,
    endTime: string,
  ): RoomAvailabilityStatus {
    const start = this.toMinutes(startTime);
    const end = this.toMinutes(endTime);
    const example = AVAILABILITY_EXAMPLES.find((slot) =>
      slot.roomCode === roomCode &&
      slot.date === date &&
      start < this.toMinutes(slot.endTime) &&
      end > this.toMinutes(slot.startTime),
    );
    return example?.status ?? 'Livre';
  }

  private toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
