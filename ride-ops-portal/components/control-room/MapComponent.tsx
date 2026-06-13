'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTripStore } from '@ride/shared';
import { useSafetyAlertStore } from '@ride/shared';

interface MapComponentProps {
  onMarkerClick?: (vehicleId: string) => void;
}

export default function MapComponent({ onMarkerClick }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const trips = useTripStore((s) => s.trips);
  const safetyAlerts = useSafetyAlertStore((s) => s.safetyAlerts);

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('map-container', {
        center: [12.9716, 77.5946],
        zoom: 12,
        dragging: true,
        touchZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
    }

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    // Add vehicle markers
    trips.forEach((trip) => {
      trip.vehicles.forEach((vehicle) => {
        if (!vehicle.vehicleId) return;

        const stop = trip.stops[0];
        if (!stop) return;

        const sosAlert = safetyAlerts.find((a) => a.vehicleId === vehicle.vehicleId && a.type === 'SOS' && a.status === 'ACTIVE');

        let color = '#3B82F6'; // blue (EN_ROUTE_PICKUP)
        if (vehicle.status === 'IN_TRANSIT') color = '#10B981'; // green
        if (sosAlert) color = '#EF4444'; // red (SOS)
        if (vehicle.status === 'BREAKDOWN') color = '#F97316'; // orange

        const svgIcon = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" fill="${color}" ${sosAlert ? 'style="animation: pulse 1s infinite"' : ''}/>
          <circle cx="16" cy="16" r="6" fill="white"/>
        </svg>`;

        const icon = L.divIcon({
          html: svgIcon,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([stop.lat, stop.lng], { icon }).addTo(mapRef.current!);

        marker.on('click', () => {
          onMarkerClick?.(vehicle.vehicleId || '');
        });

        markersRef.current[vehicle.vehicleId] = marker;
      });
    });
  }, [trips, safetyAlerts, onMarkerClick]);

  return (
    <div
      id="map-container"
      style={{
        height: '100%',
        width: '100%',
      }}
    />
  );
}
