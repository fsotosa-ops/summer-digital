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
  ArrowLeftRight,
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
  const { user, logout, initializeSession, viewMode, setViewMode } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [onboardingJourneyId, setOnboardingJourneyId] = useState<string | null>(null);

  const isAdminUser = user?.role === 'Admin' || user?.role === 'SuperAdmin';
  const isParticipantMode = isAdminUser && viewMode === 'participant';
  // Real participants + admins in participant mode both get the light theme
  const isParticipantTheme = isParticipantMode || user?.role === 'Participant';

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
      }
      // else: should_show=false → no hacer nada, re-check en el próximo fresh load
    }).catch(() => {
      sessionStorage.setItem('onboarding_checked', 'true');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user?.id]);

  // Sync admin dropdown with current route
  useEffect(() => {
    const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/crm') || pathname.startsWith('/analytics');
    setAdminOpen(isAdminRoute);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Smart mode switch: navigates between participant/admin equivalent pages
  const handleModeSwitch = () => {
    const newMode = viewMode === 'admin' ? 'participant' : 'admin';
    setViewMode(newMode);
    if (newMode === 'admin') {
      // Participant → Admin: redirect to admin equivalents
      if (pathname === '/resources') router.push('/admin/resources');
      else if (pathname === '/journey') router.push('/admin/journeys');
      // else stay (dashboard, profile, etc. are accessible in both modes)
    } else {
      // Admin → Participant: redirect to participant equivalents or dashboard
      if (pathname.startsWith('/admin/resources')) router.push('/resources');
      else if (pathname.startsWith('/admin/journeys')) router.push('/journey');
      else if (
        pathname.startsWith('/admin') ||
        pathname.startsWith('/crm') ||
        pathname.startsWith('/analytics')
      ) router.push('/dashboard');
      // else stay (dashboard, profile, etc. are accessible in both modes)
    }
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
        onComplete={() => {
          setOnboardingJourneyId(null);
          router.push('/dashboard');
        }}
      />
    );
  }

  // Effective role for nav filtering: admins in participant mode see participant nav
  const effectiveRole: UserRole = isAdminUser && viewMode === 'participant'
    ? 'Participant'
    : (user?.role ?? 'Subscriber');

  const filterItems = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!user) return false;
      if (!item.allowedRoles) return true;
      return item.allowedRoles.includes(effectiveRole);
    });
  };

  const filteredNavItems = filterItems(NAV_ITEMS);

  // ── Theme tokens (light participant vs dark admin) ───────────────────────
  const navInactive = isParticipantTheme
    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5';

  const dropdownContent = isParticipantTheme
    ? 'bg-white border-slate-200 text-slate-800 shadow-lg'
    : 'bg-neutral-900 border-white/10 text-white';

  const dropdownItem = isParticipantTheme
    ? 'cursor-pointer text-slate-700 hover:bg-slate-50 focus:bg-slate-50'
    : 'cursor-pointer hover:bg-white/10 focus:bg-white/10';

  const mobileNavInactive = isParticipantTheme
    ? 'text-slate-600 hover:text-slate-900'
    : 'text-neutral-400 hover:text-neutral-200';

  // ── Desktop topbar nav item renderer ────────────────────────────────────
  const renderTopbarItem = (item: NavItem) => {
    const isActive =
      pathname === item.href ||
      pathname.startsWith(item.href + '/') ||
      (item.children && item.children.some((child) =>
        pathname === child.href || pathname.startsWith(child.href + '/')
      ));
    const hasChildren = item.children && item.children.length > 0;
    const filteredChildren = hasChildren ? filterItems(item.children!) : [];

    if (hasChildren && filteredChildren.length === 0) return null;

    const activeGradient = isParticipantTheme
      ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white'
      : 'bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 text-white';

    if (hasChildren) {
      return (
        <DropdownMenu key={item.label}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none',
                isActive ? activeGradient : navInactive
              )}
            >
              <item.icon size={16} />
              {item.label}
              <ChevronDown size={14} className="transition-transform duration-200" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start" className={dropdownContent}>
            {filteredChildren.map((child) => {
              const childActive = pathname === child.href || pathname.startsWith(child.href + '/');
              return (
                <DropdownMenuItem
                  key={child.href}
                  onClick={() => router.push(child.href)}
                  className={cn(
                    dropdownItem,
                    childActive && (isParticipantTheme ? 'bg-sky-50 text-sky-700' : 'bg-white/5 text-white')
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
            isActive ? activeGradient : navInactive
          )}
        >
          <item.icon size={16} />
          {item.label}
        </span>
      </Link>
    );
  };

  // ── Mobile drawer nav item renderer ─────────────────────────────────────
  const renderNavItem = (item: NavItem, isMobile = false) => {
    const isActive =
      pathname === item.href ||
      pathname.startsWith(item.href + '/') ||
      (item.children && item.children.some((child) =>
        pathname === child.href || pathname.startsWith(child.href + '/')
      ));
    const hasChildren = item.children && item.children.length > 0;
    const filteredChildren = hasChildren ? filterItems(item.children!) : [];

    if (hasChildren && filteredChildren.length === 0) return null;

    const activePill = isParticipantTheme
      ? 'from-sky-500 to-teal-500'
      : 'from-fuchsia-600 to-fuchsia-500';

    if (hasChildren) {
      return (
        <div key={item.label} className="space-y-1">
          <div
            onClick={() => setAdminOpen(!adminOpen)}
            className={cn(
              'flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors duration-200 cursor-pointer',
              mobileNavInactive,
              isActive && (isParticipantTheme ? 'text-slate-900 font-medium' : 'text-white')
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
                  const childActive = pathname === child.href || pathname.startsWith(child.href + '/');
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
                          childActive ? 'text-white font-medium' : mobileNavInactive
                        )}
                      >
                        {childActive && (
                          <motion.div
                            layoutId="activeNavMobile"
                            className={`absolute inset-0 bg-gradient-to-r ${activePill} rounded-lg`}
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

    return (
      <Link key={item.href} href={item.href} onClick={() => isMobile && document.getElementById('close-sheet')?.click()}>
        <motion.div
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 relative',
            isActive ? 'text-white font-medium' : mobileNavInactive
          )}
        >
          {isActive && (
            <motion.div
              layoutId="activeNavMobile"
              className={`absolute inset-0 bg-gradient-to-r ${activePill} rounded-lg`}
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

      {/* Participant mode accent stripe — only for admin switching modes */}
      {isParticipantMode && (
        <div className="h-1 bg-gradient-to-r from-sky-500 via-teal-400 to-cyan-400 sticky top-0 z-[51]" />
      )}

      {/* ── Unified Topbar ── */}
      <header className={cn(
        'sticky top-0 z-50 h-14 flex items-center gap-4 px-4 md:px-6 transition-all duration-300',
        isParticipantTheme
          ? 'bg-white border-b border-sky-100 shadow-sm'
          : 'bg-neutral-950 border-b border-white/5'
      )}>

        {/* Logo */}
        <Link
          href="/dashboard"
          className={cn(
            'font-bold text-lg tracking-tight shrink-0 mr-2 transition-colors duration-300',
            isParticipantTheme ? 'text-sky-700' : 'text-white'
          )}
        >
          Oasis Digital
        </Link>

        {/* Participant mode badge — only for admin switching modes */}
        {isParticipantMode && (
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-sky-100 text-sky-700 border border-sky-200">
            Participante
          </span>
        )}

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {filteredNavItems.map((item) => renderTopbarItem(item))}
        </nav>

        {/* Spacer on mobile */}
        <div className="flex-1 md:hidden" />

        {/* Mode toggle (Admin + SuperAdmin only) */}
        {isAdminUser && (
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={handleModeSwitch}
              title={viewMode === 'admin' ? 'Cambiar a vista participante' : 'Cambiar a vista admin'}
              className={cn(
                'flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold transition-all duration-200',
                isParticipantMode
                  ? 'bg-sky-500 border-sky-600 text-white hover:bg-sky-600 shadow-sm shadow-sky-500/25'
                  : 'border-white/10 text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
              )}
            >
              <ArrowLeftRight size={13} />
              <span className="hidden lg:inline">
                {isParticipantMode ? 'Modo Admin' : 'Ver como participante'}
              </span>
            </button>
          </div>
        )}

        {/* Avatar dropdown (desktop) */}
        <div className="hidden md:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                'h-9 w-9 rounded-full overflow-hidden border transition-colors focus:outline-none',
                isParticipantTheme
                  ? 'border-sky-200 hover:border-sky-400'
                  : 'border-white/10 hover:border-white/30'
              )}>
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
            <DropdownMenuContent side="bottom" align="end" className={cn('w-52', dropdownContent)}>
              <DropdownMenuLabel className="pb-1">
                <p className="font-medium text-sm truncate">{user.name}</p>
                <p className={cn('text-xs truncate font-normal', isParticipantTheme ? 'text-slate-400' : 'text-neutral-400')}>
                  {user.email}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className={isParticipantTheme ? 'bg-slate-100' : 'bg-white/10'} />
              <DropdownMenuItem
                onClick={() => router.push('/profile')}
                className={dropdownItem}
              >
                <User size={15} className="mr-2" /> Mi Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator className={isParticipantTheme ? 'bg-slate-100' : 'bg-white/10'} />
              <DropdownMenuItem
                onClick={handleLogout}
                className={cn(dropdownItem, 'text-red-500 focus:text-red-600')}
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
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  isParticipantTheme
                    ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-neutral-400 hover:text-white hover:bg-white/10'
                )}
              >
                <Menu size={24} />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className={cn(
                'w-[300px] sm:w-[340px] p-0',
                isParticipantTheme
                  ? 'bg-white border-r border-sky-100'
                  : 'bg-neutral-950 border-r border-white/5'
              )}
            >
              {/* Stripe at top of sheet — only for admin switching modes */}
              {isParticipantMode && (
                <div className="h-1 bg-gradient-to-r from-sky-500 via-teal-400 to-cyan-400" />
              )}
              <SheetHeader className={cn('p-4', isParticipantTheme ? 'border-b border-sky-100' : 'border-b border-white/5')}>
                <SheetTitle className={cn('text-left font-bold text-xl', isParticipantTheme ? 'text-slate-900' : 'text-white')}>
                  Menú
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-4 mt-2 flex-1">
                {filteredNavItems.map((item) => renderNavItem(item, true))}
              </nav>
              {/* Mobile: mode toggle (admin only) */}
              {isAdminUser && (
                <div className={cn('px-4 pb-2', isParticipantMode ? 'border-t border-sky-100 pt-3' : 'border-t border-white/5 pt-3')}>
                  <button
                    onClick={handleModeSwitch}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors',
                      isParticipantMode
                        ? 'bg-sky-500 text-white hover:bg-sky-600'
                        : 'border border-white/10 text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                    )}
                  >
                    <ArrowLeftRight size={15} />
                    {isParticipantMode ? 'Volver a modo Admin' : 'Ver como participante'}
                  </button>
                </div>
              )}
              {/* Mobile: User profile + actions */}
              <div className={cn('p-4', isParticipantTheme ? 'border-t border-sky-100' : 'border-t border-white/5')}>
                <div className="flex items-center gap-3 mb-3">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className={cn('h-10 w-10 rounded-full object-cover border', isParticipantTheme ? 'border-sky-200' : 'border-white/10')}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center border border-white/10">
                      <span className="text-sm font-semibold text-white">
                        {user.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium truncate', isParticipantTheme ? 'text-slate-900' : 'text-white')}>
                      {user.name}
                    </p>
                    <p className={cn('text-xs truncate', isParticipantTheme ? 'text-slate-500' : 'text-neutral-500')}>
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start gap-3',
                      isParticipantTheme
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        : 'text-neutral-400 hover:text-white hover:bg-white/10'
                    )}
                    onClick={() => { router.push('/profile'); document.getElementById('close-sheet')?.click(); }}
                  >
                    <User size={20} />
                    Mi Perfil
                  </Button>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start gap-3',
                      isParticipantTheme
                        ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
                        : 'text-neutral-400 hover:text-white hover:bg-white/10'
                    )}
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

      {/* ── Main Content Area ── */}
      <main className="flex-1 min-w-0 bg-slate-50">
        {/* Participant mode banner — only for admin switching modes */}
        {isParticipantMode && (
          <div className="bg-sky-500 px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-white text-sm font-medium">
              <ArrowLeftRight size={14} />
              <span>Modo Participante activo — tu progreso y actividades son reales</span>
            </div>
            <button
              onClick={handleModeSwitch}
              className="text-xs font-semibold text-white bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors shrink-0"
            >
              Salir del modo
            </button>
          </div>
        )}
        <div className="h-full overflow-auto p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
