import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CampusMapPage } from './campus-map.page';
import { routes } from '../../app.routes';

describe('CampusMapPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampusMapPage],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  function createPage() {
    const fixture = TestBed.createComponent(CampusMapPage);
    fixture.detectChanges();
    return fixture;
  }

  it('keeps building context in the URL and clears it when returning to all buildings', async () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('.building-list__item[data-code="DCC"]')!.click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toContain('predio=DCC');
    host.querySelector<HTMLButtonElement>('.building-detail__back')!.click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).not.toContain('predio=');
  });

  it('filters the catalog by room resources and minimum capacity', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    const search = host.querySelector<HTMLInputElement>('.building-search')!;
    search.value = 'Computadores';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(host.querySelectorAll('.building-list__item').length).toBe(1);
    expect(host.querySelector('.building-list__item')?.textContent).toContain('DCC');
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    const capacity = host.querySelector<HTMLSelectElement>('select[aria-label="Capacidade mínima"]')!;
    capacity.value = '60';
    capacity.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    expect(host.querySelectorAll('.building-list__item').length).toBe(7);
  });

  it('renders seven selectable buildings and the three PV4 rooms', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelectorAll('.building-marker').length).toBe(7);
    expect(host.querySelectorAll('.building-list__item').length).toBe(7);
    expect(host.querySelectorAll('.room-card').length).toBe(3);
    expect(host.textContent).toContain('Sala 101');
    expect(host.textContent).toContain('40 pessoas · Sala de aula');
    expect(host.querySelector<HTMLAnchorElement>('.room-card a')?.getAttribute('href')).toBe('/ambientes/AMB-001');
    expect(host.querySelector('.page-heading p')?.textContent).toContain('horários de demonstração');
  });

  it('selects a building and shows its fixture-specific availability', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;

    host.querySelector<HTMLButtonElement>('.building-marker[data-code="DCC"]')!.click();
    fixture.detectChanges();

    expect(host.querySelector('.building-detail h2')?.textContent?.trim()).toBe('Ciência da Computação');
    expect(host.querySelector('.room-card h3')?.textContent?.trim()).toBe('Laboratório 101');
    expect(host.querySelector('.room-card')?.textContent).toContain('Ocupada');
    expect(host.querySelectorAll('.room-card').length).toBe(3);
  });

  it('shows the observed three-room panel for each selectable building', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;

    for (const code of ['PV1', 'PV2', 'PV3', 'PV4', 'PV5', 'PV6', 'DCC']) {
      host.querySelector<HTMLButtonElement>(`.building-marker[data-code="${code}"]`)!.click();
      fixture.detectChanges();
      expect(host.querySelectorAll('.room-card').length).toBe(3);
    }
  });

  it('filters the sidebar and preserves map labels for positive and empty searches', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    const search = host.querySelector<HTMLInputElement>('.building-search')!;

    search.value = 'PV4';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(host.querySelectorAll('.building-list__item').length).toBe(1);
    expect(host.querySelectorAll('.building-marker').length).toBe(7);

    search.value = 'prédio inexistente';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(host.querySelector('.empty-search')?.textContent?.trim()).toBe('Nenhum prédio encontrado.');
    expect(host.querySelectorAll('.building-list__item').length).toBe(0);
    expect(host.querySelectorAll('.building-marker').length).toBe(7);
  });

  it('validates a period and applies a valid query to the detail panel', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    const timeFields = host.querySelectorAll<HTMLInputElement>('input[type="time"]');
    const dateField = host.querySelector<HTMLInputElement>('input[type="date"]')!;
    const endTime = timeFields[1];
    const form = host.querySelector('form.period-query')!;

    endTime.value = '07:00';
    endTime.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(host.querySelector('[role="alert"]')?.textContent).toContain('horário final deve ser posterior');
    expect(host.querySelector('.building-detail__period')?.textContent).toContain('08:00–10:00');
    expect(host.querySelector('.period-feedback')).toBeNull();

    dateField.value = '2026-10-23';
    dateField.dispatchEvent(new Event('input', { bubbles: true }));
    endTime.value = '10:00';
    endTime.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(host.querySelector('.building-detail__period')?.textContent).toContain('23/10/2026 · 08:00–10:00');
    expect(host.querySelector('.period-feedback')?.textContent).toBe('Horários da demonstração atualizados.');
  });

  it('updates zoom in and out, rotation, display mode, and restores the initial map state', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    const scene = host.querySelector<HTMLElement>('.map-scene')!;

    host.querySelector<HTMLButtonElement>('[data-control="zoom-in"]')!.click();
    host.querySelector<HTMLButtonElement>('[data-control="zoom-out"]')!.click();
    fixture.detectChanges();
    expect(scene.style.transform).toContain('scale(1)');
    for (let step = 0; step < 8; step += 1) {
      host.querySelector<HTMLButtonElement>('[data-control="zoom-out"]')!.click();
    }
    host.querySelector<HTMLButtonElement>('[data-control="rotate"]')!.click();
    fixture.detectChanges();
    expect(scene.style.transform).toContain('scale(0.8)');
    expect(scene.style.transform).toContain('rotate(30deg)');

    host.querySelector<HTMLButtonElement>('[data-control="map-mode"]')!.click();
    fixture.detectChanges();
    expect(host.querySelector('.map-mode-label')?.textContent).toContain('2D');

    host.querySelector<HTMLButtonElement>('[data-control="reset"]')!.click();
    fixture.detectChanges();
    expect(scene.style.transform).toContain('scale(1)');
    expect(scene.style.transform).toContain('rotate(0deg)');
    expect(host.querySelector('.map-mode-label')?.textContent).toContain('3D');
  });

  it('pans by pointer drag or keyboard arrows and restores pan with reset', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    const scene = host.querySelector<HTMLElement>('.map-scene')!;
    const canvas = host.querySelector<HTMLElement>('.map-canvas')!;
    Object.defineProperty(scene, 'setPointerCapture', { configurable: true, value: () => undefined });

    const pointerEvent = (type: string, x: number, y: number) => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperties(event, {
        pointerId: { value: 7 },
        clientX: { value: x },
        clientY: { value: y },
      });
      return event;
    };

    scene.dispatchEvent(pointerEvent('pointerdown', 100, 60));
    scene.dispatchEvent(pointerEvent('pointermove', 132, 84));
    fixture.detectChanges();
    expect(scene.style.transform).toContain('translate(32px, 24px)');
    expect(scene.classList.contains('map-scene--dragging')).toBe(true);
    scene.dispatchEvent(pointerEvent('pointerup', 132, 84));

    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(scene.style.transform).toContain('translate(72px, 24px)');

    host.querySelector<HTMLButtonElement>('[data-control="reset"]')!.click();
    fixture.detectChanges();
    expect(scene.style.transform).toContain('translate(0px, 0px)');
    expect(scene.classList.contains('map-scene--dragging')).toBe(false);
  });
});
