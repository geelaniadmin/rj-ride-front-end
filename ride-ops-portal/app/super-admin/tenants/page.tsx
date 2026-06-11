import { EmptyState } from '@/components/ui/EmptyState';
import { Users } from 'lucide-react';

export default function TenantsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">Tenants</h1>
      <EmptyState
        icon={Users}
        title="Tenant Management"
        description="Operator and customer onboarding coming in Phase 3"
      />
    </div>
  );
}
