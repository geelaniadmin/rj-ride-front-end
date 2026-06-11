'use client';

import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-200 animate-pulse rounded-lg flex items-center justify-center text-[#8B8FA8]">Loading map...</div>,
});

interface LiveMapProps {
  height?: string;
  onMarkerClick?: (vehicleId: string) => void;
}

export function LiveMap({ height = '420px', onMarkerClick }: LiveMapProps) {
  return (
    <div style={{ height }} className="rounded-lg overflow-hidden border border-[#E0E0E0] relative">
      <MapComponent onMarkerClick={onMarkerClick} />
    </div>
  );
}
