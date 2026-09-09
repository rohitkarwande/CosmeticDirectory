import type { FeatureCollection, Polygon } from 'geojson';

export const DADRA_DAMAN_DIU_GEOJSON: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { district: 'Dadra and Nagar Haveli' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [72.88, 20.35],
          [73.15, 20.35],
          [73.12, 20.10],
          [72.85, 20.10],
          [72.88, 20.35]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Daman' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [72.78, 20.45],
          [72.92, 20.45],
          [72.90, 20.35],
          [72.76, 20.35],
          [72.78, 20.45]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Diu' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [70.88, 20.76],
          [71.05, 20.76],
          [71.02, 20.67],
          [70.85, 20.67],
          [70.88, 20.76]
        ]]
      }
    }
  ]
};
