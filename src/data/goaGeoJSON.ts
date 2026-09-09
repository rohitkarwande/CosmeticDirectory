// Goa 2 Districts GeoJSON Feature Collection
export const GOA_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "North Goa" },
      geometry: {
        type: "Polygon",
        coordinates: [[[73.68, 15.45], [74.22, 15.50], [74.25, 15.80], [73.68, 15.80], [73.68, 15.45]]]
      }
    },
    {
      type: "Feature",
      properties: { name: "South Goa" },
      geometry: {
        type: "Polygon",
        coordinates: [[[73.72, 14.88], [74.32, 14.90], [74.22, 15.45], [73.68, 15.45], [73.72, 14.88]]]
      }
    }
  ]
};
