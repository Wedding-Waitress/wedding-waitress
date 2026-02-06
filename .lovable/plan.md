
# Mobile-Friendly Wedding Waitress Implementation Plan

## Overview

This plan transforms Wedding Waitress into a fully mobile-friendly application. The current codebase already has some responsive foundations (breakpoints, `useIsMobile` hook, touch-target CSS classes), but many components need optimization for mobile screens.

## Current State Analysis

**What's Working:**
- Basic responsive breakpoints (xs: 375px, sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- `useIsMobile()` hook (768px breakpoint)
- Mobile sidebar using Sheet component (slide-out drawer)
- Touch-target CSS classes defined
- Public pages (GuestLookup, KioskView) have decent mobile layouts

**What Needs Improvement:**
- Dashboard content area overflows on mobile
- Tables/cards don't stack properly on small screens
- Complex data tables (GuestListTable) are unusable on mobile
- Modals (AddGuestModal, EventCreateModal, EventEditModal) overflow screens
- StatsBar cramped on mobile
- Forms have small touch targets
- Navigation labels truncated
- Drag-and-drop interactions need touch optimization

---

## Phase 1: Core Layout & Navigation Fixes

### 1.1 Dashboard Layout Optimization
**File: `src/pages/Dashboard.tsx`**
- Ensure main content area has proper mobile padding
- Add horizontal scroll prevention
- Improve spacing between sections on mobile

### 1.2 Dashboard Header Enhancement  
**File: `src/components/Dashboard/DashboardHeader.tsx`**
- Add safe-area-inset support for notched devices
- Improve hamburger menu button styling and hit area

### 1.3 Sidebar Mobile Improvements
**File: `src/components/Dashboard/AppSidebar.tsx`**
- Increase touch targets for menu items
- Add visual feedback for active states
- Improve scrollability on small screens

---

## Phase 2: Stats Bar & Data Display

### 2.1 StatsBar Mobile Layout
**File: `src/components/Dashboard/StatsBar.tsx`**
- Change to horizontal scrollable row on mobile (2 rows of 5)
- Add visual scroll indicators
- Increase icon and text sizes for readability

### 2.2 Table Cards Grid
**File: `src/pages/Dashboard.tsx` (Tables section)**
- Single column on mobile (<640px)
- Two columns on tablet (640-1024px)
- Add swipe gestures hint for table navigation

---

## Phase 3: Data Tables Mobile Transformation

### 3.1 GuestListTable Mobile View
**File: `src/components/Dashboard/GuestListTable.tsx`**

This is the most complex transformation. On mobile, transform the table into:
- Card-based layout instead of traditional table
- Each guest = one stacked card showing key info
- Swipe actions for edit/delete
- Collapsible detail sections
- Search and filter remain at top

**Mobile Card Structure:**
```
┌─────────────────────────────┐
│ 👤 First Last    [RSVP Badge]│
│ 🍽️ Table 5, Seat 3          │
│ 🥗 Vegetarian               │
│ [Edit] [Delete]             │
└─────────────────────────────┘
```

### 3.2 EventsTable Mobile View  
**File: `src/components/Dashboard/EventsTable.tsx`**
- Transform to card layout on mobile
- Show event name, date, venue in stacked format
- Action buttons full-width on mobile

---

## Phase 4: Modal Responsiveness

### 4.1 AddGuestModal Mobile
**File: `src/components/Dashboard/AddGuestModal.tsx`**
- Full-screen modal on mobile
- Single-column form layout
- Larger input fields (h-12 minimum)
- Fixed bottom action bar
- Keyboard-aware scrolling

### 4.2 EventCreateModal Mobile
**File: `src/components/Dashboard/EventCreateModal.tsx`**
- Full-screen on mobile
- Accordion sections instead of side-by-side
- Step-by-step flow option

### 4.3 EventEditModal Mobile
**File: `src/components/Dashboard/EventEditModal.tsx`**
- Same treatment as EventCreateModal

### 4.4 CreateTableModal Mobile
**File: `src/components/Dashboard/CreateTableModal.tsx`**
- Simple adjustments for full-width inputs
- Larger touch targets

---

## Phase 5: Feature Page Optimizations

### 5.1 My Events Page
**File: `src/components/Dashboard/MyEventsPage.tsx`**
- Countdown circles scale responsively (already partially done)
- Ceremony/Reception boxes stack vertically on mobile
- Reduce min-width constraints

### 5.2 QR Code Page
**File: `src/components/Dashboard/QRCode/QRCodeSeatingChart.tsx`**
- QR code scales to fit screen
- Customization controls in collapsible accordion
- Download buttons full-width on mobile

### 5.3 Place Cards Page
**File: `src/components/Dashboard/PlaceCards/PlaceCardsPage.tsx`**
- Preview/customizer split into tabbed interface on mobile
- Export controls simplified

### 5.4 DJ-MC Questionnaire
**Files in `src/components/Dashboard/DJMCQuestionnaire/`**
- Section rows stack vertically
- Column headers hidden on mobile (labels inline)
- Drag handles larger for touch

### 5.5 Floor Plan Page
**File: `src/components/Dashboard/FloorPlan/FloorPlanPage.tsx`**
- Tools panel collapses to bottom sheet
- Pinch-to-zoom for canvas
- Touch-friendly object manipulation

---

## Phase 6: Public-Facing Pages

### 6.1 Landing Page
**File: `src/pages/Landing.tsx`**
- Hero text sizing adjustments
- Sign-up form improvements
- Feature cards stack properly (already partially working)

### 6.2 Guest Lookup (QR Destination)
**File: `src/pages/GuestLookup.tsx`**
- Already reasonably mobile-friendly
- Minor spacing adjustments
- Ensure modals are full-screen on mobile

### 6.3 Kiosk View
**File: `src/pages/KioskView.tsx`**
- Already optimized for touch screens
- Minor padding adjustments

---

## Phase 7: Global CSS & Touch Enhancements

### 7.1 Global Mobile Styles
**File: `src/index.css`**
Add/enhance:
```css
/* Safe area padding for notched devices */
.safe-area-top { padding-top: env(safe-area-inset-top); }
.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }

/* Mobile-first scrolling */
.mobile-scroll-container {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

/* Prevent horizontal overflow */
.mobile-contain {
  max-width: 100vw;
  overflow-x: hidden;
}
```

### 7.2 Touch Target Enforcement
- Ensure all interactive elements have minimum 44×44px touch targets
- Add visible focus states for accessibility

---

## Phase 8: Component Library Updates

### 8.1 Dialog/Modal Component
**File: `src/components/ui/dialog.tsx`**
- Add `fullScreenOnMobile` variant
- Bottom sheet alternative for simple modals

### 8.2 Select Component
**File: `src/components/ui/select.tsx`**
- Larger dropdown items on mobile
- Full-width trigger on mobile

### 8.3 Table Component
**File: `src/components/ui/table.tsx`**
- Add horizontal scroll wrapper
- Sticky first column option

---

## Implementation Priority Order

1. **Phase 7** (Global CSS) - Foundation for all other changes
2. **Phase 1** (Layout/Navigation) - Core UX structure
3. **Phase 4** (Modals) - Most impactful user-facing fix
4. **Phase 3** (Data Tables) - Critical for guest management
5. **Phase 2** (Stats Bar) - Visual polish
6. **Phase 5** (Feature Pages) - Complete feature optimization
7. **Phase 6** (Public Pages) - Minor adjustments
8. **Phase 8** (Component Library) - Systematic improvements

---

## Technical Notes

### Files That Will Be Modified:

**Core Layout (6 files):**
- `src/pages/Dashboard.tsx`
- `src/components/Dashboard/DashboardHeader.tsx`
- `src/components/Dashboard/AppSidebar.tsx`
- `src/components/Dashboard/StatsBar.tsx`
- `src/index.css`
- `src/components/ui/dialog.tsx`

**Data Tables (2 files):**
- `src/components/Dashboard/GuestListTable.tsx`
- `src/components/Dashboard/EventsTable.tsx`

**Modals (4 files):**
- `src/components/Dashboard/AddGuestModal.tsx`
- `src/components/Dashboard/EventCreateModal.tsx`
- `src/components/Dashboard/EventEditModal.tsx`
- `src/components/Dashboard/CreateTableModal.tsx`

**Feature Pages (5+ files):**
- `src/components/Dashboard/MyEventsPage.tsx`
- `src/components/Dashboard/QRCode/QRCodeSeatingChart.tsx`
- `src/components/Dashboard/PlaceCards/PlaceCardsPage.tsx`
- `src/components/Dashboard/DJMCQuestionnaire/*.tsx`
- `src/components/Dashboard/FloorPlan/*.tsx`

**Public Pages (2 files):**
- `src/pages/Landing.tsx`
- `src/pages/GuestLookup.tsx`

### Constraints & Locked Files:
The following files are marked as **LOCKED** and require careful handling to preserve existing functionality while adding mobile responsiveness:
- `GuestListTable.tsx` - Add mobile view without changing desktop logic
- `AddGuestModal.tsx` - Add responsive classes without changing form logic
- `MyEventsPage.tsx` - Add responsive classes without changing countdown logic
- `TableCard.tsx` - Preserve drag-and-drop functionality

### Testing Checkpoints:
After each phase, verify:
- No horizontal scrolling on mobile
- All buttons/links tappable (44px minimum)
- Forms usable with mobile keyboard
- Modals don't overflow screen
- Content readable without zooming
- Drag-and-drop still works on desktop

---

## Expected Outcome

After implementation:
- Dashboard fully usable on phones (375px+)
- All modals display correctly on mobile
- Guest management possible on mobile devices
- No functionality regression on desktop
- Improved touch interactions throughout
- PWA-ready mobile experience
