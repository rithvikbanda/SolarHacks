/**
 * Solar overlay using the same approach as the official Google demo:
 * https://github.com/googlemaps-samples/js-solar-potential
 *
 * - Building Insights findClosest first → get the ONE building at the address and its bounding box.
 * - Data layer radius = ceil(diameter of that box / 2) so only that building is in the circle.
 * - getDataLayerUrls with that center + radius, then downloadGeoTIFF + renderPalette with mask.
 */

const MAX_OVERLAY_PX = 256;

/** Haversine distance between two lat/lng points in meters. */
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Fetch full Building Insights (findClosest). Returns full API response or null if not found. */
export async function getBuildingInsights(lat, lng, apiKey, apiBaseUrl) {
  const useProxy = typeof apiBaseUrl === 'string' && apiBaseUrl.length > 0;
  const args = {
    'location.latitude': Number(lat).toFixed(5),
    'location.longitude': Number(lng).toFixed(5),
    required_quality: 'BASE',
  };
  if (!useProxy) args.key = apiKey;
  const params = new URLSearchParams(args);
  const url = useProxy
    ? `${apiBaseUrl.replace(/\/$/, '')}/api/solar/building-insights?${params}`
    : `https://solar.googleapis.com/v1/buildingInsights:findClosest?${params}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    if (data?.error?.code === 404 || data?.error?.status === 'NOT_FOUND') return null;
    throw new Error(data?.error?.message || data?.message || 'Building insights failed');
  }
  return data;
}

/**
 * Find the single building closest to the address (Building Insights findClosest).
 * Returns { center: { lat, lng }, radiusMeters } so the data layer covers only that building.
 * If no building found, returns null (caller can fall back to address + fixed radius).
 */
export async function getBuildingRadius(lat, lng, apiKey, apiBaseUrl) {
  const data = await getBuildingInsights(lat, lng, apiKey, apiBaseUrl);
  if (!data) return null;
  const center = data.center ?? data.centre;
  const box = data.boundingBox ?? data.bounding_box;
  if (!center || !box) return null;
  const ne = box.ne ?? box.northEast ?? box.northeast;
  const sw = box.sw ?? box.southWest ?? box.southwest;
  if (!ne || !sw) return null;
  const lat1 = sw.latitude ?? sw.lat;
  const lng1 = sw.longitude ?? sw.lng;
  const lat2 = ne.latitude ?? ne.lat;
  const lng2 = ne.longitude ?? ne.lng;
  const diameter = distanceMeters(lat1, lng1, lat2, lng2);
  const radius = Math.max(10, Math.ceil(diameter / 2));
  return {
    center: { lat: center.latitude ?? center.lat, lng: center.longitude ?? center.lng },
    radiusMeters: radius,
  };
}

// Demo palettes (from js-solar-potential colors.ts)
const ironPalette = ['00000A', '91009C', 'E64616', 'FEB400', 'FFFFF6'];

function createPalette(hexColors) {
  const rgb = hexColors.map((hex) => {
    const h = hex.startsWith('#') ? hex.slice(1) : hex;
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  });
  const size = 256;
  const step = (rgb.length - 1) / (size - 1);
  return Array.from({ length: size }, (_, i) => {
    const t = i * step;
    const lo = Math.floor(t);
    const hi = Math.min(Math.ceil(t), rgb.length - 1);
    const s = t - lo;
    return {
      r: rgb[lo].r + (rgb[hi].r - rgb[lo].r) * s,
      g: rgb[lo].g + (rgb[hi].g - rgb[lo].g) * s,
      b: rgb[lo].b + (rgb[hi].b - rgb[lo].b) * s,
    };
  });
}

function normalize(x, max, min) {
  const y = (x - min) / (max - min);
  return Math.min(Math.max(y, 0), 1);
}

/** Downsample mask to target width/height (max per cell so building pixels are preserved). */
function downsampleMaskTo(mask, w, h) {
  const maskBand = Array.isArray(mask.rasters[0]) ? mask.rasters[0] : Array.from(mask.rasters[0]);
  const out = new Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const y0 = Math.floor((j * mask.height) / h);
      const y1 = Math.min(Math.floor(((j + 1) * mask.height) / h), mask.height);
      const x0 = Math.floor((i * mask.width) / w);
      const x1 = Math.min(Math.floor(((i + 1) * mask.width) / w), mask.width);
      let max = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          max = Math.max(max, maskBand[y * mask.width + x]);
        }
      }
      out[j * w + i] = max;
    }
  }
  return { width: w, height: h, rasters: [out], bounds: mask.bounds };
}

/** Downsample flux data to target width/height (average per cell). */
function downsampleDataTo(data, w, h) {
  const band = Array.isArray(data.rasters[0]) ? data.rasters[0] : Array.from(data.rasters[0]);
  const out = new Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const y0 = Math.floor((j * data.height) / h);
      const y1 = Math.min(Math.floor(((j + 1) * data.height) / h), data.height);
      const x0 = Math.floor((i * data.width) / w);
      const x1 = Math.min(Math.floor(((i + 1) * data.width) / w), data.width);
      let sum = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const v = Number(band[y * data.width + x]);
          if (Number.isFinite(v) && v >= 0 && v > -9998) {
            sum += v;
            n++;
          }
        }
      }
      out[j * w + i] = n > 0 ? sum / n : 0;
    }
  }
  return { width: w, height: h, rasters: [out] };
}

/** If dimensions exceed maxPx, return downsampled mask and data; otherwise return originals. */
function maybeDownsample(mask, data, maxPx) {
  const maxDim = Math.max(mask.width, mask.height);
  if (maxDim <= maxPx) return { mask, data };
  const scale = maxPx / maxDim;
  const w = Math.max(1, Math.round(mask.width * scale));
  const h = Math.max(1, Math.round(mask.height * scale));
  return {
    mask: downsampleMaskTo(mask, w, h),
    data: downsampleDataTo(data, w, h),
  };
}

/**
 * Scale a canvas to max size MAX_OVERLAY_PX on the longer side; return as data URL.
 */
function scaleToDataUrl(canvas, maxPx = MAX_OVERLAY_PX) {
  if (canvas.width <= maxPx && canvas.height <= maxPx) return canvas.toDataURL('image/png');
  const scale = maxPx / Math.max(canvas.width, canvas.height);
  const w = Math.round(canvas.width * scale);
  const h = Math.round(canvas.height * scale);
  const c2 = document.createElement('canvas');
  c2.width = w;
  c2.height = h;
  c2.getContext('2d').drawImage(canvas, 0, 0, w, h);
  return c2.toDataURL('image/png');
}

/**
 * Render flux GeoTiff with optional mask (roof-only). Mirrors Google demo visualize.renderPalette.
 * Canvas size = mask size when mask present; alpha = mask.rasters[0][i] * 255.
 */
function renderPalette(data, mask, colors, minVal, maxVal) {
  const canvas = document.createElement('canvas');
  canvas.width = mask ? mask.width : data.width;
  canvas.height = mask ? mask.height : data.height;
  const dw = data.width / canvas.width;
  const dh = data.height / canvas.height;
  const palette = createPalette(colors);
  const dataBand = Array.isArray(data.rasters[0]) ? data.rasters[0] : Array.from(data.rasters[0]);
  const maskBand = mask && (Array.isArray(mask.rasters[0]) ? mask.rasters[0] : Array.from(mask.rasters[0]));
  const ctx = canvas.getContext('2d');
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const dataIdx = Math.floor(y * dh) * data.width + Math.floor(x * dw);
      const maskIdx = y * canvas.width + x;
      const v = Number(dataBand[dataIdx]);
      const t = Number.isFinite(v) && v >= 0 && v > -9998 ? normalize(v, maxVal, minVal) : 0;
      const idx = Math.round(t * (palette.length - 1));
      const c = palette[Math.min(idx, palette.length - 1)];
      const alpha = maskBand ? maskBand[maskIdx] * 255 : 255;
      const j = (y * canvas.width + x) * 4;
      img.data[j] = c.r;
      img.data[j + 1] = c.g;
      img.data[j + 2] = c.b;
      img.data[j + 3] = alpha;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * Fetch data layers. Uses center + radius so only the target building is in the circle.
 * Same params as Google demo: radius_meters, required_quality (no view).
 */
export async function fetchDataLayers(lat, lng, apiKey, apiBaseUrl, radiusMeters = 100) {
  const useProxy = typeof apiBaseUrl === 'string' && apiBaseUrl.length > 0;
  const args = {
    'location.latitude': Number(lat).toFixed(5),
    'location.longitude': Number(lng).toFixed(5),
    radius_meters: String(radiusMeters),
    required_quality: 'BASE',
  };
  if (!useProxy) args.key = apiKey;
  const params = new URLSearchParams(args);
  const url = useProxy
    ? `${apiBaseUrl.replace(/\/$/, '')}/api/solar/data-layers?${params}`
    : `https://solar.googleapis.com/v1/dataLayers:get?${params}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || data?.message || 'Solar data layers failed');
  const fluxUrl = data.annualFluxUrl ?? data.annual_flux_url;
  const maskUrl = data.maskUrl ?? data.mask_url;
  const monthlyFluxUrl = data.monthlyFluxUrl ?? data.monthly_flux_url;
  if (!fluxUrl) throw new Error('No annual flux for this location');
  return { ...data, annualFluxUrl: fluxUrl, maskUrl: maskUrl || null, monthlyFluxUrl: monthlyFluxUrl || null };
}

/**
 * Fetch GeoTIFF bytes. Proxy or append key.
 */
async function fetchGeoTiffBytes(url, apiKey, apiBaseUrl) {
  if (apiBaseUrl) {
    const u = `${apiBaseUrl.replace(/\/$/, '')}/api/solar/geotiff?${new URLSearchParams({ url })}`;
    const res = await fetch(u);
    if (!res.ok) throw new Error('GeoTIFF fetch failed');
    return res.arrayBuffer();
  }
  const u = url.includes('?') ? `${url}&key=${apiKey}` : `${url}?key=${apiKey}`;
  const res = await fetch(u);
  if (!res.ok) throw new Error('GeoTIFF fetch failed');
  return res.arrayBuffer();
}

/**
 * Download and parse one GeoTIFF; return { width, height, rasters, bounds } in WGS84.
 * Same as Google demo solar.downloadGeoTIFF.
 */
async function downloadGeoTIFF(url, apiKey, apiBaseUrl, fromArrayBuffer, geokeysToProj4, proj4) {
  const arrayBuffer = await fetchGeoTiffBytes(url, apiKey, apiBaseUrl);
  const tiff = await fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();
  const rasters = await image.readRasters();
  const geoKeys = image.getGeoKeys && image.getGeoKeys();
  const box = image.getBoundingBox();
  let bounds;
  if (geoKeys && geokeysToProj4?.toProj4) {
    try {
      const projObj = geokeysToProj4.toProj4(geoKeys);
      const conv = projObj.coordinatesConversionParameters || { x: 1, y: 1 };
      const proj = proj4(projObj.proj4, 'WGS84');
      const sw = proj.forward({ x: box[0] * conv.x, y: box[1] * conv.y });
      const ne = proj.forward({ x: box[2] * conv.x, y: box[3] * conv.y });
      bounds = { north: ne.y, south: sw.y, east: ne.x, west: sw.x };
    } catch {
      bounds = { south: box[1], west: box[0], north: box[3], east: box[2] };
    }
  } else {
    bounds = { south: box[1], west: box[0], north: box[3], east: box[2] };
  }
  return {
    width: rasters.width,
    height: rasters.height,
    rasters: [...Array(rasters.length).keys()].map((i) => Array.from(rasters[i])),
    bounds,
  };
}

/**
 * Load solar overlay: same flow as Google demo.
 * 1) findClosest building → get center + radius that fits only that building.
 * 2) Data layers with that center + radius → only that building in the tile.
 * 3) renderPalette with mask → roof-only image.
 * Returns { dataUrl, bounds, buildingCenter? } for GroundOverlay and map focus.
 * Heavy libs (geotiff, proj4) load in parallel with building insights for faster TTI.
 * Monthly flux is loaded in the background; pass onMonthlyReady(frames) to receive it when done.
 *
 * @param {Object} [opts] - Optional. { onMonthlyReady: (frames: string[]) => void }
 */
export async function loadSolarOverlay(lat, lng, apiKey, apiBaseUrl = '', opts = {}) {
  const baseUrl = (typeof apiBaseUrl === 'string' && apiBaseUrl) ? apiBaseUrl : (import.meta.env?.VITE_API_BASE_URL || '');
  const onMonthlyReady = opts?.onMonthlyReady;

  // Load building insights and heavy libs in parallel so we don't wait for one after the other
  const [insights, geotiffModule, geokeysModule, proj4Module] = await Promise.all([
    getBuildingInsights(lat, lng, apiKey, baseUrl),
    import('geotiff'),
    import('geotiff-geokeys-to-proj4'),
    import('proj4'),
  ]);

  const fromArrayBuffer = geotiffModule.fromArrayBuffer;
  const geokeysToProj4 = geokeysModule.default;
  const proj4 = proj4Module.default;

  let centerLat = lat;
  let centerLng = lng;
  let radiusMeters = 100;
  let buildingCenter = null;
  let buildingInsights = insights;
  if (insights) {
    const center = insights.center ?? insights.centre;
    const box = insights.boundingBox ?? insights.bounding_box;
    if (center && box) {
      const ne = box.ne ?? box.northEast ?? box.northeast;
      const sw = box.sw ?? box.southWest ?? box.southwest;
      if (ne && sw) {
        const lat1 = sw.latitude ?? sw.lat;
        const lng1 = sw.longitude ?? sw.lng;
        const lat2 = ne.latitude ?? ne.lat;
        const lng2 = ne.longitude ?? ne.lng;
        centerLat = center.latitude ?? center.lat;
        centerLng = center.longitude ?? center.lng;
        buildingCenter = { lat: centerLat, lng: centerLng };
        const diameter = distanceMeters(lat1, lng1, lat2, lng2);
        radiusMeters = Math.max(10, Math.ceil(diameter / 2));
      }
    }
  }

  const urls = await fetchDataLayers(centerLat, centerLng, apiKey, baseUrl, radiusMeters);
  const [mask, data] = await Promise.all([
    downloadGeoTIFF(urls.maskUrl, apiKey, baseUrl, fromArrayBuffer, geokeysToProj4, proj4),
    downloadGeoTIFF(urls.annualFluxUrl, apiKey, baseUrl, fromArrayBuffer, geokeysToProj4, proj4),
  ]);

  const { mask: maskR, data: dataR } = maybeDownsample(mask, data, MAX_OVERLAY_PX);
  const canvas = renderPalette(dataR, maskR, ironPalette, 0, 1800);
  const out = canvas;

  // Return immediately with annual overlay; load monthly in background and notify via callback
  if (urls.monthlyFluxUrl && onMonthlyReady) {
    (async () => {
      try {
        const monthly = await downloadGeoTIFF(urls.monthlyFluxUrl, apiKey, baseUrl, fromArrayBuffer, geokeysToProj4, proj4);
        if (monthly.rasters.length >= 12) {
          const maskDown = downsampleMaskTo(mask, monthly.width, monthly.height);
          const MONTHLY_MAX = 200;
          const frames = [];
          for (let b = 0; b < 12; b++) {
            const bandData = {
              width: monthly.width,
              height: monthly.height,
              rasters: [monthly.rasters[b]],
            };
            const frameCanvas = renderPalette(bandData, maskDown, ironPalette, 0, MONTHLY_MAX);
            frames.push(scaleToDataUrl(frameCanvas));
          }
          onMonthlyReady(frames);
        }
      } catch (e) {
        console.warn('Monthly flux unavailable:', e?.message || e);
      }
    })();
  }

  return {
    dataUrl: out.toDataURL('image/png'),
    bounds: maskR.bounds,
    buildingCenter,
    buildingInsights,
    monthlyFrames: null,
  };
}
