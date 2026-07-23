'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery } from '@tanstack/react-query';
import { apiClient, keys, traccarService } from '@/lib/shared';
import type { components } from '@/lib/shared/api/schema.d';

type SosEvent = components['schemas']['SosEvent'];

interface TraccarPos { latitude: number; longitude: number; speed: number; }

interface MapComponentProps {
  onMarkerClick?: (vehicleId: string) => void;
}

interface MarkerData {
  marker: L.Marker;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  color: string;
  speed: number;
  isSos: boolean;
  animStart: number;
  animDuration: number;
}

export default function MapComponent({ onMarkerClick }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, MarkerData>>({});
  const animFrameRef = useRef<number | null>(null);
  const [positions, setPositions] = useState<Map<number, TraccarPos>>(new Map());

  const { data: sosEvents = [] } = useQuery({
    queryKey: keys.safety.sos.list({}),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET('/v1/safety/sos');
      if (err) throw err;
      return (res?.result ?? []) as SosEvent[];
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const activeSosVehicleIds = new Set(
    sosEvents.filter((e) => !e.resolvedAt).map((e) => e.tripVehicleId)
  );

  const buildIcon = useCallback((color: string, speed: number, isSos: boolean) => {
    const speedText = speed > 0 ? ` ${speed.toFixed(0)}` : '';
    const pulseAnim = isSos ? ' style="animation: pulse 1.5s ease-in-out infinite"' : '';
    const svgIcon = `<svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="18" fill="${color}"${pulseAnim}/>
      <circle cx="22" cy="22" r="9" fill="white" opacity="0.95"/>
      ${speed > 0 ? `<text x="22" y="36" font-size="9" fill="${color}" text-anchor="middle" font-weight="bold" font-family="monospace">${speedText}</text>` : ''}
    </svg>`;
    return L.divIcon({ html: svgIcon, iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -22] });
  }, []);

  const animateMarkers = useCallback(function animate() {
    const now = performance.now();
    let anyMoving = false;

    Object.values(markersRef.current).forEach((md) => {
      const elapsed = now - md.animStart;
      const progress = Math.min(elapsed / md.animDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const lat = md.fromLat + (md.toLat - md.fromLat) * eased;
      const lng = md.fromLng + (md.toLng - md.fromLng) * eased;
      md.marker.setLatLng([lat, lng]);
      if (progress < 1) anyMoving = true;
    });

    if (anyMoving) {
      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      animFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    traccarService.fetchDevices().then((devices) => {
      const ids = devices.map((d) => d.id);
      return traccarService.getDevicesPositions(ids);
    }).then((posMap) => {
      if (!cancelled) setPositions(posMap as unknown as Map<number, TraccarPos>);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('ops-map-container', {
        center: [12.9716, 77.5946],
        zoom: 12,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
    }

    const newIds = new Set<string>();

    positions.forEach((pos, deviceId) => {
      const id = String(deviceId);
      newIds.add(id);
      const isSos = activeSosVehicleIds.has(id);
      const color = isSos ? '#EF4444' : '#3B82F6';

      const existing = markersRef.current[id];
      if (existing) {
        existing.isSos = isSos;
        existing.speed = pos.speed;
        existing.marker.setIcon(buildIcon(color, pos.speed, isSos));
        existing.fromLat = existing.marker.getLatLng().lat;
        existing.fromLng = existing.marker.getLatLng().lng;
        existing.toLat = pos.latitude;
        existing.toLng = pos.longitude;
        existing.animStart = performance.now();
        existing.animDuration = 2000;
      } else {
        const icon = buildIcon(color, pos.speed, isSos);
        const marker = L.marker([pos.latitude, pos.longitude], { icon }).addTo(mapRef.current!);
        marker.bindPopup(`<div style="padding:8px"><p style="margin:0;font-weight:600">Device ${id}</p><p style="margin:4px 0 0">Speed: ${pos.speed.toFixed(0)} km/h</p></div>`);
        marker.on('click', () => onMarkerClick?.(id));
        markersRef.current[id] = {
          marker,
          fromLat: pos.latitude, fromLng: pos.longitude,
          toLat: pos.latitude, toLng: pos.longitude,
          color, speed: pos.speed, isSos,
          animStart: performance.now(), animDuration: 0,
        };
      }
    });

    Object.keys(markersRef.current).forEach((id) => {
      if (!newIds.has(id)) {
        markersRef.current[id]?.marker.remove();
        delete markersRef.current[id];
      }
    });

    if (animFrameRef.current === null) {
      animFrameRef.current = requestAnimationFrame(animateMarkers);
    }
  }, [sosEvents, positions, onMarkerClick, buildIcon, animateMarkers, activeSosVehicleIds]);

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

  return <div id="ops-map-container" style={{ height: '100%', width: '100%' }} />;
}
