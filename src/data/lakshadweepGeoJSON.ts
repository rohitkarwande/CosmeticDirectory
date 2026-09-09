import type { FeatureCollection, Polygon } from 'geojson';

export const LAKSHADWEEP_GEOJSON: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { district: 'Lakshadweep' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [72.00, 11.80],
          [73.80, 11.80],
          [73.75, 8.20],
          [71.95, 8.20],
          [72.00, 11.80]
        ]]
      }
    }
  ]
};
