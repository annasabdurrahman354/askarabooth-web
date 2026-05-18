# Photobooth OS — Web Platform

Multi-tenant photobooth management platform with visual template editor, real-time session management, and client-side rendering engine.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, TailwindCSS v4, Zustand |
| Backend | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Rendering | html2canvas (client-side), TemplateRenderer (unified React/HTML) |
| Build | Vite 6, manual chunk splitting |
| Deploy | Vercel (SPA) / Netlify |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Application                         │
│                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ Dashboard │  │ Template     │  │ Booth Session         │ │
│  │ (Admin)   │  │ Editor       │  │ (Kiosk Mode)          │ │
│  └──────────┘  └──────────────┘  └───────────────────────┘ │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ Render Page   │  │ Share Gallery│  │ Unified Renderer │ │
│  │ (WebView/API) │  │ (Public)     │  │ (templateRenderer)│ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
            │                                    │
            ▼                                    ▼
    ┌──────────────┐                  ┌──────────────────┐
    │  Supabase    │                  │  Android App     │
    │  (Auth/DB/   │                  │  (WebView loads  │
    │   Storage)   │                  │   RenderPage)    │
    └──────────────┘                  └──────────────────┘
```

## Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/login` | Public | Authentication (sign in / sign up) |
| `/dashboard/*` | Authenticated | Admin dashboard (role-protected) |
| `/admin/templates/:id/editor` | Owner/Superadmin | Visual template editor |
| `/booth/:boothId/template/:templateId` | Public | Kiosk photobooth session |
| `/render/:sessionId` | Public (+token) | Client-side template rendering |
| `/share/:token` | Public | Photo gallery with QR code |

## Key Features

### Template Editor
- Drag-and-drop visual editor with `react-rnd`
- Element types: text, photo slots, stickers, images, groups (flexbox)
- Properties: font, color, alignment, rotation, opacity, border, shadow, ratio lock
- Canvas size in cm with preset dimensions
- Export as PNG / HTML / batch ZIP

### Booth Session
- Full-screen camera with countdown timer
- Multi-slot photo capture
- Review + retake individual photos
- Client-side template rendering via `captureTemplate()`

### Unified Renderer (`src/lib/templateRenderer.tsx`)
Single source of truth for all rendering:
- `TemplateRenderer` — React component (forwardRef)
- `renderTemplateHTML()` — HTML string generator
- `captureTemplate()` — html2canvas pipeline with oklch fix + dimension fix
- `captureTemplateAsBlob()` — capture + toBlob

### Render Page (`/render/:sessionId`)
Standalone page that renders a session's template with captured photos:
- Fetches session, template, captures from Supabase
- Renders off-screen via `TemplateRenderer` + `captureTemplateAsBlob()`
- Uploads final image to Supabase Storage
- Updates session with `final_image_url` + `status = "completed"`
- Notifies Android WebView via `window.Android.onRenderComplete()` / `window.Android.onRenderError()`

## Android Integration

The Android app embeds the Render Page in a WebView instead of using an external browser or Puppeteer server.

### Communication Protocol

```
Android App                         RenderPage (WebView)
    │                                       │
    │  loadUrl(/render/{sessionId}?token=x) │
    │ ─────────────────────────────────────►│
    │                                       │  setSession(token)
    │                                       │  fetch session/template/captures
    │                                       │  captureTemplateAsBlob()
    │                                       │  upload to Storage
    │                                       │  update session
    │                                       │
    │  window.Android.onRenderComplete(url) │
    │ ◄─────────────────────────────────────│
    │                                       │
    │  → transition to DONE state           │
```

### Auth Token Passing
The Android app passes its Supabase access token as a URL parameter (`?token=xxx`). The Render Page calls `supabase.auth.setSession()` to authenticate all subsequent Supabase calls, satisfying RLS policies.

### Android Bridge Interface
```typescript
interface AndroidBridge {
  onRenderComplete(finalImageUrl: string, shareToken: string): void;
  onRenderError(error: string): void;
}
// Accessed via window.Android (injected by Android WebView JavascriptInterface)
```

Callbacks are dispatched to the main thread via `Handler(Looper.getMainLooper())` since `@JavascriptInterface` methods run on a WebView background thread.

## Setup

### Prerequisites
- Node.js 18+
- Supabase project

### 1. Install dependencies
```bash
npm install
```

### 2. Environment variables
```bash
cp .env.example .env
```
```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
```

### 3. Database schema
Run `supabase_schema.sql` in your Supabase SQL Editor. It creates:
- 7 tables with RLS policies
- 4 storage buckets
- Helper functions (`is_superadmin()`, `get_user_tenant_id()`, etc.)
- Default stickers and superadmin user (`superadmin@photobooth.app` / `SuperAdmin123!`)

### 4. Run dev server
```bash
npm run dev
```

### 5. Build for production
```bash
npm run build
```

## Database Schema

```
tenants ──┬── profiles (tenant_id → tenants.id)
          ├── booths (tenant_id)
          ├── templates (tenant_id)
          └── stickers (tenant_id, nullable=global)

booths ──── sessions (booth_id)
templates ── sessions (template_id)
sessions ─── captures (session_id)
auth.users ─ profiles (id = auth.uid())
```

### Session Status Flow
```
idle → shooting → uploading → review → rendering → completed
```

## Design System

Neo-brutalist aesthetic with bold borders, hard shadows, and tactile interactions.

| Element | Style |
|---------|-------|
| Background | `slate-50` |
| Border | `2px solid slate-950`, `rounded-2xl` |
| Shadow | `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]` |
| Primary | `blue-600` |
| Accent | `yellow-400`, `emerald-400`, `red-500` |
| Typography | Inter, `font-black uppercase tracking-tight` |
| Press effect | `active:translate-y-[4px] active:shadow-none` |

See `THEME.md` for full design tokens.

## Deployment

### Vercel
```bash
npm run build
vercel --prod
```

### Netlify
Build command: `npm run build`  
Publish directory: `dist`

Both platforms use SPA rewrites (configured in `vercel.json` / `public/_headers`).

## License

Proprietary — AskaRa Entertainment
