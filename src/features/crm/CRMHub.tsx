'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Users, Building2, Settings, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContactsTab } from './tabs/ContactsTab';
import { OrganizationsTab } from './tabs/OrganizationsTab';
import { ActivityTab } from './tabs/ActivityTab';
import { FieldOptionsTab } from './tabs/FieldOptionsTab';
import { RiskTab } from './tabs/RiskTab';
import { SectionHeader } from '@/components/ui/section-header';
import { useAuthStore } from '@/store/useAuthStore';

export type CRMSection = 'overview' | 'contacts' | 'orgs' | 'risk' | 'config';

export function CRMHub() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';
  const isSuperAdmin = user?.role === 'SuperAdmin';
  const [activeSection, setActiveSection] = useState<CRMSection>('overview');

  if (!user || !isAdmin) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-red-600">Acceso denegado</h1>
        <p className="text-slate-500">No tienes permisos para acceder a esta página.</p>
      </div>
    );
  }

  const navItems = [
    { value: 'overview' as CRMSection,  label: 'Panel',          icon: LayoutDashboard },
    { value: 'contacts' as CRMSection,  label: 'Participantes',  icon: Users           },
    { value: 'risk'     as CRMSection,  label: 'En Riesgo',      icon: AlertTriangle   },
    { value: 'orgs'     as CRMSection,  label: 'Organizaciones', icon: Building2       },
    ...(isAdmin ? [{ value: 'config' as CRMSection, label: 'Config', icon: Settings }] : []),
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="CRM"
        description="Centro de engagement y seguimiento de participantes Summer Up."
        icon={<Users className="h-5 w-5" />}
        className="mb-2"
      />

      {/* Shortcuts strip — quick nav to admin sections */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5">
        <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Ir a
        </span>
        {[
          { label: '⚡ Journeys',      href: '/admin/journeys'          },
          { label: '📚 Recursos',      href: '/admin/resources'         },
          { label: '🏢 Mi Org',        href: '/admin/my-organization'   },
          { label: '🎮 Gamificación',  href: '/admin/gamification'      },
        ].map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700"
          >
            {label}
          </Link>
        ))}
        {isSuperAdmin && (
          <>
            <Link
              href="/analytics"
              className="rounded-md border border-indigo-800 bg-indigo-900/50 px-3 py-1 text-[11px] font-medium text-indigo-300 transition-colors hover:border-indigo-600 hover:bg-indigo-800/50"
            >
              📊 Analítica
            </Link>
            <Link
              href="/admin/settings"
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700"
            >
              🔧 Config
            </Link>
          </>
        )}
      </div>

      <div className="flex flex-col md:flex-row min-h-[60vh] md:h-[calc(100vh-12rem)] rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Mobile pill nav — grid layout, no horizontal scroll */}
        <nav className="md:hidden grid grid-cols-3 gap-2 p-2 border-b border-slate-100 bg-white">
          {navItems.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setActiveSection(value)}
              className={cn(
                'flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-xs font-medium min-h-[44px] transition-colors',
                activeSection === value
                  ? value === 'risk'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-gradient-to-r from-summer-pink to-summer-lavender text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-800 hover:bg-slate-100',
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </nav>

        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-44 shrink-0 border-r border-slate-100 bg-white flex-col gap-1 p-2">
          {navItems.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setActiveSection(value)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-left transition-colors',
                activeSection === value
                  ? value === 'risk'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-gradient-to-r from-summer-pink to-summer-lavender text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 bg-slate-50">
          {activeSection === 'overview'  && (
            <ActivityTab
              orgId={user?.organizationId}
              onNavigateToRisk={() => setActiveSection('risk')}
            />
          )}
          {activeSection === 'contacts' && <ContactsTab orgId={user?.organizationId} />}
          {activeSection === 'risk'     && <RiskTab orgId={user?.organizationId} />}
          {activeSection === 'orgs'     && <OrganizationsTab />}
          {activeSection === 'config'   && isAdmin && <FieldOptionsTab />}
        </main>
      </div>
    </div>
  );
}
