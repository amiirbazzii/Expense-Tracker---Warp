# Environment Configuration

<cite>
**Referenced Files in This Document**   
- [next.config.js](file://next.config.js) - *Updated to prevent HTML navigation caching*
- [tailwind.config.ts](file://tailwind.config.ts) - *Extended with font family configurations*
- [postcss.config.mjs](file://postcss.config.mjs) - *Minimal PostCSS configuration for Tailwind*
- [ConvexProvider.tsx](file://src/providers/ConvexProvider.tsx) - *Client-side Convex initialization*
- [schema.ts](file://convex/schema.ts) - *Backend data model definition*
</cite>

## Update Summary
**Changes Made**   
- Updated PWA caching strategy documentation to reflect exclusion of HTML navigations
- Added details about font family configurations in Tailwind CSS
- Enhanced Next.js configuration section with updated workbox routing logic
- Updated source tracking annotations to reflect recent changes
- Corrected file extension references from .mjs to .js where appropriate

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

The `next.config.js` file configures core Next.js behaviors, including Progressive Web App (PWA) functionality, caching strategies, and asset optimization. It uses the `next-pwa` plugin to enable offline capabilities and service worker integration.

Key configuration features:
- **PWA Support**: Enabled via `next-pwa`, with static assets and key routes precached.
- **Caching Strategies**: Different caching strategies are applied based on route or resource type:
  - `StaleWhileRevalidate`: For dashboard content
  - `NetworkFirst`: For dynamic pages like expenses and Convex API calls
  - `CacheFirst`: For static assets (images, fonts, etc.)
- **Background Sync**: Convex mutations are queued and retried for up to 24 hours if offline.
- **Conditional PWA**: PWA features are disabled in development and only active in production.
- **HTML Navigation Caching Prevention**: Critical navigation routes (`/settings`, `/dashboard`, `/expenses`, `/income`, `/cards`) are explicitly excluded from caching to prevent stale app shell issues and unexpected redirects in production.

```js
{
  // Avoid caching HTML document navigations to prevent stale app shell issues
  // that can cause unexpected redirects (e.g., to /expenses) on prod.
  urlPattern: ({ request, url }) => {
    const pathname = new URL(url).pathname;
    const noCacheRoutes = ['/settings', '/dashboard', '/expenses', '/income', '/cards'];
    return request.destination !== 'document' && !noCacheRoutes.some(route => pathname.startsWith(route));
  },
  handler: 'NetworkFirst',
}
```

This setup ensures fast loading, offline access, and reliable data synchronization while preventing navigation-related caching issues.

**Section sources**
- [next.config.js](file://next.config.js#L20-L65) - *Updated to prevent HTML navigation caching*

## Tailwind CSS Setup

The `tailwind.config.ts` file defines the Tailwind CSS configuration for the application, including content sources, theme extensions, and plugin usage.

### Configuration Details
- **Content Sources**: Scans all React components and pages in the `src` directory to purge unused styles in production.
- **Theme Extensions**: Customizes colors using CSS variables (`--background`, `--foreground`) for dynamic theming and extends font families for both Persian and English text rendering.
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
      fontFamily: {
        sans: ['var(--font-poppins)', 'ui-sans-serif', 'system-ui'],
        'persian': ['var(--font-iran-sans)', 'Tahoma', 'Arial', 'sans-serif'],
        'english': ['var(--font-poppins)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

This configuration enables efficient style purging, supports dynamic theming via CSS variables, and provides optimized font stacks for both Persian and English language support.

**Section sources**
- [tailwind.config.ts](file://tailwind.config.ts#L1-L47) - *Extended with font family configurations*

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
- [postcss.config.mjs](file://postcss.config.mjs#L1-L9) - *Minimal PostCSS configuration for Tailwind*

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
- **Settings**: User preferences (currency, calendar system, language)

All tables are indexed for efficient querying by `userId` and other common filters.

### Environment Management
While no `.env` files were found, best practices suggest:
- **Development**: Set `NEXT_PUBLIC_CONVEX_URL` to local Convex instance or dev deployment
- **Production**: Set to production Convex URL via Vercel environment variables

**Section sources**
- [ConvexProvider.tsx](file://src/providers/ConvexProvider.tsx#L8-L14) - *Client-side Convex initialization*
- [schema.ts](file://convex/schema.ts#L1-L70) - *Backend data model definition*

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
- [package.json](file://package.json)
- [ConvexProvider.tsx](file://src/providers/ConvexProvider.tsx#L8-L14)

## PWA and Offline Support

The application is configured as a Progressive Web App (PWA) with offline capabilities using `next-pwa` and Workbox runtime caching.

### Runtime Caching Strategies
- **Images**: Cached with `CacheFirst` strategy and stored for 30 days
- **Static Resources**: JavaScript and CSS files use `StaleWhileRevalidate` for optimal balance between freshness and performance
- **Dynamic Content**: Uses `NetworkFirst` strategy with specific exclusions for HTML navigations to prevent stale app shell issues

### Critical Navigation Protection
To prevent production redirect issues (such as unexpected navigation to `/expenses`), HTML document requests for key routes are excluded from caching:

```js
urlPattern: ({ request, url }) => {
  const pathname = new URL(url).pathname;
  const noCacheRoutes = ['/settings', '/dashboard', '/expenses', '/income', '/cards'];
  return request.destination !== 'document' && !noCacheRoutes.some(route => pathname.startsWith(route));
}
```

This ensures that critical navigation pages always load fresh content from the network, preventing stale routing behavior while maintaining offline capabilities for data and assets.

**Section sources**
- [next.config.js](file://next.config.js#L20-L65) - *Updated to prevent HTML navigation caching*

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
- Regularly verify that critical navigation routes are not being cached inappropriately

**Section sources**
- [next.config.js](file://next.config.js)
- [package.json](file://package.json)

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
- Missing font variables in CSS

**Solutions**:
- Verify content paths include all component directories
- Check for typos in class names
- Ensure CSS variables (`--font-poppins`, `--font-iran-sans`) are properly defined
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
- Caching conflicts with navigation

**Solutions**:
- Verify `next-pwa` is correctly configured
- Test on `localhost` (treated as secure)
- Ensure `manifest.json` is properly configured
- Check that HTML navigations are excluded from caching in production

**Section sources**
- [next.config.js](file://next.config.js#L1-L110)
- [tailwind.config.ts](file://tailwind.config.ts#L1-L47)
- [ConvexProvider.tsx](file://src/providers/ConvexProvider.tsx#L8-L14)