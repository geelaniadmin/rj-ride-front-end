import { EmptyState } from '@/components/ui/EmptyState';
import { Settings } from 'lucide-react';

export default function SuperAdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">Super Admin</h1>
      <EmptyState
        icon={Settings}
        title="Administration Dashboard"
        description="Tenant and system management coming in Phase 3"
      />
    </div>
  );
}
