import React, { useEffect, useRef, useState } from 'react';
import { loadSolarOverlay } from '../utils/solarOverlay';

/**
 * Map preview with Google Solar API overlay.
 *
 * @param {Object} props
 * @param {number} props.lat
 * @param {number} props.lng
 * @param {string} [props.address]
 * @param {number} [props.zoom=18]
 * @param {string} [props.className]
 * @param {boolean} [props.solarOverlay=true]
 * @param {string} [props.apiKey]
 * @param {function} [props.onPanelConfigChange] - Receives { panelCount, yearlyKwh, panelCapacityWatts } or null.
 * @param {function} [props.onSolarReady] - Called with true when solar data finishes loading (success or failure), false when it starts.
 * @param {function} [props.onAllConfigsReady] - Receives { configs: [...], panelCapacityWatts } or null.
 */
export default function MapPreview({ lat, lng, address, zoom = 18, className = '', solarOverlay = true, apiKey: apiKeyProp, onPanelConfigChange, onSolarReady, onAllConfigsReady }) {
  const apiKey = apiKeyProp || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const solarOverlayRef = useRef(null);
  const panelsRef = useRef([]);
  const solarPanelConfigsRef = useRef([]);
  const panelCapacityWattsRef = useRef(null);
  const onChangeRef = useRef(onPanelConfigChange);
  onChangeRef.current = onPanelConfigChange;
  const onSolarReadyRef = useRef(onSolarReady);
  onSolarReadyRef.current = onSolarReady;
  const onAllConfigsRef = useRef(onAllConfigsReady);
  onAllConfigsRef.current = onAllConfigsReady;

  const [mapError, setMapError] = useState(null);
  const [solarStatus, setSolarStatus] = useState(null);
  const [solarPanelConfigs, setSolarPanelConfigs] = useState([]);
  const [configId, setConfigId] = useState(0);

  function emitPanelConfig(idx) {
    const configs = solarPanelConfigsRef.current;
    const config = configs?.[idx];
    if (!config) { onChangeRef.current?.(null); return; }
    const panelCount = config.panelsCount ?? config.panels_count ?? 0;
    const yearlyKwh = config.yearlyEnergyDcKwh ?? config.yearly_energy_dc_kwh;
    if (yearlyKwh == null) { onChangeRef.current?.(null); return; }
    const panelCapacityWatts = panelCapacityWattsRef.current;
    onChangeRef.current?.({ panelCount, yearlyKwh, panelCapacityWatts });
  }

  useEffect(() => {
    if (lat == null || lng == null || !containerRef.current) return;

    function initMap() {
      if (!window.google?.maps || !containerRef.current) return;
      try {
        const center = { lat: Number(lat), lng: Number(lng) };
        const map = new google.maps.Map(containerRef.current, {
          center,
          zoom: Number(zoom) || 18,
          tilt: 0,
          heading: 0,
          disableDefaultUI: true,
          mapTypeId: 'hybrid',
          styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
        });
        mapRef.current = map;
        setMapError(null);
        setSolarStatus(null);
        setTimeout(() => {
          if (mapRef.current) google.maps.event.trigger(mapRef.current, 'resize');
          if (mapRef.current) mapRef.current.setCenter(center);
        }, 100);

        if (solarOverlay && apiKey) {
          setSolarStatus('loading');
          setSolarPanelConfigs([]);
          onSolarReadyRef.current?.(false);
          loadSolarOverlay(lat, lng, apiKey)
            .then(async ({ dataUrl, bounds, buildingInsights }) => {
              if (!mapRef.current) return;
              const latLngBounds = new google.maps.LatLngBounds(
                new google.maps.LatLng(bounds.south, bounds.west),
                new google.maps.LatLng(bounds.north, bounds.east)
              );
              const overlay = new google.maps.GroundOverlay(dataUrl, latLngBounds, { opacity: 0.7 });
              overlay.setMap(mapRef.current);
              solarOverlayRef.current = overlay;
              setSolarStatus('ok');
              mapRef.current.fitBounds(latLngBounds, { top: 12, right: 12, bottom: 12, left: 12 });
              const z = mapRef.current.getZoom();
              if (typeof z === 'number' && z < 21) mapRef.current.setZoom(z + 1);

              if (buildingInsights?.solarPotential?.solarPanels && mapRef.current) {
                try {
                  const { spherical } = await google.maps.importLibrary('geometry');
                  const potential = buildingInsights.solarPotential;
                  const solarPanels = potential.solarPanels || potential.solar_panels || [];
                  const roofSegmentStats = potential.roofSegmentStats || potential.roof_segment_stats || [];
                  const configs = potential.solarPanelConfigs || potential.solar_panel_configs || [];
                  const panelW = (potential.panelWidthMeters ?? potential.panel_width_meters ?? 1) / 2;
                  const panelH = (potential.panelHeightMeters ?? potential.panel_height_meters ?? 1) / 2;
                  panelCapacityWattsRef.current = potential.panelCapacityWatts ?? potential.panel_capacity_watts ?? null;

                  if (solarPanels.length && roofSegmentStats.length) {
                    const minE = solarPanels[solarPanels.length - 1]?.yearlyEnergyDcKwh ?? solarPanels[solarPanels.length - 1]?.yearly_energy_dc_kwh ?? 0;
                    const maxE = solarPanels[0]?.yearlyEnergyDcKwh ?? solarPanels[0]?.yearly_energy_dc_kwh ?? 1;
                    const palette = [];
                    for (let i = 0; i < 256; i++) {
                      const t = i / 255;
                      const r = Math.round(0xe8 + t * (0x1a - 0xe8));
                      const g = Math.round(0xea + t * (0x23 - 0xea));
                      const b = Math.round(0xf6 + t * (0x7e - 0xf6));
                      palette.push('#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join(''));
                    }
                    const polygons = solarPanels.map((panel) => {
                      const center = panel.center || {};
                      const pLat = center.latitude ?? center.lat;
                      const pLng = center.longitude ?? center.lng;
                      const orientation = panel.orientation === 'PORTRAIT' ? 90 : 0;
                      const segIdx = panel.segmentIndex ?? panel.segment_index ?? 0;
                      const segment = roofSegmentStats[segIdx] || {};
                      const azimuth = segment.azimuthDegrees ?? segment.azimuth_degrees ?? 0;
                      const energy = panel.yearlyEnergyDcKwh ?? panel.yearly_energy_dc_kwh ?? 0;
                      const t = maxE > minE ? (energy - minE) / (maxE - minE) : 0;
                      const colorIndex = Math.min(255, Math.max(0, Math.round(t * 255)));
                      const points = [[panelW, panelH], [panelW, -panelH], [-panelW, -panelH], [-panelW, panelH], [panelW, panelH]];
                      const path = points.map(([x, y]) => {
                        const distM = Math.sqrt(x * x + y * y);
                        const heading = (Math.atan2(y, x) * (180 / Math.PI)) + orientation + azimuth;
                        return spherical.computeOffset({ lat: pLat, lng: pLng }, distM, heading);
                      });
                      return new google.maps.Polygon({
                        paths: path,
                        strokeColor: '#B0BEC5',
                        strokeOpacity: 0.9,
                        strokeWeight: 1,
                        fillColor: palette[colorIndex],
                        fillOpacity: 0.9,
                        map: null,
                      });
                    });
                    panelsRef.current = polygons;
                    solarPanelConfigsRef.current = configs;
                    setSolarPanelConfigs(configs);
                    setConfigId(0);
                    const showCount = configs.length ? (configs[0].panelsCount ?? configs[0].panels_count ?? polygons.length) : polygons.length;
                    polygons.forEach((p, i) => p.setMap(i < showCount ? mapRef.current : null));
                    emitPanelConfig(0);
                    onAllConfigsRef.current?.({ configs, panelCapacityWatts: panelCapacityWattsRef.current });
                  }
                } catch (e) {
                  console.warn('Solar panel preview failed:', e?.message || e);
                }
              }
              if (!buildingInsights?.solarPotential?.solarPanels?.length) {
                setSolarPanelConfigs([]);
                solarPanelConfigsRef.current = [];
                panelCapacityWattsRef.current = null;
                onChangeRef.current?.(null);
                onAllConfigsRef.current?.(null);
              }
              onSolarReadyRef.current?.(true);
            })
            .catch((err) => {
              setSolarStatus('unavailable');
              console.warn('Solar overlay failed:', err?.message || err);
              onAllConfigsRef.current?.(null);
              onSolarReadyRef.current?.(true);
            });
        }
      } catch (err) {
        setMapError(err?.message || 'Failed to load map');
      }
    }

    if (window.google?.maps) { initMap(); return; }
    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      if (window.google?.maps) { clearInterval(interval); initMap(); }
      else if (attempts >= 25) { clearInterval(interval); setMapError('Map failed to load. Try selecting an address again.'); }
    }, 200);
    return () => clearInterval(interval);
  }, [lat, lng, zoom, address, solarOverlay, apiKey]);

  useEffect(() => {
    return () => {
      if (panelsRef.current.length) { panelsRef.current.forEach((p) => p.setMap(null)); panelsRef.current = []; }
      solarPanelConfigsRef.current = [];
      panelCapacityWattsRef.current = null;
      if (solarOverlayRef.current) { solarOverlayRef.current.setMap(null); solarOverlayRef.current = null; }
      mapRef.current = null;
    };
  }, [lat, lng]);

  // Panel config slider: update polygons
  useEffect(() => {
    const configs = solarPanelConfigsRef.current;
    const polygons = panelsRef.current;
    if (!configs.length || !polygons.length || !mapRef.current) return;
    const config = configs[configId];
    if (!config) return;
    const count = config.panelsCount ?? config.panels_count ?? polygons.length;
    polygons.forEach((p, i) => p.setMap(i < count ? mapRef.current : null));
    emitPanelConfig(configId);
  }, [configId, solarPanelConfigs]);

  if (lat == null || lng == null) return null;

  return (
    <div className={`overflow-hidden rounded-2xl ${className}`}
      style={{ border: '1px solid var(--border-muted)', background: 'var(--bg-card)' }}>

      <div
        ref={containerRef}
        className="w-full"
        style={{ height: '280px', minHeight: '280px' }}
        aria-label="Map preview"
      />

      {mapError && (
        <p className="px-4 py-2 text-sm text-amber-400">{mapError}</p>
      )}

      {solarPanelConfigs.length > 0 && (
        <div className="px-4 py-3 space-y-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>

          {solarStatus === 'loading' && (
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Loading solar data…
            </p>
          )}

          {(() => {
            const max = Math.max(0, solarPanelConfigs.length - 1)
            const pct = max === 0 ? 100 : (configId / max) * 100
            const count = solarPanelConfigs[configId]?.panelsCount ?? solarPanelConfigs[configId]?.panels_count ?? 0
            return (
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Solar Panels</span>
                <span className="text-2xl font-extrabold text-orange-400">{count} panels</span>
                <input
                  type="range"
                  min={0}
                  max={max}
                  value={configId}
                  onChange={(e) => setConfigId(Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, #f97316 ${pct}%, rgba(255,255,255,0.1) ${pct}%)`,
                  }}
                  aria-label="Panels count"
                />
              </div>
            )
          })()}
        </div>
      )}

      {solarStatus === 'unavailable' && (
        <p className="px-4 py-2 text-xs text-slate-500 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          Solar data not available for this location
        </p>
      )}
    </div>
  );
}
