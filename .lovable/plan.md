

# Fix Place Card Gallery and Rename Gallery Titles

## Problem
The last batch of 10 Cultural designs (Chinese-themed) were incorrectly added to the Place Card gallery (`place_card_gallery_images`). They should only exist in the Invitation gallery (which they already do). Additionally, both gallery modal titles need renaming.

## Steps

### 1. Remove 10 Cultural designs from Place Card gallery
Delete the 10 recently-added Cultural records from `place_card_gallery_images` using a data operation (not a migration). This will bring the Place Card gallery back to **162 designs**.

```sql
DELETE FROM place_card_gallery_images 
WHERE category = 'Cultural';
```

### 2. Rename Invitation Gallery modal title
In `src/components/Dashboard/Invitations/InvitationGalleryModal.tsx`, change the DialogTitle from:
- "Image Gallery ({count} Invitations)" 
to:
- "Invitation Image Gallery"

### 3. Rename Place Card Gallery modal title
In `src/components/Dashboard/PlaceCards/PlaceCardGalleryModal.tsx`, change the DialogTitle from:
- "Image Gallery ({count} Cards)"
to:
- "Place Cards Image Gallery"

## Summary
- 10 Cultural records removed from Place Card gallery (back to 162)
- No changes to Invitation gallery data (Cultural designs remain with 70 total)
- Two file edits for title renaming
