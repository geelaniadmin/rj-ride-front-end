import { EmptyState } from '@/components/ui/EmptyState';
import { Zap } from 'lucide-react';

export default function AnomaliesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">Anomalies</h1>
      <EmptyState
        icon={Zap}
        title="System Anomalies"
        description="Issue detection and alerts coming in Phase 1"
      />
    </div>
  );
}
