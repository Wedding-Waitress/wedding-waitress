

# Insert 9 Invitation Gallery Records into Database

## What's Already Done
- All 9 images copied to `public/invitation-gallery/` (confirmed in last diff)

## What's Left (1 step)
Run a database migration to insert 9 rows into `invitation_gallery_images`:

```sql
INSERT INTO invitation_gallery_images (name, category, image_url, sort_order) VALUES
('Beige Vintage Ornate Floral Corner Frame', 'Wedding', '/invitation-gallery/Wedding_beige-vintage-ornate-floral-corner-frame.jpg', 12),
('Beige Baroque Crest Ornate Border', 'Wedding', '/invitation-gallery/Wedding_beige-baroque-crest-ornate-border.jpg', 13),
('Aged Parchment Burnt Edge Texture', 'Wedding', '/invitation-gallery/Wedding_aged-parchment-burnt-edge-texture.jpg', 14),
('Beige Vintage Calligraphy Scroll Frame', 'Wedding', '/invitation-gallery/Wedding_beige-vintage-calligraphy-scroll-frame.jpg', 15),
('Beige Vintage Swirl Frame Filigree Border', 'Wedding', '/invitation-gallery/Wedding_beige-vintage-swirl-frame-filigree-border.jpg', 16),
('Beige Ornate Swirl Crown Border', 'Wedding', '/invitation-gallery/Wedding_beige-ornate-swirl-crown-border.jpg', 17),
('Beige Art Nouveau Bold Diagonal Corner', 'Wedding', '/invitation-gallery/Wedding_beige-art-nouveau-bold-diagonal-corner.jpg', 18),
('Beige Ornate Repeating Floral Border', 'Wedding', '/invitation-gallery/Wedding_beige-ornate-repeating-floral-border.jpg', 19),
('Black Gold Balloons Confetti String Lights', 'Celebrations', '/invitation-gallery/Celebrations_black-gold-balloons-confetti-string-lights.jpg', 28);
```

This will bring the total from 314 to **323 Total Designs**.

