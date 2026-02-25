'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Map as MapIcon,
  BookOpen,
  User,
  LogOut,
  Menu,
  Users,
  Layout,
  BarChart2,
  Route,
  Building2,
  Settings,
  ChevronDown,
  Trophy,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuthStore } from '@/store/useAuthStore';
import { UserRole } from '@/types';
import { Toaster } from 'sonner';
import { journeyService } from '@/services/journey.service';
import { OnboardingGate } from './OnboardingGate';

const ROLE_LABELS: Record<string, string> = {
  SuperAdmin: 'Super Administrador',
  Admin: 'Administrador',
  Participant: 'Participante',
  Subscriber: 'Suscriptor',
};

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  allowedRoles?: UserRole[];
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', href: '/dashboard', icon: Home, allowedRoles: ['Subscriber', 'Participant', 'Admin', 'SuperAdmin'] },
  { label: 'Mi Viaje', href: '/journey', icon: MapIcon, allowedRoles: ['Participant'] },
  { label: 'Actividades Abiertas', href: '/open-activities', icon: Layout, allowedRoles: ['Subscriber'] },
  { label: 'Recursos', href: '/resources', icon: BookOpen, allowedRoles: ['Subscriber', 'Participant'] },

  // Admin Group
  {
    label: 'Administración',
    href: '/crm',
    icon: Settings,
    allowedRoles: ['Admin', 'SuperAdmin'],
    children: [
      { label: 'CRM', href: '/crm', icon: Users, allowedRoles: ['Admin', 'SuperAdmin'] },
      { label: 'Mi Organización', href: '/admin/my-organization', icon: Building2, allowedRoles: ['Admin'] },
      { label: 'Journeys', href: '/admin/journeys', icon: Route, allowedRoles: ['Admin', 'SuperAdmin'] },
      { label: 'Recursos', href: '/admin/resources', icon: BookOpen, allowedRoles: ['Admin', 'SuperAdmin'] },
      { label: 'Gamificacion', href: '/admin/gamification', icon: Trophy, allowedRoles: ['Admin', 'SuperAdmin'] },
      { label: 'Analítica', href: '/analytics', icon: BarChart2, allowedRoles: ['SuperAdmin'] },
    ],
  },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, initializeSession } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [onboardingJourneyId, setOnboardingJourneyId] = useState<string | null>(null);

  // Esperar a que Zustand persist termine de hidratar desde localStorage
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (user) {
      initializeSession();
    } else {
      router.push('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Onboarding gate: check once per session for Participants
  useEffect(() => {
    if (!hydrated || !user || user.role !== 'Participant') return;
    const checked = sessionStorage.getItem('onboarding_checked');
    if (checked) return;
    journeyService.checkOnboarding().then(res => {
      if (res.should_show && res.journey_id) {
        setOnboardingJourneyId(res.journey_id);
      } else {
        sessionStorage.setItem('onboarding_checked', 'true');
      }
    }).catch(() => {
      // If check fails, don't block the user
      sessionStorage.setItem('onboarding_checked', 'true');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user?.id]);

  // Open admin menu if on admin route
  useEffect(() => {
    if (pathname.startsWith('/admin') || pathname.startsWith('/crm') || pathname.startsWith('/analytics')) {
      setAdminOpen(true);
    }
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Mostrar loading mientras Zustand hidrata
  if (!hydrated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Oasis Digital</h1>
          <p className="text-slate-500">Cargando...</p>
        </div>
      </div>
    );
  }

  // Onboarding gate: full-screen immersive experience for Participants on first login
  if (onboardingJourneyId) {
    return (
      <OnboardingGate
        journeyId={onboardingJourneyId}
        onComplete={() => setOnboardingJourneyId(null)}
      />
    );
  }

  const filterItems = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!user) return false;
      if (!item.allowedRoles) return true;
      return item.allowedRoles.includes(user.role);
    });
  };

  const filteredNavItems = filterItems(NAV_ITEMS);

  // Desktop topbar nav item renderer
  const renderTopbarItem = (item: NavItem) => {
    const isActive =
      pathname === item.href ||
      (item.children && item.children.some((child) => pathname === child.href));
    const hasChildren = item.children && item.children.length > 0;
    const filteredChildren = hasChildren ? filterItems(item.children!) : [];

    if (hasChildren && filteredChildren.length === 0) return null;

    if (hasChildren) {
      return (
        <DropdownMenu key={item.label} open={adminOpen} onOpenChange={setAdminOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none',
                isActive
                  ? 'bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 text-white'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
              )}
            >
              <item.icon size={16} />
              {item.label}
              <ChevronDown size={14} className={cn('transition-transform duration-200', adminOpen ? 'rotate-180' : '')} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="bottom"
            align="start"
            className="bg-neutral-900 border-white/10 text-white"
          >
            {filteredChildren.map((child) => {
              const childActive = pathname === child.href;
              return (
                <DropdownMenuItem
                  key={child.href}
                  onClick={() => router.push(child.href)}
                  className={cn(
                    'cursor-pointer hover:bg-white/10 focus:bg-white/10',
                    childActive && 'bg-white/5 text-white'
                  )}
                >
                  <child.icon size={15} className="mr-2" />
                  {child.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <Link key={item.href} href={item.href}>
        <span
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            isActive
              ? 'bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 text-white'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
          )}
        >
          <item.icon size={16} />
          {item.label}
        </span>
      </Link>
    );
  };

  // Mobile drawer nav item renderer (unchanged behavior)
  const renderNavItem = (item: NavItem, isMobile = false) => {
    const isActive =
      pathname === item.href ||
      (item.children && item.children.some((child) => pathname === child.href));
    const hasChildren = item.children && item.children.length > 0;
    const filteredChildren = hasChildren ? filterItems(item.children!) : [];

    if (hasChildren && filteredChildren.length === 0) return null;

    // --- Dropdown (Administración) ---
    if (hasChildren) {
      return (
        <div key={item.label} className="space-y-1">
          <div
            onClick={() => setAdminOpen(!adminOpen)}
            className={cn(
              'flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors duration-200 cursor-pointer text-neutral-400 hover:text-neutral-200',
              isActive && 'text-white'
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon size={22} />
              <motion.span initial={false} animate={{ opacity: 1 }} className="text-sm">
                {item.label}
              </motion.span>
            </div>
            <ChevronDown
              size={16}
              className={cn('transition-transform duration-200', adminOpen ? 'rotate-180' : '')}
            />
          </div>
          <AnimatePresence>
            {adminOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden pl-4 space-y-1"
              >
                {filteredChildren.map((child) => {
                  const childActive = pathname === child.href;
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => isMobile && document.getElementById('close-sheet')?.click()}
                    >
                      <motion.div
                        whileHover={{ x: 4 }}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative',
                          childActive ? 'text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
                        )}
                      >
                        {childActive && (
                          <motion.div
                            layoutId="activeNavMobile"
                            className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 rounded-lg"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                        <child.icon size={18} className="relative z-10" />
                        <span className="relative z-10">{child.label}</span>
                      </motion.div>
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    // --- Simple nav item ---
    return (
      <Link key={item.href} href={item.href} onClick={() => isMobile && document.getElementById('close-sheet')?.click()}>
        <motion.div
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 relative',
            isActive ? 'text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
          )}
        >
          {isActive && (
            <motion.div
              layoutId="activeNavMobile"
              className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 rounded-lg"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <item.icon size={22} className="relative z-10 transition-colors" />
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm relative z-10"
          >
            {item.label}
          </motion.span>
        </motion.div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Toaster position="top-right" />

      {/* Unified Topbar — all breakpoints */}
      <header className="sticky top-0 z-50 bg-neutral-950 border-b border-white/5 h-14 flex items-center gap-4 px-4 md:px-6">

        {/* Logo */}
        <Link
          href="/dashboard"
          className="font-bold text-lg text-white tracking-tight shrink-0 mr-2"
        >
          Oasis Digital
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {filteredNavItems.map((item) => renderTopbarItem(item))}
        </nav>

        {/* Spacer on mobile */}
        <div className="flex-1 md:hidden" />

        {/* Avatar dropdown (desktop) */}
        <div className="hidden md:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-9 w-9 rounded-full overflow-hidden border border-white/10 hover:border-white/30 transition-colors focus:outline-none">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center">
                    <span className="text-xs font-semibold text-white">
                      {user.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="bottom"
              align="end"
              className="w-52 bg-neutral-900 border-white/10 text-white"
            >
              <DropdownMenuLabel className="pb-1">
                <p className="font-medium text-sm truncate">{user.name}</p>
                <p className="text-xs text-neutral-400 truncate font-normal">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={() => router.push('/profile')}
                className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
              >
                <User size={15} className="mr-2" /> Mi Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-red-400 focus:text-red-300 focus:bg-white/5"
              >
                <LogOut size={15} className="mr-2" /> Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Hamburger → Sheet (mobile) */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white hover:bg-white/10">
                <Menu size={24} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[340px] bg-neutral-950 border-r border-white/5 p-0">
              <SheetHeader className="p-4 border-b border-white/5">
                <SheetTitle className="text-left font-bold text-xl text-white">Menú</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-4 mt-2 flex-1">
                {filteredNavItems.map((item) => renderNavItem(item, true))}
              </nav>
              {/* Mobile: User profile + actions */}
              <div className="p-4 border-t border-white/5">
                <div className="flex items-center gap-3 mb-3">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="h-10 w-10 rounded-full object-cover border border-white/10" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center border border-white/10">
                      <span className="text-sm font-semibold text-white">
                        {user.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                    <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-neutral-400 hover:text-white hover:bg-white/10"
                    onClick={() => { router.push('/profile'); document.getElementById('close-sheet')?.click(); }}
                  >
                    <User size={20} />
                    Mi Perfil
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-neutral-400 hover:text-white hover:bg-white/10"
                    onClick={handleLogout}
                  >
                    <LogOut size={20} />
                    Cerrar Sesión
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

      </header>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-slate-50">
        <div className="h-full overflow-auto p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
