# MY EVENTS, TABLES & GUEST LIST - PRODUCTION SPECIFICATIONS
⚠️ **LOCKED FOR PRODUCTION** - DO NOT MODIFY WITHOUT OWNER APPROVAL ⚠️

**Status:** Production-Ready  
**Last Locked:** 2025-11-12  
**Owner:** Wedding Waitress Development Team

---

## TABLE OF CONTENTS
1. [Overview](#overview)
2. [My Events Page Specifications](#1-my-events-page-specifications)
3. [Tables Page Specifications](#2-tables-page-specifications)
4. [Guest List Page Specifications](#3-guest-list-page-specifications)
5. [Locked Components](#4-locked-components---production-warning)
6. [Critical Patterns](#5-critical-patterns-to-preserve)
7. [Database Dependencies](#6-database-dependencies)
8. [Testing Checklist](#7-testing-checklist)
9. [Change Log](#8-change-log)
10. [Consequences of Unauthorized Changes](#consequences-of-unauthorized-changes)

---

## OVERVIEW

This document contains the complete specifications for three core production-ready features of Wedding Waitress:
- **My Events Page** - Event countdown and management
- **Tables Page** - Table creation and guest assignment
- **Guest List Page** - Guest management with real-time sync

These features are LOCKED and COMPLETE. Any changes require explicit owner approval.

**Total Protected Code:** ~5,000+ lines across 13 files  
**Protection Level:** Same as Full Seating Chart

---

## 1. MY EVENTS PAGE SPECIFICATIONS

### Component Files
- `MyEventsPage.tsx` (402 lines) - Main countdown page
- `EventsTable.tsx` (397 lines) - Events table with inline edit/delete
- `EventCreateModal.tsx` (238 lines) - Event creation form
- `EventEditModal.tsx` (237 lines) - Event editing form
- `DeleteConfirmationModal.tsx` (89 lines) - Event deletion confirmation

### Core Features

#### 1.1 Countdown Timer System
**Real-Time Countdown Display**
- **4 Circular Progress Indicators:** Months, Weeks, Hours, Seconds
- **Update Frequency:** Every 1 second (1000ms interval)
- **SVG-Based Progress Rings:** 
  - Base ring: `stroke="hsl(var(--muted))"`
  - Progress ring: `stroke="hsl(var(--primary))"`
  - Circumference: `2 * Math.PI * 45` (radius 45)
  - Stroke width: 6px

**Event State Detection**
- `upcoming`: Before event start time
- `in_progress`: Between start and finish time
- `finished`: After finish time
- `no_event`: No event selected

**Progress Calculation Logic**
```typescript
// Months: Day progress within current month
const dayOfMonth = now.getDate();
const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
progress = (dayOfMonth / daysInMonth) * 100;

// Weeks: Day progress within current week
const dayOfWeek = now.getDay();
progress = (dayOfWeek / 7) * 100;

// Hours: Minutes+seconds progress within current hour
const minutes = now.getMinutes();
const seconds = now.getSeconds();
progress = ((minutes * 60 + seconds) / 3600) * 100;

// Seconds: Seconds progress within current minute
progress = (now.getSeconds() / 60) * 100;
```

#### 1.2 Event Management Table
**Table Columns** (in order)
1. Countdown - Radio button for countdown selection
2. Event Name - With "Full" badge if at capacity
3. Event Date - Format: "20th, September 2025"
4. Venue
5. Start Time - 12-hour format with AM/PM
6. Finish Time - 12-hour format with AM/PM
7. Guest Limit - Shows: `{guests_count}/{guest_limit}`
8. RSVP Deadline - Format: "DD/MM/YYYY"
9. Created Date - Format: "DD/MM/YYYY"
10. Expiry Date - Format: "DD/MM/YYYY" (12 months from creation)
11. Actions - Edit & Delete buttons

**Radio Selection Behavior**
- **Green Checkmark:** Selected countdown event
- **Class:** `data-[state=checked]:border-green-500 data-[state=checked]:text-green-500`
- **Selected Row:** Green left border (`border-l-4 border-l-[#22c55e]`) + light background (`bg-primary/5`)
- **At Capacity:** Green highlight (`bg-green-500/10`)

**Event Type Toggle (NEW DESIGN - 2025-11-12)**
```typescript
<div className="flex items-center gap-1 bg-gray-100 border-2 border-gray-300 rounded-full p-1">
  <button className={formData.event_type === 'seated' 
    ? 'bg-green-500 text-white shadow-md' 
    : 'bg-transparent text-gray-500 hover:bg-gray-200'}>
    Seated Event
  </button>
  <button className={formData.event_type === 'cocktail' 
    ? 'bg-green-500 text-white shadow-md' 
    : 'bg-transparent text-gray-500 hover:bg-gray-200'}>
    Cocktail/Stand-up
  </button>
</div>
```
- **Container:** Gray background, rounded-full, border-2
- **Selected:** Green-500 background, white text, shadow
- **Unselected:** Transparent background, gray text, hover effect

**Purple Footer Row**
- Matches table header background
- Empty row for visual consistency
- Class: `bg-primary hover:bg-primary border-t border-card-border rounded-b-2xl`

#### 1.3 Date Formatting Rules
- **Event Date:** `formatEventDate()` → "20th, September 2025"
  - Day with ordinal suffix (st, nd, rd, th)
  - Comma after day
  - Full month name and 4-digit year
- **Created/Expiry:** `formatLocalDate()` → "DD/MM/YYYY"
- **Time:** `formatDisplayTime()` → "12:30 PM" (12-hour format)

#### 1.4 Data Flow & State Management
**Session Persistence**
```typescript
// Store in sessionStorage (GLOBAL - session-scoped)
sessionStorage.setItem('ww:session_selected_event', eventId);

// Load on mount (ONCE ONLY - critical fix 2025-11-12)
const hasInitialized = useRef(false);
useEffect(() => {
  if (hasInitialized.current || events.length === 0 || selectedEventId !== null) {
    return;
  }
  const savedEventId = sessionStorage.getItem('ww:session_selected_event');
  if (savedEventId && events.find(e => e.id === savedEventId)) {
    setGlobalSelectedEventId(savedEventId);
    hasInitialized.current = true;
  }
}, [events.length, selectedEventId]);
```

**Real-Time Profile Sync**
```typescript
// Subscribe to profile changes for countdown selection
const channel = supabase.channel('profile-changes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'profiles',
    filter: `id=eq.${profile.id}`
  }, payload => {
    const newDisplayEventId = payload.new?.display_countdown_event_id;
    if (newDisplayEventId && eventMap[newDisplayEventId]) {
      setSelectedEvent(eventMap[newDisplayEventId]);
      setActiveEventId(newDisplayEventId);
    }
  })
  .subscribe();
```

**Countdown Selection Handler**
```typescript
const handleCountdownEventSelect = (eventId: string) => {
  // Update state immediately (NO AWAIT - prevents blocking)
  setSelectedEvent(eventMap[eventId]);
  setActiveEventId(eventId);
  
  // Persist in background without blocking UI
  updateDisplayCountdownEvent(eventId).catch(console.error);
};
```

---

## 2. TABLES PAGE SPECIFICATIONS

### Component Files
- `TableCard.tsx` (418 lines) - Individual table card with drag-drop
- `CreateTableModal.tsx` (416 lines) - Table creation/editing modal
- `src/hooks/useTables.ts` (261 lines) - Table data management
- `src/hooks/useRealtimeTables.ts` (61 lines) - Real-time table capacities

### Core Features

#### 2.1 Table Cards Display
**Card Layout**
- **Header:** Table name/number
- **Capacity Bar:** Progress bar with percentage badge
- **Guest Chips:** Draggable badges with names
- **Actions:** Edit & Delete buttons (tooltips)

**Capacity Visualization**
```typescript
const getCapacityColor = () => {
  if (table.guest_count === 0) return 'bg-gray-400';       // 0%: Gray
  if (progressPercentage >= 75) return 'bg-purple-500';    // 75-99%: Purple
  if (progressPercentage >= 51) return 'bg-blue-500';      // 51-74%: Blue
  if (progressPercentage >= 26) return 'bg-yellow-500';    // 26-50%: Yellow
  return 'bg-orange-500';                                  // 1-25%: Orange
};

const getCapacityStatus = () => {
  if (table.guest_count === 0) return 'Empty';
  if (progressPercentage >= 75) return 'Almost Full';
  if (progressPercentage >= 51) return 'Good Capacity';
  if (progressPercentage >= 26) return 'Half Full';
  return 'Needs More Guests';
};
```

**Full Table Banner**
```typescript
{isFull && (
  <div className="bg-green-500 text-white px-3 py-1.5 rounded-md">
    Full Table — {table.guest_count} guests
  </div>
)}

// Over capacity
{table.guest_count > table.limit_seats && (
  <div className="bg-red-500 text-white px-3 py-1.5 rounded-md">
    Over by +{table.guest_count - table.limit_seats}
  </div>
)}
```

**Capacity Tooltip**
```typescript
<Tooltip>
  <TooltipTrigger>
    <div className="w-8 h-8 rounded-full bg-primary/10...">
      {progressPercentage.toFixed(0)}%
    </div>
  </TooltipTrigger>
  <TooltipContent>
    <div className="text-xs space-y-1">
      <p>Current: {table.guest_count} guests</p>
      <p>Limit: {table.limit_seats} seats</p>
      <p>Available: {Math.max(0, table.limit_seats - table.guest_count)}</p>
    </div>
  </TooltipContent>
</Tooltip>
```

#### 2.2 Drag & Drop Guest Assignment
**Drag Start**
```typescript
const handleDragStart = (e: React.DragEvent, guest: Guest) => {
  const dragData = {
    guestId: guest.id,
    sourceTableId: table.id,
    guestName: `${guest.first_name} ${guest.last_name}`
  };
  e.dataTransfer.setData('application/json', JSON.stringify(dragData));
  e.dataTransfer.effectAllowed = 'move';
};
```

**Drop Handler**
```typescript
const handleDrop = async (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragOver(false);
  
  const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
  
  // Prevent dropping on same table
  if (dragData.sourceTableId === table.id) {
    return;
  }
  
  // Call parent handler (validates capacity)
  const success = await onGuestMove(
    dragData.guestId,
    dragData.sourceTableId,
    table.id,
    dragData.guestName
  );
};
```

**Visual Feedback**
```typescript
// Drag over state
<Card className={cn(
  "ww-box p-4",
  isDragOver && "border-2 border-blue-500 bg-blue-50"
)}>
```

#### 2.3 Guest Chip Display
**Sorting Logic**
```typescript
const sortedGuests = [...guests].sort((a, b) => {
  const aHasSeat = a.seat_no !== null;
  const bHasSeat = b.seat_no !== null;
  
  // Numbered seats first
  if (aHasSeat && !bHasSeat) return -1;
  if (!aHasSeat && bHasSeat) return 1;
  
  // Both have seats - sort numerically
  if (aHasSeat && bHasSeat) {
    return (a.seat_no || 0) - (b.seat_no || 0);
  }
  
  // Both no seats - sort by display_order or creation time
  if (a.display_order !== null && b.display_order !== null) {
    return a.display_order - b.display_order;
  }
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
});
```

**Guest Chip Component**
```typescript
<Badge
  draggable
  onDragStart={(e) => handleDragStart(e, guest)}
  className="cursor-move flex items-center gap-1"
>
  <GripVertical className="w-3 h-3" />
  {guest.first_name} {guest.last_name}
  {guest.seat_no && ` (Seat ${guest.seat_no})`}
</Badge>
```

#### 2.4 Cocktail Event Behavior (NEW - 2025-11-12)
**When event_type = 'cocktail':**
```typescript
{selectedEvent?.event_type === 'cocktail' ? (
  <Card className="ww-box p-8 text-center">
    <h3 className="text-xl font-medium text-[#7248e6] mb-2">
      Table Management Unavailable For This Event
    </h3>
    <p className="text-base text-muted-foreground">
      This is a cocktail stand-up event. Table creation and seating 
      charts are disabled. You can change this in my events page.
    </p>
  </Card>
) : (
  // Show normal table management
)}
```

#### 2.5 Table Management Rules
**Table Numbering**
- **Named tables** (table_no = null): Sort alphabetically first
- **Numbered tables** (table_no = 1, 2, 3...): Sort numerically after
- **Unique constraint:** table_no must be unique per event

**Delete Validation**
```typescript
const deleteTable = async (tableId: string) => {
  // Check for assigned guests
  const { data: guests } = await supabase
    .from('guests')
    .select('id')
    .eq('table_id', tableId);
    
  if (guests && guests.length > 0) {
    toast({
      title: "Cannot Delete Table",
      description: "Please unassign all guests before deleting this table.",
      variant: "destructive",
    });
    return false;
  }
  
  // Proceed with deletion
  const { error } = await supabase
    .from('tables')
    .delete()
    .eq('id', tableId);
};
```

---

## 3. GUEST LIST PAGE SPECIFICATIONS

### Component Files
- `GuestListTable.tsx` (1848 lines) - Main guest management table
- `AddGuestModal.tsx` (1197 lines) - Add/Edit guest modal with security
- `GuestDeleteConfirmationModal.tsx` (97 lines) - Guest deletion confirmation
- `src/hooks/useRealtimeGuests.ts` (544 lines) - Real-time guest sync

### Core Features

#### 3.1 Guest List Table
**Columns** (13 total)
1. Checkbox - Bulk selection
2. Name - First + Last name
3. Relation - Partner & role badge
4. RSVP - Status badge (Pending/Attending/Not Attending)
5. Table - Table assignment
6. Seat - Seat number
7. Dietary - Dietary requirements
8. Mobile - Phone number
9. Email - Email address
10. Family/Group - Family grouping
11. Notes - Additional notes
12. Actions - Edit & Delete

**Sort Options** (13 options)
```typescript
type SortOption = 
  | 'first_name_asc' | 'first_name_desc'
  | 'last_name_asc' | 'last_name_desc' 
  | 'table_name_asc' | 'table_name_desc'
  | 'seat_no_asc' | 'seat_no_desc'
  | 'rsvp_attending_first' | 'rsvp_not_attending_first'
  | 'relation_asc' | 'relation_desc'
  | 'family_group_asc' | 'family_group_desc';
```

**Search Functionality**
- Real-time filter by first name or last name
- Case-insensitive search
- Debounced for performance

#### 3.2 RSVP Status System (CRITICAL)
**Three Valid Statuses**
- `"Pending"` - Default/no response (gray badge, Clock icon)
- `"Attending"` - Confirmed attendance (green badge, CheckCircle2 icon)
- `"Not Attending"` - Declined (red badge, XCircle icon)

**Normalization Library** (`src/lib/rsvp.ts`)
```typescript
export function normalizeRsvp(input: string | null | undefined): RsvpStatus {
  const val = String(input ?? "").trim().toLowerCase();
  
  // Attending aliases
  if (["attending", "confirmed", "yes", "y", "going", "accepted", 
       "confirm", "accept"].includes(val)) {
    return "Attending";
  }
  
  // Not Attending aliases
  if (["not attending", "declined", "no", "n", "cant", "can't", 
       "cannot", "deny", "decline"].includes(val)) {
    return "Not Attending";
  }
  
  // Everything else
  return "Pending";
}
```

**⚠️ CRITICAL:** ALWAYS use `normalizeRsvp()` when:
- Importing CSV data
- Saving guest data
- Displaying RSVP status
- Filtering by RSVP

**Badge Display**
```typescript
<Badge variant={getRsvpBadgeVariant(guest.rsvp)}>
  {getRsvpDisplayLabel(guest.rsvp)}
</Badge>

// Variants:
// "success" → Green badge for Attending
// "destructive" → Red badge for Not Attending
// "warning" → Gray badge for Pending
```

#### 3.3 Relation Tracking System
**Relation Modes** (event-level setting)
- `'two'` - Two partners (wedding/engagement) - DEFAULT
- `'single'` - Single partner event
- `'off'` - Hide relation fields entirely

**Relation Toggle Design** (same as event type)
```typescript
<div className="flex items-center gap-1 bg-gray-100 border-2 border-gray-300 rounded-full p-1">
  <button className={relationMode === 'two' 
    ? 'bg-green-500 text-white shadow-md' 
    : 'bg-transparent text-gray-500 hover:bg-gray-200'}>
    Two Partners
  </button>
  <button className={relationMode === 'single' 
    ? 'bg-green-500 text-white shadow-md' 
    : 'bg-transparent text-gray-500 hover:bg-gray-200'}>
    Single Partner
  </button>
  <button className={relationMode === 'off' 
    ? 'bg-green-500 text-white shadow-md' 
    : 'bg-transparent text-gray-500 hover:bg-gray-200'}>
    Off
  </button>
</div>
```

**Relation Fields**
- `relation_partner` - "partner_one" or "partner_two"
- `relation_role` - "bridal_party", "father", "mother", etc.
- `relation_display` - Computed: "{PartnerName} — {RoleLabel}"

**Built-In Roles** (`src/lib/relationUtils.ts`)
```typescript
export const RELATION_ROLE_LABELS: Record<string, string> = {
  // Partner 1 roles
  'bride': 'Bride',
  'groom': 'Groom',
  'partner': 'Partner',
  'engaged': 'Engaged',
  // Bridal party
  'bridal_party': 'Bridal Party',
  'best_man': 'Best Man',
  'maid_of_honor': 'Maid of Honor',
  // Family
  'father': 'Father',
  'mother': 'Mother',
  'brother': 'Brother',
  'sister': 'Sister',
  'grandmother': 'Grandmother',
  'grandfather': 'Grandfather',
  // Friends
  'friend': 'Friend',
  'colleague': 'Colleague',
  'other': 'Other',
  // ... more roles
};
```

**Custom Roles**
- Event-level setting: `relation_allow_custom_role`
- Stored in event settings
- Displayed alongside built-in roles

**Display Format**
```typescript
// Two-partner mode
"Emma — Bride"
"Jason — Father of Bride"

// Single-partner mode
"Emma — Host's Sister"

// Off mode
// No relation display
```

#### 3.4 Table Assignment
**Table Selector Dropdown**
```typescript
<Select value={selectedTableId || ''} onValueChange={handleTableSelect}>
  <SelectTrigger>
    <SelectValue placeholder="Select a table..." />
  </SelectTrigger>
  <SelectContent>
    {tables.map(table => (
      <SelectItem key={table.id} value={table.id}>
        {table.name} ({table.guest_count}/{table.limit_seats} guests)
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Seat Picker**
```typescript
<Select value={seatNo?.toString() || ''} onValueChange={handleSeatSelect}>
  <SelectTrigger>
    <SelectValue placeholder="Select seat..." />
  </SelectTrigger>
  <SelectContent>
    {Array.from({ length: selectedTable.limit_seats }, (_, i) => i + 1).map(seat => {
      const takenSeat = takenSeats[selectedTable.id]?.find(t => t.seatNo === seat);
      return (
        <SelectItem 
          key={seat} 
          value={seat.toString()} 
          disabled={!!takenSeat && !isEditingSeat}
        >
          Seat {seat}{takenSeat && ` — Taken (${takenSeat.guestName})`}
        </SelectItem>
      );
    })}
  </SelectContent>
</Select>
```

**Auto-Select First Free Seat**
```typescript
// When table selected, auto-select first available seat
useEffect(() => {
  if (selectedTableId && !seatNo) {
    const table = tables.find(t => t.id === selectedTableId);
    if (table) {
      const taken = takenSeats[selectedTableId] || [];
      for (let i = 1; i <= table.limit_seats; i++) {
        if (!taken.find(t => t.seatNo === i)) {
          setSeatNo(i);
          break;
        }
      }
    }
  }
}, [selectedTableId, takenSeats]);
```

#### 3.5 Import/Export
**CSV Import**
- Template headers: `first_name, last_name, table_name, seat_no, rsvp, dietary, mobile, email, notes, relation_partner, relation_role`
- Validation via `src/lib/relationValidation.ts`
- Error handling modal for import failures
- RSVP normalization applied automatically

**CSV Export**
```typescript
const headers = [
  'first_name', 'last_name', 'table_name', 'seat_no', 'rsvp',
  'dietary', 'mobile', 'email', 'family_group', 'notes',
  'relation_display' // Computed field
];

const csvContent = [
  headers.join(','),
  ...guests.map(guest => [
    guest.first_name,
    guest.last_name,
    guest.table_name || '',
    guest.seat_no || '',
    guest.rsvp,
    guest.dietary,
    guest.mobile || '',
    guest.email || '',
    guest.family_group || '',
    guest.notes || '',
    guest.relation_display || ''
  ].map(escapeCSV).join(','))
].join('\n');
```

#### 3.6 Bulk Operations
**Bulk Table Assignment**
- Select multiple guests via checkboxes
- Assign to single table
- Optional: Auto-number seats sequentially
- Validates capacity before assignment

**Bulk RSVP Update**
- Select multiple guests
- Update all to: Pending, Attending, or Not Attending
- Uses `normalizeRsvp()` for consistency

**Bulk Delete**
- Select multiple guests
- Confirmation modal: "Type DELETE to confirm"
- Deletes all selected guests

**Bulk Reminder Wizard**
- SMS or Email reminders
- Filters: All guests, Pending RSVP only, specific tables
- Integration with notification system

#### 3.7 Add Guest Types
**Individual Guest**
- Single person
- All fields available

**Couple**
- Two people
- Auto-generates family group (e.g., "Smith Family")
- Same table assignment
- Sequential seat numbers

**Family**
- Multiple members (2-10)
- Auto-generates family group
- Same table assignment
- Sequential seat numbers

#### 3.8 Security Features (CRITICAL)
**Input Sanitization** (`src/lib/security/inputSanitizer.ts`)
```typescript
export class InputSanitizer {
  static sanitize(input: string): string {
    // Remove HTML tags
    // Escape special characters
    // Trim whitespace
    // Limit length
  }
  
  static detectXSS(input: string): boolean {
    // Detect <script>, javascript:, onerror=
    // Detect encoded payloads
  }
}
```

**Rate Limiting**
```typescript
export const guestAddRateLimiter = {
  maxRequests: 10,
  windowMs: 60000, // 1 minute
  attempts: new Map<string, number[]>()
};
```

**Zod Schema Validation** (`src/lib/security/validation.ts`)
```typescript
export const secureGuestSchema = z.object({
  first_name: z.string().trim().min(1).max(50),
  last_name: z.string().trim().min(1).max(50),
  dietary: z.string().max(200).optional(),
  mobile: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().max(500).optional(),
  // ... more fields
});
```

**Security Logging**
```typescript
export const logSecurityEvent = (
  eventType: 'xss_attempt' | 'rate_limit' | 'validation_error',
  details: any
) => {
  console.warn(`[SECURITY] ${eventType}:`, details);
  // Log to monitoring service
};
```

---

## 4. LOCKED COMPONENTS - PRODUCTION WARNING

### Files Requiring Protection Headers

**My Events Components:**
1. `src/components/Dashboard/MyEventsPage.tsx` - Event Countdown System
2. `src/components/Dashboard/EventsTable.tsx` - Events Management Table
3. `src/components/Dashboard/EventCreateModal.tsx` - Event Creation Form
4. `src/components/Dashboard/EventEditModal.tsx` - Event Editing Form
5. `src/components/Dashboard/DeleteConfirmationModal.tsx` - Event Deletion

**Tables Components:**
6. `src/components/Dashboard/TableCard.tsx` - Table Card with Drag-Drop
7. `src/components/Dashboard/CreateTableModal.tsx` - Table Creation Modal

**Guest List Components:**
8. `src/components/Dashboard/GuestListTable.tsx` - Guest List Management
9. `src/components/Dashboard/AddGuestModal.tsx` - Guest Add/Edit Modal
10. `src/components/Dashboard/GuestDeleteConfirmationModal.tsx` - Guest Deletion

**Hooks:**
11. `src/hooks/useEvents.ts` - Event Data Management Hook
12. `src/hooks/useTables.ts` - Table Data Management Hook
13. `src/hooks/useRealtimeGuests.ts` - Real-time Guest Sync Hook

### Protection Header Template

```typescript
/**
 * ⚠️ PRODUCTION-READY — LOCKED FOR PRODUCTION ⚠️
 * 
 * This [FEATURE NAME] feature is COMPLETE and APPROVED for production use.
 * 
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break real-time synchronization
 * - Changes could break drag-and-drop functionality
 * - Changes could break table capacity calculations
 * - Changes could break RSVP normalization
 * - Changes could break relation tracking
 * 
 * See: MY_EVENTS_TABLES_GUESTLIST_SPECS.md for full specifications
 * 
 * Last locked: 2025-11-12
 */
```

---

## 5. CRITICAL PATTERNS TO PRESERVE

### A) Real-Time Synchronization
**Pattern:** Debounced realtime with optimistic updates
```typescript
// Subscribe to guest changes
const channel = supabase
  .channel(`kiosk-guests:event:${eventId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'guests',
    filter: `event_id=eq.${eventId}`
  }, handleRealtimeUpdate)
  .subscribe();

// Optimistic update pattern
const updateGuest = async (guestId: string, updates: Partial<Guest>) => {
  // 1. Update local state immediately
  setGuests(prev => prev.map(g => g.id === guestId ? { ...g, ...updates } : g));
  
  // 2. Make API call
  const { error } = await supabase
    .from('guests')
    .update(updates)
    .eq('id', guestId);
  
  // 3. Revert if failed
  if (error) {
    await refetchGuests();
    toast({ title: "Error", description: "Failed to update guest" });
  }
};
```

### B) RSVP Normalization (ALWAYS)
```typescript
import { normalizeRsvp } from '@/lib/rsvp';

// When saving guest
const rsvpStatus = normalizeRsvp(userInput); // NEVER skip this

// When importing CSV
const normalizedRsvp = normalizeRsvp(row['rsvp']);

// When filtering
const attendingGuests = guests.filter(g => normalizeRsvp(g.rsvp) === 'Attending');
```

### C) Table Capacity Calculation
```typescript
// Real-time capacity from guest count
const tablesWithLiveCounts = useMemo(() => {
  return tables.map(table => {
    const currentGuestCount = guests.filter(g => g.table_id === table.id).length;
    return {
      ...table,
      guest_count: currentGuestCount
    };
  });
}, [tables, guests]);

// Color coding
const progressPercentage = Math.min((guest_count / limit_seats) * 100, 100);
if (guest_count === 0) return 'gray';
if (progressPercentage >= 75) return 'purple';
if (progressPercentage >= 51) return 'blue';
if (progressPercentage >= 26) return 'yellow';
return 'orange';
```

### D) Event Type Toggle (NEW - 2025-11-12)
```typescript
<div className="flex items-center gap-1 bg-gray-100 border-2 border-gray-300 rounded-full p-1">
  <button className={formData.event_type === 'seated' 
    ? 'bg-green-500 text-white shadow-md' 
    : 'bg-transparent text-gray-500 hover:bg-gray-200'}>
    Seated Event
  </button>
  <button className={formData.event_type === 'cocktail' 
    ? 'bg-green-500 text-white shadow-md' 
    : 'bg-transparent text-gray-500 hover:bg-gray-200'}>
    Cocktail/Stand-up
  </button>
</div>
```

### E) Relation Mode Handling
```typescript
const relationMode = selectedEvent?.relation_mode || 'two';
// Valid values: 'two', 'single', 'off'

// Display logic
if (relationMode === 'off') {
  // Hide relation fields entirely
  return null;
}

if (relationMode === 'single') {
  // Show single partner selector
  return <SinglePartnerSelector />;
}

// Default: two partners
return <TwoPartnerSelector />;
```

### F) Session Storage Pattern (CRITICAL - Fixed 2025-11-12)
```typescript
// ALWAYS use ref to prevent re-initialization
const hasInitialized = useRef(false);

useEffect(() => {
  // Only initialize once
  if (hasInitialized.current || events.length === 0 || selectedEventId !== null) {
    return;
  }
  
  const savedEventId = sessionStorage.getItem('ww:session_selected_event');
  if (savedEventId && events.find(e => e.id === savedEventId)) {
    setGlobalSelectedEventId(savedEventId);
    hasInitialized.current = true;
  }
}, [events.length, selectedEventId]);
```

---

## 6. DATABASE DEPENDENCIES

### Tables Used
- `events` - Event records with countdown data
- `guests` - Guest records with RSVP and relations
- `tables` - Table records with capacity limits
- `profiles` - User profile with display_countdown_event_id

### Critical Columns

**events table:**
- `event_type` - 'seated' or 'cocktail' (controls table visibility)
- `relation_mode` - 'two', 'single', 'off' (controls relation UI)
- `partner1_name`, `partner2_name` - For relation display
- `start_time`, `finish_time` - For countdown calculations
- `rsvp_deadline` - RSVP cutoff date (inclusive through end of day)
- `created_date_local`, `expiry_date_local` - Local timezone dates

**guests table:**
- `relation_partner` - "partner_one" or "partner_two"
- `relation_role` - Role key (e.g., "bridal_party", "father")
- `relation_display` - Computed: "{PartnerName} — {RoleLabel}"
- `rsvp` - MUST use normalizeRsvp() function
- `table_id` - Foreign key to tables.id
- `seat_no` - Unique constraint with table_id
- `family_group` - Grouping for families
- `display_order` - Manual ordering within table

**tables table:**
- `table_no` - Nullable for named tables, unique per event
- `limit_seats` - Maximum capacity (1-30)
- `guest_count` - Computed from guests table

**profiles table:**
- `display_countdown_event_id` - Selected countdown event

### RPC Functions
```sql
-- Get events with guest count
CREATE OR REPLACE FUNCTION get_events_with_guest_count()
RETURNS TABLE (
  id UUID,
  name TEXT,
  date DATE,
  venue TEXT,
  start_time TIME,
  finish_time TIME,
  guest_limit INTEGER,
  guests_count BIGINT,
  -- ... other fields
)
AS $$
  SELECT 
    e.*,
    COUNT(g.id) as guests_count
  FROM events e
  LEFT JOIN guests g ON e.id = g.event_id
  WHERE e.user_id = auth.uid()
  GROUP BY e.id
  ORDER BY e.created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER;
```

### Constraints
```sql
-- Unique seat number per table
ALTER TABLE guests 
ADD CONSTRAINT guests_table_seat_unique 
UNIQUE (table_id, seat_no);

-- Unique table number per event
ALTER TABLE tables 
ADD CONSTRAINT tables_event_table_no_unique 
UNIQUE (event_id, table_no);

-- Event type check
ALTER TABLE events
ADD CONSTRAINT events_event_type_check
CHECK (event_type IN ('seated', 'cocktail'));

-- Relation mode check
ALTER TABLE events
ADD CONSTRAINT events_relation_mode_check
CHECK (relation_mode IN ('two', 'single', 'off'));
```

---

## 7. TESTING CHECKLIST

Before deploying ANY changes to these features, verify:

### My Events Page
- [ ] Countdown updates every second
- [ ] Event selection persists across page refresh
- [ ] Radio button shows green checkmark when selected
- [ ] Selected row has green left border
- [ ] Event type toggle saves correctly (seated/cocktail)
- [ ] Date formatting matches specifications
- [ ] Edit modal populates with existing data
- [ ] Create modal validates required fields
- [ ] Delete requires "DELETE" confirmation
- [ ] Real-time sync updates countdown selection

### Tables Page
- [ ] Drag-and-drop guest assignment works
- [ ] Table capacity colors update correctly (gray/orange/yellow/blue/purple)
- [ ] Full table banner appears at 100% capacity
- [ ] Over-capacity warning appears when exceeded
- [ ] Guest chips sort correctly (seated first, then by creation)
- [ ] Cocktail events hide table management
- [ ] Delete table validates no guests assigned
- [ ] Table numbering handles named and numbered tables
- [ ] Real-time guest count updates immediately

### Guest List Page
- [ ] RSVP status normalizes all aliases
- [ ] Search filters by first and last name
- [ ] Sort options work for all 13 columns
- [ ] Table assignment validates capacity
- [ ] Seat picker shows taken seats correctly
- [ ] Auto-selects first free seat when table chosen
- [ ] Bulk operations work without errors
- [ ] CSV import validates and normalizes data
- [ ] CSV export includes all fields
- [ ] Relation mode toggle saves immediately
- [ ] Security validation blocks malicious input
- [ ] Real-time sync updates guest list across views

### Cross-Feature Integration
- [ ] Selected event in My Events flows to Tables page
- [ ] Selected event in My Events flows to Guest List page
- [ ] Guest moves update table capacities immediately
- [ ] RSVP changes reflect in all views
- [ ] Relation display formats correctly

---

## 8. CHANGE LOG

| Date | Change | Component | Approval |
|------|--------|-----------|----------|
| 2025-11-12 | Event Type toggle redesign (green selection, gray container) | EventCreateModal, EventEditModal | Owner ✅ |
| 2025-11-12 | Table Management message for cocktail events | TableCard rendering logic | Owner ✅ |
| 2025-11-12 | Session storage initialization fix (prevent re-init) | Dashboard.tsx useEffect | Owner ✅ |
| 2025-11-12 | LOCKED FOR PRODUCTION | All 13 component/hook files | Owner ✅ |

---

## ⚠️ CONSEQUENCES OF UNAUTHORIZED CHANGES

**DO NOT MODIFY** these features without explicit owner approval. Unauthorized changes may cause:

### Real-Time Sync Issues
- Guest updates may not appear in dashboard
- Table capacities may show stale data
- Countdown selection may not persist
- Cross-view synchronization may fail

### Drag-Drop Functionality
- Table assignments may fail silently
- Guest moves may not validate capacity
- Visual feedback may not appear
- Data may corrupt on concurrent operations

### Capacity Calculations
- Over-capacity warnings may not trigger
- Progress bars may show incorrect percentages
- Color coding may not reflect true state
- Full table banners may not appear

### RSVP Normalization
- Status may not normalize correctly
- Data integrity issues (mixed formats)
- Filters may not work properly
- Export data may have inconsistent values

### Relation Tracking
- Display format may break ("undefined — undefined")
- Partner names may not appear
- Custom roles may not save
- Relation mode toggle may not work

### Security Vulnerabilities
- Input validation may fail (XSS vulnerability)
- Rate limiting may not apply
- Sanitization may be bypassed
- Security logs may not fire

### Performance Issues
- Debounced refetch may cause race conditions
- Optimistic updates may not revert on error
- Real-time subscriptions may leak memory
- Session storage may cause infinite loops

---

## FINAL WARNING

**ALWAYS consult this specification document before making changes.**  
**ALWAYS test with multiple users and real-time scenarios.**  
**ALWAYS obtain owner approval for modifications.**

These features represent ~5,000+ lines of production-tested code. They are the foundation of the Wedding Waitress application and serve thousands of users. Treat them with care.

---

**END OF MY_EVENTS_TABLES_GUESTLIST_SPECS.md**
