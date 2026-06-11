import { EmptyState } from '@/components/ui/EmptyState';
import { DollarSign } from 'lucide-react';

export default function RateManagerPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">Rate Manager</h1>
      <EmptyState
        icon={DollarSign}
        title="Rate Card Management"
        description="Pricing and rate card versioning coming in Phase 2"
      />
    </div>
  );
}
