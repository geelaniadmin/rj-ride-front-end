import { EmptyState } from '@/components/ui/EmptyState';
import { LayoutDashboard } from 'lucide-react';

export default function ControlRoomPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">Control Room</h1>
      <EmptyState
        icon={LayoutDashboard}
        title="Control Room Dashboard"
        description="Live operations and incident management coming in Phase 1"
      />
    </div>
  );
}
