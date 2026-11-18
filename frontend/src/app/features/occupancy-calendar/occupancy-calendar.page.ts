import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OccupancyItem, OccupancyStatus } from './occupancy-calendar.models';
import { OccupancyCalendarService } from './occupancy-calendar.service';

interface CalendarDay { readonly date: string; readonly label: string; readonly shortLabel: string; }
function mondayOf(date: Date): string {
  const value = new Date(date); value.setHours(12, 0, 0, 0); value.setDate(value.getDate() - (value.getDay() + 6) % 7);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-occupancy-calendar-page', standalone: true, imports: [RouterLink],
  templateUrl: './occupancy-calendar.page.html', styleUrl: './occupancy-calendar.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OccupancyCalendarPage {
  protected readonly service = inject(OccupancyCalendarService);
  protected readonly initialWeek = mondayOf(new Date());
  protected readonly weekStart = signal(this.initialWeek);
  protected readonly timeSlots = this.service.timeSlots;
  protected readonly days = computed<readonly CalendarDay[]>(() => {
    const start = new Date(`${this.weekStart()}T12:00:00`);
    return Array.from({ length: 5 }, (_, index) => {
      const date = new Date(start); date.setDate(start.getDate() + index);
      return {
        date: this.toIsoDate(date),
        label: new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }).format(date),
        shortLabel: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date),
      };
    });
  });
  protected readonly week = this.service.week;
  protected readonly weekLabel = computed(() => {
    const start = new Date(`${this.weekStart()}T12:00:00`), end = new Date(start); end.setDate(start.getDate() + 4);
    const fmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${fmt.format(start)} – ${fmt.format(end)}`;
  });

  constructor() { this.loadWeek(); }
  protected moveWeek(offset: number): void {
    const date = new Date(`${this.weekStart()}T12:00:00`); date.setDate(date.getDate() + offset * 7);
    this.weekStart.set(this.toIsoDate(date)); this.loadWeek();
  }
  protected resetWeek(): void { this.weekStart.set(this.initialWeek); this.loadWeek(); }
  protected itemAt(date: string, time: string): OccupancyItem | undefined { return this.service.getItem(date, time, this.nextTime(time)); }
  protected statusClass(status: OccupancyStatus): string { return `event--${status.toLocaleLowerCase('pt-BR')}`; }
  protected nextTime(time: string): string { return `${String(Number(time.slice(0, 2)) + 2).padStart(2, '0')}:00`; }
  protected trackItem(_index: number, item: OccupancyItem): string { return item.id; }
  protected trackDay(_index: number, day: CalendarDay): string { return day.date; }
  protected trackTime(_index: number, time: string): string { return time; }
  protected loadWeek(): void {
    const start = new Date(`${this.weekStart()}T12:00:00`), end = new Date(start); end.setDate(start.getDate() + 4);
    this.service.loadWeek(this.weekStart(), this.toIsoDate(end));
  }
  private toIsoDate(value: Date): string { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }
}
