# Summer UP — Plataforma Digital

Plataforma digital para la Fundación Summer, diseñada para gestionar la experiencia de aprendizaje y desarrollo de **Summer UP**.

## 🏗 Arquitectura del Proyecto

- **Frontend**: [Next.js 16](https://nextjs.org/) (App Router)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Estilos**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Componentes UI**: [Shadcn/ui](https://ui.shadcn.com/) (basado en Radix UI)
- **Iconos**: [Lucide React](https://lucide.dev/)
- **Estado Global**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Animaciones**: [Framer Motion](https://www.framer.com/motion/)

### Estructura de Carpetas

- `src/app`: Rutas y páginas (App Router). Las rutas autenticadas viven bajo `(app)/`.
- `src/components`: Componentes reutilizables (UI, Layouts).
- `src/features`: Módulos funcionales por dominio (CRM, Journey, Dashboard, Resources).
- `src/services`: Clases singleton que encapsulan todas las llamadas a la API.
- `src/store`: Stores de Zustand con persistencia en localStorage.
- `src/lib`: Utilidades, cliente API, mappers y configuraciones.
- `src/types`: Tipos TypeScript — DTOs de la API en `api.types.ts`, modelos de dominio en `index.ts`.

---

## 🚀 Cómo Iniciar

1. **Instalar dependencias**:

   ```bash
   npm install
   ```

2. **Configurar variables de entorno** — copiar y completar:

   ```bash
   cp .env.example .env.local
   ```

3. **Correr servidor de desarrollo**:

   ```bash
   npm run dev
   ```

4. Visita [http://localhost:3000](http://localhost:3000).

---

## 🔌 Variables de Entorno

```env
NEXT_PUBLIC_API_URL=                  # URL base del backend
NEXT_PUBLIC_SUPABASE_URL=             # URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # Anon key de Supabase
NEXT_PUBLIC_SUPERSET_URL=             # URL de Apache Superset
NEXT_PUBLIC_SUPERSET_DASHBOARD_ID=    # ID del dashboard embebido
SUPERSET_ADMIN_USERNAME=              # Solo server-side
SUPERSET_ADMIN_PASSWORD=              # Solo server-side
```

---

## 🎨 Identidad Visual Summer UP

Los tokens de color y utilidades están definidos en `src/app/globals.css`:

- **Colores de marca**: `--color-summer-sky`, `--color-summer-teal`, `--color-summer-pink`, `--color-summer-yellow`, `--color-summer-orange`, `--color-summer-lavender`
- **Gradientes**: `.summer-gradient-135`, `.summer-gradient-180`, `.summer-gradient-90`, `.summer-gradient-radial`, `.summer-gradient-text`
- **Glassmorphism**: `.summer-glass`, `.summer-glass-dark`
- **Efectos**: `.summer-glow`, `.summer-glow-yellow`, `.summer-skeleton`
- **Tema admin**: selector `[data-theme="admin"]` aplicado automáticamente bajo `/admin/*`

---

## 🚢 Despliegue

El proyecto se despliega automáticamente en **Google Cloud Run** al hacer push a `main` via GitHub Actions.

```bash
npm run build   # Build de producción
npm run start   # Servidor de producción
npm run lint    # ESLint
```
