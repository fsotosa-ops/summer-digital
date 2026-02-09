'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Map as MapIcon,
  BookOpen,
  LogOut,
  Menu,
  X,
  Users,
  BarChart2,
  Settings, // Changed from Building2 for unified admin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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

// STRICT PREMIUM NAVIGATION ORDER
const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', href: '/dashboard', icon: Home, allowedRoles: ['Subscriber', 'Participant', 'Admin', 'SuperAdmin'] },
  { label: 'Journeys', href: '/journey', icon: MapIcon, allowedRoles: ['Participant', 'Admin', 'SuperAdmin'] },
  
  // Unified Admin Entry
  { 
    label: 'Gestión Entidades', 
    href: '/admin/entities', 
    icon: Settings, 
    allowedRoles: ['Admin', 'SuperAdmin'] 
  },

  { label: 'Recursos', href: '/resources', icon: BookOpen, allowedRoles: ['Subscriber', 'Participant', 'Admin', 'SuperAdmin'] },
  
  // Kept separate CRM/Analytics as requested in instructions? 
  // Instructions said: 
  // 1. Inicio
  // 2. Journeys
  // 3. Gestión Entidades (/admin/entities)
  // 4. Recursos
  // 5. Gestión CRM (This implies keeping it? Or is it merged into Entities? No, distinct item in list)
  // 6. Analítica
  // 7. Mi Perfil (Critical location: Fixed at bottom)
  
  { label: 'Gestión CRM', href: '/crm', icon: Users, allowedRoles: ['Admin', 'SuperAdmin'] },
  { label: 'Analítica', href: '/analytics', icon: BarChart2, allowedRoles: ['SuperAdmin'] },
];

// Extract NavItemComponent
const NavItemComponent = ({ 
    item, 
    mobile = false, 
    isActive, 
    isSidebarOpen, 
    setIsMobileOpen 
}: { 
    item: NavItem; 
    mobile?: boolean; 
    isActive: boolean;
    isSidebarOpen: boolean;
    setIsMobileOpen: (open: boolean) => void;
}) => {
    return (
      <Link 
          href={item.href} 
          onClick={() => mobile && setIsMobileOpen(false)}
          className="block mb-1"
      >
          <motion.div 
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                  isActive 
                      ? "bg-slate-900 text-white shadow-md shadow-slate-200" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
          >
              <item.icon size={20} className={cn(
                  "transition-colors",
                  isActive ? "text-fuchsia-400" : "text-slate-400 group-hover:text-slate-600"
              )} />
              
              {(isSidebarOpen || mobile) && (
                  <motion.span 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-sm font-medium"
                  >
                      {item.label}
                  </motion.span>
              )}

              {/* Tooltip for collapsed desktop */}
              {!isSidebarOpen && !mobile && (
                  <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      {item.label}
                  </div>
              )}
          </motion.div>
      </Link>
    );
};

// Extract ProfileItem
const ProfileItem = ({ 
    mobile = false, 
    isProfileActive, 
    user, 
    isSidebarOpen, 
    setIsMobileOpen 
}: { 
    mobile?: boolean; 
    isProfileActive: boolean; 
    user: { name: string }; // Minimal type needed for this component, or use ApiUser if available
    isSidebarOpen: boolean; 
    setIsMobileOpen: (open: boolean) => void;
}) => (
   <Link href="/profile" onClick={() => mobile && setIsMobileOpen(false)}>
      <motion.div
           whileHover={{ scale: 1.02 }}
           whileTap={{ scale: 0.98 }}
           className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer mt-auto border border-transparent",
               isProfileActive ? "bg-slate-100 border-slate-200" : "hover:bg-slate-50 hover:border-slate-100"
           )}
      >
          <div className={cn("flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs ring-2 ring-white shadow-sm", isProfileActive && "bg-indigo-600 text-white")}>
              {user.name.charAt(0)}
          </div>
          {(isSidebarOpen || mobile) && (
              <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-700 leading-none">{user.name.split(' ')[0]}</span>
                  <span className="text-xs text-slate-400 mt-1">Mi Perfil</span>
              </div>
          )}
      </motion.div>
   </Link>
);

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, initializeSession } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false); // Manually control sheet state

  useEffect(() => {
    // Wrap in setTimeout to avoid 'setState synchronously within effect' linter warning
    const timer = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (user) {
      initializeSession().then(() => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) router.push('/login');
      });
    } else {
      router.push('/login');
    }
  }, [hydrated, user, initializeSession, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!hydrated || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Oasis Digital</h1>
          <p className="text-slate-500">Cargando...</p>
        </div>
      </div>
    );
  }

  const filterItems = (items: NavItem[]) => {
      return items.filter(item => {
        if (!user) return false;
        if (!item.allowedRoles) return true;
        return item.allowedRoles.includes(user.role);
      });
  };

  const filteredNavItems = filterItems(NAV_ITEMS);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col md:flex-row font-sans text-slate-900">
      <Toaster position="top-right" />
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
           <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Oasis</span>
           <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="hover:bg-slate-100 rounded-full">
                        <Menu size={24} className="text-slate-700" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85%] sm:w-[350px] p-0 flex flex-col bg-white">
                    <SheetHeader className="p-6 border-b border-slate-50 text-left">
                        <SheetTitle className="font-bold text-xl flex items-center gap-2">
                            <span className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white text-lg">O</span>
                            Oasis Digital
                        </SheetTitle>
                    </SheetHeader>
                    
                    <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                        {filteredNavItems.map(item => (
                            <NavItemComponent 
                                key={item.href} 
                                item={item} 
                                mobile={true} 
                                isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                                isSidebarOpen={isSidebarOpen}
                                setIsMobileOpen={setIsMobileOpen}
                            />
                        ))}
                    </nav>

                    <div className="p-4 border-t border-slate-50 space-y-2 bg-slate-50/50">
                        <ProfileItem 
                            mobile={true} 
                            isProfileActive={pathname === '/profile'}
                            user={user}
                            isSidebarOpen={isSidebarOpen}
                            setIsMobileOpen={setIsMobileOpen}
                        />
                        <Button 
                            variant="ghost" 
                            className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                            onClick={() => { setIsMobileOpen(false); handleLogout(); }}
                        >
                            <LogOut size={20} />
                            Cerrar Sesión
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 88 }}
        className="hidden md:flex flex-col bg-white border-r border-slate-200 h-screen sticky top-0 z-40 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]"
      >
        {/* Logo Area */}
        <div className="p-6 flex items-center justify-between h-20">
          <AnimatePresence mode='wait'>
            {isSidebarOpen ? (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2"
              >
                 <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-slate-200">O</div>
                 <span className="font-bold text-lg tracking-tight text-slate-900">Oasis</span>
              </motion.div>
            ) : (
                 <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold mx-auto"
                 >O</motion.div>
            )}
          </AnimatePresence>
          
          {isSidebarOpen && (
             <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsSidebarOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full h-8 w-8"
             >
                <X size={16} />
             </Button>
          )}
        </div>

        {/* Toggle Expand Button (Centered when collapsed) */}
        {!isSidebarOpen && (
             <div className="flex justify-center mb-4">
                 <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setIsSidebarOpen(true)}
                    className="text-slate-400 hover:text-slate-600 rounded-full"
                 >
                    <Menu size={20} />
                 </Button>
             </div>
        )}

        {/* Nav Items */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-none">
          {filteredNavItems.map(item => (
             <NavItemComponent 
                key={item.href} 
                item={item} 
                isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                isSidebarOpen={isSidebarOpen}
                setIsMobileOpen={setIsMobileOpen}
             />
          ))}
        </nav>

        {/* Bottom Section: Profile & Logout */}
        <div className="p-4 space-y-2">
             <div className="h-px w-full bg-slate-100 mb-2" />
             
             {/* Profile - Fixed at bottom */}
             <ProfileItem 
                isProfileActive={pathname === '/profile'}
                user={user}
                isSidebarOpen={isSidebarOpen}
                setIsMobileOpen={setIsMobileOpen}
             />

             {/* Logout */}
             <Button 
                variant="ghost" 
                className={cn(
                  "w-full flex items-center gap-3 justify-start text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors",
                  !isSidebarOpen && "justify-center px-0"
                )}
                onClick={handleLogout}
              >
                <LogOut size={20} />
                {isSidebarOpen && "Cerrar Sesión"}
              </Button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 relative overflow-hidden">
         <div className="h-full overflow-y-auto overflow-x-hidden p-4 md:p-8 max-w-7xl mx-auto scroll-smooth">
             {children}
         </div>
      </main>
    </div>
  );
}

