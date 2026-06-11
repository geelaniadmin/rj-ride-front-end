import { EmptyState } from '@/components/ui/EmptyState';
import { AlertCircle } from 'lucide-react';

export default function SosPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">Live SOS</h1>
      <EmptyState
        icon={AlertCircle}
        title="Live SOS Management"
        description="Emergency incident tracking coming in Phase 1"
      />
    </div>
  );
}
