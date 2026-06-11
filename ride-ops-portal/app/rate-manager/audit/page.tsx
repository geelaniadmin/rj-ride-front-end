import { EmptyState } from '@/components/ui/EmptyState';
import { Settings } from 'lucide-react';

export default function AuditPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">Audit</h1>
      <EmptyState
        icon={Settings}
        title="Audit Logs"
        description="Rate card audit trail coming in Phase 2"
      />
    </div>
  );
}
