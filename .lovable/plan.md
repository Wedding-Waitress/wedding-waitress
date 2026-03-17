

## Add Text-Zone-Style Toolbar to QR Code Overlay

### Problem
The QR code overlay currently shows a basic selection border with corner handles and a standalone delete button. It needs the same toolbar pattern as text zones: top toolbar (Reset, Duplicate, Delete) and bottom controls (Move grip, Rotate handle).

### Changes

**Single file: `src/components/ui/InteractiveQROverlay.tsx`**

1. **Add new props**: `onReset`, `onDuplicate`, `onRotate`, plus `rotation` state support.

2. **Replace the current delete button** with a top toolbar matching the text zone pattern exactly:
   - Centered above the QR code with `bottom: '100%'`, `marginBottom: 6`
   - Same background, border, border-radius, padding, box-shadow
   - Three `ToolbarButton`s in order: Reset (`RotateCcw`), Duplicate (`CopyPlus`), Delete (`Trash2`)

3. **Add bottom controls** matching the text zone pattern:
   - Centered below the QR code with `top: '100%'`, `marginTop: 6`
   - Move grip: 24×24 rounded-full icon button with `Move` icon, triggers drag mode
   - Rotate handle: 24×24 rounded-full icon button with `RotateCw` icon, triggers rotate mode
   - Live angle indicator shown during rotation

4. **Add rotate logic**: Reuse the same pointer-based rotation pattern (horizontal drag → angle change, 4° snap-to-zero, live degree badge).

5. **Copy `ToolbarButton` helper** inline (same tiny component from `InteractiveTextOverlay`).

6. **Keep existing** corner resize handles and drag-to-move on the QR image itself.

**Wire up in `InvitationCardPreview.tsx`** (lines ~274-285):
- Pass `onReset` → resets QR position/size to defaults (x:50, y:90, size:15)
- Pass `onDuplicate` → no-op or not passed (QR is singular, but we show the icon for consistency; can be omitted if preferred)
- Pass `onRotate` → updates a `rotation` field in qr_config (will need to add `rotation` to `QrConfig` interface)

**Update `QrConfig` in `useInvitationCardSettings.ts`**:
- Add `rotation: number` field (default `0`)

### Toolbar Layout (matches text zones exactly)

```text
       [ ↺ Reset | ⊕ Duplicate | 🗑 Delete ]   ← top toolbar
       ┌─────────────────────────┐
       │                         │
       │       QR Code           │
       │                         │
       └─────────────────────────┘
              [ ✥ Move  ↻ Rotate ]              ← bottom controls
```

