import type { FeatureCollection, Polygon } from 'geojson';

export const LADAKH_GEOJSON: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { district: 'Kargil' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.25, 35.00],
          [77.00, 35.00],
          [76.95, 33.80],
          [75.20, 33.80],
          [75.25, 35.00]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Leh' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [76.85, 35.80],
          [79.80, 35.80],
          [79.75, 32.50],
          [76.80, 32.50],
          [76.85, 35.80]
        ]]
      }
    }
  ]
};
