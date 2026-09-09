import type { FeatureCollection, Polygon } from 'geojson';

export const MIZORAM_GEOJSON: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { district: 'Kolasib' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [92.52, 24.50],
          [92.82, 24.50],
          [92.80, 24.08],
          [92.50, 24.08],
          [92.52, 24.50]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Mamit' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [92.22, 24.25],
          [92.55, 24.25],
          [92.52, 23.58],
          [92.20, 23.58],
          [92.22, 24.25]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Aizawl' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [92.55, 24.08],
          [92.88, 24.08],
          [92.85, 23.50],
          [92.52, 23.50],
          [92.55, 24.08]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Saitual' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [92.82, 24.22],
          [93.25, 24.22],
          [93.22, 23.68],
          [92.80, 23.68],
          [92.82, 24.22]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Khawzawl' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [92.98, 23.68],
          [93.38, 23.68],
          [93.35, 23.35],
          [92.95, 23.35],
          [92.98, 23.68]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Champhai' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [93.12, 23.60],
          [93.48, 23.60],
          [93.45, 23.08],
          [93.10, 23.08],
          [93.12, 23.60]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Serchhip' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [92.68, 23.50],
          [93.02, 23.50],
          [93.00, 23.05],
          [92.65, 23.05],
          [92.68, 23.50]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Lunglei' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [92.35, 23.10],
          [92.92, 23.10],
          [92.88, 22.65],
          [92.32, 22.65],
          [92.35, 23.10]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Hnahthial' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [92.75, 23.12],
          [93.15, 23.12],
          [93.12, 22.75],
          [92.72, 22.75],
          [92.75, 23.12]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Lawngtlai' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [92.42, 22.75],
          [92.95, 22.75],
          [92.92, 21.95],
          [92.38, 21.95],
          [92.42, 22.75]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Siaha' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [92.78, 22.70],
          [93.22, 22.70],
          [93.18, 21.92],
          [92.75, 21.92],
          [92.78, 22.70]
        ]]
      }
    }
  ]
};
