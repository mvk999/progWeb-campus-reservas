import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CampusGeographicMap } from './campus-geographic-map';
import { CampusBuilding, CampusMapSnapshot } from './campus-map.models';
import { CampusMapService } from './campus-map.service';

@Component({
  selector: 'app-campus-map-page',
  standalone: true,
  imports: [RouterLink, CampusGeographicMap],
  templateUrl: './campus-map.page.html',
  styleUrl: './campus-map.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampusMapPage {
  private readonly mapService = inject(CampusMapService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly snapshot = signal(this.mapService.getMapForPeriod());
  protected readonly data = this.snapshot().map;
  protected readonly searchTerm = signal('');
  protected readonly minimumCapacity = signal(0);
  protected readonly selectedCode = signal<string | null>(this.data.buildings.some(building => building.code === this.route.snapshot.queryParamMap.get('predio')) ? this.route.snapshot.queryParamMap.get('predio') : 'PV4');
  protected readonly queryDate = signal(this.data.initialDate);
  protected readonly startTime = signal(this.data.initialStartTime);
  protected readonly endTime = signal(this.data.initialEndTime);
  protected readonly periodError = signal('');
  protected readonly periodFeedback = signal('');
  protected readonly appliedPeriod = computed(() => this.snapshot().period);

  protected readonly filteredBuildings = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase('pt-BR');
    return this.data.buildings.filter((building) =>
      building.rooms.some(room => room.capacity >= this.minimumCapacity()) &&
      `${building.code} ${building.name} ${building.fullName} ${building.rooms.map(room => `${room.name} ${room.category ?? ''} ${room.features?.join(' ') ?? ''}`).join(' ')}`
        .toLocaleLowerCase('pt-BR')
        .includes(query),
    );
  });

  protected readonly selectedBuilding = computed(
    () => this.data.buildings.find((building) => building.code === this.selectedCode()) ?? null,
  );
  protected readonly matchingCodes = computed(() => this.filteredBuildings().map(building => building.code));
  protected readonly filteredRooms = computed(() => {
    const building = this.selectedBuilding();
    if (!building) return [];
    const query = this.searchTerm().trim().toLocaleLowerCase('pt-BR');
    const buildingMatches = `${building.code} ${building.name} ${building.fullName}`.toLocaleLowerCase('pt-BR').includes(query);
    return building.rooms.filter(room => room.capacity >= this.minimumCapacity() &&
      (buildingMatches || `${room.name} ${room.category ?? ''} ${room.features?.join(' ') ?? ''}`.toLocaleLowerCase('pt-BR').includes(query)));
  });

  protected selectBuilding(building: CampusBuilding): void {
    this.selectedCode.set(building.code);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { predio: building.code }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected clearSelection(): void {
    this.selectedCode.set(null);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { predio: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }
  protected updateCapacity(event: Event): void {
    this.minimumCapacity.set(Number((event.target as HTMLSelectElement).value));
  }

  protected updateDate(event: Event): void {
    this.queryDate.set((event.target as HTMLInputElement).value);
    this.periodError.set('');
    this.periodFeedback.set('');
  }

  protected updateStartTime(event: Event): void {
    this.startTime.set((event.target as HTMLInputElement).value);
    this.periodError.set('');
    this.periodFeedback.set('');
  }

  protected updateEndTime(event: Event): void {
    this.endTime.set((event.target as HTMLInputElement).value);
    this.periodError.set('');
    this.periodFeedback.set('');
  }

  protected updatePeriod(event: Event): void {
    event.preventDefault();
    if (!this.queryDate()) {
      this.periodError.set('Informe a data da consulta.');
      return;
    }
    if (!this.startTime() || !this.endTime() || this.startTime() >= this.endTime()) {
      this.periodError.set('Informe um período válido: o horário final deve ser posterior ao inicial.');
      return;
    }

    this.periodError.set('');
    const snapshot: CampusMapSnapshot = this.mapService.getMapForPeriod({
      date: this.queryDate(),
      startTime: this.startTime(),
      endTime: this.endTime(),
    });
    this.snapshot.set(snapshot);
    this.periodFeedback.set('Horários da demonstração atualizados.');
  }

  protected get displayDate(): string {
    const value = this.appliedPeriod().date;
    if (!value) return '';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  protected get displayPeriod(): string {
    return `${this.appliedPeriod().startTime}–${this.appliedPeriod().endTime}`;
  }
}
