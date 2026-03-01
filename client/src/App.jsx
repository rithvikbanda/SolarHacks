import React, { useState } from 'react'
import AddressSearch from './components/AddressSearch'
import MapPreview from './components/MapPreview'

export default function App() {
  const [result, setResult] = useState(null)
  const [searchError, setSearchError] = useState(null)

  const handleAddressChange = ({ lat, lng, address }) => {
    setSearchError(null)
    setResult({ address, lat, lng })
  }

  const handleSearchError = (message) => {
    setSearchError(message)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Address search</h1>

        <AddressSearch
          onChange={handleAddressChange}
          onError={handleSearchError}
          placeholder="Enter an address..."
        />

        {searchError && (
          <p className="text-sm text-amber-400" role="alert">
            {searchError}
          </p>
        )}

        {result && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-4 font-mono text-sm">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Result</p>
              {result.address && (
                <p className="text-slate-200">
                  {[result.address.street, result.address.unit, result.address.city, result.address.state, result.address.zip, result.address.country].filter(Boolean).join(', ')}
                </p>
              )}
              <p className="text-slate-500 mt-2">
                {result.lat.toFixed(6)}, {result.lng.toFixed(6)}
              </p>
            </div>
            <MapPreview
              lat={result.lat}
              lng={result.lng}
              address={result.address ? [result.address.street, result.address.unit, result.address.city, result.address.state, result.address.zip].filter(Boolean).join(', ') : undefined}
              className="w-full"
            />
          </div>
        )}
      </div>
    </div>
  )
}
