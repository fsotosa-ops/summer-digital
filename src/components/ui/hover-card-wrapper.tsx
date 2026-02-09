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
      whileHover={{ y: -4, borderColor: 'rgb(20, 184, 166)' }} // teal-500
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn(
        "cursor-pointer transition-colors border border-transparent rounded-xl",
        className
      )}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
