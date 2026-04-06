

## Apply Consistent Dark Gray Text to Running Sheet + Add Guest Modal

**What**: Update the dark gray text styling so that ALL text (headers, body, labels) uses `#1D1D1F`, and ONLY placeholder/input text inside form fields uses the muted `#6E6E73`. Purple text (`text-primary`) stays untouched.

### Files to edit

**1. `src/index.css`** — Update the existing `.running-sheet-dark-gray` rules and add a new `.ww-dark-gray-form` class for the Add Guest modal:

- Remove the current `.text-muted-foreground` override (which was making ceremony/reception header text lighter)
- Instead, only apply `#6E6E73` to input placeholders, textarea placeholders, and select trigger placeholder text
- Add a new `.ww-dark-gray-form` class with the same logic for the Add Guest popup

```css
/* Updated rules */
.running-sheet-dark-gray,
.running-sheet-dark-gray * {
  color: #1D1D1F;
}
.running-sheet-dark-gray .text-primary { color: hsl(var(--primary)); }
.running-sheet-dark-gray .text-destructive { color: hsl(var(--destructive)); }
.running-sheet-dark-gray .text-green-600 { color: #16a34a; }
.running-sheet-dark-gray .text-green-500 { color: #22c55e; }
.running-sheet-dark-gray input::placeholder,
.running-sheet-dark-gray textarea::placeholder,
.running-sheet-dark-gray .text-muted-foreground[data-placeholder] { color: #6E6E73; }

/* Add Guest modal dark gray */
.ww-dark-gray-form,
.ww-dark-gray-form * {
  color: #1D1D1F;
}
.ww-dark-gray-form .text-primary { color: hsl(var(--primary)); }
.ww-dark-gray-form .text-destructive { color: hsl(var(--destructive)); }
.ww-dark-gray-form input::placeholder,
.ww-dark-gray-form textarea::placeholder { color: #6E6E73; }
```

**2. `src/components/Dashboard/AddGuestModal.tsx`** — Add the `ww-dark-gray-form` class to the `DialogContent` wrapper so all labels, headers, and text inside the modal become `#1D1D1F`, while only field placeholders use `#6E6E73`.

### What changes visually
- Running Sheet: ALL text including ceremony/reception details now `#1D1D1F` (no more light gray headers)
- Running Sheet: Only input/textarea placeholders remain `#6E6E73`
- Add Guest modal: All labels ("First Name", "Table", etc.) and the title → `#1D1D1F`
- Add Guest modal: Placeholder text inside fields ("Enter first name", etc.) → `#6E6E73`
- Purple text (`text-primary`) remains purple everywhere

