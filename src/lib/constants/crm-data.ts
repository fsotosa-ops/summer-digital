import { ApiOrgType } from '@/types/api.types';

// Organization types — single source of truth
export const ORG_TYPES: { value: ApiOrgType; label: string }[] = [
  { value: 'community', label: 'Comunidad' },
  { value: 'provider', label: 'Proveedor' },
  { value: 'sponsor', label: 'Patrocinador' },
  { value: 'enterprise', label: 'Empresa' },
];

// Company sizes
export const COMPANY_SIZES: { value: string; label: string }[] = [
  { value: '1-10', label: '1–10 personas' },
  { value: '11-50', label: '11–50 personas' },
  { value: '51-200', label: '51–200 personas' },
  { value: '201-500', label: '201–500 personas' },
  { value: '500+', label: '500+ personas' },
];

// Industries — based on GICS (Global Industry Classification Standard), in Spanish
export const INDUSTRIES: { value: string; label: string }[] = [
  // Sector 1: Energía
  { value: 'energia', label: 'Energía' },
  { value: 'petroleo_gas', label: 'Petróleo y Gas' },
  { value: 'energia_renovable', label: 'Energía Renovable' },
  // Sector 2: Materiales
  { value: 'materiales', label: 'Materiales' },
  { value: 'quimica', label: 'Química' },
  { value: 'mineria', label: 'Minería' },
  // Sector 3: Industriales
  { value: 'industriales', label: 'Industriales' },
  { value: 'manufactura', label: 'Manufactura' },
  { value: 'construccion', label: 'Construcción' },
  { value: 'logistica', label: 'Logística y Transporte' },
  { value: 'aeroespacial', label: 'Aeroespacial y Defensa' },
  // Sector 4: Consumo Discrecional
  { value: 'consumo_discrecional', label: 'Consumo Discrecional' },
  { value: 'retail', label: 'Retail / Comercio' },
  { value: 'automoviles', label: 'Automóviles' },
  { value: 'turismo_hospitalidad', label: 'Turismo y Hospitalidad' },
  { value: 'entretenimiento', label: 'Entretenimiento y Medios' },
  // Sector 5: Consumo Básico
  { value: 'consumo_basico', label: 'Consumo Básico' },
  { value: 'alimentos_bebidas', label: 'Alimentos y Bebidas' },
  { value: 'salud_personal', label: 'Salud Personal y Hogar' },
  // Sector 6: Salud
  { value: 'salud', label: 'Salud' },
  { value: 'farmaceutica', label: 'Farmacéutica y Biotecnología' },
  { value: 'dispositivos_medicos', label: 'Dispositivos Médicos' },
  { value: 'servicios_salud', label: 'Servicios de Salud' },
  // Sector 7: Financiero
  { value: 'financiero', label: 'Financiero' },
  { value: 'banca', label: 'Banca' },
  { value: 'seguros', label: 'Seguros' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'gestion_activos', label: 'Gestión de Activos' },
  // Sector 8: Tecnología de la Información
  { value: 'tecnologia', label: 'Tecnología de la Información' },
  { value: 'software', label: 'Software y SaaS' },
  { value: 'hardware', label: 'Hardware y Semiconductores' },
  { value: 'servicios_ti', label: 'Servicios de TI y Consultoría' },
  { value: 'ciberseguridad', label: 'Ciberseguridad' },
  { value: 'inteligencia_artificial', label: 'Inteligencia Artificial' },
  // Sector 9: Servicios de Comunicación
  { value: 'comunicaciones', label: 'Servicios de Comunicación' },
  { value: 'telecomunicaciones', label: 'Telecomunicaciones' },
  { value: 'medios_digitales', label: 'Medios Digitales y Redes Sociales' },
  // Sector 10: Servicios Públicos
  { value: 'servicios_publicos', label: 'Servicios Públicos' },
  { value: 'gobierno', label: 'Gobierno y Sector Público' },
  { value: 'ong', label: 'ONG / Organizaciones Sin Fines de Lucro' },
  // Sector 11: Inmobiliario
  { value: 'inmobiliario', label: 'Inmobiliario' },
  // Educación y otros relevantes
  { value: 'educacion', label: 'Educación' },
  { value: 'edtech', label: 'EdTech' },
  { value: 'recursos_humanos', label: 'Recursos Humanos y Capacitación' },
  { value: 'consultoria', label: 'Consultoría y Servicios Profesionales' },
  { value: 'legal', label: 'Legal y Compliance' },
  { value: 'otro', label: 'Otro' },
];
