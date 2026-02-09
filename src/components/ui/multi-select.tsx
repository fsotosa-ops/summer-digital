'use client';

import * as React from 'react';
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
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger area */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5 min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer',
          'ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          open && 'ring-2 ring-ring ring-offset-2'
        )}
        onClick={() => setOpen(!open)}
      >
        {selectedLabels.length > 0 ? (
          selectedLabels.map(({ value, label }) => (
            <Badge
              key={value}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {label}
              <button
                type="button"
                className="ml-0.5 rounded-full p-0.5 hover:bg-slate-300 transition-colors"
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

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
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
                      isSelected ? 'bg-fuchsia-50 text-fuchsia-900' : 'hover:bg-accent'
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
                          ? 'bg-fuchsia-600 border-fuchsia-600 text-white'
                          : 'border-input'
                      )}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span>{opt.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
