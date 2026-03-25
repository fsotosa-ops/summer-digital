# Summer UP — Plataforma Digital

¡Bienvenido al repositorio oficial de **Summer UP**! 
Esta plataforma digital es el núcleo de la experiencia de aprendizaje, desarrollo y gamificación diseñada exclusivamente para la **Fundación Summer**. Ha sido rediseñada para ofrecer una experiencia inmersiva, vibrante y de alta calidad tanto para los usuarios finales como para los administradores.

---

## 🌟 Resumen del Proyecto

Summer UP es una aplicación web Full-Stack construida sobre **Next.js** que divide su experiencia en dos flujos principales, cada uno con una identidad visual fuertemente marcada:

1. **Modo Participante (Usuario Final)**:
   - **Objetivo**: Completar trayectos de aprendizaje ("Journeys"), consumir recursos educativos y ganar experiencia (XP) dentro de un marco gamificado.
   - **Identidad Visual**: Paletas cálidas y vibrantes centradas en **Amarillo Limón** (`summer-yellow`) y **Naranja Vibrante** (`summer-orange`). Interfaces iluminadas, tarjetas tipo "glassmorphism", sombras suaves y componentes interactivos para una experiencia enriquecedora.

2. **Modo Administrador**:
   - **Objetivo**: Acceder a analíticas de plataformas (vía Apache Superset), gestionar organizaciones, moderar recursos y seguir de cerca los KPIs globales.
   - **Identidad Visual**: Tema oscuro institucional ("Neón con realces negros", implementado con `[data-theme="admin"]`). Fondos oscuros estructurados, contornos definidos y acentos en **Teal**, **Sky Blue** y **Lavender** centrados en la lectura de datos de alta densidad.

*(La plataforma incluye un modo de suplantación donde los Administradores pueden visualizar la interfaz del Participante ("Modo Participante Activo") en tiempo real con una barra de control de estado rápido).*

---

## 🏗 Stack Tecnológico

La plataforma utiliza herramientas de vanguardia, optimizadas para rendimiento y mantenibilidad:

- **Framework Core**: [Next.js 16](https://nextjs.org/) (App Router)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/) para tipado estricto extremo a extremo.
- **Estilos y Estética**: [Tailwind CSS v4](https://tailwindcss.com/) + Variables CSS Inline Themes.
- **Librería de Componentes**: [Shadcn/ui](https://ui.shadcn.com/) (Componentes accesibles sin cabeza basados en Radix UI).
- **Iconografía**: [Lucide React](https://lucide.dev/).
- **Manejo de Estado**: [Zustand](https://zustand-demo.pmnd.rs/) (con sincronización/hidratación y persistencia segura vía `localStorage`).
- **Autenticación y BaaS**: [Supabase](https://supabase.com/).
- **Animaciones**: [Framer Motion](https://www.framer.com/motion/) (micro-animaciones interactivas, elevación 3D pseudo).

---

## 📁 Arquitectura y Estructura del Código

El código está estructurado bajo principios de *Feature-Sliced Design* para máxima escalabilidad:

```text
src/
├── app/                  # Enrutamiento App Router de Next.js
│   ├── (app)/            # Rutas protegidas (Requieren Auth: Dashboard, Journeys, etc.)
│   ├── api/              # Endpoints Servidor proxy / lógica Next.js Edge
│   ├── auth/             # Callbacks y validación de sesiones
│   ├── login/            # Flujo Auth público
│   └── globals.css       # ✨ Motor central de temas Summer UP, tokens e inyección de estilos
├── components/           # UI Compartida
│   ├── layout/           # MainLayout (Switch Admin/Participante), Navbars, Drawers
│   └── ui/               # Componentes atómicos base de Shadcn UI (Botones, inputs, badges)
├── features/             # Dominios funcionales altamente cohesivos:
│   ├── analytics/        # Embebido de Apache Superset y Tokens CSRF
│   ├── crm/              # Paneles de administración y gestión de entidades
│   ├── dashboard/        # Widgets principales, KPIs, AdminDashboardPanel
│   └── journey/          # "Mi Viaje", Gamificación, Renderizado de Avances y Wizards
├── lib/                  # Herramientas globales (utilidades de Tailwind, promesas, etc.)
├── services/             # Patrón Singleton de comunicación con Supabase y Backend
├── store/                # Zustand Stores (useAuth, useTheme, config general)
└── types/                # Interfaces y Definciones (api.types.ts, modelos de dominio)
```

---

## 🎨 Identidad Visual y CSS (`globals.css`)

El rediseño de Oasis Digital hacia Summer UP centraliza su CSS en `src/app/globals.css`. Todo el branding es dictado por utilidades personalizadas:

- **Tokens de Color Globales**: `--color-summer-sky`, `--color-summer-teal`, `--color-summer-pink`, `--color-summer-yellow`, `--color-summer-orange`, `--color-summer-lavender`.
- **Motor de Temas CSS (`@theme inline`)**: Integra directamente las variables de root locales a Tailwind CSS v4 para admitir clases reactivas dinámicas como `bg-summer-yellow/20` o `text-summer-sky`.
- **Clases de Utilidad Específicas del Proyecto**:
  - Estructura y legibilidad de Logo: `.logo-outline-white`.
  - Capas de Profundidad (Glassmorphism): `.summer-glass`, `.summer-glass-dark`.
  - Resplandores y Neón: `.summer-glow`, `.summer-glow-yellow`.
  - Gradientes Modulares: `.summer-gradient-135`, `.summer-gradient-radial`, `.summer-gradient-text`.

---

## 🚀 Guía de Instalación y Ejecución Local

Para levantar el ecosistema Summer UP en un entorno de desarrollo:

### 1. Variables de Entorno
Clona la plantilla de configuración `.env.example` y rellénala usando las credenciales del equipo:

```bash
cp .env.example .env.local
```

El archivo debe contener claves seguras imprescindibles para arrancar:
```env
NEXT_PUBLIC_API_URL=                  # URL base del backend
NEXT_PUBLIC_SUPABASE_URL=             # Endpoint de Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # Clave anónima para Auth/Client
NEXT_PUBLIC_SUPERSET_URL=             # URL de la instancia Apache Superset
NEXT_PUBLIC_SUPERSET_DASHBOARD_ID=    # ID interno del panel Analytics
SUPERSET_ADMIN_USERNAME=              # Credencial segura Servidor
SUPERSET_ADMIN_PASSWORD=              # Credencial segura Servidor
```

### 2. Instalación de Dependencias
```bash
npm install
# NOTA: Instalar usando npm en lugar de yarn/pnpm para garantizar lockfiles estables
```

### 3. Arranque de Servidor de Desarrollo
```bash
npm run dev
```

El servidor estará expuesto en **[http://localhost:3000](http://localhost:3000)**. El primer renderizado utilizará Next.js Turbopack para compilación HMR ultrarrápida.

---

## 🚢 Despliegue (Deployment)

Summer UP cuenta con integración continua sólida.
La aplicación está contenedorizada y configurada para despliegue automatizado sin servidor (Serverless) alojada en la infraestructura de la nube:

- **Proveedor Activo**: **Google Cloud Run**
- **Pipeline Automático**: Un empuje (push) a la rama `main` en GitHub encenderá GitHub Actions, el cual desencadena la construcción con `npm run build` y genera la imagen inmutable hacia GCP.

### Scripts Locales de Revisión de Despliegue:
Antes de mezclar (merge) un Pull Request, siempre valida las reglas del linter y la construcción de producción.
```bash
npm run lint      # Chequeo estricto TypeScript/ESLint y dependencias circulares
npm run build     # Simula la pipeline de construcción de Vercel/Next para errores severos
npm run start     # Corre la versión "Production-like" resultante
```

---
*Hecho con 🧡 para impulsar el aprendizaje continuo en Fundación Summer.*
