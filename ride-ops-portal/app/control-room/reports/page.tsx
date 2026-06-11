import { EmptyState } from '@/components/ui/EmptyState';
import { BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">Reports</h1>
      <EmptyState
        icon={BarChart3}
        title="Operations Reports"
        description="Analytics and reporting coming in Phase 1"
      />
    </div>
  );
}
