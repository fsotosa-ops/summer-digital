'use client';

import { useState, useEffect } from 'react';
import { crmService } from '@/services/crm.service';
import { ApiCrmStats } from '@/types/api.types';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ActivityTab() {
  const [stats, setStats] = useState<ApiCrmStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await crmService.getStats();
      setStats(result);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Resumen general</h3>
        <Button variant="ghost" size="sm" onClick={loadData} className="h-8 text-slate-500 hover:text-fuchsia-600">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Actualizar
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Contactos', value: stats?.total_contacts ?? 0,    icon: Users,         cls: 'text-slate-700', bg: 'bg-slate-100'  },
          { label: 'Activos',   value: stats?.active_contacts ?? 0,   icon: UserCheck,     cls: 'text-green-600', bg: 'bg-green-100'  },
          { label: 'En Riesgo', value: stats?.risk_contacts ?? 0,     icon: AlertTriangle, cls: 'text-red-600',   bg: 'bg-red-100'    },
          { label: 'Inactivos', value: stats?.inactive_contacts ?? 0, icon: UserX,         cls: 'text-slate-500', bg: 'bg-slate-100'  },
        ].map(({ label, value, icon: Icon, cls, bg }) => (
          <Card key={label} className="rounded-2xl shadow-sm border-0 bg-white">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">{label}</p>
                  <p className={`text-2xl font-bold mt-0.5 ${cls}`}>{value}</p>
                </div>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${bg}`}>
                  <Icon className={`h-5 w-5 ${cls}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
