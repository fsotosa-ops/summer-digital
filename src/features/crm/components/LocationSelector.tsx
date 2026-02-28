'use client';

import { useMemo } from 'react';
import { Country, State, City } from 'country-state-city';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface LocationValue {
  country: string; // ISO2 code, e.g. "CL"
  state: string;   // state code, e.g. "RM"
  city: string;    // city name
}

interface LocationSelectorProps {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  disabled?: boolean;
  contentClassName?: string;
}

const NONE = '__none__';

export function LocationSelector({ value, onChange, disabled, contentClassName }: LocationSelectorProps) {
  const countryOptions = useMemo(
    () =>
      [
        { value: NONE, label: 'Sin país' },
        ...Country.getAllCountries().map((c) => ({
          value: c.isoCode,
          label: `${c.flag} ${c.name}`,
        })),
      ],
    [],
  );

  const states = value.country
    ? State.getStatesOfCountry(value.country)
    : [];

  const cities =
    value.country && value.state
      ? City.getCitiesOfState(value.country, value.state)
      : [];

  const handleCountryChange = (code: string) => {
    onChange({ country: code === NONE ? '' : code, state: '', city: '' });
  };

  const handleStateChange = (code: string) => {
    onChange({ ...value, state: code === NONE ? '' : code, city: '' });
  };

  const handleCityChange = (name: string) => {
    onChange({ ...value, city: name === NONE ? '' : name });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Country - searchable */}
      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">País</Label>
        <SearchableSelect
          options={countryOptions}
          value={value.country || NONE}
          onValueChange={handleCountryChange}
          placeholder="Selecciona país"
          searchPlaceholder="Buscar país..."
          emptyMessage="País no encontrado."
          disabled={disabled}
          popoverContentClassName={contentClassName}
        />
      </div>

      {/* State / Region */}
      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">Región / Departamento</Label>
        <Select
          value={value.state || NONE}
          onValueChange={handleStateChange}
          disabled={disabled || !value.country}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder={value.country ? 'Selecciona región' : 'Elige un país primero'} />
          </SelectTrigger>
          <SelectContent className={cn("max-h-60", contentClassName)}>
            <SelectItem value={NONE}>
              <span className="text-slate-400">Sin región</span>
            </SelectItem>
            {states.map((s) => (
              <SelectItem key={s.isoCode} value={s.isoCode}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* City */}
      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">Ciudad</Label>
        <Select
          value={value.city || NONE}
          onValueChange={handleCityChange}
          disabled={disabled || !value.state}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder={value.state ? 'Selecciona ciudad' : 'Elige una región primero'} />
          </SelectTrigger>
          <SelectContent className={cn("max-h-60", contentClassName)}>
            <SelectItem value={NONE}>
              <span className="text-slate-400">Sin ciudad</span>
            </SelectItem>
            {cities.map((c) => (
              <SelectItem key={c.name} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Helper: display label for a country code
export function getCountryName(isoCode: string): string {
  if (!isoCode) return '';
  return Country.getCountryByCode(isoCode)?.name || isoCode;
}

// Helper: display label for a state code within a country
export function getStateName(countryCode: string, stateCode: string): string {
  if (!countryCode || !stateCode) return '';
  return State.getStateByCodeAndCountry(stateCode, countryCode)?.name || stateCode;
}
