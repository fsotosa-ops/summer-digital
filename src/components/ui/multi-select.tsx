'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Seleccionar...',
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number } | null>(null);

  // Calculate dropdown position relative to viewport
  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = 240; // approximate max height
    const placeAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setPos({
      top: placeAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const openDropdown = () => {
    updatePosition();
    setOpen(true);
  };

  // Close on click outside (check both trigger and portal dropdown)
  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
      setSearch('');
    };
    // Close on scroll of any ancestor (dropdown position would be stale)
    const handleScroll = () => {
      updatePosition();
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, updatePosition]);

  const filteredOptions = options.filter(
    (opt) => opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((v) => v !== value));
  };

  const selectedLabels = selected.map((v) => {
    const opt = options.find((o) => o.value === v);
    return { value: v, label: opt?.label || v };
  });

  return (
    <div ref={triggerRef} className={cn('relative', className)}>
      {/* Trigger area */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5 min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer',
          'ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          open && 'ring-2 ring-ring ring-offset-2'
        )}
        onClick={() => (open ? setOpen(false) : openDropdown())}
      >
        {selectedLabels.length > 0 ? (
          selectedLabels.map(({ value, label }) => (
            <Badge
              key={value}
              variant="secondary"
              className="gap-1 pr-1 max-w-[180px]"
            >
              <span className="truncate">{label}</span>
              <button
                type="button"
                className="ml-0.5 rounded-full p-0.5 hover:bg-slate-300 transition-colors shrink-0"
                onClick={(e) => handleRemove(value, e)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className={cn('ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </div>

      {/* Dropdown via portal — avoids clipping from overflow:auto parents */}
      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 9999,
          }}
          className="rounded-md border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {/* Search input */}
          <div className="flex items-center border-b px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
            <input
              type="text"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</p>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selected.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    className={cn(
                      'flex items-center gap-2 rounded-sm px-3 py-2 text-sm cursor-pointer transition-colors',
                      isSelected ? 'bg-teal-50 text-teal-900' : 'hover:bg-accent'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(opt.value);
                    }}
                  >
                    <div
                      className={cn(
                        'h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center',
                        isSelected
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : 'border-input'
                      )}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
