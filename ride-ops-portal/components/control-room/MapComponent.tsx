'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTripStore, useSafetyAlertStore, useTraccarStore } from '@ride/shared';

interface MapComponentProps {
  onMarkerClick?: (vehicleId: string) => void;
}

export default function MapComponent({ onMarkerClick }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const trips = useTripStore((s) => s.trips);
  const safetyAlerts = useSafetyAlertStore((s) => s.safetyAlerts);
  const traccarStore = useTraccarStore();
  const traccarPositions = traccarStore.positions;

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

        // Try to get position from Traccar first, fall back to trip stop
        let lat = 12.9716;
        let lng = 77.5946;
        let speed = 0;

        // Check if we have a Traccar position for this vehicle
        // Map vehicleId to device ID (in real scenario, this would be stored in the vehicle record)
        const deviceId = parseInt(vehicle.vehicleId.split('-')[1] || '1');
        const traccarPos = traccarPositions.get(deviceId);

        if (traccarPos) {
          lat = traccarPos.latitude;
          lng = traccarPos.longitude;
          speed = traccarPos.speed;
        } else if (trip.stops[0]) {
          // Fall back to trip stop location
          lat = trip.stops[0].lat;
          lng = trip.stops[0].lng;
        }

        const sosAlert = safetyAlerts.find((a) => a.vehicleId === vehicle.vehicleId && a.type === 'SOS' && a.status === 'ACTIVE');

        let color = '#3B82F6'; // blue (EN_ROUTE_PICKUP)
        if (vehicle.status === 'IN_TRANSIT') color = '#10B981'; // green
        if (sosAlert) color = '#EF4444'; // red (SOS)
        if (vehicle.status === 'BREAKDOWN') color = '#F97316'; // orange

        const speedText = speed > 0 ? ` ${speed.toFixed(0)}km/h` : '';
        const svgIcon = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="16" fill="${color}" ${sosAlert ? 'style="animation: pulse 1s infinite"' : ''}/>
          <circle cx="20" cy="20" r="8" fill="white"/>
          <text x="20" y="32" font-size="8" fill="${color}" text-anchor="middle" font-weight="bold">${speedText}</text>
        </svg>`;

        const icon = L.divIcon({
          html: svgIcon,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          popupAnchor: [0, -20],
        });

        const marker = L.marker([lat, lng], { icon }).addTo(mapRef.current!);

        // Add popup with vehicle info
        const popupContent = `<div style="padding: 8px;">
          <p style="margin: 0; font-weight: bold;">${vehicle.vehicleId}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px;">Speed: ${speed.toFixed(1)} km/h</p>
          <p style="margin: 2px 0 0 0; font-size: 12px;">Status: ${vehicle.status}</p>
        </div>`;
        marker.bindPopup(popupContent);

        marker.on('click', () => {
          onMarkerClick?.(vehicle.vehicleId || '');
        });

        markersRef.current[vehicle.vehicleId] = marker;
      });
    });
  }, [trips, safetyAlerts, traccarPositions, onMarkerClick]);

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
