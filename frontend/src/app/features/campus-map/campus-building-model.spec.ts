import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildingHeight, clampVisualScale, footprintCenter } from './campus-building-model';
import { CampusGeographicMap } from './campus-geographic-map';

describe('Campus model presentation', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses original footprint coordinates for the marker without mutating geometry', () => {
    const feature = { type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [[[-45, -22], [-44, -22], [-44, -21], [-45, -21], [-45, -22]]] } };
    const before = JSON.stringify(feature);
    expect(footprintCenter(feature)).toEqual([-44.5, -21.5]);
    expect(JSON.stringify(feature)).toBe(before);
    expect(footprintCenter({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [-45, -22] } })).toBeNull();
  });

  it('limits visual exaggeration and preserves the source height in the expression', () => {
    expect(clampVisualScale(-5)).toBe(1);
    expect(clampVisualScale(9)).toBe(3);
    expect(clampVisualScale(Number.NaN)).toBe(1.6);
    expect(JSON.stringify(buildingHeight(1.6))).toContain('["get","height"]');
  });

  it('cancels orbital animation and refuses to start it with reduced motion', () => {
    const cancel = vi.fn();
    const raf = vi.fn().mockReturnValue(42);
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', cancel);
    const component = new CampusGeographicMap();
    Object.assign(component, { map: { stop: vi.fn(), getBearing: () => 0, jumpTo: vi.fn() } });
    component['toggleOrbit']();
    expect(component['orbiting']()).toBe(true);
    component['stopOrbit']();
    expect(cancel).toHaveBeenCalledWith(42);
    expect(component['orbiting']()).toBe(false);
    Object.assign(component, { reducedMotion: true });
    component['toggleOrbit']();
    expect(component['orbiting']()).toBe(false);
    expect(raf).toHaveBeenCalledTimes(1);
  });

  it('hides all extrusion layers in 2D while retaining geographic footprints', () => {
    const setLayoutProperty = vi.fn();
    const component = new CampusGeographicMap();
    Object.assign(component, { map: { getLayer: () => true, setLayoutProperty, easeTo: vi.fn() } });
    component['toggleMode']();
    expect(setLayoutProperty).toHaveBeenCalledWith('ufla-buildings', 'visibility', 'none');
    expect(setLayoutProperty).toHaveBeenCalledWith('ufla-roofs', 'visibility', 'none');
    expect(setLayoutProperty).not.toHaveBeenCalledWith('ufla-footprints', 'visibility', 'none');
  });
});
