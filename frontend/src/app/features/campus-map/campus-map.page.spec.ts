import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { CampusMapPage } from './campus-map.page';
import { CampusMapService } from './campus-map.service';
import { CAMPUS_MAP_LAYOUT } from './campus-map-layout';
import { CampusMapPeriod, CampusMapSnapshot } from './campus-map.models';

describe('CampusMapPage timeline', () => {
  function setup() {
    const requests: { period: CampusMapPeriod; response: Subject<CampusMapSnapshot> }[] = [];
    const getMapForPeriod = vi.fn((period: CampusMapPeriod) => {
      const response = new Subject<CampusMapSnapshot>();
      requests.push({ period, response });
      return response;
    });
    TestBed.configureTestingModule({ providers: [
      { provide: CampusMapService, useValue: { emptyMap: () => CAMPUS_MAP_LAYOUT, getMapForPeriod } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
      { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
    ] });
    const page = TestBed.runInInjectionContext(() => new CampusMapPage());
    const respond = (index: number) => {
      const request = requests[index];
      request.response.next({ map: CAMPUS_MAP_LAYOUT, period: request.period });
      request.response.complete();
    };
    return { page, requests, respond, getMapForPeriod };
  }

  it('updates immediately during dragging and keeps the last interval when the API responds', () => {
    const { page, requests, respond } = setup();
    for (const minute of [540, 600, 665]) {
      page['scrub']({ target: { value: String(minute) } } as unknown as Event);
      expect(page['startMinute']()).toBe(minute);
    }
    expect(requests).toHaveLength(1);
    expect(page['displayPeriod']).toBe('11:05–13:05');
    respond(0);
    expect(page['displayPeriod']).toBe('11:05–13:05');
    expect(page['loading']()).toBe(false);
  });

  it('reuses daily availability when changing time or duration and clamps the interval to 20:00', () => {
    const { page, requests, respond } = setup();
    respond(0);
    page['selectTime'](600, 30);
    page['selectTime'](660);
    expect(page['displayPeriod']).toBe('11:00–11:30');
    page['selectTime'](1190, 120);
    expect(page['displayPeriod']).toBe('18:00–20:00');
    expect(page['latestStart']()).toBe(1080);
    expect(requests).toHaveLength(1);
  });

  it('cancels an old date request and preserves the newly selected date while dragging', () => {
    const { page, requests, respond } = setup();
    page['changeTimelineDate']({ target: { value: '2026-12-01' }, preventDefault() {} } as unknown as Event);
    expect(requests[0].response.observed).toBe(false);
    page['selectTime'](600);
    expect(page['appliedPeriod']().date).toBe('2026-12-01');
    expect(requests).toHaveLength(2);
    respond(1);
    respond(0);
    expect(page['displayPeriod']).toBe('10:00–12:00');
    expect(page['displayDate']).toBe('01/12/2026');
  });

  it('retries after a failed daily request', () => {
    const { page, requests, respond } = setup();
    requests[0].response.error(new Error('Falha na consulta'));
    expect(page['loadError']()).not.toBe('');
    page['retry']();
    expect(requests).toHaveLength(2);
    respond(1);
    expect(page['loadError']()).toBe('');
    expect(page['loading']()).toBe(false);
  });

  it('keeps an exact interval entered in the form when dragging afterward', () => {
    const { page, requests, respond } = setup();
    respond(0);
    page['updateStartTime']({ target: { value: '09:15' } } as unknown as Event);
    page['updateEndTime']({ target: { value: '10:45' } } as unknown as Event);
    page['updatePeriod']({ preventDefault() {} } as Event);
    expect(page['displayPeriod']).toBe('09:15–10:45');
    page['selectTime'](675);
    expect(page['displayPeriod']).toBe('11:15–12:45');
    expect(page['duration']()).toBe(90);
    expect(requests).toHaveLength(1);
  });

  it('reuses the loaded day and cancels a pending request when returning to that day', () => {
    const { page, requests, respond } = setup();
    respond(0);
    const originalDate = page['appliedPeriod']().date;
    page['changeTimelineDate']({ target: { value: '2026-12-01' }, preventDefault() {} } as unknown as Event);
    page['changeTimelineDate']({ target: { value: originalDate }, preventDefault() {} } as unknown as Event);
    expect(requests).toHaveLength(2);
    expect(requests[1].response.observed).toBe(false);
    expect(page['appliedPeriod']().date).toBe(originalDate);
    expect(page['loading']()).toBe(false);
  });

  it('cancels the pending request when leaving the page', () => {
    const { requests } = setup();
    TestBed.resetTestingModule();
    expect(requests[0].response.observed).toBe(false);
  });
});
