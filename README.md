# Summer UP — Plataforma Digital

Bienvenido al repositorio oficial de **Summer UP**.
Esta plataforma digital es el núcleo de la experiencia de aprendizaje, desarrollo y gamificación diseñada exclusivamente para la **Fundación Summer**. Construida para ofrecer una experiencia inmersiva, vibrante y de alta calidad tanto en escritorio como en dispositivos móviles, para usuarios finales y administradores por igual.

---

## Resumen del Proyecto

Summer UP es una aplicación web Full-Stack construida sobre **Next.js** que divide su experiencia en dos flujos principales, cada uno con una identidad visual claramente definida:

1. **Modo Participante (Usuario Final)**
   - **Objetivo**: Completar trayectos de aprendizaje ("Journeys"), consumir recursos educativos y ganar experiencia (XP) dentro de un sistema gamificado.
   - **Identidad Visual**: Paletas cálidas y vibrantes centradas en **Amarillo Limón** (`summer-yellow`) y **Naranja Vibrante** (`summer-orange`). Interfaces iluminadas, tarjetas con efecto glassmorphism, sombras suaves y componentes interactivos.

2. **Modo Administrador**
   - **Objetivo**: Acceder a analíticas de plataforma (vía Apache Superset), gestionar organizaciones, moderar recursos y monitorear KPIs globales.
   - **Identidad Visual**: Tema oscuro institucional (`[data-theme="admin"]`). Fondos oscuros estructurados con acentos en **Teal**, **Sky Blue** y **Lavender**, optimizado para lectura de datos de alta densidad.

> La plataforma incluye un modo de suplantación donde los Administradores pueden visualizar la interfaz del Participante en tiempo real con una barra de control de estado rápido.

---

## Stack Tecnológico

- **Framework Core**: [Next.js 16](https://nextjs.org/) (App Router)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Estilos**: [Tailwind CSS v4](https://tailwindcss.com/) + Variables CSS con temas inline
- **Componentes**: [Shadcn/ui](https://ui.shadcn.com/) (basado en Radix UI)
- **Iconografía**: [Lucide React](https://lucide.dev/)
- **Estado Global**: [Zustand](https://zustand-demo.pmnd.rs/) con persistencia en `localStorage`
- **Autenticación y BaaS**: [Supabase](https://supabase.com/)
- **Animaciones**: [Framer Motion](https://www.framer.com/motion/)

---

## Arquitectura y Estructura del Código

El código sigue principios de *Feature-Sliced Design* para máxima escalabilidad:

```text
src/
├── app/                  # Enrutamiento App Router de Next.js
│   ├── (app)/            # Rutas protegidas (Dashboard, Journeys, etc.)
│   ├── api/              # Route Handlers server-side
│   ├── auth/             # Callbacks y validación de sesiones
│   ├── login/            # Flujo de autenticación público
│   └── globals.css       # Motor central de temas, tokens CSS y estilos globales
├── components/           # UI compartida
│   ├── layout/           # MainLayout, Navbars, Drawers
│   └── ui/               # Componentes atómicos de Shadcn UI
├── features/             # Dominios funcionales cohesivos
│   ├── analytics/        # Embebido de Apache Superset
│   ├── crm/              # Paneles de administración y gestión
│   ├── dashboard/        # Widgets principales y KPIs
│   └── journey/          # Gamificación, avances y wizards
├── lib/                  # Utilidades globales y helpers
├── services/             # Singletons de comunicación con Supabase y Backend
├── store/                # Zustand Stores (useAuth, useJourney, useContent)
└── types/                # Interfaces y definiciones de tipos
```

---

## Identidad Visual y CSS

Todo el branding de Summer UP está centralizado en `src/app/globals.css`:

- **Tokens de Color**: `--color-summer-sky`, `--color-summer-teal`, `--color-summer-pink`, `--color-summer-yellow`, `--color-summer-orange`, `--color-summer-lavender`.
- **Motor de Temas** (`@theme inline`): Integra variables CSS directamente en Tailwind v4 para clases dinámicas como `bg-summer-yellow/20` o `text-summer-sky`.
- **Utilidades del Proyecto**:
  - Glassmorphism: `.summer-glass`, `.summer-glass-dark`
  - Resplandores: `.summer-glow`, `.summer-glow-yellow`
  - Gradientes: `.summer-gradient-135`, `.summer-gradient-radial`, `.summer-gradient-text`
  - Logo: `.logo-outline-white`

---

## Guía de Instalación y Ejecución Local

### 1. Variables de Entorno

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_API_URL=                  # URL base del backend
NEXT_PUBLIC_SUPABASE_URL=             # Endpoint de Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # Clave anónima para Auth/Client
NEXT_PUBLIC_SUPERSET_URL=             # URL de la instancia Apache Superset
NEXT_PUBLIC_SUPERSET_DASHBOARD_ID=    # ID interno del panel Analytics
SUPERSET_ADMIN_USERNAME=              # Credencial segura servidor
SUPERSET_ADMIN_PASSWORD=              # Credencial segura servidor
```

### 2. Instalar Dependencias

```bash
npm install
```

> Usar `npm` (no `yarn` ni `pnpm`) para garantizar lockfiles estables.

### 3. Servidor de Desarrollo

```bash
npm run dev
```

El servidor estará disponible en **[http://localhost:3000](http://localhost:3000)** con HMR via Turbopack.

---

## Despliegue

Summer UP cuenta con integración continua automatizada:

- **Proveedor**: Google Cloud Run
- **Pipeline**: Un push a `main` dispara GitHub Actions → `npm run build` → imagen Docker → GCP

### Validación antes de merge

```bash
npm run lint      # ESLint + TypeScript
npm run build     # Simula la build de producción
npm run start     # Ejecuta la versión producción localmente
```

---

*Hecho con cariño para impulsar el aprendizaje continuo en Fundación Summer.*
