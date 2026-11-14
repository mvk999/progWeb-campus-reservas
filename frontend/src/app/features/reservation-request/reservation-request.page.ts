import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EnvironmentDetailService } from '../environment-detail/environment-detail.service';
import { RESERVATION_SUMMARY_FIXTURES } from './reservation-request.fixtures';
import { DemoReservationStore } from './demo-reservation-store.service';
import { ReservationDraft, ReservationFormErrors } from './reservation-request.models';

@Component({
  selector: 'app-reservation-request-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './reservation-request.page.html',
  styleUrl: './reservation-request.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationRequestPage {
  private readonly route = inject(ActivatedRoute);
  private readonly detailService = inject(EnvironmentDetailService);
  private readonly store = inject(DemoReservationStore);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  private readonly queryParams = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  protected readonly code = computed(() => this.params().get('codigo') ?? 'AMB-001');
  protected readonly environment = computed(() => this.detailService.getEnvironment(this.code()));
  protected readonly date = computed(() => this.queryParams().get('data') ?? '2026-10-22');
  protected readonly startTime = computed(() => this.queryParams().get('inicio') ?? '08:00');
  protected readonly endTime = computed(() => this.queryParams().get('fim') ?? '10:00');
  protected readonly purpose = signal('');
  protected readonly participants = signal('');
  protected readonly observations = signal('');
  protected readonly acceptedRules = signal(false);
  protected readonly attempted = signal(false);
  protected readonly success = signal(false);
  protected readonly storageError = signal('');
  protected readonly errors = signal<ReservationFormErrors>({ purpose: '', participants: '', period: '', acceptedRules: '' });
  protected readonly summary = computed(() =>
    RESERVATION_SUMMARY_FIXTURES.find((fixture) => fixture.environmentCode === this.code()) ?? {
      environmentCode: this.code(),
      responsible: 'Informação demonstrativa do ambiente',
      approvalForecast: 'Sujeita à análise do responsável',
    },
  );
  protected readonly formattedDate = computed(() => {
    const date = this.date();
    const parsed = new Date(`${date}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? 'Data não informada' :
      new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(parsed);
  });
  protected readonly durationLabel = computed(() => {
    const start = this.toMinutes(this.startTime());
    const end = this.toMinutes(this.endTime());
    const minutes = end - start;
    if (!Number.isFinite(minutes) || minutes <= 0) return 'Período inválido';
    return minutes % 60 === 0 ? `${minutes / 60} ${minutes / 60 === 1 ? 'hora' : 'horas'}` : `${minutes} minutos`;
  });
  protected readonly changePeriodRoute = computed(() => ['/ambientes', this.code()]);
  protected readonly changePeriodQueryParams = computed(() => ({
    data: this.date(), inicio: this.startTime(), fim: this.endTime(),
  }));
  protected readonly requestCount = signal(this.store.getAll().length);

  protected setPurpose(event: Event): void { this.purpose.set((event.target as HTMLTextAreaElement).value); }
  protected setParticipants(event: Event): void { this.participants.set((event.target as HTMLInputElement).value); }
  protected setObservations(event: Event): void { this.observations.set((event.target as HTMLTextAreaElement).value); }
  protected setAccepted(event: Event): void { this.acceptedRules.set((event.target as HTMLInputElement).checked); }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.success()) return;
    this.attempted.set(true);
    const room = this.environment();
    const count = Number(this.participants());
    const periodAvailable = this.detailService.isPeriodAvailable(
      this.code(), this.date(), this.startTime(), this.endTime(),
    );
    const errors: ReservationFormErrors = {
      purpose: this.purpose().trim() ? '' : 'Informe a finalidade da reserva.',
      participants: !this.participants().trim() ? 'Informe a quantidade de participantes.' :
        !Number.isInteger(count) || count < 1 ? 'Informe uma quantidade inteira maior que zero.' :
          room && count > room.capacity ? `A capacidade máxima é de ${room.capacity} pessoas.` : '',
      period: !this.validDate(this.date()) || this.toMinutes(this.endTime()) <= this.toMinutes(this.startTime())
        ? 'O período informado é inválido.' : !periodAvailable
          ? 'Este período não está disponível na demonstração local. Altere o período.' : '',
      acceptedRules: this.acceptedRules() ? '' : 'Confirme o compromisso com as regras de utilização.',
    };
    this.errors.set(errors);
    if (Object.values(errors).some(Boolean) || !room) return;

    const draft: ReservationDraft = {
      environmentCode: room.code,
      date: this.date(),
      startTime: this.startTime(),
      endTime: this.endTime(),
      purpose: this.purpose().trim(),
      participants: count,
      observations: this.observations().trim(),
      acceptedRules: this.acceptedRules(),
    };
    this.storageError.set('');
    try {
      this.store.save(draft);
    } catch {
      this.storageError.set('Não foi possível salvar a solicitação demonstrativa neste navegador. Nenhum pedido foi registrado; tente novamente mais tarde.');
      return;
    }
    this.requestCount.set(this.store.getAll().length);
    this.success.set(true);
  }

  private validDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T12:00:00`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }
  private toMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : Number.NaN;
  }
}
