import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Client } from '../types';
import { STATES_AND_DISTRICTS, DISTRICT_CENTERS } from '../data/statesAndDistricts';
import { STATE_GEOJSON_MAP } from '../data/stateGeoJSON';
import { MAHARASHTRA_GEOJSON } from '../data/maharashtraGeoJSON';

// Fix Leaflet default icon URL issues in Vite/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface ClientMapProps {
  clients: Client[];
  selectedDistrict: string;
  selectedState?: string;
  onSelectDistrict: (district: string) => void;
  onSelectClient?: (client: Client) => void;
}

export function ClientMap({
  clients,
  selectedDistrict,
  selectedState = 'Maharashtra',
  onSelectDistrict,
  onSelectClient
}: ClientMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Pre-calculate client counts per district
  const districtCounts = useRef<Record<string, number>>({});
  
  useEffect(() => {
    const counts: Record<string, number> = {};
    clients.forEach(client => {
      if (client.district) {
        counts[client.district] = (counts[client.district] || 0) + 1;
      }
    });
    districtCounts.current = counts;
  }, [clients]);

  // Initialize Leaflet Map instance
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // initialize once

    const stateConfig = STATES_AND_DISTRICTS[selectedState] || STATES_AND_DISTRICTS['Maharashtra'];

    const map = L.map(mapContainerRef.current, {
      center: stateConfig.center,
      zoom: stateConfig.zoom,
      zoomControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // OpenStreetMap dark/sleek tile layer or standard OSM tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Recenter map when state changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedState === 'All') {
      map.flyTo([20.5937, 78.9629], 5, { duration: 1 });
    } else {
      const stateConfig = STATES_AND_DISTRICTS[selectedState];
      if (stateConfig) {
        map.flyTo(stateConfig.center, stateConfig.zoom, { duration: 1 });
      }
    }
  }, [selectedState]);

  // Render / update GeoJSON District Boundaries for selected state
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
    }

    const counts = districtCounts.current;
    const currentGeoJson = STATE_GEOJSON_MAP[selectedState] || MAHARASHTRA_GEOJSON;

    const geoJsonLayer = L.geoJSON(currentGeoJson as any, {
      style: (feature) => {
        const dName = feature?.properties?.name || '';
        const isSelected = selectedDistrict !== 'All' && selectedDistrict === dName;
        const count = counts[dName] || 0;

        return {
          fillColor: isSelected ? '#06b6d4' : (count > 0 ? '#6366f1' : '#334155'),
          weight: isSelected ? 2.5 : (count > 0 ? 2 : 1),
          opacity: isSelected ? 1 : 0.8,
          color: isSelected ? '#38bdf8' : (count > 0 ? '#818cf8' : '#64748b'),
          dashArray: isSelected ? '' : '3',
          fillOpacity: isSelected ? 0.35 : (count > 0 ? 0.25 : 0.08)
        };
      },
      onEachFeature: (feature, layer) => {
        const dName = feature.properties.name;
        const count = counts[dName] || 0;

        layer.bindTooltip(`
          <div class="px-2 py-1 text-xs font-semibold text-slate-800 rounded shadow">
            <strong>${dName} District</strong>
            <div class="text-[11px] text-indigo-600 font-bold">${count} Client${count === 1 ? '' : 's'}</div>
          </div>
        `, { sticky: true, direction: 'top' });

        layer.on({
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({
              weight: 3,
              color: '#38bdf8',
              fillOpacity: 0.45
            });
          },
          mouseout: (e) => {
            geoJsonLayer.resetStyle(e.target);
          },
          click: () => {
            onSelectDistrict(dName);
          }
        });
      }
    }).addTo(map);

    geoJsonLayerRef.current = geoJsonLayer;
  }, [selectedDistrict, clients, onSelectDistrict]);

  // Render Client Pins & Popups
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // Filter clients based on selectedDistrict
    const visibleClients = selectedDistrict === 'All'
      ? clients
      : clients.filter(c => c.district === selectedDistrict);

    visibleClients.forEach(client => {
      let lat = client.latitude;
      let lng = client.longitude;

      // Fallback to district center if lat/lng are invalid
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        const center = DISTRICT_CENTERS[`${client.state}:${client.district}`] || DISTRICT_CENTERS[client.district] || STATES_AND_DISTRICTS['Maharashtra'].center;
        lat = center[0];
        lng = center[1];
      }

      // Custom Pin HTML Icon
      const customIcon = L.divIcon({
        className: 'custom-client-pin',
        html: `
          <div class="relative group cursor-pointer">
            <div class="w-7 h-7 rounded-full bg-cyan-500 border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-400 rotate-45"></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 10px 4px 6px 4px; min-width: 210px; color: #0f172a;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; tracking: 0.05em; color: #0284c7; margin-bottom: 2px;">${client.shopName}</div>
          <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">${client.clientName}</div>
          <div style="font-size: 12px; color: #475569; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="background-color: #e0e7ff; color: #4338ca; font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 4px;">
                ${client.district} District
              </span>
              <span style="color: #94a3b8;">•</span>
              <span style="color: #64748b; font-weight: 500;">${client.state}</span>
            </div>
            ${client.cityArea ? `<div style="color: #475569; font-weight: 600; font-size: 12px; margin-top: 4px;">📍 ${client.cityArea}</div>` : ''}
          </div>
          ${client.phone ? `
            <a href="tel:${client.phone}" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(135deg, #0284c7 0%, #4338ca 100%); color: #ffffff !important; font-weight: 700; font-size: 13px; padding: 8px 16px; border-radius: 8px; text-decoration: none !important; width: 100%; box-sizing: border-box; box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.3);">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <span style="color: #ffffff !important; text-decoration: none !important;">${client.phone}</span>
            </a>
          ` : ''}
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 280, className: 'client-popup' });

      marker.on('click', () => {
        onSelectDistrict(client.district);
        if (onSelectClient) {
          onSelectClient(client);
        }
      });

      markersGroup.addLayer(marker);
    });

    // If a specific district is selected, zoom to district center
    if (selectedDistrict !== 'All') {
      const distCenter = DISTRICT_CENTERS[`${selectedState}:${selectedDistrict}`] || DISTRICT_CENTERS[selectedDistrict];
      if (distCenter) {
        map.flyTo(distCenter, 9, { duration: 1 });
      } else if (geoJsonLayerRef.current) {
        const feat = (geoJsonLayerRef.current.toGeoJSON() as any)?.features?.find((f: any) => f.properties?.name === selectedDistrict);
        if (feat && feat.geometry && feat.geometry.coordinates) {
          const coords = feat.geometry.coordinates[0][0];
          map.flyTo([coords[1], coords[0]], 9, { duration: 1 });
        }
      }
    }
  }, [selectedDistrict, clients, onSelectClient]);

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-xl overflow-hidden shadow-inner border border-slate-700/60 bg-slate-900">
      <div ref={mapContainerRef} className="w-full h-full min-h-[480px] z-0" />
      
      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/90 backdrop-blur-md border border-slate-700/70 p-3 rounded-lg text-slate-200 text-xs shadow-xl max-w-[220px]">
        <div className="font-semibold text-white mb-2 flex items-center justify-between">
          <span>Map Overview</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded border border-cyan-500/30">Maharashtra</span>
        </div>
        <div className="space-y-1.5 text-[11px] text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-500 border border-white inline-block"></span>
            <span>Client Shop Location Pin</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3 rounded border border-indigo-400 bg-indigo-500/30 inline-block"></span>
            <span>District with active client(s)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3 rounded border border-slate-600 bg-slate-700/20 inline-block"></span>
            <span>District without clients</span>
          </div>
        </div>
      </div>
    </div>
  );
}
