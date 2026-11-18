import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, ViewChild, signal } from '@angular/core';
import type { CameraOptions, ExpressionSpecification, Map as LibreMap, MapGeoJSONFeature, Marker } from 'maplibre-gl';
import type { FeatureCollection, Geometry } from 'geojson';
import { CampusMapCanvas } from './campus-map-canvas';
import { CampusBuilding } from './campus-map.models';
import { CAMPUS_GEOGRAPHY as CONFIG } from './campus-geography.config';
import { buildingHeight, clampVisualScale, footprintCenter } from './campus-building-model';

const availabilityColor: ExpressionSpecification = [
  'step', ['number', ['feature-state', 'available'], -1], '#a5b3aa', 0, '#cb886d', 1, '#65a083', 3, '#347a58',
];

@Component({
  selector: 'app-campus-geographic-map', standalone: true, imports: [CampusMapCanvas],
  templateUrl: './campus-geographic-map.html', styleUrl: './campus-geographic-map.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampusGeographicMap implements AfterViewInit, OnChanges, OnDestroy {
  @Input() campusName = 'UFLA';
  @Input() buildings: readonly CampusBuilding[] = [];
  @Input() selectedCode: string | null = null;
  @Input() selectionVersion = 0;
  @Input() matchingCodes: readonly string[] = [];
  @Input() availabilityCounts: Readonly<Record<string, number | null>> = {};
  @Output() buildingSelected = new EventEmitter<CampusBuilding>();
  @ViewChild('mapHost', { static: true }) private host!: ElementRef<HTMLElement>;
  protected readonly status = signal<'loading' | 'ready' | 'fallback'>('loading');
  protected readonly message = signal('Preparando a exploração do campus…');
  protected readonly threeDimensional = signal(true);
  protected readonly heightScale = signal(1.6);
  protected readonly pitch = signal(CONFIG.pitch);
  protected readonly labelsVisible = signal(true);
  protected readonly orbiting = signal(false);
  protected readonly tourActive = signal(false);
  protected readonly tourIndex = signal(0);
  protected readonly tourStops = signal<readonly { code: string; name: string }[]>([]);
  protected readonly expanded = signal(false);
  protected readonly motionReduced = signal(false);
  protected readonly hoverInfo = signal<{ name: string; x: number; y: number } | null>(null);
  private markers: { marker: Marker; button: HTMLButtonElement; counter: HTMLElement; building: CampusBuilding }[] = [];
  private overviewCamera?: CameraOptions;
  private focusedVersion = 0;
  private orbitFrame?: number;
  private selectionFrame?: number;
  private lastOrbitTime?: number;
  private motionPreference?: MediaQueryList;
  private previousFocus?: HTMLElement;
  private previousBodyOverflow = '';
  private map?: LibreMap;
  private resize?: ResizeObserver;
  private abort = new AbortController();
  private destroyed = false;
  private features: FeatureCollection<Geometry> = { type: 'FeatureCollection', features: [] };
  private reducedMotion = false;
  private selectedId?: string | number;
  private loadTimeout?: ReturnType<typeof setTimeout>;
  protected readonly geographicPaths = signal<readonly { id: string; code: string; name: string; path: string }[]>([]);

  async ngAfterViewInit(): Promise<void> {
    // jsdom and devices without WebGL retain the keyboard-accessible schematic.
    if (typeof WebGL2RenderingContext === 'undefined') {
      this.fallback();
      try {
        const response = await fetch(CONFIG.buildingsUrl, { signal: this.abort.signal });
        if (response.ok && !this.destroyed) {
          this.features = await response.json(); this.features.features = this.features.features.filter(feature => ['DCC', 'PV1', 'PV2', 'PV3', 'PV4', 'PV5', 'PV6'].includes(feature.properties?.['code']));
          this.features.features.forEach((feature, index) => { feature.id = index; });
          this.prepareFlatMap();
          this.message.set('Vista 2D com contornos oficiais NUP/UFLA. WebGL indisponível neste dispositivo.');
        }
      } catch { /* Keep the API driven room list available when map geometry cannot load. */ }
      return;
    }
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.motionReduced.set(this.reducedMotion);
    this.motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.motionPreference.addEventListener('change', this.updateMotionPreference);
    try {
      const [libre, response] = await Promise.all([
        import('maplibre-gl'), fetch(CONFIG.buildingsUrl, { signal: this.abort.signal }),
      ]);
      if (!response.ok) throw new Error('Geometria indisponível');
      this.features = await response.json(); this.features.features = this.features.features.filter(feature => ['DCC', 'PV1', 'PV2', 'PV3', 'PV4', 'PV5', 'PV6'].includes(feature.properties?.['code']));
      if (this.destroyed) return;
      if (!this.features.features?.length) throw new Error('Geometria vazia');
      this.features.features.forEach((feature, index) => { feature.id = index; });
      this.prepareFlatMap();
      libre.setWorkerUrl('/maplibre-gl-worker.mjs');
      this.map = new libre.Map({
        container: this.host.nativeElement, center: CONFIG.center, zoom: CONFIG.zoom,
        pitch: this.reducedMotion ? 0 : CONFIG.pitch, bearing: CONFIG.bearing,
        maxZoom: 19, minZoom: 12, attributionControl: false,
        style: { version: 8, sources: {

        }, layers: [
          { id: 'background', type: 'background', paint: { 'background-color': '#e8eddf' } },
        ] },
      });
      this.threeDimensional.set(!this.reducedMotion);
      this.pitch.set(this.reducedMotion ? 0 : CONFIG.pitch);
      this.host.nativeElement.addEventListener('pointerdown', () => this.stopOrbit(), { signal: this.abort.signal, capture: true });
      this.host.nativeElement.addEventListener('keydown', () => this.stopOrbit(), { signal: this.abort.signal });
      document.addEventListener('keydown', this.handleExpandedKeyboard, { signal: this.abort.signal, capture: true });
      this.map.addControl(new libre.AttributionControl({ compact: true }));
      this.map.addControl(new libre.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');
      this.map.on('error', () => this.message.set('Parte do fundo cartográfico não carregou. Os edifícios locais continuam disponíveis.'));
      this.map.on('webglcontextlost', () => this.fallback());
      this.map.on('pitchend', () => { if (!this.map) return; this.pitch.set(Math.round(this.map.getPitch())); this.threeDimensional.set(this.pitch() > 0); this.applyMode(); });
      this.map.on('style.load', () => {
        clearTimeout(this.loadTimeout);
        if (!this.map) return;
        this.map.addSource('ufla', { type: 'geojson', data: this.features });
        this.map.addSource('campus-context', { type: 'geojson', data: '/data/ufla-context.geojson' });
        this.map.addLayer({ id: 'campus-greens', type: 'fill', source: 'campus-context', filter: ['==', ['geometry-type'], 'Polygon'], paint: {
          'fill-color': ['case', ['==', ['get', 'natural'], 'water'], '#a4c9d0', '#c6d6b9'], 'fill-opacity': 0.85,
        } });
        this.map.addLayer({ id: 'campus-roads-edge', type: 'line', source: 'campus-context', filter: ['has', 'highway'], paint: { 'line-color': '#bac3ad', 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 3, 18, 14] } });
        this.map.addLayer({ id: 'campus-roads', type: 'line', source: 'campus-context', filter: ['has', 'highway'], paint: { 'line-color': '#fffdf3', 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 1.5, 18, 10] } });
        this.map.addLayer({ id: 'ufla-footprints', type: 'fill', source: 'ufla', paint: {
          'fill-color': availabilityColor, 'fill-opacity': 0.86,
        } });
        this.map.addLayer({ id: 'ufla-foundations', type: 'fill-extrusion', source: 'ufla', paint: {
          'fill-extrusion-color': '#526353', 'fill-extrusion-height': 1.4, 'fill-extrusion-opacity': 1,
        } });
        this.map.addLayer({ id: 'ufla-buildings', type: 'fill-extrusion', source: 'ufla', paint: {
          'fill-extrusion-color': availabilityColor,
          'fill-extrusion-height': buildingHeight(this.heightScale()),
          'fill-extrusion-base': 1.4, 'fill-extrusion-opacity': 1,
        } });
        this.map.addLayer({ id: 'ufla-roofs', type: 'fill-extrusion', source: 'ufla', paint: {
          'fill-extrusion-color': availabilityColor,
          'fill-extrusion-base': buildingHeight(this.heightScale()),
          'fill-extrusion-height': ['+', buildingHeight(this.heightScale()), 0.9], 'fill-extrusion-opacity': 1,
        } });
        this.map.addLayer({ id: 'ufla-outline', type: 'line', source: 'ufla', paint: {
          'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#d19b46', '#60745c'],
          'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3, 0.6],
        } });
        this.map.setLight({ anchor: 'viewport', color: '#fff5e4', intensity: 0.45, position: [1.5, 190, 40] });
        let hovered: string | number | undefined;
        this.map.on('mousemove', ['ufla-buildings', 'ufla-roofs'], event => {
          if (hovered !== undefined) this.map?.setFeatureState({ source: 'ufla', id: hovered }, { hover: false });
          hovered = event.features?.[0]?.id;
          if (hovered !== undefined) this.map?.setFeatureState({ source: 'ufla', id: hovered }, { hover: true });
          this.hoverInfo.set({ name: event.features?.[0]?.properties?.['name'] ?? 'Edificação do campus', x: Math.max(8, Math.min(event.point.x, this.host.nativeElement.clientWidth - 260)), y: Math.max(80, Math.min(event.point.y, this.host.nativeElement.clientHeight - 100)) });
          this.map!.getCanvas().style.cursor = 'pointer';
        });
        this.map.on('mouseleave', ['ufla-buildings', 'ufla-roofs'], () => {
          if (hovered !== undefined) this.map?.setFeatureState({ source: 'ufla', id: hovered }, { hover: false });
          this.map!.getCanvas().style.cursor = '';
          this.hoverInfo.set(null);
        });
        this.map.on('click', ['ufla-buildings', 'ufla-roofs'], event => {
          const feature = event.features?.[0];
          if (feature) this.chooseFeature(feature);
        });
        this.map.on('click', 'ufla-footprints', event => {
          if (!this.threeDimensional() && event.features?.[0]) this.chooseFeature(event.features[0]);
        });
        this.createMarkers(libre.Marker);
        this.applyMode();
        this.status.set('ready');
        this.message.set('Campus real · contornos NUP/UFLA · alturas ilustrativas, sem medição oficial');
        this.ngOnChanges();
      });
      this.resize = new ResizeObserver(() => this.map?.resize());
      this.resize.observe(this.host.nativeElement);
      this.loadTimeout = setTimeout(() => { if (this.status() === 'loading') this.fallback(); }, 18000);
    } catch { if (!this.destroyed) this.fallback(); }
  }

  ngOnChanges(): void {
    if (!this.map?.getSource('ufla')) return;
    for (const feature of this.features.features) {
      const building = this.associatedBuilding(feature.properties);
      const count = building ? this.availabilityCounts[building.code] : null;
      this.map.setFeatureState({ source: 'ufla', id: feature.id! }, { available: count ?? -1 });
    }
    this.markers.forEach(({ button, counter, building }) => {
      const { code } = building;
      const count = this.availabilityCounts[code];
      button.classList.toggle('campus-pin--selected', code === this.selectedCode);
      button.setAttribute('aria-pressed', String(code === this.selectedCode));
      button.dataset['availability'] = count == null ? 'unknown' : count === 0 ? 'full' : 'free';
      button.setAttribute('aria-label', `${building.name}, ${count == null ? 'disponibilidade sem dados' : count === 1 ? '1 sala livre' : count + ' salas livres'}`);
      counter.textContent = count == null ? '—' : String(count);
      button.hidden = !this.matchingCodes.includes(code);
      button.classList.toggle('campus-pin--hide-name', !this.labelsVisible());
    });
    const building = this.buildings.find(item => item.code === this.selectedCode);
    const feature = building && this.matchingCodes.includes(building.code) && this.features.features.find(item => this.associatedBuilding(item.properties)?.code === building.code);
    if (feature) {
      const focus = this.selectionVersion !== this.focusedVersion;
      this.focusedVersion = this.selectionVersion;
      this.chooseFeature(feature as MapGeoJSONFeature, false, focus);
    }
    else {
      if (this.selectedId !== undefined) this.map.setFeatureState({ source: 'ufla', id: this.selectedId }, { selected: false, lift: 0 });
      this.selectedId = undefined;
      if (!this.selectedCode && this.overviewCamera) {
        this.map.easeTo({ ...this.overviewCamera, duration: this.duration });
        this.overviewCamera = undefined;
      }
    }
  }

  private associatedBuilding(properties: Record<string, unknown> | null | undefined): CampusBuilding | undefined {
    const code = properties?.['code'];
    if (typeof code === 'string') return this.buildings.find(building => building.code === code);
    const name = properties?.['name'];
    if (typeof name !== 'string') return undefined;
    const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return this.buildings.find(building => {
      if (building.code === 'BU') return normalized.includes('biblioteca universitaria');
      if (building.code === 'DCC') return normalized.includes('departamento de ciencia da computacao');
      return normalized === `pavilhao de aulas ${building.code.replace('PV', '')}` || normalized === `pavilhao ${building.code.replace('PV', '')}`;
    });
  }

  private chooseFeature(feature: MapGeoJSONFeature, emit = true, focus = true): void {
    if (!this.map) return;
    const changed = feature.id !== this.selectedId;
    if (changed && this.selectionFrame !== undefined) cancelAnimationFrame(this.selectionFrame);
    if (changed && this.selectedId !== undefined) this.map.setFeatureState({ source: 'ufla', id: this.selectedId }, { selected: false, lift: 0 });
    this.selectedId = feature.id;
    if (feature.id !== undefined) this.map.setFeatureState({ source: 'ufla', id: feature.id }, { selected: true });
    this.markers.forEach(({ button, building }) => {
      button.classList.toggle('campus-pin--selected', building.code === feature.properties?.['code']);
      button.setAttribute('aria-pressed', String(building.code === feature.properties?.['code']));
    });
    const building = this.associatedBuilding(feature.properties);
    const center = footprintCenter(feature);
    if (center && focus) {
      this.stopOrbit();
      this.overviewCamera ??= {
        center: this.map.getCenter(), zoom: this.map.getZoom(),
        pitch: this.map.getPitch(), bearing: this.map.getBearing(),
      };
      const offset: [number, number] = emit && matchMedia('(max-width: 48rem)').matches && !this.expanded()
        ? [0, -Math.min(110, this.host.nativeElement.clientHeight / 4)] : [0, 0];
      this.map.flyTo({ center, zoom: 17.8, pitch: this.threeDimensional() ? this.pitch() : 0, offset, duration: this.duration, essential: false });
      this.animateSelection(feature.id);
    }
    if (building && emit) {
      if (this.expanded()) this.toggleExpanded();
      this.focusedVersion = this.selectionVersion + 1;
      this.buildingSelected.emit(building);
    }
  }

  protected zoomIn(): void { this.stopOrbit(); this.map?.zoomIn({ duration: this.duration }); }
  protected zoomOut(): void { this.stopOrbit(); this.map?.zoomOut({ duration: this.duration }); }
  protected rotate(): void { this.stopOrbit(); this.map?.easeTo({ bearing: this.map.getBearing() + 30, duration: this.duration }); }
  protected toggleMode(): void {
    this.stopOrbit();
    this.threeDimensional.update(value => !value);
    if (this.threeDimensional() && !this.pitch()) this.pitch.set(CONFIG.pitch);
    this.applyMode();
    this.map?.easeTo({ pitch: this.threeDimensional() ? this.pitch() : 0, duration: this.duration });
  }
  protected reset(): void {
    this.stopTour(); this.stopOrbit();
    this.overviewCamera = undefined;
    this.map?.flyTo({ center: CONFIG.center, zoom: CONFIG.zoom, bearing: CONFIG.bearing, pitch: this.threeDimensional() ? this.pitch() : 0, duration: this.duration });
  }
  protected setHeightScale(event: Event): void {
    this.stopOrbit();
    this.heightScale.set(clampVisualScale(Number((event.target as HTMLInputElement).value)));
    if (!this.map?.getLayer('ufla-buildings')) return;
    this.map.setPaintProperty('ufla-buildings', 'fill-extrusion-height', buildingHeight(this.heightScale()));
    this.map.setPaintProperty('ufla-roofs', 'fill-extrusion-base', buildingHeight(this.heightScale()));
    this.map.setPaintProperty('ufla-roofs', 'fill-extrusion-height', ['+', buildingHeight(this.heightScale()), 0.9]);
  }
  protected setPitch(event: Event): void {
    this.stopOrbit();
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    this.pitch.set(Math.max(0, Math.min(70, value)));
    this.threeDimensional.set(this.pitch() > 0);
    this.applyMode();
    this.map?.easeTo({ pitch: this.pitch(), duration: this.reducedMotion ? 0 : 100 });
  }
  protected toggleLabels(): void { this.stopOrbit(); this.labelsVisible.update(value => !value); this.ngOnChanges(); }
  protected toggleExpanded(): void {
    this.stopOrbit();
    this.expanded.update(value => !value);
    if (this.expanded()) {
      this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
      this.previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      queueMicrotask(() => this.host.nativeElement.closest('section')?.querySelector<HTMLElement>('button')?.focus());
    } else {
      document.body.style.overflow = this.previousBodyOverflow;
      this.previousFocus?.focus();
    }
    requestAnimationFrame(() => { if (!this.destroyed) this.map?.resize(); });
  }
  protected toggleOrbit(): void {
    if (this.orbiting()) { this.stopOrbit(); return; }
    if (!this.map || this.reducedMotion) return;
    this.map.stop(); this.orbiting.set(true); this.lastOrbitTime = undefined;
    const frame = (time: number) => {
      if (!this.orbiting() || !this.map || this.destroyed) return;
      const delta = this.lastOrbitTime === undefined ? 0 : Math.min(time - this.lastOrbitTime, 100);
      this.lastOrbitTime = time;
      this.map.jumpTo({ bearing: this.map.getBearing() + delta * 0.006 });
      this.orbitFrame = requestAnimationFrame(frame);
    };
    this.orbitFrame = requestAnimationFrame(frame);
  }
  protected stopOrbit(): void {
    if (this.orbitFrame !== undefined) cancelAnimationFrame(this.orbitFrame);
    this.orbitFrame = undefined; this.lastOrbitTime = undefined; this.orbiting.set(false);
  }
  protected startTour(): void {
    if (!this.tourStops().length) return;
    this.tourActive.set(true); this.tourIndex.set(0); this.visitTourStop();
  }
  protected nextTour(): void {
    this.tourIndex.update(value => (value + 1) % Math.max(1, this.tourStops().length)); this.visitTourStop();
  }
  protected previousTour(): void {
    this.tourIndex.update(value => (value - 1 + this.tourStops().length) % Math.max(1, this.tourStops().length)); this.visitTourStop();
  }
  protected stopTour(): void { this.tourActive.set(false); this.stopOrbit(); }
  private visitTourStop(): void {
    const code = this.tourStops()[this.tourIndex()]?.code;
    const feature = this.features.features.find(item => item.properties?.['code'] === code);
    if (feature) this.chooseFeature(feature as MapGeoJSONFeature);
  }
  private applyMode(): void {
    for (const layer of ['ufla-foundations', 'ufla-buildings', 'ufla-roofs']) {
      if (this.map?.getLayer(layer)) this.map.setLayoutProperty(layer, 'visibility', this.threeDimensional() ? 'visible' : 'none');
    }
  }
  private createMarkers(MarkerConstructor: typeof Marker): void {
    const stops: { code: string; name: string }[] = [];
    for (const feature of this.features.features) {
      const building = this.associatedBuilding(feature.properties);
      const center = footprintCenter(feature);
      if (!building || !center) continue;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'campus-pin'; button.dataset['code'] = building.code;
      const code = document.createElement('span'); code.className = 'campus-pin__code'; code.textContent = building.code;
      const counter = document.createElement('span'); counter.className = 'campus-pin__count';
      const name = document.createElement('span'); name.className = 'campus-pin__name'; name.textContent = building.name;
      button.append(code, counter, name);
      button.addEventListener('click', event => { event.stopPropagation(); this.chooseFeature(feature as MapGeoJSONFeature); }, { signal: this.abort.signal });
      button.addEventListener('mouseenter', () => this.map?.setFeatureState({ source: 'ufla', id: feature.id! }, { hover: true }), { signal: this.abort.signal });
      button.addEventListener('mouseleave', () => this.map?.setFeatureState({ source: 'ufla', id: feature.id! }, { hover: false }), { signal: this.abort.signal });
      const marker = new MarkerConstructor({ element: button, anchor: 'bottom', offset: [0, -12] }).setLngLat(center).addTo(this.map!);
      this.markers.push({ marker, button, counter, building }); stops.push({ code: building.code, name: building.name });
    }
    this.tourStops.set(stops.sort((a, b) => a.code.localeCompare(b.code)));
  }
  private animateSelection(id: string | number | undefined): void {
    if (id === undefined || this.reducedMotion) return;
    const start = performance.now();
    const frame = (time: number) => {
      if (this.destroyed || this.selectedId !== id || !this.map) return;
      const progress = Math.min(1, (time - start) / 450);
      this.map.setFeatureState({ source: 'ufla', id }, { lift: Math.sin(progress * Math.PI) * 3 });
      if (progress < 1) this.selectionFrame = requestAnimationFrame(frame);
      else this.selectionFrame = undefined;
    };
    this.selectionFrame = requestAnimationFrame(frame);
  }
  private readonly updateMotionPreference = (event: MediaQueryListEvent): void => {
    this.reducedMotion = event.matches;
    this.motionReduced.set(event.matches);
    if (event.matches) {
      this.stopOrbit(); this.map?.stop();
      if (this.selectionFrame !== undefined) cancelAnimationFrame(this.selectionFrame);
      this.selectionFrame = undefined;
      if (this.selectedId !== undefined) this.map?.setFeatureState({ source: 'ufla', id: this.selectedId }, { lift: 0 });
    }
  };
  private readonly handleExpandedKeyboard = (event: KeyboardEvent): void => {
    if (!this.expanded()) return;
    if (event.key === 'Escape') { event.preventDefault(); this.toggleExpanded(); return; }
    if (event.key !== 'Tab') return;
    const card = this.host.nativeElement.closest('section');
    const focusables = [...card?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]') ?? []]
      .filter(element => !element.hidden && element.getClientRects().length > 0);
    const first = focusables[0], last = focusables.at(-1);
    if (!first) return;
    if (event.shiftKey && (document.activeElement === first || !card?.contains(document.activeElement))) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !card?.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  };
  private get duration(): number { return this.reducedMotion ? 0 : 700; }
  private prepareFlatMap(): void {
    const polygons = this.features.features.filter(feature => feature.geometry.type === 'Polygon');
    const allPoints = polygons.flatMap(feature => feature.geometry.type === 'Polygon' ? feature.geometry.coordinates[0] : []);
    if (!allPoints.length) return;
    const minX = Math.min(...allPoints.map(p => p[0])), maxX = Math.max(...allPoints.map(p => p[0]));
    const minY = Math.min(...allPoints.map(p => p[1])), maxY = Math.max(...allPoints.map(p => p[1]));
    const scale = Math.min(920 / (maxX - minX), 580 / (maxY - minY));
    if (this.status() === 'fallback') this.message.set('Vista 2D dos contornos NUP/UFLA. WebGL indisponível neste dispositivo.');
    this.geographicPaths.set(polygons.map(feature => ({
      id: String(feature.id), code: this.associatedBuilding(feature.properties)?.code ?? '',
      name: feature.properties?.['name'] || 'Edificação do campus',
      path: feature.geometry.type === 'Polygon' ? feature.geometry.coordinates.map(ring => ring.map((p, index) => `${index ? 'L' : 'M'}${20 + (p[0] - minX) * scale},${600 - (p[1] - minY) * scale}`).join(' ') + 'Z').join(' ') : '',
    })));
  }
  protected selectFlatBuilding(code: string): void {
    const building = this.buildings.find(item => item.code === code);
    if (building) this.buildingSelected.emit(building);
  }
  private fallback(): void {
    this.stopOrbit();
    this.markers.forEach(item => item.marker.remove()); this.markers = [];
    this.status.set('fallback');
    this.message.set('Modo esquemático 2D: WebGL ou dados geográficos indisponíveis. As posições abaixo são ilustrativas, sem precisão geográfica.');
    if (this.geographicPaths().length) this.message.set('Vista 2D dos contornos NUP/UFLA. WebGL indisponível neste dispositivo.');
    this.map?.remove(); this.map = undefined;
  }
  ngOnDestroy(): void {
    if (this.expanded()) document.body.style.overflow = this.previousBodyOverflow;
    this.stopOrbit();
    if (this.selectionFrame !== undefined) cancelAnimationFrame(this.selectionFrame);
    this.motionPreference?.removeEventListener('change', this.updateMotionPreference);
    this.markers.forEach(item => item.marker.remove()); this.markers = [];
    this.destroyed = true; clearTimeout(this.loadTimeout); this.abort.abort(); this.resize?.disconnect(); this.map?.remove();
  }
}
