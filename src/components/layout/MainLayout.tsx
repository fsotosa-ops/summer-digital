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
  X,
  Users,
  Layout,
  BarChart2,
  Route,
  Building2,
  Settings,
  ChevronDown,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuthStore } from '@/store/useAuthStore';
import { UserRole } from '@/types';
import { Toaster } from 'sonner';

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
  { label: 'Mi Perfil', href: '/profile', icon: User, allowedRoles: ['Participant', 'Admin', 'SuperAdmin'] },

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

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

  const filterItems = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!user) return false;
      if (!item.allowedRoles) return true;
      return item.allowedRoles.includes(user.role);
    });
  };

  const filteredNavItems = filterItems(NAV_ITEMS);

  const renderNavItem = (item: NavItem, isMobile = false) => {
    const isActive =
      pathname === item.href ||
      (item.children && item.children.some((child) => pathname === child.href));
    const hasChildren = item.children && item.children.length > 0;
    const filteredChildren = hasChildren ? filterItems(item.children!) : [];

    if (hasChildren && filteredChildren.length === 0) return null;

    // --- Dropdown (Administración) ---
    if (hasChildren) {
      // Collapsed desktop: show icon only with tooltip
      if (!isSidebarOpen && !isMobile) {
        return (
          <Link key={item.href} href={item.href}>
            <motion.div
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 group relative',
                isActive ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 rounded-lg"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon size={22} className="relative z-10" />
              {/* Tooltip collapsed */}
              <div className="absolute left-full ml-4 px-2 py-1 bg-neutral-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {item.label}
              </div>
            </motion.div>
          </Link>
        );
      }

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
                            layoutId="activeNav"
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
            'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 group relative',
            isActive ? 'text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
          )}
        >
          {isActive && (
            <motion.div
              layoutId="activeNav"
              className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 rounded-lg"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <item.icon size={22} className="relative z-10 transition-colors" />
          {(isSidebarOpen || isMobile) && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm relative z-10"
            >
              {item.label}
            </motion.span>
          )}
          {!isSidebarOpen && !isMobile && (
            <div className="absolute left-full ml-4 px-2 py-1 bg-neutral-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              {item.label}
            </div>
          )}
        </motion.div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <Toaster position="top-right" />

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-neutral-950 border-b border-white/5 sticky top-0 z-50">
        <span className="font-bold text-xl text-white tracking-tight">Oasis Digital</span>
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
            <nav className="flex flex-col gap-1 p-4 mt-2">
              {filteredNavItems.map((item) => renderNavItem(item, true))}
              <div className="border-t border-white/5 mt-2 pt-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-neutral-400 hover:text-white hover:bg-white/10"
                  onClick={handleLogout}
                >
                  <LogOut size={20} />
                  Cerrar Sesión
                </Button>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="hidden md:flex flex-col bg-neutral-950 border-r border-white/5 h-screen sticky top-0 z-40"
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between h-16 border-b border-white/5">
          <AnimatePresence mode="wait">
            {isSidebarOpen ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-bold text-xl text-white tracking-tight"
              >
                Oasis Digital
              </motion.span>
            ) : null}
          </AnimatePresence>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-neutral-400 hover:text-white hover:bg-white/10"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-800">
          {filteredNavItems.map((item) => renderNavItem(item))}
        </nav>

        {/* Bottom section */}
        <div className="p-3 bg-neutral-900/50 backdrop-blur-sm border-t border-white/5">
          <Button
            variant="ghost"
            className={cn(
              'w-full flex items-center gap-3 justify-start text-neutral-400 hover:text-white hover:bg-white/10',
              !isSidebarOpen && 'justify-center px-0'
            )}
            onClick={handleLogout}
          >
            <LogOut size={20} />
            {isSidebarOpen && 'Cerrar Sesión'}
          </Button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 relative overflow-hidden bg-slate-50">
        <div className="h-full overflow-auto p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
