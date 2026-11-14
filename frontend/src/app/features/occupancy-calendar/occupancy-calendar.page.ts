import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OCCUPANCY_CALENDAR_INITIAL_WEEK } from './occupancy-calendar.fixtures';
import { DemonstrationOccupancyItem, OccupancyStatus } from './occupancy-calendar.models';
import { OccupancyCalendarService } from './occupancy-calendar.service';

interface CalendarDay {
  readonly date: string;
  readonly label: string;
  readonly shortLabel: string;
}

@Component({
  selector: 'app-occupancy-calendar-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './occupancy-calendar.page.html',
  styleUrl: './occupancy-calendar.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OccupancyCalendarPage {
  private readonly service = inject(OccupancyCalendarService);
  protected readonly initialWeek = OCCUPANCY_CALENDAR_INITIAL_WEEK;
  protected readonly weekStart = signal(this.initialWeek);
  protected readonly managedResourceCount = this.service.managedResourceCount;
  protected readonly timeSlots = this.service.timeSlots;
  protected readonly days = computed<readonly CalendarDay[]>(() => {
    const start = new Date(`${this.weekStart()}T12:00:00`);
    return Array.from({ length: 5 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const iso = this.toIsoDate(date);
      return {
        date: iso,
        label: new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }).format(date),
        shortLabel: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date),
      };
    });
  });
  protected readonly week = computed(() => this.service.getWeek(this.weekStart()));
  protected readonly weekLabel = computed(() => {
    const week = this.week();
    const start = new Date(`${week.startDate}T12:00:00`);
    const end = new Date(`${week.endDate}T12:00:00`);
    if (start.getFullYear() !== end.getFullYear()) {
      const fullDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
      return `${fullDate.format(start)} – ${fullDate.format(end)}`;
    }
    if (start.getMonth() !== end.getMonth()) {
      const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' });
      const year = end.getFullYear();
      return `${start.getDate()} de ${month.format(start)} – ${end.getDate()} de ${month.format(end)} de ${year}`;
    }
    const monthYear = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(end);
    return `${start.getDate()}–${end.getDate()} de ${monthYear}`;
  });

  protected moveWeek(offset: number): void {
    const date = new Date(`${this.weekStart()}T12:00:00`);
    date.setDate(date.getDate() + offset * 7);
    this.weekStart.set(this.toIsoDate(date));
  }

  protected resetWeek(): void { this.weekStart.set(this.initialWeek); }
  protected itemAt(date: string, time: string): DemonstrationOccupancyItem | undefined {
    return this.service.getItem(this.weekStart(), date, time);
  }
  protected statusClass(status: OccupancyStatus): string { return `event--${status.toLocaleLowerCase('pt-BR')}`; }
  protected nextTime(time: string): string {
    const hour = Number(time.slice(0, 2)) + 2;
    return `${String(hour).padStart(2, '0')}:00`;
  }
  protected trackItem(_index: number, item: DemonstrationOccupancyItem): string { return item.id; }
  protected trackDay(_index: number, day: CalendarDay): string { return day.date; }
  protected trackTime(_index: number, time: string): string { return time; }

  private toIsoDate(value: Date): string {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
}
