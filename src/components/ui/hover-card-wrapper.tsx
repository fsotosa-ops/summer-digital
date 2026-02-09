'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface HoverCardWrapperProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function HoverCardWrapper({ children, className, onClick }: HoverCardWrapperProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{ borderColor: 'transparent' }} // Reset defaults
      className={cn(
        "relative group rounded-xl border border-slate-200 bg-white transition-colors hover:border-brand/50",
        className
      )}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
