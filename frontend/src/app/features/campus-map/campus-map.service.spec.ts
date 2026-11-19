import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { CampusApiService } from '../../core/campus-api.service';
import { CampusMapService } from './campus-map.service';

describe('CampusMapService', () => {
  it('shows registered rooms when building codes use lowercase or surrounding whitespace', async () => {
    const environment = {
      code: 'gcc 106', name: 'gcc 106', category: 'Sala de aula',
      location: 'dcc', buildingCode: ' dcc ', capacity: 30,
      responsible: 'Responsável', features: [],
    };
    const occupied = [{ startTime: '09:00', endTime: '10:00', type: 'APROVADA' as const }];
    TestBed.configureTestingModule({
      providers: [{ provide: CampusApiService, useValue: {
        getEnvironments: () => of([environment]),
        getAvailability: () => of({ environmentCode: environment.code, date: '2026-11-20', occupied }),
      } }],
    });

    const snapshot = await firstValueFrom(TestBed.inject(CampusMapService).getMapForPeriod({
      date: '2026-11-20', startTime: '08:00', endTime: '10:00',
    }));

    expect(snapshot.map.buildings.map(building => building.code)).toEqual(['DCC']);
    expect(snapshot.map.buildings[0].rooms).toEqual([
      { code: environment.code, name: environment.name, category: environment.category,
        capacity: environment.capacity, features: environment.features, location: environment.location,
        responsible: environment.responsible, occupied },
    ]);
  });
});
