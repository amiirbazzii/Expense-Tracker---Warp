# Root-Level Configuration Files

<cite>
**Referenced Files in This Document**   
- [package.json](file://package.json)
- [next.config.mjs](file://next.config.mjs)
- [tailwind.config.ts](file://tailwind.config.ts)
- [postcss.config.mjs](file://postcss.config.mjs)
- [tsconfig.json](file://tsconfig.json)
</cite>

## Table of Contents
1. [Root-Level Configuration Files](#root-level-configuration-files)
2. [package.json: Project Manifest and Script Management](#packagejson-project-manifest-and-script-management)
3. [next.config.mjs: Next.js Customization and PWA Integration](#nextconfigmjs-nextjs-customization-and-pwa-integration)
4. [tailwind.config.ts: Design System and JIT Compilation Setup](#tailwindconfigts-design-system-and-jit-compilation-setup)
5. [postcss.config.mjs: PostCSS Processing Pipeline](#postcssconfigmjs-postcss-processing-pipeline)
6. [tsconfig.json: TypeScript Compiler Configuration](#tsconfigjson-typescript-compiler-configuration)
7. [Configuration Extension Guidance](#configuration-extension-guidance)

## package.json: Project Manifest and Script Management

The `package.json` file serves as the central manifest for the project, defining metadata, dependencies, and development scripts. It governs how the application is built, run, and maintained.

### Metadata and Project Identification
- **name**: "warp-ex-tracker" – the identifier for the project
- **version**: "0.1.0" – current version following semantic versioning
- **private**: true – indicates this package is not intended for public npm distribution

### Dependencies
The project relies on a modern full-stack JavaScript/TypeScript ecosystem:

**Core Frameworks**
- **next**: "14.2.30" – the Next.js framework for server-side rendering and routing
- **react**, **react-dom**: "^18" – UI library and DOM renderer
- **convex**: "^1.25.2" – backend-as-a-service with real-time sync and serverless functions

**UI and Styling Libraries**
- **lucide-react**: "^0.525.0" – icon library
- **framer-motion**: "^12.23.0" – animation library
- **sonner**: "^2.0.6" – toast notification system
- **chart.js**, **react-chartjs-2**: "^4.5.0", "^5.3.0" – data visualization

**Form and Validation**
- **react-hook-form**: "^7.60.0" – form state management
- **zod**: "^3.25.75" – schema validation
- **@hookform/resolvers**: "^5.1.1" – integration between Zod and React Hook Form

**Date and Localization**
- **date-fns**: "^4.1.0" – date utility functions
- **jalali-moment**: "^3.3.11" – support for Persian calendar

**Offline and Storage**
- **localforage**: "^1.10.0" – enhanced localStorage with IndexedDB fallback
- **next-pwa**: "^5.6.0" – Progressive Web App integration

### Development Dependencies
These tools support development, linting, and type safety:
- **TypeScript**: "^5" – typed superset of JavaScript
- **@types/** packages – type definitions for Node.js, React, and DOM
- **eslint**, **eslint-config-next**: "^8", "14.2.30" – code linting aligned with Next.js best practices
- **tailwindcss**: "^3.4.1" – utility-first CSS framework
- **postcss**: "^8" – CSS transformation tool

### Scripts
Standardized commands for development and deployment:
- **dev**: "next dev" – starts the development server
- **build**: "next build" – compiles the application for production
- **start**: "next start" – runs the production server
- **lint**: "next lint" – runs ESLint with Next.js configuration

**Section sources**
- [package.json](file://package.json#L1-L48)

## next.config.mjs: Next.js Customization and PWA Integration

This configuration file extends Next.js functionality, primarily enabling Progressive Web App (PWA) capabilities and customizing caching behavior.

### PWA Configuration via next-pwa
The `next-pwa` plugin is used to transform the application into an installable PWA with offline support.

```javascript
import withPWA from 'next-pwa';
```

The PWA is conditionally disabled in non-production environments:
```javascript
const isProduction = process.env.NODE_ENV === 'production';
```

#### Service Worker Configuration
- **dest**: 'public' – outputs the service worker to the public directory
- **register**: true – automatically registers the service worker
- **skipWaiting**: true – forces the new service worker to activate immediately
- **disable**: !isProduction – disables PWA in development

### Runtime Caching Strategies
Custom caching rules are defined for different resource types:

#### Dashboard Caching
```json
{
  "urlPattern": "/dashboard",
  "handler": "StaleWhileRevalidate",
  "options": {
    "cacheName": "dashboard-cache",
    "expiration": {
      "maxEntries": 1,
      "maxAgeSeconds": 86400
    }
  }
}
```
- Uses **StaleWhileRevalidate** to serve cached content immediately while updating in the background
- Limits cache to 1 entry, valid for 1 day

#### Expenses Caching
```json
{
  "urlPattern": "/expenses",
  "handler": "NetworkFirst",
  "options": {
    "cacheName": "expenses-cache",
    "expiration": {
      "maxEntries": 1,
      "maxAgeSeconds": 86400
    }
  }
}
```
- Prefers network response but falls back to cache if offline
- Suitable for data that should be fresh but available offline

#### Convex API Caching
```json
{
  "urlPattern": "https://*.convex.cloud",
  "handler": "NetworkFirst",
  "options": {
    "cacheName": "convex-api-cache",
    "networkTimeoutSeconds": 10,
    "expiration": {
      "maxEntries": 50
    },
    "backgroundSync": {
      "name": "convex-mutations-queue",
      "options": {
        "maxRetentionTime": 1440
      }
    },
    "cacheableResponse": {
      "statuses": [0, 200]
    }
  }
}
```
- Caches all requests to Convex backend services
- Implements **background sync** to retry failed mutations for up to 24 hours
- Critical for offline functionality, ensuring user actions are not lost

#### Static Assets Caching
```json
{
  "urlPattern": "\\.(?:png|jpg|jpeg|svg|gif|ico|woff|woff2)$",
  "handler": "CacheFirst",
  "options": {
    "cacheName": "static-assets-cache",
    "expiration": {
      "maxEntries": 100,
      "maxAgeSeconds": 2592000
    }
  }
}
```
- Uses **CacheFirst** strategy for maximum performance
- Stores up to 100 assets for 30 days

**Section sources**
- [next.config.mjs](file://next.config.mjs#L1-L74)

## tailwind.config.ts: Design System and JIT Compilation Setup

This file configures Tailwind CSS, defining the design tokens and content sources for Just-In-Time (JIT) compilation.

### Content Sources
Specifies where Tailwind should scan for class usage to generate CSS:
```typescript
content: [
  "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
  "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
]
```
- Ensures all components in the `src` directory are scanned
- Supports multiple file extensions including TypeScript and JSX
- Enables JIT engine to generate styles on-demand

### Theme Configuration
Extends the default theme with custom CSS variables:
```typescript
theme: {
  extend: {
    colors: {
      background: "var(--background)",
      foreground: "var(--foreground)",
    },
  },
}
```
- Maps Tailwind color classes to CSS custom properties
- Enables dynamic theming via CSS variables defined elsewhere (e.g., `globals.css`)
- Maintains design consistency across the application

### Plugins
Currently no additional plugins are enabled:
```typescript
plugins: [],
```
- Can be extended with community or custom plugins (e.g., typography, forms)
- Lightweight configuration suitable for a focused design system

**Section sources**
- [tailwind.config.ts](file://tailwind.config.ts#L1-L19)

## postcss.config.mjs: PostCSS Processing Pipeline

This minimal configuration sets up PostCSS to process CSS with Tailwind and autoprefixer.

### PostCSS Plugin Chain
```javascript
plugins: {
  tailwindcss: {},
}
```
- **tailwindcss**: processes Tailwind directives (`@tailwind`, `@apply`)
- **autoprefixer**: automatically included by Tailwind – adds vendor prefixes
- No additional plugins (e.g., CSSNano for minification, which is handled by Next.js)

### Integration with Next.js
- Next.js automatically detects and applies this configuration
- Works in tandem with `tailwind.config.ts` to generate final CSS
- Executed during both development and production builds

**Section sources**
- [postcss.config.mjs](file://postcss.config.mjs#L1-L8)

## tsconfig.json: TypeScript Compiler Configuration

This configuration ensures consistent type checking across frontend and backend code.

### Compiler Options

#### Path Mapping
```json
"baseUrl": ".",
"paths": {
  "@/*": ["./src/*"]
}
```
- Enables absolute imports (e.g., `import Component from "@/components/Component"`)
- Improves code readability and reduces relative path complexity

#### Language and Module Settings
```json
"lib": ["dom", "dom.iterable", "esnext"]
"module": "esnext"
"moduleResolution": "bundler"
"jsx": "preserve"
```
- Targets modern JavaScript and DOM APIs
- Compatible with Next.js and bundler tooling (Webpack, Turbopack)
- Preserves JSX for transformation in later build steps

#### Type Checking
```json
"strict": true
"skipLibCheck": true
"noEmit": true
```
- **strict**: enables all strict type-checking options
- **skipLibCheck**: improves build performance by skipping type checks on node_modules
- **noEmit**: prevents TypeScript from emitting JavaScript (Next.js handles compilation)

#### Advanced Options
```json
"plugins": [
  {
    "name": "next"
  }
]
```
- Integrates with Next.js type checking and plugin system
- Provides enhanced type support for Next.js features

### File Inclusion
```json
"include": [
  "next-env.d.ts",
  "**/*.ts",
  "**/*.tsx",
  ".next/types/**/*.ts"
]
```
- Includes all TypeScript files in the project
- References Next.js type definitions
- Ensures types in the build directory are checked

**Section sources**
- [tsconfig.json](file://tsconfig.json#L1-L40)

## Configuration Extension Guidance

### Adding Environment Variables
1. Define variables in `.env.local`
2. Prefix frontend variables with `NEXT_PUBLIC_`
3. Reference in code via `process.env.VAR_NAME`
4. Update `schema.ts` in Convex if backend variables are needed

### Customizing Build Output
- Modify `next.config.mjs` with `output` option for static exports
- Use `distDir` to change build directory
- Add `images` configuration for image optimization

### Integrating New Libraries
1. Install via `npm install`
2. Add to relevant config:
   - **Tailwind plugins**: add to `tailwind.config.ts`
   - **PostCSS plugins**: add to `postcss.config.mjs`
   - **TypeScript types**: install `@types/library-name` if needed
3. Update `tsconfig.json` paths if using custom module resolution

### Extending Tailwind
```typescript
// Add to tailwind.config.ts
theme: {
  extend: {
    colors: {
      primary: '#3B82F6',
      secondary: '#10B981'
    },
    spacing: {
      '128': '32rem'
    }
  }
},
plugins: [
  require('@tailwindcss/forms'),
  require('@tailwindcss/typography')
]
```

### Enhancing PWA
- Customize `manifest.json` in `public/`
- Add splash screens and icons
- Implement push notifications via service worker
- Monitor installation events

All configurations are designed to work harmoniously with Convex and Next.js requirements, maintaining optimal performance and developer experience.