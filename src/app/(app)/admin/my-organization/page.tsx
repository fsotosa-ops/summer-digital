'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2 } from 'lucide-react';

export default function MyOrganizationRedirect() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.organizationId) {
      router.replace(`/admin/organizations/${user.organizationId}`);
    } else if (user) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );
}
