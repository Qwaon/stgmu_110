# Frontend Redesign — Sonic PS Club Admin
**Date:** 2026-04-15

## Direction
Outlined / Wireframe aesthetic. Pure black background, no fills — everything through borders. Three status colors (green/red/yellow) used only on outlines and dots, never as fills. Font: Outfit (geometric grotesque). Monochrome base with white typography.

## Color System

```
--bg:           #0a0a0a
--border:       rgba(255,255,255,0.10)   /* neutral borders */
--border-hover: rgba(255,255,255,0.20)
--text:         #ffffff
--text-muted:   #666666
--accent-line:  #ffffff                  /* active tab underline, focus ring */

/* Status — borders and dots only, never fills */
--status-free:   #22c55e
--status-busy:   #ef4444
--status-booked: #eab308
```

## Typography
- **Font:** Outfit (Google Fonts), weights 400/500/600/700
- Replace Inter everywhere
- Timer and prices: Outfit 400, `letter-spacing: 0.05em`, tabular nums
- No system fonts fallback after Outfit loads

## Layout & Components

### Header (dashboard/layout.tsx + owner/layout.tsx)
- Black bar, 1px bottom border (`var(--border)`)
- Left: SVG logo placeholder (user will insert) + "SONIC" in Outfit 700, uppercase, tracked wide. Below: club name or "Owner Panel" in muted text
- Right: email muted + "Выйти" link
- No background color (transparent over --bg)

### Navigation tabs
- No background. Tab text in muted color. Active tab: white text + 1px white underline (not 2px)
- Hover: white text, no underline
- Clean, no filled active state

### Room Card (RoomCard.tsx)
- 1px border, color = status color (green/red/yellow)
- Background: #0a0a0a (same as page — card is "cut out" by border only)
- Top row: room name (Outfit 600) + status dot (4px circle, status color) + status label
- VIP badge: outlined, 1px border white/20, no fill
- Upcoming booking: outlined yellow badge, no fill
- Session end warning: outlined orange, no fill
- Buttons: outlined (1px border), no fill. "Начать" — white border+text. "Завершить" — red border+text. "Заказ" — muted border+text
- Replace all emoji (📅, ⚠, ▶, ■, +) with inline SVG icons

### Stats bar (RoomGrid.tsx)
- Four outlined boxes, 1px border. Values large Outfit 700, color = status color. Label muted below
- "Сводка смены" button: outlined, no fill

### Modals (StartSessionModal, EndSessionModal, SessionSheet, AddOrderModal, CreateBookingModal, ShiftSummaryModal, SessionExpiredDialog, UndoToast, TariffSettings)
- Background: #0a0a0a, 1px border var(--border)
- No rounded-2xl everywhere — use rounded-lg (8px) for consistency
- Inputs: 1px border, transparent background, white text. Focus: white border
- Buttons: outlined pattern, no filled primaries except destructive confirm (red outline+text)
- Close button: × replaced with SVG X icon

### Login page
- Centered. Logo SVG placeholder + "SONIC" large. Form outlined card
- Submit button: white border + white text (outlined, not filled)

### Owner pages (ClubsOverview, OwnerAnalytics)
- Same outlined system. Charts keep their data colors but axes/grid muted

## SVG Icon Set (replacing all emoji)
Replace these emoji with SVG throughout:
- 📅 → calendar SVG (BookingBadge)
- ⚠ → triangle-alert SVG
- ▶ → play SVG (start button)
- ■ → square-stop SVG (end button)
- 📋 → list SVG (shift summary)
- × → X SVG (close buttons)

## Logo Placement
In [src/app/dashboard/layout.tsx](../../src/app/dashboard/layout.tsx) and [src/app/owner/layout.tsx](../../src/app/owner/layout.tsx):
```tsx
{/* Replace this div with user's SVG: */}
<div className="w-7 h-7 flex-shrink-0">
  {/* INSERT_LOGO_SVG */}
</div>
<span className="text-white font-bold text-sm tracking-[0.12em] uppercase">Sonic</span>
```
Same placeholder in login page.

## Files to Change
1. `src/app/globals.css` — color vars, font import
2. `src/app/dashboard/layout.tsx` — header + nav
3. `src/app/owner/layout.tsx` — header + nav
4. `src/app/login/page.tsx` — login form
5. `src/components/RoomCard.tsx` — card redesign + SVG icons
6. `src/components/RoomGrid.tsx` — stats bar + summary button
7. `src/components/SessionSheet.tsx` — modal redesign
8. `src/components/StartSessionModal.tsx`
9. `src/components/EndSessionModal.tsx`
10. `src/components/AddOrderModal.tsx`
11. `src/components/CreateBookingModal.tsx`
12. `src/components/ShiftSummaryModal.tsx`
13. `src/components/SessionExpiredDialog.tsx`
14. `src/components/UndoToast.tsx`
15. `src/components/TariffSettings.tsx`
16. `src/components/owner/ClubsOverview.tsx`
17. `src/components/owner/OwnerAnalytics.tsx`
18. `src/app/dashboard/menu/page.tsx`
19. `src/app/dashboard/tariffs/page.tsx`
20. `src/app/dashboard/bookings/page.tsx`
