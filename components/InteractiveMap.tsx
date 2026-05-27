import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  Map, 
  AdvancedMarker, 
  Pin, 
  InfoWindow, 
  useMap, 
  useMapsLibrary,
  useAdvancedMarkerRef
} from '@vis.gl/react-google-maps';
import { Stop } from '../types';
import { Navigation, MapPin, Info, ExternalLink, Activity } from 'lucide-react';

const TrafficLayerCustom: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(map);
    return () => trafficLayer.setMap(null);
  }, [map]);
  return null;
};

interface InteractiveMapProps {
  stops: Stop[];
  origin?: string;
  destination?: string;
}

const RouteDisplay: React.FC<{ stops: Stop[] }> = ({ stops }) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!routesLib || !map || stops.length < 2) return;

    // Clear previous route
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    const validStops = stops.filter(s => s.coordinates?.lat && s.coordinates?.lng);
    if (validStops.length < 2) return;

    const origin = { lat: validStops[0].coordinates!.lat, lng: validStops[0].coordinates!.lng };
    const destination = { lat: validStops[validStops.length - 1].coordinates!.lat, lng: validStops[validStops.length - 1].coordinates!.lng };
    const intermediates = validStops.slice(1, -1).map(s => ({
      location: { lat: s.coordinates!.lat, lng: s.coordinates!.lng }
    }));

    routesLib.Route.computeRoutes({
      origin,
      destination,
      intermediates: intermediates.length > 0 ? intermediates : undefined,
      travelMode: 'DRIVING',
      routingPreference: 'TRAFFIC_AWARE',
      fields: ['path', 'viewport', 'distanceMeters', 'durationMillis'],
    }).then(({ routes }) => {
      if (routes?.[0]) {
        const newPolylines = routes[0].createPolylines();
        newPolylines.forEach(p => {
          p.setOptions({
            strokeColor: '#FF385C',
            strokeWeight: 5,
            strokeOpacity: 0.8
          });
          p.setMap(map);
        });
        polylinesRef.current = newPolylines;
        if (routes[0].viewport) map.fitBounds(routes[0].viewport);
      }
    }).catch(err => console.error("Error computing route:", err));

    return () => {
      polylinesRef.current.forEach(p => p.setMap(null));
    };
  }, [routesLib, map, stops]);

  return null;
};

const StopMarker: React.FC<{ stop: Stop; index: number }> = ({ stop, index }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [isOpen, setIsOpen] = useState(false);

  if (!stop.coordinates?.lat) return null;

  const isStart = index === 0;
  const isEnd = false; // We handle intermediates and end separately if needed, but here let's just color codes

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: stop.coordinates.lat, lng: stop.coordinates.lng }}
        onClick={() => setIsOpen(true)}
      >
        <Pin 
          background={isStart ? '#10B981' : '#FF385C'} 
          glyphColor="#fff" 
          borderColor={isStart ? '#059669' : '#BE123C'}
          scale={1.1}
        />
      </AdvancedMarker>
      {isOpen && (
        <InfoWindow anchor={marker} onCloseClick={() => setIsOpen(false)}>
          <div className="p-1 min-w-[150px] font-sans">
            <div className="flex items-center gap-2 mb-2">
               <div className={`w-2 h-2 rounded-full ${isStart ? 'bg-emerald-500' : 'bg-[#FF385C]'}`} />
               <h4 className="text-sm font-black text-gray-900">{stop.city}</h4>
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Day {stop.day}</p>
            <p className="text-xs text-gray-700 leading-tight mb-2">{stop.activity}</p>
            
            {stop.stopSources && stop.stopSources.length > 0 && (
              <a 
                href={stop.stopSources[0].uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-bold text-[#FF385C] hover:underline"
              >
                More Details <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ stops }) => {
  const [showTraffic, setShowTraffic] = useState(false);
  const validStops = useMemo(() => stops.filter(s => s.coordinates && s.coordinates.lat && s.coordinates.lng), [stops]);

  if (validStops.length === 0) {
    return (
      <div className="h-[400px] w-full rounded-2xl bg-gray-50 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 p-8 text-center">
        <MapPin className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm font-bold uppercase tracking-widest mb-1">Geographic Data Missing</p>
        <p className="text-xs max-w-[200px]">We couldn't pinpoint the exact locations for this itinerary yet.</p>
      </div>
    );
  }

  return (
    <div className="h-[450px] w-full rounded-2xl overflow-hidden border border-gray-200 shadow-xl shadow-gray-200/50 relative group">
      <Map
        defaultCenter={{ lat: validStops[0].coordinates!.lat, lng: validStops[0].coordinates!.lng }}
        defaultZoom={10}
        mapId="ROAD_TRIP_PRO_MAP"
        disableDefaultUI={true}
        zoomControl={true}
        gestureHandling="greedy"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
      >
        {showTraffic && <TrafficLayerCustom />}
        <RouteDisplay stops={validStops} />
        {validStops.map((stop, i) => (
          <StopMarker key={`${stop.city}-${i}`} stop={stop} index={i} />
        ))}
      </Map>

      {/* Floating Info Overlay */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-white hidden sm:flex items-center gap-3">
           <Navigation className="w-4 h-4 text-[#FF385C]" />
           <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Precision Routing</p>
              <p className="text-xs font-bold text-gray-900 leading-none">Traffic-Aware Google Maps Engine</p>
           </div>
        </div>
        
        <button 
          onClick={() => setShowTraffic(!showTraffic)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg border transition-all ${
            showTraffic 
            ? 'bg-amber-500 border-amber-600 text-white' 
            : 'bg-white/90 backdrop-blur-md border-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="text-[10px] font-black uppercase">Live Traffic {showTraffic ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </div>
  );
};

