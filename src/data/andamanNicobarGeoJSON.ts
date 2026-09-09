import type { FeatureCollection, Polygon } from 'geojson';

export const ANDAMAN_NICOBAR_GEOJSON: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { district: 'North and Middle Andaman' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [92.55, 13.70],
          [93.05, 13.70],
          [93.00, 12.10],
          [92.50, 12.10],
          [92.55, 13.70]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'South Andaman' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [92.48, 12.10],
          [93.00, 12.10],
          [92.95, 11.20],
          [92.42, 11.20],
          [92.48, 12.10]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Nicobar' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [92.65, 9.40],
          [94.00, 9.40],
          [93.95, 6.70],
          [92.60, 6.70],
          [92.65, 9.40]
        ]]
      }
    }
  ]
};
