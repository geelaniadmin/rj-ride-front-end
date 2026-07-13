'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTripStore, useSafetyAlertStore, useTraccarStore, useVehicleStore } from '@ride/shared';

interface MapComponentProps {
  onMarkerClick?: (vehicleId: string) => void;
}

// ── Marker data cache (holds previous position for interpolation) ──
interface MarkerData {
  marker: L.Marker;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  color: string;
  status: string;
  speed: number;
  sosAlert?: any;
  animStart: number;
  animDuration: number;
}

export default function MapComponent({ onMarkerClick }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: MarkerData }>({});
  const animFrameRef = useRef<number | null>(null);
  const trips = useTripStore((s) => s.trips);
  const safetyAlerts = useSafetyAlertStore((s) => s.safetyAlerts);
  const traccarStore = useTraccarStore();
  const traccarPositions = traccarStore.positions;
  const vehicles = useVehicleStore((s) => s.vehicles);

  // Fetch Traccar devices on mount
  useEffect(() => {
    traccarStore.fetchDevices();
  }, []);

  // ── Build marker SVG icon ──
  const buildIcon = useCallback((color: string, speed: number, sosAlert?: any) => {
    const speedText = speed > 0 ? ` ${speed.toFixed(0)}` : '';
    const pulseAnim = sosAlert
      ? 'style="animation: pulse 1.5s ease-in-out infinite"'
      : '';
    const svgIcon = `<svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow-${color.replace('#', '')}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
      </defs>
      <circle cx="22" cy="22" r="18" fill="${color}" filter="url(#shadow-${color.replace('#', '')})" ${pulseAnim}/>
      <circle cx="22" cy="22" r="9" fill="white" opacity="0.95"/>
      ${speed > 0 ? `<text x="22" y="36" font-size="9" fill="${color}" text-anchor="middle" font-weight="bold" font-family="monospace">${speedText}</text>` : ''}
    </svg>`;

    return L.divIcon({
      html: svgIcon,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22],
    });
  }, []);

  // ── Animation loop: smoothly moves markers toward target ──
  const animateMarkers = useCallback(() => {
    const now = performance.now();
    let anyMoving = false;

    Object.entries(markersRef.current).forEach(([id, md]) => {
      const elapsed = now - md.animStart;
      const t = Math.min(elapsed / md.animDuration, 1);
      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - t, 3);

      const lat = md.fromLat + (md.toLat - md.fromLat) * eased;
      const lng = md.fromLng + (md.toLng - md.fromLng) * eased;
      md.marker.setLatLng([lat, lng]);

      if (t < 1) anyMoving = true;
    });

    if (anyMoving) {
      animFrameRef.current = requestAnimationFrame(animateMarkers);
    }
  }, []);

  // ── Update marker positions (with animation) when data changes ──
  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('map-container', {
        center: [12.9716, 77.5946],
        zoom: 12,
        dragging: true,
        touchZoom: true,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
    }

    // Collect all vehicles to show with their positions
    const shownVehicleIds = new Set<string>();
    interface VehicleToRender {
      id: string;
      lat: number;
      lng: number;
      speed: number;
      color: string;
      status: string;
      sosAlert?: any;
    }
    const toRender: VehicleToRender[] = [];

    // ── Step 1: Vehicles on active trips ──
    trips.forEach((trip) => {
      trip.vehicles.forEach((vehicle) => {
        if (!vehicle.vehicleId) return;
        shownVehicleIds.add(vehicle.vehicleId);

        let lat = 12.9716;
        let lng = 77.5946;
        let speed = 0;

        const vehicleRecord = vehicles.find((v) => v.id === vehicle.vehicleId);
        const traccarDeviceId = vehicleRecord?.traccarDeviceId;

        let traccarPos = traccarDeviceId
          ? traccarStore.getPositionForTraccarDeviceId(traccarDeviceId)
          : undefined;
        if (!traccarPos) {
          const deviceId = parseInt(vehicle.vehicleId?.split('-')[1] || '1');
          traccarPos = traccarPositions.get(deviceId);
        }

        if (traccarPos) {
          lat = traccarPos.latitude;
          lng = traccarPos.longitude;
          speed = traccarPos.speed;
        } else if (trip.stops[0]) {
          lat = trip.stops[0].lat;
          lng = trip.stops[0].lng;
        }

        const sosAlert = safetyAlerts.find(
          (a) => a.vehicleId === vehicle.vehicleId && a.type === 'SOS' && a.status === 'ACTIVE'
        );

        let color = '#3B82F6';
        if (vehicle.status === 'IN_TRANSIT') color = '#10B981';
        if (sosAlert) color = '#EF4444';
        if (vehicle.status === 'BREAKDOWN') color = '#F97316';

        toRender.push({ id: vehicle.vehicleId, lat, lng, speed, color, status: vehicle.status, sosAlert });
      });
    });

    // ── Step 2: Tracked-only vehicles ──
    vehicles.forEach((vehicle) => {
      if (shownVehicleIds.has(vehicle.id) || !vehicle.traccarDeviceId) return;

      const traccarPos = traccarStore.getPositionForTraccarDeviceId(vehicle.traccarDeviceId);
      if (!traccarPos) return;

      shownVehicleIds.add(vehicle.id);

      const sosAlert = safetyAlerts.find(
        (a) => a.vehicleId === vehicle.id && a.type === 'SOS' && a.status === 'ACTIVE'
      );

      const color = sosAlert ? '#EF4444' : '#8B8FA8';
      toRender.push({ id: vehicle.id, lat: traccarPos.latitude, lng: traccarPos.longitude, speed: traccarPos.speed, color, status: 'TRACKED', sosAlert });
    });

    // ── Update markers: create new, animate existing, remove stale ──
    const newIds = new Set(toRender.map((v) => v.id));

    // Remove markers for vehicles no longer visible
    Object.keys(markersRef.current).forEach((id) => {
      if (!newIds.has(id)) {
        const md = markersRef.current[id];
        if (md) md.marker.remove();
        delete markersRef.current[id];
      }
    });

    toRender.forEach((v) => {
      const existing = markersRef.current[v.id];

      if (existing) {
        // Update icon (color/speed may have changed)
        existing.color = v.color;
        existing.status = v.status;
        existing.speed = v.speed;
        existing.sosAlert = v.sosAlert;
        existing.marker.setIcon(buildIcon(v.color, v.speed, v.sosAlert));

        // Animate to new position
        existing.fromLat = existing.marker.getLatLng().lat;
        existing.fromLng = existing.marker.getLatLng().lng;
        existing.toLat = v.lat;
        existing.toLng = v.lng;
        existing.animStart = performance.now();
        existing.animDuration = 2000; // 2 second animation

        // Update popup content
        const popupContent = `<div style="padding: 10px; min-width: 140px;">
          <p style="margin: 0; font-weight: 600; color: #1B2A4A; font-size: 13px;">${v.id}</p>
          <p style="margin: 6px 0 0 0; font-size: 12px; color: ${v.color};">● ${v.status}</p>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #555;">Speed: ${v.speed.toFixed(0)} km/h</p>
        </div>`;
        existing.marker.setPopupContent(popupContent);
      } else {
        // Create new marker
        const icon = buildIcon(v.color, v.speed, v.sosAlert);
        const marker = L.marker([v.lat, v.lng], { icon }).addTo(mapRef.current!);

        const popupContent = `<div style="padding: 10px; min-width: 140px;">
          <p style="margin: 0; font-weight: 600; color: #1B2A4A; font-size: 13px;">${v.id}</p>
          <p style="margin: 6px 0 0 0; font-size: 12px; color: ${v.color};">● ${v.status}</p>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #555;">Speed: ${v.speed.toFixed(0)} km/h</p>
        </div>`;
        marker.bindPopup(popupContent);

        marker.on('click', () => {
          onMarkerClick?.(v.id);
        });

        markersRef.current[v.id] = {
          marker,
          fromLat: v.lat,
          fromLng: v.lng,
          toLat: v.lat,
          toLng: v.lng,
          color: v.color,
          status: v.status,
          speed: v.speed,
          sosAlert: v.sosAlert,
          animStart: performance.now(),
          animDuration: 0,
        };
      }
    });

    // Start animation loop if not already running
    if (animFrameRef.current === null) {
      animFrameRef.current = requestAnimationFrame(animateMarkers);
    }
  }, [trips, safetyAlerts, traccarPositions, vehicles, onMarkerClick, buildIcon, animateMarkers]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      Object.values(markersRef.current).forEach((md) => md.marker.remove());
      markersRef.current = {};
    };
  }, []);

  // Cancel animation on unmount
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
