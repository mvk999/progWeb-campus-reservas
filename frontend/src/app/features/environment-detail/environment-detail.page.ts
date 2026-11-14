import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CalendarDay, DemonstrationPeriod } from './environment-detail.models';
import { EnvironmentDetailService } from './environment-detail.service';

@Component({
  selector: 'app-environment-detail-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './environment-detail.page.html',
  styleUrl: './environment-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnvironmentDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly detailService = inject(EnvironmentDetailService);
  protected readonly code = this.route.snapshot.paramMap.get('codigo') ?? 'AMB-001';
  protected readonly environment = this.detailService.getEnvironment(this.code);
  protected readonly month = signal(new Date(2026, 9, 1, 12));
  protected readonly selectedDate = signal('2026-10-22');
  protected readonly selectedPeriod = signal('08:00');
  protected readonly days = computed(() => this.buildCalendarDays());
  protected readonly periods = computed(() => this.detailService.getPeriods(this.code, this.selectedDate()));
  protected readonly currentPeriod = computed(() =>
    this.periods().find((period) => period.startTime === this.selectedPeriod()) ?? null,
  );
  protected readonly canRequest = computed(() => this.currentPeriod()?.availability === 'available');
  protected readonly monthLabel = computed(() => new Intl.DateTimeFormat('pt-BR', {
    month: 'long', year: 'numeric',
  }).format(this.month()));
  protected readonly selectedDateLabel = computed(() => this.formatDate(this.selectedDate()));
  protected readonly requestQueryParams = computed(() => ({
    data: this.selectedDate(),
    inicio: this.currentPeriod()?.startTime ?? '',
    fim: this.currentPeriod()?.endTime ?? '',
  }));

  protected changeMonth(delta: number): void {
    const currentMonth = this.month();
    const selectedDate = new Date(`${this.selectedDate()}T12:00:00`);
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1, 12);
    this.month.set(next);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0, 12).getDate();
    selectedDate.setFullYear(next.getFullYear(), next.getMonth(), Math.min(selectedDate.getDate(), lastDay));
    this.selectedDate.set(this.toIsoDate(selectedDate));
    this.selectedPeriod.set('08:00');
  }

  protected selectDate(day: CalendarDay): void {
    if (day.disabled) return;
    this.selectedDate.set(day.date);
    this.selectedPeriod.set('08:00');
  }

  protected selectPeriod(period: DemonstrationPeriod): void {
    if (period.availability !== 'unavailable') this.selectedPeriod.set(period.startTime);
  }

  protected periodLabel(period: DemonstrationPeriod): string {
    return `${period.startTime}–${period.endTime}`;
  }

  protected periodStatusLabel(period: DemonstrationPeriod): string {
    switch (period.availability) {
      case 'available': return 'Disponível na demonstração';
      case 'unavailable': return 'Indisponível';
      default: return 'Sem dado demonstrativo';
    }
  }

  protected get requestRoute(): string[] {
    return ['/solicitar', this.code];
  }

  private buildCalendarDays(): (CalendarDay | null)[] {
    const year = this.month().getFullYear();
    const month = this.month().getMonth();
    const firstWeekday = (new Date(year, month, 1, 12).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0, 12).getDate();
    const blanks: (CalendarDay | null)[] = Array.from({ length: firstWeekday }, () => null);
    const days = Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(year, month, index + 1, 12);
      const iso = this.toIsoDate(date);
      return {
        date: iso,
        dayNumber: index + 1,
        disabled: this.detailService.isObservedInitialDayDisabled(iso),
      } satisfies CalendarDay;
    });
    return [...blanks, ...days];
  }

  private toIsoDate(date: Date): string {
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
  }

  private formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      .format(new Date(`${value}T12:00:00`));
  }
}
