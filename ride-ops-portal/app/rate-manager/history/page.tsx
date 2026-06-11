import { EmptyState } from '@/components/ui/EmptyState';
import { BarChart3 } from 'lucide-react';

export default function HistoryPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">History</h1>
      <EmptyState
        icon={BarChart3}
        title="Rate Card History"
        description="Version history and changes coming in Phase 2"
      />
    </div>
  );
}
