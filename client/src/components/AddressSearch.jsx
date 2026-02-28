import { useEffect, useRef, useState } from 'react';

const CALLBACK_NAME = '___addressToLatLongInit___';

// Shared script loading: one script per key, notify all registered listeners when ready
const listenersByKey = new Map();
const loadingKeys = new Set();

function registerListener(key, onReady, onError) {
  if (!listenersByKey.has(key)) listenersByKey.set(key, []);
  listenersByKey.get(key).push({ onReady, onError });
}

function unregisterListener(key, onReady) {
  const list = listenersByKey.get(key);
  if (!list) return;
  const i = list.findIndex((l) => l.onReady === onReady);
  if (i !== -1) list.splice(i, 1);
  if (list.length === 0) listenersByKey.delete(key);
}

function notifyAllReady() {
  listenersByKey.forEach((list) => list.forEach((l) => l.onReady()));
  loadingKeys.clear();
  delete window[CALLBACK_NAME];
}

function notifyError(key, message) {
  const list = listenersByKey.get(key);
  if (list) list.forEach((l) => l.onError?.(message));
  loadingKeys.delete(key);
}

function loadScript(key) {
  if (typeof google !== 'undefined' && google.maps) {
    notifyAllReady();
    return;
  }
  if (loadingKeys.size > 0) {
    // Script already loading (any key) - callback will notify everyone when it's ready
    window[CALLBACK_NAME] = notifyAllReady;
    return;
  }
  loadingKeys.add(key);
  window[CALLBACK_NAME] = notifyAllReady;
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=${CALLBACK_NAME}`;
  script.async = true;
  script.defer = true;
  script.onerror = () => notifyError(key, 'Google Maps script failed to load.');
  document.head.appendChild(script);
}

/**
 * Address search box with Google Places autocomplete (Places API New).
 * Pass your Google API key via the apiKey prop or set VITE_GOOGLE_MAPS_API_KEY.
 *
 * @param {Object} props
 * @param {string} [props.apiKey] - Google API key (or set VITE_GOOGLE_MAPS_API_KEY)
 * @param {function} [props.onChange] - Called when a place is selected. Receives `{ lat, lng, formattedAddress }`.
 * @param {function} [props.onError] - Called when selection fails. Receives error message string.
 */
export default function AddressSearch({ apiKey, onChange, onError, placeholder = 'Enter an address...' }) {
  const key = apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onErrorRef = useRef(onError);
  onChangeRef.current = onChange;
  onErrorRef.current = onError;
  const [apiReady, setApiReady] = useState(false);

  // Load Google Maps script (shared across instances); register so we get notified when ready
  useEffect(() => {
    if (!key) return;
    if (typeof google !== 'undefined' && google.maps) {
      setApiReady(true);
      return;
    }
    const onReady = () => setApiReady(true);
    registerListener(key, onReady, onErrorRef.current);
    loadScript(key);
    return () => {
      unregisterListener(key, onReady);
    };
  }, [key]);

  // When API is ready and we have a container, init Places autocomplete widget
  useEffect(() => {
    if (!apiReady || !containerRef.current || !key) return;
    let mounted = true;
    (async () => {
      try {
        const { PlaceAutocompleteElement } = await google.maps.importLibrary('places');
        if (!mounted || !containerRef.current) return;
        const el = new PlaceAutocompleteElement({ placeholder });
        if (!mounted || !containerRef.current) return;
        containerRef.current.appendChild(el);
        widgetRef.current = el;
        el.addEventListener('gmp-select', async ({ placePrediction }) => {
          const place = placePrediction.toPlace();
          await place.fetchFields({ fields: ['location', 'formattedAddress', 'displayName'] });
          if (!place.location) {
            onErrorRef.current?.('No coordinates for that place.');
            return;
          }
          const data = { lat: place.location.lat(), lng: place.location.lng(), formattedAddress: place.formattedAddress || place.displayName || '' };
          onChangeRef.current?.(data);
        });
      } catch (err) {
        if (mounted) onErrorRef.current?.(err?.message || 'Failed to load Places.');
      }
    })();
    return () => {
      mounted = false;
      if (widgetRef.current && containerRef.current?.contains(widgetRef.current)) {
        containerRef.current.removeChild(widgetRef.current);
      }
      widgetRef.current = null;
    };
  }, [apiReady, key, placeholder]);

  return (
    <div className="address-search-box" ref={containerRef}>
      <style>{`
        .address-search-box { width: 100%; min-height: 2.75rem; }
        .address-search-box gmp-place-autocomplete { display: block !important; width: 100% !important; }
        .address-search-box gmp-place-autocomplete input {
          width: 100% !important; padding: 0.75rem 1rem 0.75rem 2.75rem;
          border: 1px solid rgba(71, 85, 105, 0.6);
          border-radius: 12px;
          font-size: 1rem;
          box-sizing: border-box;
          font-family: 'Outfit', system-ui, -apple-system, sans-serif;
          background: rgba(30, 41, 59, 0.6);
          color: #f1f5f9;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .address-search-box gmp-place-autocomplete input::placeholder { color: #64748b; }
        .address-search-box gmp-place-autocomplete input:focus {
          outline: none;
          border-color: rgba(16, 185, 129, 0.6);
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
        }
      `}</style>
    </div>
  );
}
