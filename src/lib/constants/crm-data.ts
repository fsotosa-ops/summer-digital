import { ApiOrgType } from '@/types/api.types';

// Organization types — single source of truth
// Industry and company_size options are stored in crm.field_options
// (field_name = 'org_industry' / 'org_company_size') and loaded dynamically.
export const ORG_TYPES: { value: ApiOrgType; label: string }[] = [
  { value: 'community', label: 'Comunidad' },
  { value: 'provider', label: 'Proveedor' },
  { value: 'sponsor', label: 'Patrocinador' },
  { value: 'enterprise', label: 'Empresa' },
];
