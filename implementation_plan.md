# Photobooth SaaS — Complete Web App Implementation Plan (with Superadmin)

This document outlines the full implementation plan for a multi-tenant photobooth SaaS application.  
It covers architecture, technology choices, module breakdown, database design, development phases, and the reasoning behind every key decision.

Inspired by **LumaBooth**, **Canva**, and modern web capabilities, this app is built entirely with web technologies — no native app required. The central philosophy: **everything is HTML/CSS**.

## 1. Core Philosophy: Why HTML/CSS for Templates?

Most photobooth systems rely on a `<canvas>` engine to compose and edit templates. We take a different approach:

**All templates are real DOM elements** — structured with HTML, styled with CSS, and positioned with standard layout techniques (CSS Grid, Flexbox, absolute positioning).  
The final output is rendered to a flat image using **html2canvas**.

### Advantages

- **Easier editing**: Since templates are live DOM, the same editor that users interact with is the source of truth. No internal canvas model to sync.
- **Web-native styling**: All CSS properties work out-of-the-box — gradients, shadows, filters, text wrapping, custom fonts.
- **Responsive by default**: Templates can be made responsive or fixed-size with media queries. The booth view can be a single fixed dimension, while the editor can be fluid.
- **Simpler export**: Rendering is a single `html2canvas()` call — no manual composition of canvas elements.
- **Lower maintenance**: You don’t need to build or maintain a proprietary canvas engine.

The entire platform revolves around this idea: **the template is the webpage**.

## 2. High-Level Architecture

```txt
┌──────────────────────────────┐
│         React App            │
│                              │
│  • Superadmin Dashboard      │
│  • Admin Dashboard           │
│  • Booth Session             │
│  • Template Editor           │
│  • Render Engine             │
│  • Share Gallery             │
└─────────────┬────────────────┘
              │
              ▼
          Supabase
     (Auth, DB, Storage, Realtime)
```

- **React** powers the entire frontend application.
- **Supabase** provides authentication, PostgreSQL database, object storage, and real-time subscriptions — all essential for a multi-tenant SaaS.

## 3. Tech Stack

### Frontend

| Purpose            | Technology    |
| ------------------ | ------------- |
| Framework          | React 18+     |
| Build Tool         | Vite          |
| Styling            | Tailwind CSS  |
| State Management   | Zustand       |
| Authentication     | Supabase Auth |
| Drag & Resize      | `react-rnd`   |
| Drag & Drop (sort) | `dnd-kit`     |
| Rendering          | `html2canvas` |
| Animations         | Framer Motion |

### Backend (Supabase)

| Purpose              | Service                                                       |
| -------------------- | ------------------------------------------------------------- |
| Database             | Postgres (via Supabase)                                       |
| File Storage         | Supabase Storage                                              |
| Authentication       | Supabase Auth                                                 |
| Real-time            | Supabase Realtime                                             |
| Serverless Functions | Supabase Edge Functions (optional for webhooks, custom logic) |

## 4. Application Modules

You’re not building one monolithic app — you’re building **six tightly-integrated sub-apps** that share the same database and authentication.

### A. Admin Dashboard

- Manage tenants, booths, templates, and users.
- View analytics: sessions per day, print count, QR scans.
- Monitoring: booth online/offline, current session, printer state.

### B. Booth Session App

- The actual photobooth interface used at events.
- Webcam capture (DSLR integration planned for later).
- Countdown, live preview overlay, multi-shot flow, editing before print/export.

### C. Template Editor

- A Canva-like, drag-and-drop editor for creating photostrips and layouts.
- Supports photo slots, text, stickers, overlays, shapes, QR codes.
- Exports template as HTML + CSS + metadata JSON.

### D. Render Engine

- Converts the in-browser DOM (template + captured photos) into a final high-resolution JPG using `html2canvas`.
- Used for printing, sharing, and gallery generation.

### E. Share Gallery

- After a session, a unique share token is generated.
- A public (or semi-public) page shows the final render, QR code, download link, and optionally a gallery of all outputs.

### F. Superadmin Dashboard

- Platform-wide view of all tenants
- Create, disable, or modify tenants
- Manage global billing/plans
- Access analytics across all tenants
- Full read/write access to every tenant’s data (booths, templates, sessions, etc.)

The superadmin dashboard is **only** accessible by users with the `superadmin` role.

## 5. Project Structure

A modular structure keeps everything organised and scalable.

```txt
src/
  components/
    editor/
    booth/
    render/
    ui/

  features/
    auth/
    sessions/
    templates/
    editor/
    printing/
    sharing/
    superadmin/

  lib/
    supabase/
    renderer/
    camera/
    export/

  stores/

  pages/

  routes/

  hooks/

  styles/
```

### Why React + Vite?

- **Fast development experience** with instant HMR (Hot Module Replacement)
- Lightweight and simple deployment
- Easier control over routing and architecture
- Perfect for kiosk-style web applications
- Lower complexity compared to SSR frameworks

## 6. Database Design (Multi-Tenant + Superadmin)

All tables are in **Supabase PostgreSQL** with **Row Level Security (RLS)** enforcing tenant isolation, with superadmin bypass.

### Core Tables

#### `tenants`

| Column     | Type      | Description           |
| ---------- | --------- | --------------------- |
| id         | uuid      | Primary key           |
| name       | text      | Company/tenant name   |
| plan       | text      | free, pro, enterprise |
| status     | text      | active, disabled      |
| created_at | timestamp |                       |
| updated_at | timestamp |                       |

#### `users`

| Column     | Type      | Description                        |
| ---------- | --------- | ---------------------------------- |
| id         | uuid      | References `auth.users`            |
| tenant_id  | uuid?     | NULL for superadmins               |
| email      | text      |                                    |
| role       | text      | owner, admin, operator, superadmin |
| created_at | timestamp |                                    |

A superadmin user **does not belong to any tenant** — their `tenant_id` is `NULL`.

## 7. Authentication & Roles

Using **Supabase Auth** with:

- Email/password
- Magic links
- Social logins (optional)

### Roles

- `superadmin`
- `owner`
- `admin`
- `operator`

Authorization is enforced through:

- Supabase RLS
- React route guards
- Zustand auth store

## 8. Template System — The Heart of the App

### Template = HTML + CSS + Metadata

Each template consists of:

- HTML
- CSS
- Metadata JSON

The template itself is simply rendered as live DOM elements inside React.

### Example Metadata

```json
{
  "width": 1200,
  "height": 1800,
  "elements": [
    {
      "id": "photo_1",
      "type": "photo",
      "x": 100,
      "y": 120,
      "width": 420,
      "height": 520
    }
  ]
}
```

### Rendering Strategy

1. React renders the template DOM.
2. Captured images populate photo slots.
3. The final DOM is exported with `html2canvas`.

No custom canvas rendering engine is required.

## 9. Template Editor

### Editor Features

- Drag & resize
- Rotate
- Snap to grid
- Layers
- Undo/redo
- Text editing
- Stickers & overlays

### Libraries Used

| Feature          | Library     |
| ---------------- | ----------- |
| Resize & Drag    | `react-rnd` |
| Layer sorting    | `dnd-kit`   |
| State management | Zustand     |

## 10. Camera Implementation

We use the browser **MediaDevices API**.

### Detect Cameras

```javascript
const devices = await navigator.mediaDevices.enumerateDevices();
const videoDevices = devices.filter((d) => d.kind === "videoinput");
```

### Open Camera

```javascript
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
});
```

## 11. Session Flow

State machine:

```txt
IDLE
 → COUNTDOWN
 → CAPTURE
 → PREVIEW
 → EDIT
 → EXPORT
 → PRINT
```

Managed using Zustand.

## 12. Live Preview System

The booth preview combines:

- `<video>` camera feed
- HTML overlay template

Users see themselves directly inside the template before capture.

## 13. Render Engine

### Export Process

```javascript
const canvas = await html2canvas(renderRoot, {
  scale: 2,
  useCORS: true,
  backgroundColor: "#ffffff",
});
```

Then:

- convert canvas to blob
- upload to Supabase Storage
- generate final image URL

## 14. Printing

### MVP

Uses:

```javascript
window.print();
```

### Future

Silent printing through local bridge software.

## 15. QR Sharing

Generated share URL:

```txt
https://app.example.com/share/{token}
```

Users can:

- download image
- share socially
- scan QR code

## 16. Storage Structure

```txt
captures/
renders/
templates/
stickers/
overlays/
thumbnails/
```

Managed entirely through Supabase Storage.

## 17. Dashboards

### Tenant Dashboard

- booths
- templates
- analytics
- sessions

### Superadmin Dashboard

- all tenants
- billing
- platform analytics
- global assets

## 18. Responsive Strategy

### Booth App

Fixed kiosk layout.

### Admin + Editor

Responsive Tailwind layouts.

### Share Page

Mobile-first.

## 19. Offline Support

PWA support:

- service worker
- IndexedDB caching
- offline captures
- background sync

## 20. Development Phases

### Phase 1

- React + Vite setup
- Supabase auth
- Webcam capture
- Static templates
- html2canvas export

### Phase 2

- Template editor
- Multi-shot flow
- Drag/drop system

### Phase 3

- SaaS dashboards
- Analytics
- Real-time monitoring
- Superadmin tools

### Phase 4

- DSLR integration
- GIF/Boomerang
- AI background removal
- Silent printing

## 21. Recommended Build Order

| Week | Focus                      |
| ---- | -------------------------- |
| 1    | React setup, auth, tenants |
| 2    | Camera + capture flow      |
| 3    | Template rendering         |
| 4    | Template editor            |
| 5    | Sharing + printing         |
| 6    | Tenant dashboard           |
| 7    | Superadmin dashboard       |

## 22. Final Architecture Summary

| Layer         | Technology               |
| ------------- | ------------------------ |
| Frontend      | React, Tailwind, Zustand |
| Backend       | Supabase                 |
| Rendering     | HTML/CSS + html2canvas   |
| Multi-tenancy | Supabase RLS             |
| State         | Zustand                  |
| Drag/Resize   | react-rnd                |
| Sorting       | dnd-kit                  |

### Final Philosophy

The key architectural idea is simple:

> **The template is the webpage itself.**

Instead of building a complicated canvas rendering engine, the browser already provides:

- layout
- styling
- compositing
- responsiveness
- rendering

React simply controls and edits the DOM, while `html2canvas` converts it into a printable/exportable image.

---

_End of Updated Implementation Plan_
