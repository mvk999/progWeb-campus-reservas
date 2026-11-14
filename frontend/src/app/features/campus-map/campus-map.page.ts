import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CampusMapCanvas } from './campus-map-canvas';
import { CampusBuilding, CampusMapSnapshot } from './campus-map.models';
import { CampusMapService } from './campus-map.service';

@Component({
  selector: 'app-campus-map-page',
  standalone: true,
  imports: [RouterLink, CampusMapCanvas],
  templateUrl: './campus-map.page.html',
  styleUrl: './campus-map.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampusMapPage {
  private readonly mapService = inject(CampusMapService);
  protected readonly snapshot = signal(this.mapService.getMapForPeriod());
  protected readonly data = this.snapshot().map;
  protected readonly searchTerm = signal('');
  protected readonly selectedCode = signal<string | null>('PV4');
  protected readonly queryDate = signal(this.data.initialDate);
  protected readonly startTime = signal(this.data.initialStartTime);
  protected readonly endTime = signal(this.data.initialEndTime);
  protected readonly periodError = signal('');
  protected readonly periodFeedback = signal('');
  protected readonly appliedPeriod = computed(() => this.snapshot().period);

  protected readonly filteredBuildings = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase('pt-BR');
    if (!query) return this.data.buildings;
    return this.data.buildings.filter((building) =>
      `${building.code} ${building.name} ${building.fullName}`
        .toLocaleLowerCase('pt-BR')
        .includes(query),
    );
  });

  protected readonly selectedBuilding = computed(
    () => this.data.buildings.find((building) => building.code === this.selectedCode()) ?? null,
  );

  protected selectBuilding(building: CampusBuilding): void {
    this.selectedCode.set(building.code);
  }

  protected clearSelection(): void {
    this.selectedCode.set(null);
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
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
