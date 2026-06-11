import { EmptyState } from '@/components/ui/EmptyState';
import { DollarSign } from 'lucide-react';

export default function BillingPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">Billing</h1>
      <EmptyState
        icon={DollarSign}
        title="Billing Management"
        description="Invoice and payment tracking coming in Phase 3"
      />
    </div>
  );
}
