

## Set Up POS as Installable PWA

Convert the POS application into a Progressive Web App (PWA) so it can be installed on tablets and desktops like a native app, with offline caching and instant loading.

### What You'll Get

- **Install to Home Screen**: Staff can install the POS directly from the browser -- it opens full-screen like a real app
- **Fast Loading**: All menu data, UI assets, and pages are cached locally -- no waiting for network on repeat visits
- **Offline Resilience**: The app shell loads even without internet; cached menu items and categories remain available
- **Auto Updates**: When you publish changes, the app automatically updates in the background

### Changes

#### 1. Install `vite-plugin-pwa` dependency

Add the `vite-plugin-pwa` package which handles service worker generation, manifest creation, and caching strategies.

#### 2. Update `vite.config.ts`

Configure the PWA plugin with:
- App name: "Royal Hotel POS"
- Theme color matching the brand
- `navigateFallbackDenylist` to exclude `/~oauth` from service worker caching
- Precaching of all static assets (JS, CSS, images, fonts)
- Runtime caching strategy for API calls (network-first with fallback)
- Auto-update behavior so new versions install seamlessly

#### 3. Update `index.html`

Add mobile-optimized meta tags:
- `<meta name="apple-mobile-web-app-capable">` for iOS full-screen mode
- `<meta name="theme-color">` for browser chrome styling
- `<link rel="apple-touch-icon">` for iOS home screen icon
- Update the title to "Royal Hotel POS"

#### 4. Create PWA icons in `public/`

Generate the required icon files:
- `pwa-192x192.png` -- standard PWA icon
- `pwa-512x512.png` -- splash screen icon
- `apple-touch-icon-180x180.png` -- iOS home screen icon

These will be simple branded placeholder icons with "RH" text.

#### 5. Create Install Page (`src/pages/InstallPWA.tsx`)

A dedicated `/install` page that:
- Detects if the app is already installed
- Shows an "Install" button that triggers the browser's install prompt
- Provides step-by-step instructions for iOS (Share -> Add to Home Screen)
- Shows a success message if already installed

#### 6. Add `/install` route to `App.tsx`

Register the new install page route (accessible without login so staff can install easily).

### Files Changed

| File | Action |
|------|--------|
| `vite.config.ts` | Add PWA plugin configuration |
| `index.html` | Add mobile meta tags, update title |
| `public/pwa-192x192.png` | Create PWA icon |
| `public/pwa-512x512.png` | Create PWA icon |
| `public/apple-touch-icon-180x180.png` | Create iOS icon |
| `src/pages/InstallPWA.tsx` | New install page |
| `src/App.tsx` | Add /install route |

### How to Install After Setup

1. Open the POS on your tablet/desktop browser
2. Go to `/install` or use the browser menu
3. Tap "Install" or "Add to Home Screen"
4. The POS now launches full-screen like a native app

