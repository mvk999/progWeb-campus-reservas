/** Geographic basemap data is separate from the live reservation API. */
export const CAMPUS_GEOGRAPHY = {
  center: [-44.9763, -21.227] as [number, number],
  zoom: 15.8,
  pitch: 54,
  bearing: -24,
  buildingsUrl: '/data/ufla-buildings.geojson',
  tiles: ['https://basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png'],
};
