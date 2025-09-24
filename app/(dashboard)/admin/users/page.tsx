'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface UserRow {
  id: string;
  name?: string;
  email?: string;
  role: string;
  isActive: boolean;
  subscription?: { id: string; tier: string; expiresAt: string } | null;
}

interface Tier { id: string; name: string; }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [selectedTier, setSelectedTier] = useState<string | undefined>();
  const [selectedUser, setSelectedUser] = useState<string | undefined>();

  const load = async () => {
    const [u, t] = await Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/subscriptions/tiers').then(r => r.json())
    ]);
    setUsers(u.users || []);
    setTiers((t.tiers || []).map((x: any) => ({ id: x.id, name: x.name })));
  };

  useEffect(() => { load(); }, []);

  const assign = async () => {
    if (!selectedUser || !selectedTier) return;
    const res = await fetch('/api/subscriptions/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedUser, tierId: selectedTier })
    });
    if (res.ok) {
      toast.success('Tier assigned');
      await load();
    } else {
      const data = await res.json();
      toast.error(data?.error || 'Failed to assign');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Users & Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Select onValueChange={setSelectedUser}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name || u.email} ({u.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={setSelectedTier}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                {tiers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={assign}>Assign</Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Subscription</th>
                  <th className="py-2 pr-4">Expires</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="py-2 pr-4">{u.name}</td>
                    <td className="py-2 pr-4">{u.email}</td>
                    <td className="py-2 pr-4">{u.role}</td>
                    <td className="py-2 pr-4">{u.subscription?.tier || '—'}</td>
                    <td className="py-2 pr-4">{u.subscription?.expiresAt ? new Date(u.subscription.expiresAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


