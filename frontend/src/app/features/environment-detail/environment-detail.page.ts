import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
  private readonly queryParams = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly hasEditedSelection = signal(false);
  private readonly initialDate = this.initialDateFromRoute();
  protected readonly month = signal(new Date(`${this.initialDate}T12:00:00`));
  protected readonly selectedDate = signal(this.initialDate);
  protected readonly selectedPeriod = signal(this.route.snapshot.queryParamMap.get('inicio') ?? '08:00');
  protected readonly selectedEndTime = signal(this.route.snapshot.queryParamMap.get('fim') ?? '10:00');
  protected readonly days = computed(() => this.buildCalendarDays());
  protected readonly periods = computed(() => this.detailService.getPeriods(this.code, this.selectedDate()));
  protected readonly currentPeriod = computed(() =>
    this.periods().find((period) => period.startTime === this.selectedPeriod() && period.endTime === this.selectedEndTime()) ?? null,
  );
  protected readonly routeContextError = computed(() => {
    if (this.hasEditedSelection()) return '';
    const query = this.queryParams();
    const date = query.get('data');
    const start = query.get('inicio');
    const end = query.get('fim');
    if (!date && !start && !end) return '';
    if (!date || !this.isValidDate(date)) return 'A data recebida não é válida. Selecione outra data.';
    const period = this.detailService.getPeriods(this.code, date).find((item) => item.startTime === start && item.endTime === end);
    if (!period) return 'O período recebido não corresponde a um intervalo válido para esta demonstração.';
    if (period.availability === 'unknown') return 'Não há disponibilidade demonstrativa para esta data.';
    return '';
  });
  protected readonly canRequest = computed(() =>
    !this.routeContextError() && this.currentPeriod()?.availability === 'available',
  );
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
    this.selectedEndTime.set('10:00');
    this.hasEditedSelection.set(true);
  }

  protected selectDate(day: CalendarDay): void {
    if (day.disabled) return;
    this.selectedDate.set(day.date);
    this.selectedPeriod.set('08:00');
    this.selectedEndTime.set('10:00');
    this.hasEditedSelection.set(true);
  }

  protected selectPeriod(period: DemonstrationPeriod): void {
    if (period.availability !== 'unavailable') {
      this.selectedPeriod.set(period.startTime);
      this.selectedEndTime.set(period.endTime);
      this.hasEditedSelection.set(true);
    }
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

  private initialDateFromRoute(): string {
    const date = this.route.snapshot.queryParamMap.get('data');
    return date && this.isValidDate(date) ? date : '2026-10-22';
  }

  private isValidDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T12:00:00`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }
}
