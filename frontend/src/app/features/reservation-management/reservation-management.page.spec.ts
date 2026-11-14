import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { routes } from '../../app.routes';
import { MANAGEMENT_DECISIONS_STORAGE_KEY } from './reservation-management.fixtures';
import { ReservationManagementPage } from './reservation-management.page';
import { ReservationManagementService } from './reservation-management.service';

describe('ReservationManagementPage', () => {
  beforeEach(async () => {
    localStorage.removeItem(MANAGEMENT_DECISIONS_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [ReservationManagementPage],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  function createPage() {
    const fixture = TestBed.createComponent(ReservationManagementPage);
    fixture.detectChanges();
    return fixture;
  }

  it('shows six explicitly synthetic requests and observed indicator totals', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.requests-table tbody tr').length).toBe(6);
    expect(host.querySelectorAll('.metric strong')[0].textContent).toBe('2');
    expect(host.querySelectorAll('.metric strong')[1].textContent).toBe('2');
    expect(host.querySelectorAll('.metric strong')[2].textContent).toBe('12');
    expect(host.textContent).toContain('dados sintéticos locais');
    expect(host.textContent).toContain('Solicitante demo 01');
    expect(host.textContent).not.toContain('Ana Ribeiro');
  });

  it('filters by resource and situation', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    const resource = host.querySelector<HTMLSelectElement>('.filters label:first-child select')!;
    resource.value = 'AMB-001';
    resource.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    expect(host.querySelectorAll('.requests-table tbody tr').length).toBe(1);

    const status = host.querySelector<HTMLSelectElement>('.filters label:last-child select')!;
    status.value = 'Pendente';
    status.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    expect(host.querySelectorAll('.requests-table tbody tr').length).toBe(1);
    expect(host.querySelector('.requests-table tbody')?.textContent).toContain('RES-001');
  });

  it('shows pending details, conflict notice and persists an explicit local-only decision', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('.requests-table tbody tr:first-child .row-action')!.click();
    fixture.detectChanges();
    expect(host.querySelector('[role="dialog"] h2')?.textContent).toBe('Analisar solicitação');
    expect(host.querySelector('.request-details')?.textContent).toContain('Atividade acadêmica demonstrativa');
    expect(host.querySelector('.request-details')?.textContent).toContain('Solicitante demo 01');
    expect(host.querySelector('.conflict-note')?.textContent).toContain('Conflito sinalizado');
    expect(host.querySelectorAll('.dialog-actions .button--approve, .dialog-actions .button--reject').length).toBe(2);

    host.querySelector<HTMLButtonElement>('.button--approve')!.click();
    fixture.detectChanges();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(host.querySelector('[role="status"]')?.textContent).toContain('apenas nesta demonstração local');
    expect(host.querySelectorAll('.metric strong')[0].textContent).toBe('1');
    expect(host.querySelectorAll('.metric strong')[1].textContent).toBe('3');
    expect(JSON.parse(localStorage.getItem(MANAGEMENT_DECISIONS_STORAGE_KEY) ?? '[]')[0].status).toBe('Aprovada');
    const updatedAction = host.querySelector<HTMLButtonElement>('button[data-request-id="RES-001"]');
    expect(updatedAction?.textContent).toContain('Ver detalhes');
    expect(document.activeElement).toBe(updatedAction);
  });

  it('returns focus to the section heading when approval removes the row under the pending filter', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    const status = host.querySelector<HTMLSelectElement>('.filters label:last-child select')!;
    status.value = 'Pendente';
    status.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('button[data-request-id="RES-001"]')!.click();
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('.button--approve')!.click();
    fixture.detectChanges();

    expect(host.querySelectorAll('.requests-table tbody tr').length).toBe(1);
    expect(host.querySelector('button[data-request-id="RES-001"]')).toBeNull();
    expect(document.activeElement).toBe(host.querySelector('#requests-title'));
  });

  it('returns focus to the section heading when rejection removes the row action', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('button[data-request-id="RES-001"]')!.click();
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('.button--reject')!.click();
    fixture.detectChanges();

    expect(host.querySelector('button[data-request-id="RES-001"]')).toBeNull();
    expect(document.activeElement).toBe(host.querySelector('#requests-title'));
  });

  it('shows approved details read-only and closes with Escape while restoring focus', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    const action = host.querySelector<HTMLButtonElement>('.requests-table tbody tr:nth-child(2) .row-action')!;
    action.focus();
    action.click();
    fixture.detectChanges();
    expect(host.querySelector('[role="dialog"] h2')?.textContent).toBe('Detalhes da solicitação');
    expect(host.querySelector('.read-only-note')).not.toBeNull();
    expect(host.querySelector('.button--approve')).toBeNull();
    expect(host.querySelector('.button--reject')).toBeNull();
    host.querySelector<HTMLElement>('[role="dialog"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    fixture.detectChanges();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(action);
  });

  it('reports local storage decision failures without changing fixture status', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('.requests-table tbody tr:first-child .row-action')!.click();
    fixture.detectChanges();
    const writeSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    host.querySelector<HTMLButtonElement>('.button--reject')!.click();
    fixture.detectChanges();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível salvar');
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    expect(host.querySelector('.dialog-header .page-eyebrow')?.textContent).toContain('Pendente');
    expect(TestBed.inject(ReservationManagementService).readDecisions().ok).toBe(true);
    writeSpy.mockRestore();
  });
});
