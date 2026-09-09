import type { FeatureCollection, Polygon } from 'geojson';

export const PUDUCHERRY_GEOJSON: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { district: 'Puducherry' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [79.72, 12.02],
          [79.88, 12.02],
          [79.86, 11.85],
          [79.70, 11.85],
          [79.72, 12.02]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Karaikal' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [79.78, 11.02],
          [79.88, 11.02],
          [79.86, 10.85],
          [79.76, 10.85],
          [79.78, 11.02]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Mahe' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.50, 11.75],
          [75.58, 11.75],
          [75.56, 11.68],
          [75.48, 11.68],
          [75.50, 11.75]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Yanam' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [82.18, 16.78],
          [82.26, 16.78],
          [82.24, 16.68],
          [82.16, 16.68],
          [82.18, 16.78]
        ]]
      }
    }
  ]
};
