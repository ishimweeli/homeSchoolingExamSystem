'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Tier {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  currency: string;
  interval: 'MONTH' | 'YEAR';
  examLimitPerPeriod: number;
  studyModuleLimitPerPeriod: number;
  maxAttemptsPerExam: number;
  isActive: boolean;
}

export default function AdminSubscriptionsPage() {
  const { data: session } = useSession();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/subscriptions/tiers').then(async (r) => {
      const data = await r.json();
      setTiers(data.tiers || []);
      setLoading(false);
    });
  }, []);

  const addTier = async () => {
    const res = await fetch('/api/subscriptions/tiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Starter',
        description: 'Default tier',
        priceCents: 500,
        currency: 'USD',
        interval: 'MONTH',
        examLimitPerPeriod: 5,
        studyModuleLimitPerPeriod: 5,
        maxAttemptsPerExam: 2,
        isActive: true
      })
    });
    const data = await res.json();
    setTiers((prev) => [...prev, data.tier]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Subscription Tiers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            <Button onClick={addTier}>Add Tier</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map((t) => (
              <div key={t.id} className="border rounded-lg p-4">
                <div className="font-semibold">{t.name}</div>
                <div className="text-sm text-gray-600">{t.description}</div>
                <div className="mt-2">
                  <span className="text-lg font-bold">
                    {(t.priceCents / 100).toFixed(2)} {t.currency}
                  </span>{' '}
                  <span className="text-sm">/ {t.interval.toLowerCase()}</span>
                </div>
                <div className="text-xs mt-2 text-gray-600">
                  Exams/period: {t.examLimitPerPeriod || '∞'} • Modules/period: {t.studyModuleLimitPerPeriod || '∞'} • Attempts/exam: {t.maxAttemptsPerExam || '∞'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


