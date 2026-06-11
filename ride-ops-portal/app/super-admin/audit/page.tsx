import { EmptyState } from '@/components/ui/EmptyState';
import { Settings } from 'lucide-react';

export default function AuditPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">Audit Log</h1>
      <EmptyState
        icon={Settings}
        title="System Audit Log"
        description="Activity and access logs coming in Phase 3"
      />
    </div>
  );
}
