'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, Users, Building2, Settings, AlertTriangle,
  Route, Layers, Trophy, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { crmService } from '@/services/crm.service';
import { ContactsTab } from './tabs/ContactsTab';
import { OrganizationsTab } from './tabs/OrganizationsTab';
import { ActivityTab } from './tabs/ActivityTab';
import { FieldOptionsTab } from './tabs/FieldOptionsTab';
import { RiskTab } from './tabs/RiskTab';
import { SectionHeader } from '@/components/ui/section-header';
import { useAuthStore } from '@/store/useAuthStore';

export type CRMSection = 'overview' | 'contacts' | 'orgs' | 'risk' | 'config';

// ── Tooltip wrapper — shows label to the right on hover ──────────────────────
function NavTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group">
      {children}
      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-md transition-opacity delay-75 group-hover:opacity-100">
        {label}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
      </span>
    </div>
  );
}

export function CRMHub() {
  const { user } = useAuthStore();
  const isAdmin    = user?.role === 'Admin' || user?.role === 'SuperAdmin';
  const isSuperAdmin = user?.role === 'SuperAdmin';
  const orgId      = user?.organizationId;

  const [activeSection, setActiveSection] = useState<CRMSection>('overview');
  const [riskCount, setRiskCount]         = useState(0);

  // Fetch risk count for badge — lightweight (limit=1, only count matters)
  useEffect(() => {
    if (!orgId) return;
    crmService.listContacts(0, 1, undefined, orgId, 'risk')
      .then((res) => setRiskCount(res.count))
      .catch(() => {});
  }, [orgId]);

  if (!user || !isAdmin) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-red-600">Acceso denegado</h1>
        <p className="text-slate-500">No tienes permisos para acceder a esta página.</p>
      </div>
    );
  }

  // Main nav — data sections
  const mainNav: { value: CRMSection; label: string; Icon: React.ElementType }[] = [
    { value: 'overview',  label: 'Panel',          Icon: LayoutDashboard },
    { value: 'contacts',  label: 'Participantes',  Icon: Users           },
    { value: 'risk',      label: 'En Riesgo',      Icon: AlertTriangle   },
    { value: 'orgs',      label: 'Organizaciones', Icon: Building2       },
  ];

  // Mobile nav includes Config in same list for simplicity
  const allNavMobile = [
    ...mainNav,
    { value: 'config' as CRMSection, label: 'Config', Icon: Settings },
  ];

  function navButtonClass(value: CRMSection) {
    const isActive = activeSection === value;
    if (isActive) {
      return value === 'risk'
        ? 'bg-amber-500 text-white shadow-sm'
        : 'bg-gradient-to-br from-summer-pink to-summer-lavender text-white shadow-sm';
    }
    return value === 'risk'
      ? 'text-amber-400 hover:bg-amber-50 hover:text-amber-500'
      : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700';
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="CRM"
        description="Centro de engagement y seguimiento de participantes Summer Up."
        icon={<Users className="h-5 w-5" />}
        className="mb-2"
      />

      {/* Shortcuts strip — external modules only */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white border border-slate-100 shadow-sm px-4 py-3">
        <span className="mr-2 text-xs font-semibold text-slate-400 shrink-0">
          Accesos rápidos
        </span>
        {([
          { label: 'Journeys',     href: '/admin/journeys',     Icon: Route  },
          { label: 'Recursos',     href: '/admin/resources',    Icon: Layers },
          { label: 'Gamificación', href: '/admin/gamification', Icon: Trophy },
        ] as const).map(({ label, href, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-summer-pink/40 hover:bg-summer-pink/5 hover:text-summer-pink"
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </Link>
        ))}
        {isSuperAdmin && (
          <Link
            href="/analytics"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-summer-lavender/40 hover:bg-summer-lavender/5 hover:text-summer-lavender"
          >
            <BarChart3 className="h-3.5 w-3.5 shrink-0" />
            Analítica
          </Link>
        )}
      </div>

      {/* CRM panel */}
      <div className="flex flex-col md:flex-row min-h-[60vh] rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

        {/* ── Mobile nav (pill grid, shows labels) ── */}
        <nav className="md:hidden grid grid-cols-5 gap-1 p-2 border-b border-slate-100 bg-white">
          {allNavMobile.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setActiveSection(value)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg text-[10px] font-medium min-h-[44px] transition-colors',
                activeSection === value
                  ? value === 'risk'
                    ? 'bg-amber-500 text-white'
                    : 'bg-gradient-to-br from-summer-pink to-summer-lavender text-white'
                  : value === 'risk'
                    ? 'text-amber-400 hover:bg-amber-50'
                    : 'text-slate-500 hover:bg-slate-50',
              )}
            >
              <div className="relative">
                <Icon className="h-4 w-4" />
                {value === 'risk' && riskCount > 0 && activeSection !== 'risk' && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500 border border-white" />
                )}
              </div>
              <span className="truncate w-full text-center px-1">{label}</span>
            </button>
          ))}
        </nav>

        {/* ── Desktop sidebar — icon-only, 56px ── */}
        <aside className="hidden md:flex w-14 shrink-0 border-r border-slate-100 bg-white flex-col items-center gap-1 py-3 px-2">

          {/* Main nav items */}
          {mainNav.map(({ value, label, Icon }) => (
            <NavTooltip key={value} label={label}>
              <button
                onClick={() => setActiveSection(value)}
                className={cn(
                  'relative flex h-10 w-10 items-center justify-center rounded-xl transition-all',
                  navButtonClass(value),
                )}
              >
                <Icon className="h-5 w-5" />
                {/* Risk badge — only when not active and count > 0 */}
                {value === 'risk' && riskCount > 0 && activeSection !== 'risk' && (
                  <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white" />
                )}
              </button>
            </NavTooltip>
          ))}

          {/* Config — separated, dimmed */}
          <div className="mt-auto w-full">
            <div className="mb-1 h-px bg-slate-100 mx-1" />
            <NavTooltip label="Config">
              <button
                onClick={() => setActiveSection('config')}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl transition-all',
                  activeSection === 'config'
                    ? 'bg-gradient-to-br from-summer-pink to-summer-lavender text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-50 hover:text-slate-500',
                )}
              >
                <Settings className="h-5 w-5" />
              </button>
            </NavTooltip>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 bg-slate-50">
          {activeSection === 'overview'  && (
            <ActivityTab
              orgId={orgId}
              onNavigateToRisk={() => setActiveSection('risk')}
            />
          )}
          {activeSection === 'contacts' && <ContactsTab orgId={orgId} />}
          {activeSection === 'risk'     && <RiskTab orgId={orgId} />}
          {activeSection === 'orgs'     && <OrganizationsTab />}
          {activeSection === 'config'   && isAdmin && <FieldOptionsTab />}
        </main>
      </div>
    </div>
  );
}
