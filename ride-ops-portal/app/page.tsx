'use client';

import { useRouter } from 'next/navigation';
import { useOpsSessionStore } from '@/stores/opsSessionStore';
import { useEffect } from 'react';

export default function Home() {
  const { session } = useOpsSessionStore();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      const roleRoute = {
        'control-room': '/control-room',
        'rate-manager': '/rate-manager',
        'super-admin': '/super-admin',
      }[session.role];
      router.push(roleRoute);
    } else {
      router.push('/login');
    }
  }, [session, router]);

  return null;
}
