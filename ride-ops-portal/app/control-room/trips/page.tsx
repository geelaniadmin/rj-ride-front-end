import { EmptyState } from '@/components/ui/EmptyState';
import { Link } from 'lucide-react';

export default function TripsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">Trips</h1>
      <EmptyState
        icon={Link}
        title="Trip Management"
        description="Trip lifecycle monitoring coming in Phase 1"
      />
    </div>
  );
}
