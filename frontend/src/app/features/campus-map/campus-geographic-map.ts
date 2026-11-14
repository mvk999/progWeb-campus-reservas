import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, ViewChild, signal } from '@angular/core';
import type { Map as LibreMap, MapGeoJSONFeature } from 'maplibre-gl';
import type { FeatureCollection, Geometry } from 'geojson';
import { CampusMapCanvas } from './campus-map-canvas';
import { CampusBuilding } from './campus-map.models';
import { CAMPUS_GEOGRAPHY as CONFIG } from './campus-geography.config';

@Component({
  selector: 'app-campus-geographic-map', standalone: true, imports: [CampusMapCanvas],
  templateUrl: './campus-geographic-map.html', styleUrl: './campus-geographic-map.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampusGeographicMap implements AfterViewInit, OnChanges, OnDestroy {
  @Input() campusName = 'UFLA';
  @Input() buildings: readonly CampusBuilding[] = [];
  @Input() selectedCode: string | null = null;
  @Input() matchingCodes: readonly string[] = [];
  @Output() buildingSelected = new EventEmitter<CampusBuilding>();
  @ViewChild('mapHost', { static: true }) private host!: ElementRef<HTMLElement>;
  protected readonly status = signal<'loading' | 'ready' | 'fallback'>('loading');
  protected readonly message = signal('Preparando a exploração do campus…');
  protected readonly threeDimensional = signal(true);
  protected readonly selectedName = signal('');
  protected readonly selectedDescription = signal('');
  private map?: LibreMap;
  private resize?: ResizeObserver;
  private abort = new AbortController();
  private destroyed = false;
  private features: FeatureCollection<Geometry> = { type: 'FeatureCollection', features: [] };
  private reducedMotion = false;
  private selectedId?: string | number;
  private loadTimeout?: ReturnType<typeof setTimeout>;
  protected readonly geographicPaths = signal<readonly { id: string; name: string; path: string }[]>([]);

  async ngAfterViewInit(): Promise<void> {
    // jsdom and devices without WebGL retain the keyboard-accessible schematic.
    if (typeof WebGL2RenderingContext === 'undefined') {
      this.fallback();
      try {
        const response = await fetch(CONFIG.buildingsUrl, { signal: this.abort.signal });
        if (response.ok && !this.destroyed) {
          this.features = await response.json();
          this.features.features.forEach((feature, index) => { feature.id ??= index; });
          this.prepareFlatMap();
          this.message.set('Vista 2D com contornos oficiais NUP/UFLA. WebGL indisponível neste dispositivo.');
        }
      } catch { /* The local demonstration remains usable without a geographic source. */ }
      return;
    }
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      const [libre, response] = await Promise.all([
        import('maplibre-gl'), fetch(CONFIG.buildingsUrl, { signal: this.abort.signal }),
      ]);
      if (!response.ok) throw new Error('Geometria indisponível');
      this.features = await response.json();
      if (this.destroyed) return;
      if (!this.features.features?.length) throw new Error('Geometria vazia');
      this.features.features.forEach((feature, index) => { feature.id ??= index; });
      this.prepareFlatMap();
      libre.setWorkerUrl('/maplibre-gl-worker.mjs');
      this.map = new libre.Map({
        container: this.host.nativeElement, center: CONFIG.center, zoom: CONFIG.zoom,
        pitch: this.reducedMotion ? 0 : CONFIG.pitch, bearing: CONFIG.bearing,
        maxZoom: 19, minZoom: 12, attributionControl: false,
        style: { version: 8, sources: {
          campusBase: { type: 'raster', tiles: CONFIG.tiles, tileSize: 256, maxzoom: 19,
            attribution: '© OpenStreetMap contributors' },
        }, layers: [
          { id: 'background', type: 'background', paint: { 'background-color': '#e8eddf' } },
          { id: 'campus-base', type: 'raster', source: 'campusBase', paint: { 'raster-saturation': -0.65, 'raster-opacity': 0.78 } },
        ] },
      });
      this.threeDimensional.set(!this.reducedMotion);
      this.map.addControl(new libre.AttributionControl({ compact: true }));
      this.map.addControl(new libre.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');
      this.map.on('error', () => this.message.set('Parte do fundo cartográfico não carregou. Os edifícios locais continuam disponíveis.'));
      this.map.on('webglcontextlost', () => this.fallback());
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
          'fill-color': '#91a797', 'fill-opacity': 0.7,
        } });
        this.map.addLayer({ id: 'ufla-buildings', type: 'fill-extrusion', source: 'ufla', paint: {
          'fill-extrusion-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#d19b46', ['boolean', ['feature-state', 'hover'], false], '#6b9c85', '#527763'],
          'fill-extrusion-height': ['coalesce', ['to-number', ['get', 'height']], 8],
          'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.95,
        } });
        this.map.setLight({ anchor: 'viewport', color: '#fff5e4', intensity: 0.45, position: [1.5, 190, 40] });
        let hovered: string | number | undefined;
        this.map.on('mousemove', 'ufla-buildings', event => {
          if (hovered !== undefined) this.map?.setFeatureState({ source: 'ufla', id: hovered }, { hover: false });
          hovered = event.features?.[0]?.id;
          if (hovered !== undefined) this.map?.setFeatureState({ source: 'ufla', id: hovered }, { hover: true });
          this.map!.getCanvas().style.cursor = 'pointer';
        });
        this.map.on('mouseleave', 'ufla-buildings', () => {
          if (hovered !== undefined) this.map?.setFeatureState({ source: 'ufla', id: hovered }, { hover: false });
          this.map!.getCanvas().style.cursor = '';
        });
        this.map.on('click', 'ufla-buildings', event => {
          const feature = event.features?.[0];
          if (feature) this.chooseFeature(feature);
        });
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
    const matches = this.features.features.filter(feature => {
      const building = this.associatedBuilding(feature.properties);
      return building && this.matchingCodes.includes(building.code);
    }).map(feature => feature.id!);
    this.map.setPaintProperty('ufla-buildings', 'fill-extrusion-opacity', this.matchingCodes.length < this.buildings.length
      ? ['case', ['in', ['id'], ['literal', matches]], 1, 0.3] : 0.95);
    const building = this.buildings.find(item => item.code === this.selectedCode);
    const feature = building && this.matchingCodes.includes(building.code) && this.features.features.find(item => this.associatedBuilding(item.properties)?.code === building.code);
    if (feature) this.chooseFeature(feature as MapGeoJSONFeature, false);
    else {
      if (this.selectedId !== undefined) this.map.setFeatureState({ source: 'ufla', id: this.selectedId }, { selected: false });
      this.selectedId = undefined;
      this.selectedName.set(building?.name ?? '');
      this.selectedDescription.set(building ? 'Catálogo demonstrativo. Localização deste ambiente ainda não vinculada a uma geometria verificada.' : '');
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

  private chooseFeature(feature: MapGeoJSONFeature, emit = true): void {
    if (!this.map) return;
    if (this.selectedId !== undefined) this.map.setFeatureState({ source: 'ufla', id: this.selectedId }, { selected: false });
    this.selectedId = feature.id;
    if (feature.id !== undefined) this.map.setFeatureState({ source: 'ufla', id: feature.id }, { selected: true });
    const name = feature.properties?.['name'] || 'Edificação do campus';
    this.selectedName.set(name);
    const building = this.associatedBuilding(feature.properties);
    this.selectedDescription.set(building ? `${building.rooms.length} ambientes demonstrativos no catálogo. Consulte os detalhes ao lado.` : 'Contorno oficial NUP/UFLA. Sem ambientes associados no catálogo demonstrativo.');
    if (feature.geometry.type === 'Polygon') {
      const points = feature.geometry.coordinates[0];
      const center: [number, number] = [points.reduce((sum, p) => sum + p[0], 0) / points.length, points.reduce((sum, p) => sum + p[1], 0) / points.length];
      this.map.flyTo({ center, zoom: 17.8, duration: this.duration, essential: false });
    }
    if (building && emit) this.buildingSelected.emit(building);
  }

  protected zoomIn(): void { this.map?.zoomIn({ duration: this.duration }); }
  protected zoomOut(): void { this.map?.zoomOut({ duration: this.duration }); }
  protected rotate(): void { this.map?.easeTo({ bearing: this.map.getBearing() + 30, duration: this.duration }); }
  protected toggleMode(): void {
    this.threeDimensional.update(value => !value);
    this.map?.easeTo({ pitch: this.threeDimensional() ? CONFIG.pitch : 0, duration: this.duration });
  }
  protected reset(): void {
    this.map?.flyTo({ center: CONFIG.center, zoom: CONFIG.zoom, bearing: CONFIG.bearing, pitch: this.threeDimensional() ? CONFIG.pitch : 0, duration: this.duration });
  }
  private get duration(): number { return this.reducedMotion ? 0 : 700; }
  private prepareFlatMap(): void {
    const polygons = this.features.features.filter(feature => feature.geometry.type === 'Polygon');
    const allPoints = polygons.flatMap(feature => feature.geometry.type === 'Polygon' ? feature.geometry.coordinates[0] : []);
    if (!allPoints.length) return;
    const minX = Math.min(...allPoints.map(p => p[0])), maxX = Math.max(...allPoints.map(p => p[0]));
    const minY = Math.min(...allPoints.map(p => p[1])), maxY = Math.max(...allPoints.map(p => p[1]));
    const scale = Math.min(920 / (maxX - minX), 580 / (maxY - minY));
    this.geographicPaths.set(polygons.map(feature => ({
      id: String(feature.id), name: feature.properties?.['name'] || 'Edificação do campus',
      path: feature.geometry.type === 'Polygon' ? feature.geometry.coordinates.map(ring => ring.map((p, index) => `${index ? 'L' : 'M'}${20 + (p[0] - minX) * scale},${600 - (p[1] - minY) * scale}`).join(' ') + 'Z').join(' ') : '',
    })));
  }
  protected chooseFlatFeature(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    const feature = this.features.features.find(item => String(item.id) === id);
    if (feature) {
      this.selectedName.set(feature.properties?.['name'] || 'Edificação do campus');
      this.selectedDescription.set('Contorno NUP/UFLA. Alturas ilustrativas e disponibilidade demonstrativa.');
      if (this.map) this.chooseFeature(feature as MapGeoJSONFeature);
      else {
        const building = this.associatedBuilding(feature.properties);
        if (building) this.buildingSelected.emit(building);
      }
    }
  }
  private fallback(): void {
    this.status.set('fallback');
    this.message.set('Modo esquemático 2D: WebGL ou dados geográficos indisponíveis. As posições abaixo são ilustrativas, sem precisão geográfica.');
    this.map?.remove(); this.map = undefined;
  }
  ngOnDestroy(): void {
    this.destroyed = true; clearTimeout(this.loadTimeout); this.abort.abort(); this.resize?.disconnect(); this.map?.remove();
  }
}
