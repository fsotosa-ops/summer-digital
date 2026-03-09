'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { OnboardingGate } from '@/components/layout/OnboardingGate';

function OnboardingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const journeyId = searchParams.get('journeyId');
  const redirect = searchParams.get('redirect') || '/dashboard';

  if (!journeyId) {
    router.replace('/dashboard');
    return null;
  }

  return (
    <OnboardingGate
      journeyId={journeyId}
      onComplete={() => router.replace(redirect)}
    />
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100" />}>
      <OnboardingContent />
    </Suspense>
  );
}
