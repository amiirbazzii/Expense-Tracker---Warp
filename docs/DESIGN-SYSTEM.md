# Spendly Design System

## 1. Core Rules
- **Single Source of Truth**: All colors and theme tokens are defined exclusively in `src/styles/tokens.css`.
- **Token Utilities Only**: Components must only use token-backed Tailwind utilities (e.g., `bg-surface-page`, `text-ink-primary`, `border-border-default`).
- **No Raw Colors**: No raw hex values (`#fff`), no `rgba(...)`, and no arbitrary Tailwind values (such as `bg-[#F8F8F8]`).
- **No Stock Tailwind Palette Utilities**: Do not use stock Tailwind color classes (e.g., `text-gray-500`, `border-gray-200`, `bg-neutral-100`). Stock palette classes bypass CSS custom properties and cannot adapt to dark mode or theme switches.
- **Naming Convention**: Text colors use `--ink-*` (utility: `text-ink-*`), NOT `--text-*`, because Tailwind v4 reserves `--text-*` for font-size utilities (`text-sm`, `text-xl`).

---

## 2. Token Definitions & Tailwind Utility Mapping

All tokens are declared as CSS variables in `:root` and mirrored for dark mode in `@media (prefers-color-scheme: dark)` and `[data-theme="dark"]`. A `[data-theme="light"]` block is also provided for explicit theme overrides.

### Surfaces
| CSS Token | Light Value | Dark Value | Tailwind Utility |
|---|---|---|---|
| `--surface-page` | `#FFFFFF` | `#0A0A0A` | `bg-surface-page` |
| `--surface-app` | `#F8F8F8` | `#101010` | `bg-surface-app` |
| `--surface-raised` | `#FFFFFF` | `#1A1A1A` | `bg-surface-raised` |
| `--surface-field` | `#F8F8F8` | `#1A1A1A` | `bg-surface-field` |
| `--surface-sunken` | `#F4F4F4` | `#141414` | `bg-surface-sunken` |
| `--surface-hover` | `#E8E8E8` | `#262626` | `bg-surface-hover` |
| `--surface-active` | `#DCDCDC` | `#333333` | `bg-surface-active` |
| `--surface-overlay` | `rgba(0,0,0,0.80)` | `rgba(0,0,0,0.85)` | `bg-surface-overlay` |

### Borders
| CSS Token | Light Value | Dark Value | Tailwind Utility |
|---|---|---|---|
| `--border-subtle` | `#E4E4E4` | `#2A2A2A` | `border-border-subtle` |
| `--border-default` | `#D3D3D3` | `#3A3A3A` | `border-border-default` |
| `--border-strong` | `#B1B1B1` | `#5A5A5A` | `border-border-strong` |

### Typography (Ink)
| CSS Token | Light Value | Dark Value | Tailwind Utility |
|---|---|---|---|
| `--ink-primary` | `#000000` | `#EDEDED` | `text-ink-primary` |
| `--ink-secondary` | `#707070` | `#A0A0A0` | `text-ink-secondary` |
| `--ink-tertiary` | `#9CA3AF` | `#6E6E6E` | `text-ink-tertiary` |
| `--ink-disabled` | `#A7A7A7` | `#565656` | `text-ink-disabled` |
| `--ink-inverse` | `#FFFFFF` | `#0A0A0A` | `text-ink-inverse` |
| `--ink-link` | `#3B6FD4` | `#6E9BEE` | `text-ink-link` |
| `--ink-link-hover` | `#2F59AA` | `#8FB4F2` | `text-ink-link-hover` |

### Accent
| CSS Token | Light Value | Dark Value | Tailwind Utility |
|---|---|---|---|
| `--accent` | `#000000` | `#FFFFFF` | `bg-accent`, `text-accent` |
| `--accent-foreground` | `#FFFFFF` | `#0A0A0A` | `text-accent-foreground` |
| `--accent-hover` | `#1A1A1A` | `#E6E6E6` | `bg-accent-hover` |
| `--accent-active` | `#333333` | `#CCCCCC` | `bg-accent-active` |

### Danger / Error
| CSS Token | Light Value | Dark Value | Tailwind Utility |
|---|---|---|---|
| `--danger-surface` | `#E99C9C` | `#7A2F2F` | `bg-danger-surface` |
| `--danger-border` | `#C15959` | `#C15959` | `border-danger-border` |
| `--danger-active` | `#D98C8C` | `#8F3838` | `bg-danger-active` |
| `--danger-active-border` | `#B14F4F` | `#B14F4F` | `border-danger-active-border` |
| `--danger-text` | `#D02E2E` | `#F08A8A` | `text-danger-text` |

### Sync Status (Theme-agnostic)
| CSS Token | Light Value | Dark Value | Tailwind Utility |
|---|---|---|---|
| `--sync-synced` | `#10B981` | `#10B981` | `bg-sync-synced`, `text-sync-synced` |
| `--sync-syncing` | `#F59E0B` | `#F59E0B` | `bg-sync-syncing`, `text-sync-syncing` |
| `--sync-offline` | `#9CA3AF` | `#9CA3AF` | `bg-sync-offline`, `text-sync-offline` |
| `--sync-attention` | `#EF4444` | `#EF4444` | `bg-sync-attention`, `text-sync-attention` |

### Radius & Shadows
| CSS Token | Light Value | Dark Value | Tailwind Utility |
|---|---|---|---|
| `--radius-field` | `10px` | `10px` | `rounded-field` |
| `--shadow-neumo` | `0px 2px 6px 0px rgba(0,0,0,0.15), 0px 2px 2px 0px rgba(255,255,255,0.5) inset` | `0 1px 2px rgba(0,0,0,0.6)` | `shadow-neumo` |
| `--shadow-neumo-hover` | `0px 4px 10px 0px rgba(0,0,0,0.17), 0px 2px 2px 0px rgba(255,255,255,0.5) inset` | `0 1px 2px rgba(0,0,0,0.6)` | `shadow-neumo-hover` |
| `--shadow-neumo-active` | `0px 1px 3px 0px rgba(0,0,0,0.15), 0px 0px 5px 0px rgba(101,101,101,0.5) inset` | `0 1px 2px rgba(0,0,0,0.6)` | `shadow-neumo-active` |
| `--shadow-raised` | `0 10px 30px rgba(0,0,0,0.10)` | `0 10px 30px rgba(0,0,0,0.10)` | `shadow-raised` |
| `--shadow-focus-field` | `inset 0 0 0 1px var(--accent)` | `inset 0 0 0 1px var(--accent)` | `shadow-focus-field` |

---

## 3. Deliberate Exceptions
1. **Canvas Charts**: `CategoryBreakdownChart` and `DailySpendingChart` paint directly onto HTML5 `<canvas>` via Chart.js, requiring JavaScript hex strings. Their palette is managed as constants in `src/lib/design/chartColors.ts` (`CHART_COLORS`, `CHART_AXIS`, `CHART_MUTED`).
2. **PWA Browser Chrome**: `themeColor` in `src/app/layout.tsx` configures OS browser chrome / status bar metadata and remains a literal hex.

---

## 4. Migration Status
- **Step 1 (Foundation)**: Done. Token foundation declared in `src/styles/tokens.css`, Tailwind `@theme inline` utilities mapped, canvas chart colors extracted to `src/lib/design/chartColors.ts`, and legacy `--background` / `--foreground` aliases established in `src/app/globals.css`.
- **Step 2**: The 8 core primitives + dashboard charts.
- **Step 3**: Remaining raw-hex values and stock palette utilities across all 31 components.
