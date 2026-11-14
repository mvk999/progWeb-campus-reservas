import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DemonstrationManagementRequest, ManagementDecision, ManagementReadResult, ManagementRequestStatus } from './reservation-management.models';
import { ReservationManagementService } from './reservation-management.service';

@Component({
  selector: 'app-reservation-management-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './reservation-management.page.html',
  styleUrl: './reservation-management.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationManagementPage {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly service = inject(ReservationManagementService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly initialDecisionRead = this.service.readDecisions();
  protected readonly decisionRead = signal(this.initialDecisionRead);
  protected readonly requests = signal(this.service.getRequests(this.initialDecisionRead.ok ? this.initialDecisionRead.decisions : []));
  protected readonly storageError = computed(() => {
    const result = this.decisionRead();
    return result.ok ? '' : result.message;
  });
  protected readonly resourceFilter = signal('all');
  protected readonly statusFilter = signal<'all' | ManagementRequestStatus>('all');
  protected readonly selectedRequest = signal<DemonstrationManagementRequest | null>(null);
  protected readonly decisionError = signal('');
  protected readonly toast = signal('');
  protected readonly managedResourceCount = this.service.managedResourceCount;
  protected readonly resources = computed(() => [...new Set(this.requests().map((request) => request.environmentCode))]);
  protected readonly pendingCount = computed(() => this.decisionRead().ok ? this.service.countByStatus(this.requests(), 'Pendente') : '—');
  protected readonly approvedCount = computed(() => this.decisionRead().ok ? this.service.countByStatus(this.requests(), 'Aprovada') : '—');
  protected readonly visibleRequests = computed(() => this.requests().filter((request) =>
    (this.resourceFilter() === 'all' || request.environmentCode === this.resourceFilter()) &&
    (this.statusFilter() === 'all' || request.status === this.statusFilter()),
  ));
  protected readonly selectedReadOnly = computed(() => this.selectedRequest()?.status !== 'Pendente');
  protected readonly modalTitle = computed(() => this.selectedRequest()?.status === 'Pendente'
    ? 'Analisar solicitação' : 'Detalhes da solicitação');
  @ViewChild('firstModalControl') private firstModalControl?: ElementRef<HTMLButtonElement>;
  @ViewChild('modalDialog') private modalDialog?: ElementRef<HTMLElement>;
  private returnFocus?: HTMLElement;

  protected setResourceFilter(event: Event): void { this.resourceFilter.set((event.target as HTMLSelectElement).value); }
  protected setStatusFilter(event: Event): void { this.statusFilter.set((event.target as HTMLSelectElement).value as 'all' | ManagementRequestStatus); }
  protected statusClass(status: ManagementRequestStatus): string { return `status--${status.toLocaleLowerCase('pt-BR')}`; }
  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      .format(new Date(`${value}T12:00:00`));
  }
  protected trackRequest(_index: number, request: DemonstrationManagementRequest): string { return request.id; }

  protected openDetails(request: DemonstrationManagementRequest, event: Event): void {
    this.returnFocus = event.currentTarget as HTMLElement;
    this.selectedRequest.set(request);
    this.decisionError.set('');
    this.changeDetector.detectChanges();
    this.firstModalControl?.nativeElement.focus();
  }

  protected closeDialog(restoreFocus = true): void {
    this.selectedRequest.set(null);
    this.decisionError.set('');
    this.changeDetector.detectChanges();
    if (restoreFocus) this.returnFocus?.focus();
  }

  protected onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDialog();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...(this.modalDialog?.nativeElement.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], select:not([disabled])',
    ) ?? [])];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeDialog();
  }

  protected decide(status: ManagementDecision): void {
    const selected = this.selectedRequest();
    if (!selected || selected.status !== 'Pendente' || this.storageError()) return;
    try {
      this.service.decide(selected.id, status);
      const result: ManagementReadResult = this.service.readDecisions();
      this.decisionRead.set(result);
      if (!result.ok) throw new Error(result.message);
      this.requests.set(this.service.getRequests(result.decisions));
      this.toast.set(`Decisão ${status.toLocaleLowerCase('pt-BR')} salva apenas nesta demonstração local. Nenhuma decisão real foi registrada.`);
      this.closeDialog(false);
      const root = this.host.nativeElement as HTMLElement;
      const updatedAction = root.querySelector<HTMLButtonElement>(
        `button[data-request-id="${selected.id}"]`,
      );
      (updatedAction ?? root.querySelector<HTMLElement>('#requests-title'))?.focus();
    } catch {
      this.decisionError.set('Não foi possível salvar esta decisão demonstrativa no navegador. Nenhuma decisão foi alterada.');
    }
  }

  protected clearToast(): void { this.toast.set(''); }
}
