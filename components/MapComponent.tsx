// Map component using react-leaflet
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvent } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapComponentProps {
  center: [number, number];
  marker: [number, number] | null;
  onMapClick?: (coords: [number, number]) => void;
}

// Component to update map view when center changes
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

function ClickHandler({ onMapClick }: { onMapClick?: (coords: [number, number]) => void }) {
  useMapEvent('click', (e) => {
    if (onMapClick) {
      onMapClick([e.latlng.lat, e.latlng.lng]);
    }
  });
  return null;
}

export default function MapComponent({ center, marker, onMapClick }: MapComponentProps) {
  return (
    <div className="h-96 w-full rounded-lg overflow-hidden">
      <MapContainer
        center={center}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        className="z-10"
      >
        <ChangeView center={center} zoom={marker ? 15 : 6} />
        <ClickHandler onMapClick={onMapClick} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {marker && (
          <Marker position={marker}>
            <Popup>
              <div className="text-center">
                <strong>Selected Location</strong><br />
                Lat: {marker[0].toFixed(6)}<br />
                Lng: {marker[1].toFixed(6)}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}