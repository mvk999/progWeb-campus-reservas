import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { routes } from '../../app.routes';
import { OccupancyCalendarPage } from './occupancy-calendar.page';

describe('OccupancyCalendarPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OccupancyCalendarPage],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  function createPage() {
    const fixture = TestBed.createComponent(OccupancyCalendarPage);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the captured week, synthetic status examples and resource links', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('#week-title')?.textContent).toContain('19–23 de outubro de 2026');
    expect(host.querySelectorAll('.calendar-grid thead th').length).toBe(6);
    expect(host.querySelectorAll('.calendar-event').length).toBe(4);
    expect(host.querySelector('.event--aprovada')).not.toBeNull();
    expect(host.querySelector('.event--pendente')).not.toBeNull();
    expect(host.querySelector('.event--bloqueado')).not.toBeNull();
    expect(host.querySelectorAll('.consult-link').length).toBe(21);
    expect(host.querySelectorAll('.consult-link[routerLink="/salas"]').length).toBe(21);
    expect(host.textContent).toContain('horários aproximados');
    expect(host.textContent).toContain('12 recursos gerenciados');
    expect(host.querySelector('.manager-link')?.textContent).toContain('Painel do responsável');
  });

  it('navigates between weeks and resets to the initial captured week', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('button[aria-label="Próxima semana"]')!.click();
    fixture.detectChanges();
    expect(host.querySelector('#week-title')?.textContent).toContain('26–30 de outubro de 2026');
    expect(host.querySelectorAll('.calendar-event').length).toBe(0);
    expect(host.querySelectorAll('.consult-link').length).toBe(25);
    expect(host.querySelector<HTMLButtonElement>('.week-reset')?.disabled).toBe(false);

    host.querySelector<HTMLButtonElement>('.week-reset')!.click();
    fixture.detectChanges();
    expect(host.querySelector('#week-title')?.textContent).toContain('19–23 de outubro de 2026');
    expect(host.querySelectorAll('.calendar-event').length).toBe(4);
    expect(host.querySelector<HTMLButtonElement>('.week-reset')?.disabled).toBe(true);

    host.querySelector<HTMLButtonElement>('button[aria-label="Semana anterior"]')!.click();
    fixture.detectChanges();
    expect(host.querySelector('#week-title')?.textContent).toContain('12–16 de outubro de 2026');
  });

  it('shows both month and year names for weeks crossing calendar boundaries', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    const nextWeek = host.querySelector<HTMLButtonElement>('button[aria-label="Próxima semana"]')!;
    for (let week = 0; week < 6; week += 1) {
      nextWeek.click();
      fixture.detectChanges();
    }
    expect(host.querySelector('#week-title')?.textContent).toContain('30 de novembro – 4 de dezembro de 2026');

    for (let week = 0; week < 4; week += 1) {
      nextWeek.click();
      fixture.detectChanges();
    }
    expect(host.querySelector('#week-title')?.textContent).toContain('28 de dezembro de 2026 – 1 de janeiro de 2027');
  });
});
