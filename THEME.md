# Photobooth OS - Theme & Design System

This application uses a bold, **neo-brutalist / bento-grid** design language. When adding new components, pages, or features, AI agents **MUST** follow these guidelines to maintain a consistent aesthetic.

## 1. Core Philosophy
- **Bold & Structured:** Heavy borders, solid high-contrast shadows, and stark typography.
- **Utilitarian & Playful:** A mix of strict grid layouts (bento box) and vibrant accent colors.
- **Tactile Interactions:** Buttons should physically "press down" (translate) and lose their shadow when clicked.

## 2. Color Palette
- **Backgrounds:** `bg-slate-50` (Main), `bg-white` (Cards/Components), `bg-slate-100` (Hover/Secondary).
- **Text:** `text-slate-900` (Primary), `text-slate-500` (Secondary/Subtle).
- **Primary Accent:** `blue-600` (Main actions, primary buttons, highlights).
- **Secondary Accents:** `yellow-400` (Warnings, lively accents), `emerald-400` / `emerald-700` (Success, active states), `red-500` / `red-600` (Destructive).
- **Borders & Shadows:** `slate-950` (Almost black, `#020617` via rgba `0,0,0,1`).

## 3. Typography
- **Font Family:** `Inter` (sans-serif).
- **Headings & Titles:** `font-black`, `uppercase`, `tracking-tight` (e.g., `text-3xl font-black uppercase tracking-tight text-slate-950`).
- **Labels & Microcopy:** Small, bold, and spaced out (e.g., `text-[10px] font-black uppercase tracking-widest text-slate-500`).
- **Body:** Standard weights, `font-bold` used frequently for emphasis.

## 4. UI Components

### Containers & Cards (Bento Boxes)
- **Base Style:** `bg-white border-2 border-slate-950 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
- **Variations:** 
  - Thicker borders for emphasis: `border-4 border-slate-950 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`
  - Colored cards: `bg-yellow-400` or `bg-blue-600 border-2 border-slate-950 ...`

### Buttons
- **Primary Blue Button:**
  ```html
  <button class="bg-blue-600 text-white font-black uppercase tracking-widest px-4 py-3 border-2 border-slate-950 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-500 active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all">
    Action
  </button>
  ```
- **Secondary / White Button:**
  ```html
  <button class="bg-white text-slate-950 font-black uppercase tracking-widest px-4 py-3 border-2 border-slate-950 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all">
    Secondary
  </button>
  ```

### Inputs & Forms
- **Input Fields:**
  ```html
  <input class="w-full border-2 border-slate-950 p-2 font-bold focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-y-[1px] focus:translate-x-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all rounded" />
  ```
- **Labels:** `text-[10px] font-black tracking-widest uppercase text-slate-500 mb-2 block`

### Badges & Status Indicators
- **Live / Active Badge:**
  ```html
  <span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 border-2 border-emerald-300 rounded text-[10px] font-black tracking-widest uppercase">
    LIVE STATUS
  </span>
  ```

### Icons
- Use `lucide-react` icons.
- Small icon wrappers: `w-8 h-8 bg-blue-600 border-2 border-slate-950 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center`

## 5. Layout Structure
- Use Tailwind Grid `grid-cols-4` or `grid-cols-6` with standard gaps (`gap-4`, `gap-6`) to create the Bento aesthetic.
- Wrap main container views in `flex flex-col h-screen overflow-hidden border-8 border-slate-950` to frame the entire application with a heavy stroke.

## 6. Interaction Summary
Whenever an element is "clickable" (Buttons, Cards acting as links, Icon buttons), append this interaction sequence:
`hover:bg-{lighter-color} active:translate-y-[Xpx] active:translate-x-[Xpx] active:shadow-none transition-all`
*Note: Make sure the translate matches the depth of the initial shadow (e.g. `shadow-[4px_...]` should have `active:translate-y-[4px] active:translate-x-[4px]`).*
