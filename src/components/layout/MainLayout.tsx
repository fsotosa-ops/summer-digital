'use client';

import React, { useState } from 'react';
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
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', href: '/dashboard', icon: Home },
  { label: 'Mi Viaje', href: '/journey', icon: MapIcon },
  { label: 'Recursos', href: '/resources', icon: BookOpen },
  { label: 'Mi Perfil', href: '/profile', icon: User },
  { label: 'Gestión CRM', href: '/crm', icon: Users, adminOnly: true },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter(); // Use router from next/navigation
  const { user, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Filter items based on role
  const filteredNavItems = NAV_ITEMS.filter(item => 
    !item.adminOnly || (user?.role === 'Admin' || user?.role === 'SuperAdmin')
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 240 : 80 }}
        className="hidden md:flex flex-col bg-white border-r border-slate-200 h-screen sticky top-0 z-40 shadow-sm"
      >
        <div className="p-4 flex items-center justify-between h-16 border-b border-slate-100">
          <AnimatePresence mode='wait'>
            {isSidebarOpen ? (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-bold text-xl text-slate-900 tracking-tight"
              >
                Oasis Digital
              </motion.span>
            ) : null}
          </AnimatePresence>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-slate-500 hover:text-slate-900"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 group relative",
                  isActive 
                    ? "bg-slate-100 text-slate-900 font-medium" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}>
                  <item.icon size={22} className={cn(
                    "transition-colors",
                    isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
                  )} />
                  {isSidebarOpen && (
                    <motion.span 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-sm"
                    >
                      {item.label}
                    </motion.span>
                  )}
                  {!isSidebarOpen && (
                    <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
             <Button 
                variant="ghost" 
                className={cn(
                  "w-full flex items-center gap-3 justify-start text-slate-500 hover:text-slate-900 hover:bg-slate-50",
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
      <main className="flex-1 min-w-0 pb-20 md:pb-0 relative overflow-hidden">
         <div className="h-full overflow-auto p-4 md:p-8 max-w-7xl mx-auto">
             {children}
         </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-50">
        <nav className="flex justify-around items-center h-16 px-2">
          {filteredNavItems.map((item) => {
             const isActive = pathname === item.href;
             return (
               <Link key={item.href} href={item.href} className="flex-1">
                 <div className={cn(
                   "flex flex-col items-center justify-center py-2 h-full gap-1 transition-colors",
                   isActive ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
                 )}>
                   <item.icon size={24} className={isActive ? "fill-current/10" : ""} />
                   <span className="text-[10px] font-medium leading-none">{item.label}</span>
                 </div>
               </Link>
             )
          })}
        </nav>
      </div>
    </div>
  );
}
