import type { FeatureCollection, Polygon } from 'geojson';

export const SIKKIM_GEOJSON: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { district: 'Mangan' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [88.12, 28.08],
          [88.88, 28.08],
          [88.85, 27.38],
          [88.10, 27.38],
          [88.12, 28.08]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Gyalshing' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [88.02, 27.50],
          [88.35, 27.50],
          [88.32, 27.20],
          [88.00, 27.20],
          [88.02, 27.50]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Soreng' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [88.05, 27.30],
          [88.30, 27.30],
          [88.28, 27.05],
          [88.02, 27.05],
          [88.05, 27.30]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Namchi' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [88.25, 27.32],
          [88.50, 27.32],
          [88.48, 27.05],
          [88.22, 27.05],
          [88.25, 27.32]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Gangtok' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [88.48, 27.52],
          [88.85, 27.52],
          [88.82, 27.25],
          [88.45, 27.25],
          [88.48, 27.52]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Pakyong' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [88.52, 27.35],
          [88.88, 27.35],
          [88.85, 27.10],
          [88.48, 27.10],
          [88.52, 27.35]
        ]]
      }
    }
  ]
};
