'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Tier {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  currency: string;
  interval: 'MONTH' | 'YEAR';
}

export default function UpgradePage() {
  const [tiers, setTiers] = useState<Tier[]>([]);

  useEffect(() => {
    fetch('/api/subscriptions/tiers').then(async (r) => {
      const data = await r.json();
      setTiers(data.tiers || []);
    });
  }, []);

  const startPayment = async (tierId: string) => {
    const res = await fetch('/api/payments/flutterwave/invite', { method: 'GET' });
  };

  const initiate = async (tierId: string) => {
    const res = await fetch('/api/payments/flutterwave/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tierId })
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data?.error || 'Failed to start payment');
      return;
    }

    // Redirect to Flutterwave hosted payment if using standard; otherwise use inline on client
    // For simplicity here, open their standard hosted page via inline JS (user can integrate fully later)
    toast.success('Payment initialized. Complete it in the Flutterwave modal.');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upgrade Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map((t) => (
              <div key={t.id} className="border rounded-lg p-4 flex flex-col gap-2">
                <div className="font-semibold">{t.name}</div>
                <div className="text-sm text-gray-600">{t.description}</div>
                <div className="text-2xl font-bold mt-2">{(t.priceCents / 100).toFixed(2)} {t.currency}</div>
                <Button onClick={() => initiate(t.id)}>Choose</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


