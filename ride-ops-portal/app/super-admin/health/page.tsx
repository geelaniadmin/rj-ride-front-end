import { EmptyState } from '@/components/ui/EmptyState';
import { HeartHandshake } from 'lucide-react';

export default function HealthPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">System Health</h1>
      <EmptyState
        icon={HeartHandshake}
        title="System Health Dashboard"
        description="Monitoring and metrics coming in Phase 3"
      />
    </div>
  );
}
