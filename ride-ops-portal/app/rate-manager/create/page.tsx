import { EmptyState } from '@/components/ui/EmptyState';
import { Zap } from 'lucide-react';

export default function CreateVersionPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">Create Version</h1>
      <EmptyState
        icon={Zap}
        title="Create Rate Card Version"
        description="Rate card versioning coming in Phase 2"
      />
    </div>
  );
}
