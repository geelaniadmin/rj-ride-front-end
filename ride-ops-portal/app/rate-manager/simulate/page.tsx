import { EmptyState } from '@/components/ui/EmptyState';
import { CheckCircle } from 'lucide-react';

export default function SimulatePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">Simulator</h1>
      <EmptyState
        icon={CheckCircle}
        title="Rate Card Simulator"
        description="Quote testing and validation coming in Phase 2"
      />
    </div>
  );
}
