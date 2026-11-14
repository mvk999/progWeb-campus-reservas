import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LEGACY_CAMPUS,
  LEGACY_FEATURE_OPTIONS,
  LEGACY_INITIAL_DATE,
  LEGACY_INITIAL_WEEK,
  LEGACY_ROOM_FIXTURES,
  LEGACY_TIME_HOURS,
} from './legacy-rooms.fixtures';
import { LegacyAvailability, LegacyRoom, LegacyRoomFilters } from './legacy-rooms.models';
import { LegacyRoomsService } from './legacy-rooms.service';

interface WeekDay { readonly date: string; readonly shortName: string; readonly dayNumber: string; }
type FilterKey = 'date' | 'campus' | 'building' | 'category' | 'minimumCapacity';

const initialFilters = (): LegacyRoomFilters => ({
  date: LEGACY_INITIAL_DATE, campus: '', building: '', category: '', minimumCapacity: null,
  onlyAvailable: false, features: [], startTime: '08:00', endTime: '10:00',
});

@Component({
  selector: 'app-legacy-rooms-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './legacy-rooms.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegacyRoomsPage {
  private readonly service = inject(LegacyRoomsService);
  protected readonly rooms = LEGACY_ROOM_FIXTURES;
  protected readonly hours = LEGACY_TIME_HOURS;
  protected readonly campus = LEGACY_CAMPUS;
  protected readonly featureOptions = LEGACY_FEATURE_OPTIONS;
  protected readonly categories = ['Sala de aula', 'Laboratório', 'Sala de reunião', 'Sala de estudo'] as const;
  protected readonly queryError = signal('');
  protected readonly searchTerm = signal('');
  protected readonly draftFilters = signal(initialFilters());
  protected readonly appliedFilters = signal(initialFilters());
  protected readonly advancedOpen = signal(false);
  protected readonly viewMode = signal<'agenda' | 'lista'>('agenda');
  protected readonly sortOrder = signal<'nome' | 'capacidade'>('nome');
  protected readonly selectedDate = signal(LEGACY_INITIAL_DATE);
  protected readonly weekStart = signal(LEGACY_INITIAL_WEEK);
  protected readonly weekDays = computed<readonly WeekDay[]>(() => {
    const start = new Date(`${this.weekStart()}T12:00:00`);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        date: this.toIsoDate(date),
        shortName: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date),
        dayNumber: String(date.getDate()).padStart(2, '0'),
      };
    });
  });
  protected readonly selectedDateLabel = computed(() => new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }).format(new Date(`${this.selectedDate()}T12:00:00`)));
  protected readonly weekRangeLabel = computed(() => {
    const start = new Date(`${this.weekStart()}T12:00:00`);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.getDate()}–${end.getDate()}/${String(end.getMonth() + 1).padStart(2, '0')}/${end.getFullYear()}`;
  });
  protected readonly listPeriodLabel = computed(() => `${this.appliedFilters().startTime} às ${this.appliedFilters().endTime}`);
  protected readonly buildingOptions = [...new Set(this.rooms.map((room) => room.buildingCode))];
  protected readonly filteredRooms = computed(() => {
    const filters = this.appliedFilters();
    const term = this.searchTerm().trim().toLocaleLowerCase('pt-BR');
    const rooms = this.rooms.filter((room) => {
      const matchesSearch = !term || [room.code, room.name, room.location, room.category, room.buildingName]
        .some((value) => value.toLocaleLowerCase('pt-BR').includes(term));
      return matchesSearch &&
        (!filters.campus || room.campus === filters.campus) &&
        (!filters.building || room.buildingCode === filters.building) &&
        (!filters.category || room.category === filters.category) &&
        (filters.minimumCapacity === null || room.capacity >= filters.minimumCapacity) &&
        (!filters.onlyAvailable || this.statusForPeriod(room, this.selectedDate(), filters.startTime, filters.endTime) === 'Livre') &&
        filters.features.every((feature) => room.features.includes(feature));
    });
    return [...rooms].sort((first, second) => this.sortOrder() === 'capacidade'
      ? first.capacity - second.capacity || first.name.localeCompare(second.name, 'pt-BR')
      : first.name.localeCompare(second.name, 'pt-BR'));
  });

  protected updateDraftFilter(key: FilterKey, value: string): void {
    this.draftFilters.update((filters) => ({
      ...filters,
      [key]: key === 'minimumCapacity' ? (value ? Number(value) : null) : value,
    }));
  }
  protected updateStart(event: Event): void { this.draftFilters.update((filters) => ({ ...filters, startTime: (event.target as HTMLInputElement).value })); }
  protected updateEnd(event: Event): void { this.draftFilters.update((filters) => ({ ...filters, endTime: (event.target as HTMLInputElement).value })); }
  protected setOnlyAvailable(event: Event): void { this.draftFilters.update((filters) => ({ ...filters, onlyAvailable: (event.target as HTMLInputElement).checked })); }
  protected toggleFeature(feature: string, checked: boolean): void {
    this.draftFilters.update((filters) => ({ ...filters, features: checked ? [...filters.features, feature] : filters.features.filter((value) => value !== feature) }));
  }
  protected updateSearch(event: Event): void { this.searchTerm.set((event.target as HTMLInputElement).value); }
  protected setSort(event: Event): void { this.sortOrder.set((event.target as HTMLSelectElement).value as 'nome' | 'capacidade'); }
  protected applyFilters(event: Event): void {
    event.preventDefault();
    const filters = this.draftFilters();
    if (!filters.date) { this.queryError.set('Informe uma data para consultar.'); return; }
    if (!filters.startTime || !filters.endTime || filters.endTime <= filters.startTime) {
      this.queryError.set('O término precisa ser posterior ao início.');
      return;
    }
    this.queryError.set('');
    this.appliedFilters.set({ ...filters, features: [...filters.features] });
    this.selectedDate.set(filters.date);
    this.weekStart.set(this.mondayOf(filters.date));
  }
  protected clearFilters(): void {
    const defaults = initialFilters();
    this.draftFilters.set(defaults);
    this.appliedFilters.set(initialFilters());
    this.searchTerm.set('');
    this.sortOrder.set('nome');
    this.selectedDate.set(LEGACY_INITIAL_DATE);
    this.weekStart.set(LEGACY_INITIAL_WEEK);
    this.viewMode.set('agenda');
    this.advancedOpen.set(false);
    this.queryError.set('');
  }
  protected toggleView(view: 'agenda' | 'lista'): void { this.viewMode.set(view); }
  protected setDay(date: string): void {
    this.selectedDate.set(date);
    this.draftFilters.update((filters) => ({ ...filters, date }));
  }
  protected moveDay(offset: number): void {
    const date = new Date(`${this.selectedDate()}T12:00:00`);
    date.setDate(date.getDate() + offset);
    this.setDay(this.toIsoDate(date));
    this.weekStart.set(this.mondayOf(this.selectedDate()));
  }
  protected moveWeek(offset: number): void {
    const date = new Date(`${this.weekStart()}T12:00:00`);
    date.setDate(date.getDate() + offset * 7);
    this.weekStart.set(this.toIsoDate(date));
    const selected = new Date(`${this.selectedDate()}T12:00:00`);
    selected.setDate(selected.getDate() + offset * 7);
    this.setDay(this.toIsoDate(selected));
  }
  protected toggleAdvanced(): void { this.advancedOpen.update((open) => !open); }
  protected updateDate(event: Event): void { this.updateDraftFilter('date', (event.target as HTMLInputElement).value); }
  protected buildingName(code: string): string {
    const room = this.rooms.find((item) => item.buildingCode === code);
    return room ? `${room.buildingCode} · ${room.buildingName}` : code;
  }
  protected status(room: LegacyRoom, hour: number): LegacyAvailability { return this.service.statusAt(room, this.selectedDate(), hour); }
  protected listStatus(room: LegacyRoom): LegacyAvailability {
    const filters = this.appliedFilters();
    return this.statusForPeriod(room, this.selectedDate(), filters.startTime, filters.endTime);
  }
  protected featuresForRoom(room: LegacyRoom): readonly string[] { return room.features; }
  protected statusClass(status: LegacyAvailability): string { return `availability--${status.toLocaleLowerCase('pt-BR')}`; }
  protected trackRoom(_index: number, room: LegacyRoom): string { return room.code; }
  protected trackDay(_index: number, day: WeekDay): string { return day.date; }
  protected trackHour(_index: number, hour: number): number { return hour; }

  private statusForPeriod(room: LegacyRoom, date: string, start: string, end: string): LegacyAvailability {
    return this.service.statusForPeriod(room, date, start, end);
  }
  private mondayOf(value: string): string {
    const date = new Date(`${value}T12:00:00`);
    const day = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - day);
    return this.toIsoDate(date);
  }
  private toIsoDate(value: Date): string {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
}
