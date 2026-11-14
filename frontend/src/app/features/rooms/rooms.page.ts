import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ADVANCED_ROOM_FEATURES, ROOM_FEATURE_EXAMPLES } from './rooms.fixtures';
import { RoomListItem, RoomsFilterState, RoomsViewMode, WeekDay } from './rooms.models';
import { RoomsService } from './rooms.service';

@Component({
  selector: 'app-rooms-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './rooms.page.html',
  styleUrl: './rooms.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomsPage {
  private readonly roomsService = inject(RoomsService);
  protected readonly allRooms = this.roomsService.getRooms();
  protected readonly viewMode = signal<RoomsViewMode>('agenda');
  protected readonly searchTerm = signal('');
  protected readonly advancedOpen = signal(false);
  protected readonly queryDate = signal('2026-10-23');
  protected readonly searchStart = signal('08:00');
  protected readonly searchEnd = signal('10:00');
  protected readonly appliedStart = signal('08:00');
  protected readonly appliedEnd = signal('10:00');
  protected readonly filterError = signal('');
  protected readonly filterFeedback = signal('');
  protected readonly selectedDay = signal('2026-10-23');
  protected readonly weekAnchor = signal('2026-10-23');
  protected readonly draftFilters = signal<RoomsFilterState>({
    campus: 'UFLA · Campus sede', building: '', category: '', minimumCapacity: null,
  });
  protected readonly appliedFilters = signal<RoomsFilterState>({
    campus: 'UFLA · Campus sede', building: '', category: '', minimumCapacity: null,
  });
  protected readonly onlyAvailable = signal(false);
  protected readonly advancedFeatures = signal<readonly string[]>([]);
  protected readonly sortOrder = signal<'nome' | 'capacidade'>('nome');
  protected readonly hours = Array.from({ length: 15 }, (_, index) => index + 7);
  protected readonly advancedFeatureOptions = ADVANCED_ROOM_FEATURES;
  private readonly demoFeatures = ROOM_FEATURE_EXAMPLES;
  protected readonly dateInvalid = computed(() => !!this.filterError() && !this.queryDate());
  protected readonly timeInvalid = computed(() => !!this.filterError() &&
    (!this.searchStart() || !this.searchEnd() || this.searchStart() >= this.searchEnd()));

  protected readonly weekDays = computed(() => {
    const anchor = new Date(`${this.weekAnchor()}T12:00:00`);
    const monday = new Date(anchor);
    const weekday = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - weekday);
    return Array.from({ length: 7 }, (_, index): WeekDay => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return {
        date: this.toIsoDate(date),
        shortName: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', ''),
        dayNumber: new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(date),
      };
    });
  });

  protected readonly filteredRooms = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase('pt-BR');
    const filters = this.appliedFilters();
    const selectedFeatures = this.advancedFeatures();
    const onlyAvailable = this.onlyAvailable();
    const rooms = this.allRooms.filter((room) => {
      const searchable = `${room.name} ${room.buildingCode} ${room.buildingName} ${room.location}`
        .toLocaleLowerCase('pt-BR');
      const roomFeatures = this.featuresForRoom(room);
      const status = this.roomsService.getStatusForPeriod(
        room.code, this.selectedDay(), this.appliedStart(), this.appliedEnd(),
      );
      return (!query || searchable.includes(query)) &&
        (!filters.campus || room.campusName === 'UFLA') &&
        (!filters.building || room.buildingCode === filters.building) &&
        (!filters.category || room.category === filters.category) &&
        (filters.minimumCapacity === null || room.capacity >= filters.minimumCapacity) &&
        (!onlyAvailable || status === 'Livre') &&
        selectedFeatures.every((feature) => roomFeatures.includes(feature));
    });
    return [...rooms].sort((a, b) => this.sortOrder() === 'nome'
      ? a.name.localeCompare(b.name, 'pt-BR') || a.buildingCode.localeCompare(b.buildingCode)
      : a.capacity - b.capacity || a.name.localeCompare(b.name, 'pt-BR'));
  });

  protected readonly selectedDateLabel = computed(() => this.formatDate(this.selectedDay()));
  protected readonly weekRangeLabel = computed(() => {
    const days = this.weekDays();
    const first = new Date(`${days[0].date}T12:00:00`);
    const last = new Date(`${days[6].date}T12:00:00`);
    const firstMonth = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(first);
    const lastMonth = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(last);
    const year = last.getFullYear();
    return first.getMonth() === last.getMonth()
      ? `${days[0].dayNumber}–${days[6].dayNumber} de ${lastMonth} de ${year}`
      : `${days[0].dayNumber} de ${firstMonth} – ${days[6].dayNumber} de ${lastMonth} de ${year}`;
  });

  protected buildingOptions(): string[] {
    return [...new Set(this.allRooms.map((room) => room.buildingCode))];
  }
  protected buildingName(code: string): string {
    return this.allRooms.find((room) => room.buildingCode === code)?.buildingName ?? code;
  }
  protected featuresForRoom(room: RoomListItem): readonly string[] {
    const example = this.demoFeatures.find((item) => item.roomCode === room.code);
    return [...new Set([...(room.features ?? []), ...(example?.features ?? [])])];
  }

  protected updateDraftFilter(key: keyof RoomsFilterState, value: string): void {
    this.draftFilters.update((filters) => ({
      ...filters,
      [key]: key === 'minimumCapacity' ? (value ? Number(value) : null) : value,
    }));
  }

  protected updateDate(event: Event): void { this.queryDate.set((event.target as HTMLInputElement).value); }
  protected updateStart(event: Event): void { this.searchStart.set((event.target as HTMLInputElement).value); }
  protected updateEnd(event: Event): void { this.searchEnd.set((event.target as HTMLInputElement).value); }
  protected updateSearch(event: Event): void { this.searchTerm.set((event.target as HTMLInputElement).value); }
  protected setSort(event: Event): void { this.sortOrder.set((event.target as HTMLSelectElement).value as 'nome' | 'capacidade'); }

  protected applyFilters(event: Event): void {
    event.preventDefault();
    if (!this.queryDate() || !this.searchStart() || !this.searchEnd() || this.searchStart() >= this.searchEnd()) {
      this.filterError.set('Informe uma data e um período válido, com o horário final posterior ao inicial.');
      this.filterFeedback.set('');
      return;
    }
    this.filterError.set('');
    this.appliedFilters.set({ ...this.draftFilters() });
    this.selectedDay.set(this.queryDate());
    this.weekAnchor.set(this.queryDate());
    this.appliedStart.set(this.searchStart());
    this.appliedEnd.set(this.searchEnd());
    this.filterFeedback.set('Consulta demonstrativa atualizada.');
  }

  protected clearFilters(): void {
    const defaults: RoomsFilterState = { campus: 'UFLA · Campus sede', building: '', category: '', minimumCapacity: null };
    this.draftFilters.set(defaults);
    this.appliedFilters.set(defaults);
    this.searchTerm.set('');
    this.queryDate.set('2026-10-23');
    this.selectedDay.set('2026-10-23');
    this.weekAnchor.set('2026-10-23');
    this.searchStart.set('08:00');
    this.searchEnd.set('10:00');
    this.appliedStart.set('08:00');
    this.appliedEnd.set('10:00');
    this.sortOrder.set('nome');
    this.onlyAvailable.set(false);
    this.advancedFeatures.set([]);
    this.filterError.set('');
    this.filterFeedback.set('Filtros demonstrativos limpos.');
  }

  protected toggleView(view: RoomsViewMode): void { this.viewMode.set(view); }
  protected toggleAdvanced(): void { this.advancedOpen.update((open) => !open); }
  protected toggleFeature(feature: string, checked: boolean): void {
    this.advancedFeatures.update((features) => checked ? [...features, feature] : features.filter((item) => item !== feature));
  }
  protected setDay(date: string): void { this.selectedDay.set(date); }
  protected moveDay(delta: number): void {
    const date = new Date(`${this.selectedDay()}T12:00:00`);
    date.setDate(date.getDate() + delta);
    this.selectedDay.set(this.toIsoDate(date));
    this.weekAnchor.set(this.toIsoDate(date));
  }
  protected moveWeek(delta: number): void {
    const date = new Date(`${this.selectedDay()}T12:00:00`);
    date.setDate(date.getDate() + delta * 7);
    const nextSelectedDay = this.toIsoDate(date);
    this.weekAnchor.set(nextSelectedDay);
    this.selectedDay.set(nextSelectedDay);
  }
  protected status(room: RoomListItem, hour: number): string {
    return this.roomsService.getStatusForHour(room.code, this.selectedDay(), hour);
  }
  protected listStatus(room: RoomListItem): string {
    return this.roomsService.getStatusForPeriod(room.code, this.selectedDay(), this.appliedStart(), this.appliedEnd());
  }
  protected trackRoom(_index: number, room: RoomListItem): string { return room.code; }
  protected get listPeriodLabel(): string { return `${this.appliedStart()} às ${this.appliedEnd()}`; }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  private formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      .format(new Date(`${value}T12:00:00`));
  }
}
