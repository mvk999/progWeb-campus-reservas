import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CampusGeographicMap } from './campus-geographic-map';
import { CampusBuilding } from './campus-map.models';
import { CampusMapService } from './campus-map.service';
import { apiErrorMessage, loginRequired } from '../../core/api-error';

const DAY_START = 8 * 60;
const DAY_END = 20 * 60;

function todayIso(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function clockTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

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
  protected readonly snapshot = signal({ map: this.mapService.emptyMap(), period: { date: todayIso(), startTime: '08:00', endTime: '10:00' } });
  protected get data() { return this.snapshot().map; }
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly loginRequired = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly minimumCapacity = signal(0);
  protected readonly selectedCode = signal<string | null>(this.route.snapshot.queryParamMap.get('predio'));
  protected readonly queryDate = signal(todayIso());
  protected readonly startTime = signal('08:00');
  protected readonly endTime = signal('10:00');
  protected readonly periodError = signal('');
  protected readonly periodFeedback = signal('');
  protected readonly appliedPeriod = computed(() => this.snapshot().period);
  protected readonly dayStart = DAY_START;
  protected readonly dayEnd = DAY_END;
  protected readonly durations = [30, 60, 120];
  protected readonly clockMarks = ['08h', '11h', '14h', '17h', '20h'];
  protected readonly startMinute = computed(() => minutesOf(this.appliedPeriod().startTime));
  protected readonly duration = computed(() => minutesOf(this.appliedPeriod().endTime) - this.startMinute());
  protected readonly latestStart = computed(() => Math.max(DAY_START, DAY_END - this.duration()));
  protected readonly percent = computed(() => (this.startMinute() - DAY_START) / (DAY_END - DAY_START) * 100);
  protected readonly durationPercent = computed(() => this.duration() / (DAY_END - DAY_START) * 100);
  protected readonly mobileDetails = signal(false);
  protected readonly selectionVersion = signal(this.route.snapshot.queryParamMap.has('predio') ? 1 : 0);
  @ViewChild('buildingPanel') private buildingPanel?: ElementRef<HTMLElement>;
  private panelTrigger?: HTMLElement;

  constructor() { this.applyPeriod(); }

  private readonly schedules = computed(() => {
    return new Map(this.data.buildings.flatMap(building => building.rooms.map(room => {
      const busy = room.occupied.filter(slot => slot.type === 'APROVADA' || slot.type === 'BLOQUEIO')
        .map(slot => ({ startTime: slot.startTime, endTime: slot.endTime }))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      const windows: { startTime: string; endTime: string }[] = [];
      let cursor = '08:00';
      for (const slot of busy) {
        if (slot.endTime <= cursor || slot.startTime >= '20:00') continue;
        if (slot.startTime > cursor) windows.push({ startTime: cursor, endTime: slot.startTime });
        if (slot.endTime > cursor) cursor = slot.endTime;
      }
      if (cursor < '20:00') windows.push({ startTime: cursor, endTime: '20:00' });
      return [room.code, { windows, known: true }] as const;
    })));
  });

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
    return building ? this.matchingRooms(building) : [];
  });

  protected readonly roomAvailability = computed(() => {
    const { startTime, endTime } = this.appliedPeriod();
    const duration = this.duration();
    return new Map([...this.schedules()].map(([code, schedule]) => {
      const current = schedule.windows.find(window => window.startTime <= startTime && window.endTime >= endTime);
      const next = schedule.windows.flatMap(window => {
        const start = Math.max(minutesOf(window.startTime), minutesOf(startTime));
        return start + duration <= minutesOf(window.endTime) ? [{ start, until: window.endTime }] : [];
      })[0];
      return [code, { current, next, known: schedule.known }] as const;
    }));
  });

  protected readonly buildingCounts = computed(() => {
    const availability = this.roomAvailability();
    return Object.fromEntries(this.filteredBuildings().map(building => {
      const rooms = this.matchingRooms(building);
      const known = rooms.some(room => availability.get(room.code)?.known);
      const count = rooms.filter(room => availability.get(room.code)?.current).length;
      return [building.code, known ? count : null];
    }));
  });
  protected readonly roomsByAvailability = computed(() => {
    const availability = this.roomAvailability();
    return [...this.filteredRooms()].sort((a, b) =>
      Number(!!availability.get(b.code)?.current) - Number(!!availability.get(a.code)?.current),
    );
  });

  protected readonly totalAvailable = computed(() => {
    const counts = Object.values(this.buildingCounts()).filter(count => count !== null);
    return counts.length ? counts.reduce((total, count) => total + count, 0) : null;
  });
  protected readonly availabilityLabel = computed(() => {
    const total = this.totalAvailable();
    if (total === null) return this.filteredBuildings().length ? 'Sem dados para a consulta' : 'Nenhum prédio nos filtros';
    return total === 1 ? '1 sala livre' : `${total} salas livres`;
  });

  protected readonly nextOpening = computed(() =>
    this.filteredRooms().map(room => this.roomAvailability().get(room.code)?.next?.start)
      .filter((minute): minute is number => minute !== undefined && minute > this.startMinute())
      .sort((a, b) => a - b)[0],
  );

  protected readonly openingMarks = computed(() => {
    const rooms = this.selectedBuilding() ? this.filteredRooms() : this.filteredBuildings().flatMap(building => this.matchingRooms(building));
    const minutes = new Set(rooms.flatMap(room => this.schedules().get(room.code)?.windows.flatMap(window =>
      [minutesOf(window.startTime), minutesOf(window.endTime)]) ?? []));
    return [...minutes].filter(minute => minute > DAY_START && minute < DAY_END).sort((a, b) => a - b);
  });

  private matchingRooms(building: CampusBuilding) {
    const query = this.searchTerm().trim().toLocaleLowerCase('pt-BR');
    const buildingMatches = `${building.code} ${building.name} ${building.fullName}`.toLocaleLowerCase('pt-BR').includes(query);
    return building.rooms.filter(room => room.capacity >= this.minimumCapacity() &&
      (buildingMatches || `${room.name} ${room.category ?? ''} ${room.features?.join(' ') ?? ''}`.toLocaleLowerCase('pt-BR').includes(query)));
  }

  protected selectBuilding(building: CampusBuilding): void {
    const active = document.activeElement;
    this.panelTrigger = active instanceof HTMLElement ? active : undefined;
    this.selectedCode.set(building.code);
    this.selectionVersion.update(version => version + 1);
    this.mobileDetails.set(true);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { predio: building.code }, queryParamsHandling: 'merge', replaceUrl: true });
    if (typeof matchMedia === 'function' && matchMedia('(max-width: 48rem)').matches) {
      requestAnimationFrame(() => this.buildingPanel?.nativeElement.focus({ preventScroll: true }));
    }
  }

  protected clearSelection(): void {
    this.mobileDetails.set(false);
    this.selectedCode.set(null);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { predio: null }, queryParamsHandling: 'merge', replaceUrl: true });
    this.panelTrigger?.focus({ preventScroll: true });
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }
  protected updateCapacity(event: Event): void {
    this.minimumCapacity.set(Number((event.target as HTMLSelectElement).value));
  }

  protected changeTimelineDate(event: Event): void {
    this.queryDate.set((event.target as HTMLInputElement).value);
    this.startTime.set(this.appliedPeriod().startTime);
    this.endTime.set(this.appliedPeriod().endTime);
    this.periodFeedback.set('');
    this.updatePeriod(event);
  }

  protected scrub(event: Event): void {
    this.selectTime(Number((event.target as HTMLInputElement).value));
  }

  protected selectTime(minute: number, duration = this.duration()): void {
    const start = Math.max(DAY_START, Math.min(minute, DAY_END - duration));
    this.startTime.set(clockTime(start));
    this.endTime.set(clockTime(start + duration));
    this.queryDate.set(this.appliedPeriod().date);
    this.periodError.set('');
    this.periodFeedback.set('');
    this.applyPeriod();
  }

  protected readonly clockTime = clockTime;

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
    if (minutesOf(this.startTime()) < DAY_START || minutesOf(this.endTime()) > DAY_END) {
      this.periodError.set('Escolha um horário entre 08:00 e 20:00.');
      return;
    }

    this.periodError.set('');
    this.applyPeriod();
    this.periodFeedback.set('Consultando horários atualizados…');
  }

  private applyPeriod(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.loginRequired.set(false);
    this.mapService.getMapForPeriod({
      date: this.queryDate(),
      startTime: this.startTime(),
      endTime: this.endTime(),
    }).subscribe({
      next: snapshot => {
        this.snapshot.set(snapshot);
        this.loading.set(false);
        this.periodFeedback.set('Horários atualizados com os dados do campus.');
      },
      error: error => {
        this.loadError.set(apiErrorMessage(error));
        this.loginRequired.set(loginRequired(error));
        this.loading.set(false);
      },
    });
  }

  protected retry(): void { this.applyPeriod(); }

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
