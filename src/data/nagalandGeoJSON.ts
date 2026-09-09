import type { FeatureCollection, Polygon } from 'geojson';

export const NAGALAND_GEOJSON: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { district: 'Dimapur' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [93.62, 26.02],
          [93.82, 26.02],
          [93.84, 25.85],
          [93.65, 25.85],
          [93.62, 26.02]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Chumoukedima' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [93.65, 25.85],
          [93.90, 25.85],
          [93.88, 25.72],
          [93.63, 25.72],
          [93.65, 25.85]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Niuland' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [93.75, 26.10],
          [93.98, 26.10],
          [93.95, 25.92],
          [93.78, 25.92],
          [93.75, 26.10]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Peren' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [93.45, 25.68],
          [93.88, 25.68],
          [93.85, 25.40],
          [93.42, 25.40],
          [93.45, 25.68]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Kohima' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [93.88, 25.82],
          [94.25, 25.82],
          [94.22, 25.55],
          [93.85, 25.55],
          [93.88, 25.82]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Tseminyu' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [94.05, 26.05],
          [94.32, 26.05],
          [94.30, 25.82],
          [94.02, 25.82],
          [94.05, 26.05]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Phek' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [94.22, 25.80],
          [94.68, 25.80],
          [94.65, 25.48],
          [94.20, 25.48],
          [94.22, 25.80]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Wokha' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [94.05, 26.25],
          [94.40, 26.25],
          [94.38, 25.98],
          [94.02, 25.98],
          [94.05, 26.25]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Zunheboto' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [94.35, 26.15],
          [94.68, 26.15],
          [94.65, 25.85],
          [94.32, 25.85],
          [94.35, 26.15]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Mokokchung' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [94.32, 26.48],
          [94.72, 26.48],
          [94.70, 26.18],
          [94.30, 26.18],
          [94.32, 26.48]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Tuensang' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [94.68, 26.42],
          [94.98, 26.42],
          [94.95, 26.15],
          [94.65, 26.15],
          [94.68, 26.42]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Kiphire' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [94.62, 26.05],
          [94.95, 26.05],
          [94.92, 25.75],
          [94.60, 25.75],
          [94.62, 26.05]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Longleng' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [94.68, 26.65],
          [94.95, 26.65],
          [94.92, 26.35],
          [94.65, 26.35],
          [94.68, 26.65]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Noklak' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [94.88, 26.35],
          [95.18, 26.35],
          [95.15, 26.05],
          [94.85, 26.05],
          [94.88, 26.35]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Shamator' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [94.78, 26.18],
          [95.05, 26.18],
          [95.02, 25.95],
          [94.75, 25.95],
          [94.78, 26.18]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { district: 'Mon' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [94.85, 27.02],
          [95.25, 27.02],
          [95.22, 26.52],
          [94.82, 26.52],
          [94.85, 27.02]
        ]]
      }
    }
  ]
};
