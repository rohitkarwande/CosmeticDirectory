import type { FeatureCollection, Polygon } from 'geojson';

export const CHANDIGARH_GEOJSON: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { district: 'Chandigarh' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [76.70, 30.79],
          [76.84, 30.79],
          [76.82, 30.68],
          [76.68, 30.68],
          [76.70, 30.79]
        ]]
      }
    }
  ]
};
