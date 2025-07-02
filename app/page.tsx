"use client"
// Main frontend page with coordinate/word conversion and map
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

// Dynamically import map component to avoid SSR issues
const MapComponent = dynamic(() => import('../components/MapComponent'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-200 rounded-lg flex items-center justify-center">Loading map...</div>
});

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface ApiResponse {
  success: boolean;
  words?: string[];
  coordinates?: Coordinates;
  error?: string;
  message?: string;
  invalidWords?: string[];
}

export default function Home() {
  const [coordsInput, setCoordsInput] = useState({ lat: '', lng: '' });
  const [wordsInput, setWordsInput] = useState(['', '', '']);
  const [coordsResult, setCoordsResult] = useState<string[]>([]);
  const [wordsResult, setWordsResult] = useState<Coordinates | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // India center
  const [mapMarker, setMapMarker] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState({ coords: false, words: false });
  const [errors, setErrors] = useState({ coords: '', words: '' });

  // Convert coordinates to words
  const handleCoordsToWords = async () => {
    if (!coordsInput.lat || !coordsInput.lng) {
      setErrors(prev => ({ ...prev, coords: 'Please enter both latitude and longitude' }));
      return;
    }
    const lat = parseFloat(coordsInput.lat);
    const lng = parseFloat(coordsInput.lng);
    if (isNaN(lat) || isNaN(lng)) {
      setErrors(prev => ({ ...prev, coords: 'Latitude and longitude must be valid numbers.' }));
      return;
    }
    if (lat < 6.5 || lat > 37.6 || lng < 68.7 || lng > 97.25) {
      setErrors(prev => ({ ...prev, coords: 'Coordinates must be within India bounds: Latitude 6.5–37.6, Longitude 68.7–97.25' }));
      return;
    }
    setLoading(prev => ({ ...prev, coords: true }));
    setErrors(prev => ({ ...prev, coords: '' }));
    try {
      const response = await fetch('/api/toWords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng
        })
      });
      const data: ApiResponse = await response.json();
      if (data.success && data.words) {
        let wordsArray: string[];
        if (Array.isArray(data.words) && data.words.length === 3) {
          wordsArray = data.words;
        } else if (typeof data.words === 'string') {
          // Try to split by whitespace or comma
          wordsArray = (data.words as string).split(/[\s,]+/).filter(Boolean);
          // If still only one word, try to split into 3 equal parts (for emergency fallback)
          if (wordsArray.length === 1 && wordsArray[0].length === 18) {
            wordsArray = [
              wordsArray[0].slice(0, 6),
              wordsArray[0].slice(6, 12),
              wordsArray[0].slice(12, 18)
            ];
          }
          console.log('Splitting string words:', data.words, '->', wordsArray);
        } else {
          console.log('Unexpected words type:', typeof data.words, data.words);
          wordsArray = [];
        }
        if (wordsArray.length === 3) {
          setCoordsResult(wordsArray);
          setMapCenter([lat, lng]);
          setMapMarker([lat, lng]);
        } else {
          setErrors(prev => ({ ...prev, coords: 'Failed to parse 3 words from response.' }));
        }
      } else {
        setErrors(prev => ({ ...prev, coords: data.error || 'Failed to convert coordinates' }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, coords: 'Network error. Please try again.' }));
    } finally {
      setLoading(prev => ({ ...prev, coords: false }));
    }
  };

  // Convert words to coordinates
  const handleWordsToCoords = async () => {
    const filledWords = wordsInput.map(word => word.trim()).filter(word => word !== '');
    if (filledWords.length !== 3) {
      setErrors(prev => ({ ...prev, words: 'Please enter exactly 3 words (all fields required)' }));
      return;
    }
    setLoading(prev => ({ ...prev, words: true }));
    setErrors(prev => ({ ...prev, words: '' }));
    try {
      const response = await fetch('/api/toCoords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: wordsInput.map(w => w.trim().toLowerCase()) })
      });
      const data: ApiResponse = await response.json();
      if (data.success && data.coordinates &&
          typeof data.coordinates.latitude === 'number' &&
          typeof data.coordinates.longitude === 'number') {
        setWordsResult(data.coordinates);
        const lat = data.coordinates.latitude;
        const lng = data.coordinates.longitude;
        setMapCenter([lat, lng]);
        setMapMarker([lat, lng]);
      } else if (Array.isArray((data as any).invalidWords)) {
        setWordsResult(null);
        setErrors(prev => ({ ...prev, words: `Invalid words: ${(data as any).invalidWords.join(', ')}. Please use valid words from the system.` }));
      } else {
        setWordsResult(null);
        setErrors(prev => ({ ...prev, words: data.error || 'Failed to convert words' }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, words: 'Network error. Please try again.' }));
    } finally {
      setLoading(prev => ({ ...prev, words: false }));
    }
  };

  // Handle map click to fetch 3 words for clicked coordinates
  const handleMapClick = async (coords: [number, number]) => {
    const [lat, lng] = coords;
    if (lat < 6.5 || lat > 37.6 || lng < 68.7 || lng > 97.25) {
      setErrors(prev => ({ ...prev, coords: 'Clicked location is outside India bounds.' }));
      return;
    }
    setCoordsInput({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
    setLoading(prev => ({ ...prev, coords: true }));
    setErrors(prev => ({ ...prev, coords: '' }));
    try {
      const response = await fetch('/api/toWords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng })
      });
      const data: ApiResponse = await response.json();
      if (data.success && data.words) {
        let wordsArray: string[];
        if (Array.isArray(data.words) && data.words.length === 3) {
          wordsArray = data.words;
        } else if (typeof data.words === 'string') {
          // Try to split by whitespace or comma
          wordsArray = (data.words as string).split(/[\s,]+/).filter(Boolean);
          // If still only one word, try to split into 3 equal parts (for emergency fallback)
          if (wordsArray.length === 1 && wordsArray[0].length === 18) {
            wordsArray = [
              wordsArray[0].slice(0, 6),
              wordsArray[0].slice(6, 12),
              wordsArray[0].slice(12, 18)
            ];
          }
          console.log('Splitting string words:', data.words, '->', wordsArray);
        } else {
          console.log('Unexpected words type:', typeof data.words, data.words);
          wordsArray = [];
        }
        if (wordsArray.length === 3) {
          setCoordsResult(wordsArray);
          setMapCenter([lat, lng]);
          setMapMarker([lat, lng]);
        } else {
          setErrors(prev => ({ ...prev, coords: 'Failed to parse 3 words from response.' }));
        }
      } else {
        setErrors(prev => ({ ...prev, coords: data.error || 'Failed to convert coordinates' }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, coords: 'Network error. Please try again.' }));
    } finally {
      setLoading(prev => ({ ...prev, coords: false }));
    }
  };

  return (
    <>
      <Head>
        <title>GeoWords - India Location Grid System</title>
        <meta name="description" content="Convert GPS coordinates to 3 words and vice versa for locations in India" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">🌍 GeoWords</h1>
            <p className="text-lg text-gray-600 flex items-center justify-center gap-2">
              Convert GPS coordinates to 3 words and vice versa
              <span className="relative group">
                <InformationCircleIcon className="w-5 h-5 text-blue-500 inline-block cursor-pointer" />
                <span className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 bg-white text-xs text-gray-700 rounded shadow-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  India is divided into 3×3 meter grid cells. Each cell maps to exactly 3 easy, pronounceable words. Click on the map to get the 3 words for any location!
                </span>
              </span>
            </p>
            <p className="text-sm text-gray-500 mt-1">Precision: 3x3 meter grid cells across India</p>
            <div className="mt-2 text-xs text-blue-700 bg-blue-100 rounded p-2 inline-block">
              <strong>Valid India bounds:</strong> Latitude 6.5–37.6, Longitude 68.7–97.25
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Converters */}
            <div className="space-y-6">
              {/* Coordinates to Words */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">📍 Coordinates → Words</h2>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g., 22.3039"
                        value={coordsInput.lat}
                        onChange={(e) => setCoordsInput(prev => ({ ...prev, lat: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min={6.5}
                        max={37.6}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g., 70.8022"
                        value={coordsInput.lng}
                        onChange={(e) => setCoordsInput(prev => ({ ...prev, lng: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min={68.7}
                        max={97.25}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleCoordsToWords}
                    disabled={loading.coords}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading.coords ? 'Converting...' : 'Convert to Words'}
                  </button>

                  {errors.coords && (
                    <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                      {errors.coords}
                    </div>
                  )}

                  {coordsResult.length > 0 && (
                    <div className="bg-green-50 p-4 rounded-md">
                      <h3 className="font-medium text-green-800 mb-2">Result:</h3>
                      <div className="flex space-x-2">
                        {coordsResult.map((word, index) => (
                          <span key={index} className="bg-green-200 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Words to Coordinates */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">🔤 Words → Coordinates</h2>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {wordsInput.map((word, index) => (
                      <div key={index}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Word {index + 1}</label>
                        <input
                          type="text"
                          placeholder={`word${index + 1}`}
                          value={word}
                          onChange={(e) => {
                            const newWords = [...wordsInput];
                            newWords[index] = e.target.value;
                            setWordsInput(newWords);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleWordsToCoords}
                    disabled={loading.words}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading.words ? 'Converting...' : 'Convert to Coordinates'}
                  </button>

                  {errors.words && (
                    <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                      {errors.words}
                    </div>
                  )}

                  {wordsResult && typeof wordsResult.latitude === 'number' && typeof wordsResult.longitude === 'number' && (
                    <div className="bg-blue-50 p-4 rounded-md">
                      <h3 className="font-medium text-blue-800 mb-2">Result:</h3>
                      <p className="text-sm text-blue-700">
                        <span className="font-mono">Latitude: {wordsResult.latitude.toFixed(6)}</span><br />
                        <span className="font-mono">Longitude: {wordsResult.longitude.toFixed(6)}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Map */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">🗺️ Location Map</h2>
              <MapComponent center={mapCenter} marker={mapMarker} onMapClick={handleMapClick} />
            </div>
          </div>

          {/* Sample Data */}
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">📋 Sample Data for Testing</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Sample Coordinates (India):</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>• Mumbai: 19.0760, 72.8777</li>
                  <li>• Delhi: 28.6139, 77.2090</li>
                  <li>• Bangalore: 12.9716, 77.5946</li>
                  <li>• Kolkata: 22.5726, 88.3639</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-700 mb-2">How it works:</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>• India is divided into 3×3 meter grid cells</li>
                  <li>• Each cell maps to exactly 3 words</li>
                  <li>• Uses deterministic hashing for consistency</li>
                  <li>• Reverse lookup finds coordinates from words</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}