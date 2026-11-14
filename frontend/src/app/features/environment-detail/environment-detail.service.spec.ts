import { TestBed } from '@angular/core/testing';
import { EnvironmentDetailService } from './environment-detail.service';
import { RoomsService } from '../rooms/rooms.service';

describe('EnvironmentDetailService catalog integration', () => {
  it('resolves every catalog room and preserves unknown codes', () => {
    const service = TestBed.inject(EnvironmentDetailService);
    for (const room of TestBed.inject(RoomsService).getRooms()) {
      expect(service.getEnvironment(room.code)?.buildingCode).toBe(room.buildingCode);
      expect(service.getEnvironment(room.code)?.capacity).toBe(room.capacity);
    }
    expect(service.getEnvironment('INVALID')).toBeNull();
    expect(service.getEnvironment('AMB-002')?.name).toBe('Laboratório 101');
  });

  it('uses the modeled occupied period and leaves unmodeled dates unknown', () => {
    const service = TestBed.inject(EnvironmentDetailService);
    expect(service.getPeriods('AMB-002', '2026-10-23').find(period => period.startTime === '10:00')?.availability).toBe('unavailable');
    expect(service.getPeriods('AMB-002', '2026-10-22')[0].availability).toBe('available');
    expect(service.getPeriods('AMB-002', '2026-11-22').every(period => period.availability === 'unknown')).toBe(true);
  });
});
