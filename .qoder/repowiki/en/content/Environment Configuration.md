# Environment Configuration

<cite>
**Referenced Files in This Document**   
- [next.config.mjs](file://next.config.mjs#L1-L74)
- [tailwind.config.ts](file://tailwind.config.ts#L1-L20)
- [postcss.config.mjs](file://postcss.config.mjs#L1-L9)
- [ConvexProvider.tsx](file://src/providers/ConvexProvider.tsx#L1-L16)
- [schema.ts](file://convex/schema.ts#L1-L62)
- [sw.js](file://public/sw.js#L1-L50)
- [package.json](file://package.json#L1-L49)
</cite>

## Table of Contents
1. [Next.js Configuration](#nextjs-configuration)  
2. [Tailwind CSS Setup](#tailwind-css-setup)  
3. [PostCSS Pipeline](#postcss-pipeline)  
4. [Convex Integration and Environment Variables](#convex-integration-and-environment-variables)  
5. [Developer Setup Guide](#developer-setup-guide)  
6. [PWA and Offline Support](#pwa-and-offline-support)  
7. [Deployment Considerations](#deployment-considerations)  
8. [Troubleshooting Common Issues](#troubleshooting-common-issues)

## Next.js Configuration

The `next.config.mjs` file configures core Next.js behaviors, including Progressive Web App (PWA) functionality, caching strategies, and asset optimization. It uses the `next-pwa` plugin to enable offline capabilities and service worker integration.

Key configuration features:
- **PWA Support**: Enabled via `next-pwa`, with static assets and key routes precached.
- **Caching Strategies**: Different caching strategies are applied based on route or resource type:
  - `StaleWhileRevalidate`: For dashboard content
  - `NetworkFirst`: For dynamic pages like expenses and Convex API calls
  - `CacheFirst`: For static assets (images, fonts, etc.)
- **Background Sync**: Convex mutations are queued and retried for up to 24 hours if offline.
- **Conditional PWA**: PWA features are disabled in development and only active in production.

```js
export default withPWA(pwaConfig)(nextConfig);
```

This setup ensures fast loading, offline access, and reliable data synchronization.

**Section sources**
- [next.config.mjs](file://next.config.mjs#L1-L74)

## Tailwind CSS Setup

The `tailwind.config.ts` file defines the Tailwind CSS configuration for the application, including content sources, theme extensions, and plugin usage.

### Configuration Details
- **Content Sources**: Scans all React components and pages in the `src` directory to purge unused styles in production.
- **Theme Extensions**: Customizes colors using CSS variables (`--background`, `--foreground`) for dynamic theming.
- **Plugins**: No additional plugins are currently used.

```ts
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
```

This configuration enables efficient style purging and supports dynamic theming via CSS variables.

**Section sources**
- [tailwind.config.ts](file://tailwind.config.ts#L1-L20)

## PostCSS Pipeline

The `postcss.config.mjs` file configures the PostCSS processing pipeline, which integrates Tailwind CSS into the build process.

### Key Configuration
- **Tailwind CSS Plugin**: The only PostCSS plugin used, responsible for generating utility classes from the Tailwind configuration.
- **No Additional Processing**: No autoprefixer or other PostCSS plugins are explicitly configured, relying on Next.js defaults.

```js
const config = {
  plugins: {
    tailwindcss: {},
  },
};

export default config;
```

This minimal setup allows Tailwind to process CSS during the build, enabling utility-first styling with optimal performance.

**Section sources**
- [postcss.config.mjs](file://postcss.config.mjs#L1-L9)

## Convex Integration and Environment Variables

Convex is integrated as the backend-as-a-service for data storage, authentication, and real-time synchronization. The frontend connects to Convex using environment variables and the `convex/react` client library.

### Environment Variable Usage
- **`NEXT_PUBLIC_CONVEX_URL`**: The URL of the Convex deployment, used to initialize the `ConvexReactClient`. This must be set in all environments (development, staging, production).

The client-side initialization occurs in `ConvexProvider.tsx`:

```tsx
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
```

### Convex Schema Overview
The data model defined in `schema.ts` includes:
- **Users**: Authentication and onboarding status
- **Expenses & Income**: Financial transactions linked to cards and categories
- **Cards**: Payment methods with user association
- **Settings**: User preferences (currency, calendar system)

All tables are indexed for efficient querying by `userId` and other common filters.

### Environment Management
While no `.env` files were found, best practices suggest:
- **Development**: Set `NEXT_PUBLIC_CONVEX_URL` to local Convex instance or dev deployment
- **Production**: Set to production Convex URL via Vercel environment variables

**Section sources**
- [ConvexProvider.tsx](file://src/providers/ConvexProvider.tsx#L1-L16)
- [schema.ts](file://convex/schema.ts#L1-L62)

## Developer Setup Guide

Follow these steps to set up a new development environment:

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Convex
- Create a Convex account at [https://convex.dev](https://convex.dev)
- Initialize Convex in the project:
```bash
npx convex dev
```
- Copy the generated `NEXT_PUBLIC_CONVEX_URL` from the CLI output

### 3. Configure Environment
Create a `.env.local` file:
```env
NEXT_PUBLIC_CONVEX_URL=https://your-convex-app.convex.cloud
```

### 4. Run the Application
```bash
npm run dev
```
Visit `http://localhost:3000` to access the app.

### 5. Link to Convex Project
Ensure your local Convex CLI is linked to your Convex project:
```bash
npx convex login
npx convex deploy
```

**Section sources**
- [package.json](file://package.json#L1-L49)
- [ConvexProvider.tsx](file://src/providers/ConvexProvider.tsx#L1-L16)

## PWA and Offline Support

The application is configured as a Progressive Web App (PWA) with offline capabilities using `next-pwa` and a custom service worker.

### Service Worker (`sw.js`)
- **Precaching**: Key routes (`/`, `/login`, `/dashboard`, etc.) are cached during installation.
- **Fetch Strategy**: Attempts to serve from cache first; falls back to network.
- **Cache Cleanup**: Old caches are removed during activation.

```js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});
```

### Caching Strategies in `next.config.mjs`
- **Convex API Calls**: Cached with `NetworkFirst` and background sync for mutations
- **Static Assets**: Cached with `CacheFirst` for 30 days
- **Dashboard & Expenses**: Use `StaleWhileRevalidate` and `NetworkFirst` respectively

This combination ensures fast load times and reliable offline functionality.

**Section sources**
- [next.config.mjs](file://next.config.mjs#L1-L74)
- [sw.js](file://public/sw.js#L1-L50)

## Deployment Considerations

### Vercel Deployment
- The app is optimized for Vercel deployment via Next.js defaults.
- Environment variables (especially `NEXT_PUBLIC_CONVEX_URL`) must be set in the Vercel dashboard.
- Automatic builds triggered on Git push.
- PWA assets are generated during the build process.

### Convex Cloud Deployment
- Deploy Convex backend using:
```bash
npx convex deploy
```
- Ensure the deployed Convex URL is updated in Vercel environment variables.
- Schema changes are automatically synced upon deployment.
- Use separate Convex apps for staging and production environments.

### Best Practices
- Use environment-specific Convex deployments
- Never commit `.env` files to version control
- Monitor cache strategies and adjust based on usage patterns
- Test offline functionality thoroughly

**Section sources**
- [next.config.mjs](file://next.config.mjs#L1-L74)
- [package.json](file://package.json#L1-L49)

## Troubleshooting Common Issues

### 1. Hot Reload Not Working
**Possible Causes**:
- File watcher limits exceeded (common on Linux)
- Conflicting IDE file watchers

**Solutions**:
- Increase system file watcher limit:
```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```
- Restart development server: `npm run dev`

### 2. Styles Not Applying
**Possible Causes**:
- Tailwind classes not detected during purge
- Incorrect content paths in `tailwind.config.ts`

**Solutions**:
- Verify content paths include all component directories
- Check for typos in class names
- Test with `@apply` in CSS to isolate issue

### 3. Convex Connection Errors
**Possible Causes**:
- Invalid or missing `NEXT_PUBLIC_CONVEX_URL`
- Network issues or CORS
- Convex backend not deployed

**Solutions**:
- Verify `NEXT_PUBLIC_CONVEX_URL` is set and correct
- Check Convex dashboard for deployment status
- Run `npx convex dev` to test local connection
- Ensure environment variable is prefixed with `NEXT_PUBLIC_`

### 4. PWA Not Installing
**Possible Causes**:
- Service worker not registered
- HTTPS requirement in production

**Solutions**:
- Verify `next-pwa` is correctly configured
- Test on `localhost` (treated as secure)
- Ensure `manifest.json` is properly configured

**Section sources**
- [next.config.mjs](file://next.config.mjs#L1-L74)
- [tailwind.config.ts](file://tailwind.config.ts#L1-L20)
- [ConvexProvider.tsx](file://src/providers/ConvexProvider.tsx#L1-L16)
- [sw.js](file://public/sw.js#L1-L50)